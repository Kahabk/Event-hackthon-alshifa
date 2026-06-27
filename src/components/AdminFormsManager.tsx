import { useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';
import { deleteObject, getBlob, listAll, ref as storageRef } from 'firebase/storage';
import { Copy, Download, Eye, EyeOff, FileText, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import {
  createFormField,
  createRegistrationForm,
  FormFieldType,
  FormSubmission,
  formsCollection,
  formSubmissionsCollection,
  normalizeRegistrationForm,
  RegistrationForm,
  RegistrationFormField,
  slugifyForm,
} from '../lib/forms';

const FIELD_TYPES: Array<{ value: FormFieldType; label: string }> = [
  { value: 'text', label: 'Text input' }, { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone number' }, { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown / select' }, { value: 'radio', label: 'Radio buttons' },
  { value: 'checkbox', label: 'Checkbox' }, { value: 'date', label: 'Date' },
  { value: 'file', label: 'File upload' }, { value: 'textarea', label: 'Long text' },
];

const dateLabel = (value: unknown) => {
  if (value && typeof value === 'object' && 'toDate' in value) return (value as { toDate: () => Date }).toDate().toLocaleString();
  return value ? new Date(String(value)).toLocaleString() : '—';
};

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const storagePrefix = 'storage://';

function SecureUploadedFileLink({ value }: { value: string }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    void getBlob(storageRef(storage, value.slice(storagePrefix.length)))
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [value]);
  if (failed) return <span className="text-red-600">File unavailable</span>;
  if (!url) return <span className="text-slate-400">Preparing secure link…</span>;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">Open uploaded file</a>;
}

function downloadSubmissions(rows: FormSubmission[]) {
  const keys = Array.from(new Set(rows.flatMap(row => Object.keys(row.submittedData || {}))));
  const csv = [
    ['Form', 'Submitted at', 'Source page', 'Source section', 'Source button', ...keys],
    ...rows.map(row => [row.formTitle, dateLabel(row.createdAt), row.sourcePage, row.sourceSection, row.sourceButton, ...keys.map(key => {
      const value = row.submittedData?.[key];
      return Array.isArray(value) ? value.join(', ') : value ?? '';
    })]),
  ].map(row => row.map(csvCell).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = 'form-submissions.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

export function FormBuilderTab() {
  const [forms, setForms] = useState<RegistrationForm[]>([]);
  const [draft, setDraft] = useState<RegistrationForm | null>(null);
  const [originalId, setOriginalId] = useState('');
  const [message, setMessage] = useState('');
  const [operationMessage, setOperationMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    void getDocs(collection(db, formsCollection)).then(snapshot => {
      setForms(snapshot.docs.map(item => normalizeRegistrationForm(item.id, item.data())));
    });
  }, []);

  const edit = (form: RegistrationForm) => {
    setDraft(JSON.parse(JSON.stringify(form)) as RegistrationForm);
    setOriginalId(form.id);
    setMessage('');
  };

  const startNew = () => {
    setDraft(createRegistrationForm());
    setOriginalId('');
    setMessage('');
  };

  const save = async () => {
    if (!draft) return;
    const id = slugifyForm(draft.slug || draft.title);
    if (!id) return setMessage('Add a valid title or slug.');
    if (forms.some(form => form.id === id && form.id !== originalId)) return setMessage('That form slug is already in use.');
    const payload = {
      ...draft,
      id,
      slug: id,
      fields: draft.fields.map((field, index) => ({ ...field, order: index + 1 })),
      updatedAt: serverTimestamp(),
      ...(!originalId ? { createdAt: serverTimestamp() } : {}),
    };
    await setDoc(doc(db, formsCollection, id), payload);
    if (originalId && originalId !== id) await deleteDoc(doc(db, formsCollection, originalId));
    const savedForm = normalizeRegistrationForm(id, { ...draft, id, slug: id, fields: payload.fields });
    setForms(current => [...current.filter(form => form.id !== originalId && form.id !== id), savedForm]);
    setDraft(null);
    setOriginalId('');
  };

  const duplicate = async (form: RegistrationForm) => {
    const id = `${form.slug || form.id}-copy-${Date.now().toString(36)}`;
    await setDoc(doc(db, formsCollection, id), {
      ...JSON.parse(JSON.stringify(form)), id, slug: id, title: `${form.title} (copy)`, status: 'inactive',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    setForms(current => [...current, normalizeRegistrationForm(id, { ...form, id, slug: id, title: `${form.title} (copy)`, status: 'inactive' })]);
  };

  const toggle = async (form: RegistrationForm) => {
    const status = form.status === 'active' ? 'inactive' : 'active';
    await setDoc(doc(db, formsCollection, form.id), { status, updatedAt: serverTimestamp() }, { merge: true });
    setForms(current => current.map(item => item.id === form.id ? { ...item, status } : item));
  };

  const deleteFormAndRelatedData = async (form: RegistrationForm) => {
    const confirmed = window.confirm(`Permanently delete “${form.title}”?\n\nThis will also delete every submission and uploaded file connected to this form. This cannot be undone.`);
    if (!confirmed) return;
    setDeletingId(form.id);
    setOperationMessage(null);
    try {
      const submissionSnapshot = await getDocs(query(
        collection(db, formSubmissionsCollection),
        where('formId', '==', form.id),
      ));

      for (let index = 0; index < submissionSnapshot.docs.length; index += 450) {
        const batch = writeBatch(db);
        submissionSnapshot.docs.slice(index, index + 450).forEach(item => batch.delete(item.ref));
        await batch.commit();
      }

      const uploadedFiles = await listAll(storageRef(storage, `form-uploads/${form.id}`));
      await Promise.all(uploadedFiles.items.map(item => deleteObject(item)));
      await deleteDoc(doc(db, formsCollection, form.id));
      setForms(current => current.filter(item => item.id !== form.id));

      setOperationMessage({
        tone: 'success',
        text: `Deleted “${form.title}”, ${submissionSnapshot.size} submission${submissionSnapshot.size === 1 ? '' : 's'}, and ${uploadedFiles.items.length} uploaded file${uploadedFiles.items.length === 1 ? '' : 's'}.`,
      });
    } catch (error) {
      setOperationMessage({
        tone: 'error',
        text: error instanceof Error ? `Delete failed: ${error.message}` : 'Delete failed. Check Firebase permissions and try again.',
      });
    } finally {
      setDeletingId('');
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-2xl font-semibold">Form Builder</h2><p className="text-sm font-medium text-slate-500">Create reusable forms, then assign active forms to landing buttons.</p></div>
        <button type="button" onClick={startNew} className="admin-primary-btn inline-flex items-center justify-center gap-2 px-4 py-3 text-sm"><Plus className="h-4 w-4" /> New form</button>
      </div>
      {operationMessage && <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${operationMessage.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{operationMessage.text}</div>}
      {!forms.length ? <EmptyForms onCreate={startNew} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {forms.map(form => (
            <article key={form.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-950">{form.title}</h3><p className="mt-1 font-mono text-xs text-slate-400">{form.slug}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${form.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{form.status}</span></div>
              <p className="mt-3 line-clamp-2 text-sm text-slate-500">{form.description || 'No description'}</p>
              <p className="mt-4 text-xs font-semibold text-slate-500">{form.fields.length} field{form.fields.length === 1 ? '' : 's'}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => edit(form)} className="admin-secondary-btn px-3 py-2 text-xs">Edit</button>
                <button type="button" onClick={() => toggle(form)} className="admin-secondary-btn inline-flex items-center gap-1 px-3 py-2 text-xs">{form.status === 'active' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {form.status === 'active' ? 'Disable' : 'Enable'}</button>
                <button type="button" onClick={() => duplicate(form)} className="admin-secondary-btn inline-flex items-center gap-1 px-3 py-2 text-xs"><Copy className="h-3.5 w-3.5" /> Duplicate</button>
                <button type="button" disabled={Boolean(deletingId)} onClick={() => void deleteFormAndRelatedData(form)} className="rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"><Trash2 className="mr-1 inline h-3.5 w-3.5" /> {deletingId === form.id ? 'Deleting all data…' : 'Delete all'}</button>
              </div>
            </article>
          ))}
        </div>
      )}
      {draft && <FormEditor draft={draft} setDraft={setDraft} message={message} onClose={() => setDraft(null)} onSave={save} />}
    </section>
  );
}

function EmptyForms({ onCreate }: { onCreate: () => void }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><FileText className="mx-auto h-8 w-8 text-slate-300" /><h3 className="mt-3 font-semibold">No custom forms yet</h3><p className="mt-1 text-sm text-slate-500">Create the first form to make it available in the landing editor.</p><button type="button" onClick={onCreate} className="admin-primary-btn mt-4 px-4 py-2.5 text-sm">Create form</button></div>;
}

function FormEditor({ draft, setDraft, message, onClose, onSave }: { draft: RegistrationForm; setDraft: (value: RegistrationForm) => void; message: string; onClose: () => void; onSave: () => void }) {
  const patch = (value: Partial<RegistrationForm>) => setDraft({ ...draft, ...value });
  const updateField = (id: string, value: Partial<RegistrationFormField>) => patch({ fields: draft.fields.map(field => field.id === id ? { ...field, ...value } : field) });
  const moveField = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= draft.fields.length) return;
    const fields = [...draft.fields];
    [fields[index], fields[target]] = [fields[target], fields[index]];
    patch({ fields });
  };
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/55 p-3 sm:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto max-w-4xl rounded-2xl bg-slate-50 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-5"><div><h2 className="text-xl font-semibold">{draft.id ? 'Edit form' : 'Create form'}</h2><p className="text-xs text-slate-500">Changes are available to landing buttons after saving.</p></div><button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <div className="space-y-6 p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminInput label="Form title" value={draft.title} onChange={title => patch({ title, ...(!draft.id ? { slug: slugifyForm(title) } : {}) })} />
            <AdminInput label="Unique slug / ID" value={draft.slug} onChange={slug => patch({ slug: slugifyForm(slug) })} />
            <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Description</span><textarea className="admin-input min-h-24 w-full" value={draft.description} onChange={event => patch({ description: event.target.value })} /></label>
            <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Status</span><select className="admin-input w-full" value={draft.status} onChange={event => patch({ status: event.target.value as RegistrationForm['status'] })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <AdminInput label="Submit button text" value={draft.submitButtonText} onChange={submitButtonText => patch({ submitButtonText })} />
            <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Success message</span><textarea className="admin-input min-h-20 w-full" value={draft.successMessage} onChange={event => patch({ successMessage: event.target.value })} /></label>
            <AdminInput label="Redirect URL (optional)" value={draft.redirectUrl} onChange={redirectUrl => patch({ redirectUrl })} />
          </div>
          <div className="flex items-center justify-between"><div><h3 className="font-semibold">Fields</h3><p className="text-xs text-slate-500">Configure labels, validation, options, and order.</p></div><button type="button" onClick={() => patch({ fields: [...draft.fields, createFormField(draft.fields.length + 1)] })} className="admin-secondary-btn inline-flex items-center gap-1 px-3 py-2 text-xs"><Plus className="h-3.5 w-3.5" /> Add field</button></div>
          <div className="space-y-4">{draft.fields.map((field, index) => <FieldEditor key={field.id} field={field} index={index} count={draft.fields.length} onUpdate={value => updateField(field.id, value)} onMove={moveField} onDelete={() => patch({ fields: draft.fields.filter(item => item.id !== field.id) })} />)}</div>
          {message && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p>}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white p-4"><button type="button" onClick={onClose} className="admin-secondary-btn px-4 py-2.5 text-sm">Cancel</button><button type="button" onClick={onSave} className="admin-primary-btn inline-flex items-center gap-2 px-5 py-2.5 text-sm"><Save className="h-4 w-4" /> Save form</button></div>
      </div>
    </div>
  );
}

function FieldEditor({ field, index, count, onUpdate, onMove, onDelete }: { key?: string; field: RegistrationFormField; index: number; count: number; onUpdate: (value: Partial<RegistrationFormField>) => void; onMove: (index: number, delta: number) => void; onDelete: () => void }) {
  const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type);
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-4 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-slate-400">Field {index + 1}</span><div className="flex gap-1"><button type="button" disabled={!index} onClick={() => onMove(index, -1)} className="rounded-lg px-2 py-1 text-xs disabled:opacity-30">↑</button><button type="button" disabled={index === count - 1} onClick={() => onMove(index, 1)} className="rounded-lg px-2 py-1 text-xs disabled:opacity-30">↓</button><button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><AdminInput label="Label" value={field.label} onChange={label => onUpdate({ label })} /><label><span className="mb-1.5 block text-xs font-semibold text-slate-600">Type</span><select className="admin-input w-full" value={field.type} onChange={event => onUpdate({ type: event.target.value as FormFieldType })}>{FIELD_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><AdminInput label="Placeholder" value={field.placeholder || ''} onChange={placeholder => onUpdate({ placeholder })} /><AdminInput label="Minimum" type="number" value={String(field.validation.minLength ?? field.validation.min ?? '')} onChange={value => onUpdate({ validation: { ...field.validation, ...(field.type === 'number' ? { min: value ? Number(value) : undefined } : { minLength: value ? Number(value) : undefined }) } })} /><AdminInput label="Maximum" type="number" value={String(field.validation.maxLength ?? field.validation.max ?? '')} onChange={value => onUpdate({ validation: { ...field.validation, ...(field.type === 'number' ? { max: value ? Number(value) : undefined } : { maxLength: value ? Number(value) : undefined }) } })} /><AdminInput label={field.type === 'file' ? 'Accepted files (e.g. image/*,.pdf)' : 'Validation pattern'} value={field.type === 'file' ? field.validation.accept || '' : field.validation.pattern || ''} onChange={value => onUpdate({ validation: { ...field.validation, ...(field.type === 'file' ? { accept: value } : { pattern: value }) } })} /></div>
    <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={field.required} onChange={event => onUpdate({ required: event.target.checked })} /> Required field</label>
    {hasOptions && <label className="mt-3 block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Options (one per line)</span><textarea className="admin-input min-h-20 w-full" value={field.options.join('\n')} onChange={event => onUpdate({ options: event.target.value.split('\n').map(value => value.trim()).filter(Boolean) })} /></label>}
  </article>;
}

function AdminInput({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span><input type={type} className="admin-input w-full" value={value} onChange={event => onChange(event.target.value)} /></label>;
}

export function FormSubmissionsTab() {
  const [forms, setForms] = useState<RegistrationForm[]>([]);
  const [rows, setRows] = useState<FormSubmission[]>([]);
  const [formFilter, setFormFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FormSubmission | null>(null);
  const [deletingId, setDeletingId] = useState('');
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [operationMessage, setOperationMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadSubmissionData = async () => {
    setRefreshing(true);
    try {
      const [formsSnapshot, submissionsSnapshot] = await Promise.all([
      getDocs(collection(db, formsCollection)),
      getDocs(query(collection(db, formSubmissionsCollection), orderBy('createdAt', 'desc'), limit(250))),
      ]);
      setForms(formsSnapshot.docs.map(item => normalizeRegistrationForm(item.id, item.data())));
      setRows(submissionsSnapshot.docs.map(item => ({ id: item.id, ...item.data() } as FormSubmission)));
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => { void loadSubmissionData(); }, []);
  const filtered = useMemo(() => rows.filter(row => {
    if (formFilter && row.formId !== formFilter) return false;
    const haystack = `${row.formTitle} ${JSON.stringify(row.submittedData)}`.toLowerCase();
    return !search || haystack.includes(search.toLowerCase());
  }), [rows, formFilter, search]);

  const removeUploadedFiles = async (submissionsToDelete: FormSubmission[]) => {
    const references = Array.from(new Set(submissionsToDelete.flatMap(row => Object.values(row.submittedData || {}))
      .filter((value): value is string => typeof value === 'string' && (
        value.startsWith(`${storagePrefix}form-uploads/`)
        || (value.includes('firebasestorage.googleapis.com') && value.includes('form-uploads'))
      ))));
    const results = await Promise.allSettled(references.map(value => deleteObject(storageRef(
      storage,
      value.startsWith(storagePrefix) ? value.slice(storagePrefix.length) : value,
    ))));
    return results.filter(result => result.status === 'rejected').length;
  };

  const deleteSubmission = async (submission: FormSubmission) => {
    if (!window.confirm(`Permanently delete this “${submission.formTitle}” response and its uploaded files?`)) return;
    setDeletingId(submission.id);
    setOperationMessage(null);
    try {
      const failedFileDeletes = await removeUploadedFiles([submission]);
      await deleteDoc(doc(db, formSubmissionsCollection, submission.id));
      setRows(current => current.filter(row => row.id !== submission.id));
      setSelected(current => current?.id === submission.id ? null : current);
      setOperationMessage({
        tone: failedFileDeletes ? 'error' : 'success',
        text: failedFileDeletes
          ? `Response deleted, but ${failedFileDeletes} uploaded file could not be removed. Check Storage rules.`
          : 'Response and its uploaded files were deleted.',
      });
    } catch (error) {
      setOperationMessage({ tone: 'error', text: error instanceof Error ? `Delete failed: ${error.message}` : 'Delete failed.' });
    } finally {
      setDeletingId('');
    }
  };

  const deleteFilteredSubmissions = async () => {
    if (!filtered.length) return;
    if (!window.confirm(`Permanently delete all ${filtered.length} displayed response${filtered.length === 1 ? '' : 's'} and their uploaded files?\n\nThis cannot be undone.`)) return;
    setDeletingBulk(true);
    setOperationMessage(null);
    try {
      const failedFileDeletes = await removeUploadedFiles(filtered);
      for (let index = 0; index < filtered.length; index += 450) {
        const batch = writeBatch(db);
        filtered.slice(index, index + 450).forEach(row => batch.delete(doc(db, formSubmissionsCollection, row.id)));
        await batch.commit();
      }
      setSelected(null);
      const deletedIds = new Set(filtered.map(row => row.id));
      setRows(current => current.filter(row => !deletedIds.has(row.id)));
      setOperationMessage({
        tone: failedFileDeletes ? 'error' : 'success',
        text: failedFileDeletes
          ? `${filtered.length} responses deleted, but ${failedFileDeletes} uploaded file${failedFileDeletes === 1 ? '' : 's'} could not be removed.`
          : `${filtered.length} response${filtered.length === 1 ? '' : 's'} and related uploaded files were deleted.`,
      });
    } catch (error) {
      setOperationMessage({ tone: 'error', text: error instanceof Error ? `Bulk delete failed: ${error.message}` : 'Bulk delete failed.' });
    } finally {
      setDeletingBulk(false);
    }
  };
  return <section className="space-y-5">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-2xl font-semibold">Form Submissions</h2><p className="text-sm text-slate-500">View, export, or permanently delete responses for each custom form.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void loadSubmissionData()} disabled={refreshing} className="admin-secondary-btn inline-flex items-center justify-center gap-2 px-4 py-3 text-sm disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</button><button type="button" onClick={() => void deleteFilteredSubmissions()} disabled={!filtered.length || deletingBulk || Boolean(deletingId)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 disabled:opacity-40"><Trash2 className="h-4 w-4" /> {deletingBulk ? 'Deleting…' : 'Delete filtered'}</button><button type="button" onClick={() => downloadSubmissions(filtered)} disabled={!filtered.length} className="admin-primary-btn inline-flex items-center justify-center gap-2 px-4 py-3 text-sm disabled:opacity-40"><Download className="h-4 w-4" /> Export CSV</button></div></div>
    {operationMessage && <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${operationMessage.tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{operationMessage.text}</div>}
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-semibold text-slate-500">Filter by form</span><select className="admin-input w-full" value={formFilter} onChange={event => setFormFilter(event.target.value)}><option value="">All forms</option>{forms.map(form => <option key={form.id} value={form.id}>{form.title}</option>)}</select></label><label><span className="mb-1 block text-xs font-semibold text-slate-500">Search name, email, phone, or response</span><span className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="admin-input w-full pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search submissions" /></span></label></div>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Form</th><th className="px-4 py-3">Response</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y">{filtered.map(row => <tr key={row.id}><td className="px-4 py-3 font-semibold">{row.formTitle}</td><td className="max-w-sm truncate px-4 py-3 text-slate-500">{Object.values(row.submittedData || {}).filter(value => typeof value !== 'object').slice(0, 3).join(' · ') || 'Response'}</td><td className="px-4 py-3 text-xs text-slate-500">{row.sourceSection || row.sourcePage || 'Landing page'}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{dateLabel(row.createdAt)}</td><td className="whitespace-nowrap px-4 py-3"><button type="button" onClick={() => setSelected(row)} className="mr-3 font-semibold text-slate-950 underline">View</button><button type="button" disabled={Boolean(deletingId) || deletingBulk} onClick={() => void deleteSubmission(row)} className="font-semibold text-red-600 disabled:opacity-40">{deletingId === row.id ? 'Deleting…' : 'Delete'}</button></td></tr>)}</tbody></table>{!filtered.length && <p className="p-8 text-center text-sm text-slate-500">No submissions match these filters.</p>}</div>
    {selected && <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/55 p-4"><div className="mx-auto mt-10 max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h3 className="text-xl font-semibold">{selected.formTitle}</h3><p className="mt-1 text-xs text-slate-500">{dateLabel(selected.createdAt)} · {selected.sourceSection || selected.sourcePage}</p></div><button type="button" onClick={() => setSelected(null)}><X className="h-5 w-5" /></button></div><dl className="mt-6 divide-y rounded-xl border">{Object.entries(selected.submittedData || {}).map(([key, value]) => <div key={key} className="grid gap-1 p-4 sm:grid-cols-[180px_1fr]"><dt className="text-xs font-bold text-slate-500">{key}</dt><dd className="break-words text-sm font-medium">{typeof value === 'string' && value.startsWith(storagePrefix) ? <SecureUploadedFileLink value={value} /> : typeof value === 'string' && /^https?:\/\//.test(value) ? <a href={value} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">Open uploaded file</a> : Array.isArray(value) ? value.join(', ') : String(value ?? '—')}</dd></div>)}</dl></div></div>}
  </section>;
}
