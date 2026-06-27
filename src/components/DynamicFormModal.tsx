import { FormEvent, useEffect, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { deleteObject, ref, uploadBytes, UploadResult } from 'firebase/storage';
import { CheckCircle2, Loader2, Upload, X } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { formSubmissionsCollection, RegistrationForm, RegistrationFormField } from '../lib/forms';
import { acquireScrollLock } from '../lib/scrollLock';

interface DynamicFormModalProps {
  form: RegistrationForm | null;
  sourceSection?: string;
  sourceButton?: string;
  preview?: boolean;
  onClose: () => void;
}

const keyFor = (field: RegistrationFormField) => field.label.trim() || field.id;
const allowedUploadTypes = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'application/pdf', 'text/plain', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export default function DynamicFormModal({ form, sourceSection = '', sourceButton = '', preview = false, onClose }: DynamicFormModalProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    setValues({}); setFiles({}); setErrors({}); setSuccess(false); setSubmitError('');
  }, [form?.id]);

  useEffect(() => {
    if (!form) return;
    const releaseScrollLock = acquireScrollLock();
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => { releaseScrollLock(); window.removeEventListener('keydown', closeOnEscape); };
  }, [form, onClose]);

  if (!form) return null;

  const update = (field: RegistrationFormField, value: unknown) => {
    const key = keyFor(field);
    setValues(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [field.id]: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    form.fields.forEach(field => {
      const value = values[keyFor(field)];
      const file = files[field.id];
      const empty = field.type === 'file' ? !file : value === undefined || value === '' || value === false || (Array.isArray(value) && !value.length);
      if (field.required && empty) next[field.id] = `${field.label} is required.`;
      if (file && file.size > 10 * 1024 * 1024) next[field.id] = 'File size must be 10 MB or less.';
      else if (file && !allowedUploadTypes.has(file.type)) next[field.id] = 'This file type is not supported.';
      if (field.type === 'email' && typeof value === 'string' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) next[field.id] = 'Enter a valid email address.';
      if (field.type === 'phone' && typeof value === 'string' && value && !/^[+()\-\s0-9]{7,20}$/.test(value)) next[field.id] = 'Enter a valid phone number.';
      if (field.type === 'number' && value !== '' && value !== undefined) {
        const number = Number(value);
        if (!Number.isFinite(number)) next[field.id] = 'Enter a valid number.';
        else if (field.validation.min !== undefined && number < field.validation.min) next[field.id] = `Value must be at least ${field.validation.min}.`;
        else if (field.validation.max !== undefined && number > field.validation.max) next[field.id] = `Value must be no more than ${field.validation.max}.`;
      }
      if (typeof value === 'string' && field.validation.minLength && value.length < field.validation.minLength) next[field.id] = `Use at least ${field.validation.minLength} characters.`;
      if (typeof value === 'string' && field.validation.maxLength && value.length > field.validation.maxLength) next[field.id] = `Use no more than ${field.validation.maxLength} characters.`;
      if (typeof value === 'string' && field.validation.pattern) {
        try { if (!new RegExp(field.validation.pattern).test(value)) next[field.id] = 'Please use the requested format.'; } catch { /* Ignore invalid admin patterns. */ }
      }
    });
    setErrors(next);
    return !Object.keys(next).length;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true); setSubmitError('');
    const completedUploads: UploadResult[] = [];
    try {
      if (preview) {
        setSuccess(true);
        return;
      }
      const submittedData = { ...values };
      for (const field of form.fields.filter(item => item.type === 'file')) {
        const file = files[field.id];
        if (!file) continue;
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
        const uploadRef = ref(storage, `form-uploads/${form.id}/${crypto.randomUUID()}-${safeName.slice(-160)}`);
        completedUploads.push(await uploadBytes(uploadRef, file, { contentType: file.type }));
        // Store an internal reference instead of a permanent public download URL.
        // The authenticated admin UI resolves it only when an admin opens it.
        submittedData[keyFor(field)] = `storage://${uploadRef.fullPath}`;
      }
      await addDoc(collection(db, formSubmissionsCollection), {
        formId: form.id,
        formTitle: form.title,
        submittedData,
        sourcePage: window.location.pathname || '/',
        sourceSection,
        sourceButton,
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      if (form.redirectUrl) window.setTimeout(() => { window.location.href = form.redirectUrl; }, 1200);
    } catch (error) {
      await Promise.allSettled(completedUploads.map(upload => deleteObject(upload.ref)));
      setSubmitError(error instanceof Error ? error.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#050816]/70 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div className="mx-auto my-4 max-w-2xl overflow-hidden rounded-[26px] border-3 border-[#191A23] bg-white shadow-[8px_8px_0px_#191A23] sm:my-10">
        <header className="flex items-start justify-between gap-4 border-b-2 border-[#191A23] bg-[#B9FF66] p-5 sm:p-7"><div><p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#191A23]/60">{preview ? 'Preview · responses are not saved' : 'Registration form'}</p><h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{form.title}</h2>{form.description && <p className="mt-2 max-w-xl text-sm font-bold leading-relaxed text-[#191A23]/75">{form.description}</p>}</div><button type="button" onClick={onClose} className="grid h-10 w-10 flex-none place-items-center rounded-full border-2 border-[#191A23] bg-white shadow-[2px_2px_0px_#191A23]" aria-label="Close form"><X className="h-5 w-5" /></button></header>
        {success ? <div className="p-8 text-center sm:p-12"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" /><h3 className="mt-4 text-2xl font-black">{preview ? 'Preview validation passed' : 'Submitted successfully'}</h3><p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-relaxed text-slate-600">{preview ? 'This was only a preview. No response or file was saved.' : form.successMessage}</p>{!preview && form.redirectUrl && <p className="mt-4 text-xs font-semibold text-slate-400">Redirecting…</p>}<button type="button" onClick={onClose} className="neo-btn mt-6 px-6 py-3 text-sm">Close</button></div> : (
          <form onSubmit={submit} className="space-y-5 p-5 sm:p-7" noValidate>
            {form.fields.sort((a, b) => a.order - b.order).map(field => <PublicField key={field.id} field={field} value={values[keyFor(field)]} error={errors[field.id]} onChange={value => update(field, value)} onFile={file => { setFiles(current => ({ ...current, [field.id]: file })); setErrors(current => ({ ...current, [field.id]: '' })); }} />)}
            {submitError && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{submitError}</p>}
            <button type="submit" disabled={submitting} className="neo-btn flex w-full items-center justify-center gap-2 px-6 py-4 text-sm disabled:opacity-60">{submitting && <Loader2 className="h-4 w-4 animate-spin" />}{submitting ? 'Submitting…' : form.submitButtonText}</button>
          </form>
        )}
      </div>
    </div>
  );
}

function PublicField({ field, value, error, onChange, onFile }: { key?: string; field: RegistrationFormField; value: unknown; error?: string; onChange: (value: unknown) => void; onFile: (file?: File) => void }) {
  const id = `dynamic-${field.id}`;
  const shared = { id, required: field.required, className: `admin-input w-full border-2 ${error ? 'border-red-500' : 'border-slate-300'}`, placeholder: field.placeholder || '', minLength: field.validation.minLength, maxLength: field.validation.maxLength, pattern: field.validation.pattern };
  const label = <span className="mb-1.5 block text-sm font-black text-[#191A23]">{field.label}{field.required && <span className="ml-1 text-red-600">*</span>}</span>;
  let control;
  if (field.type === 'textarea') control = <textarea {...shared} className={`${shared.className} min-h-28`} value={String(value ?? '')} onChange={event => onChange(event.target.value)} />;
  else if (field.type === 'select') control = <select {...shared} value={String(value ?? '')} onChange={event => onChange(event.target.value)}><option value="">{field.placeholder || 'Select an option'}</option>{field.options.map(option => <option key={option} value={option}>{option}</option>)}</select>;
  else if (field.type === 'radio') control = <div className="grid gap-2 sm:grid-cols-2">{field.options.map(option => <label key={option} className="flex items-center gap-2 rounded-xl border-2 border-slate-200 p-3 text-sm font-semibold"><input type="radio" name={id} value={option} checked={value === option} onChange={() => onChange(option)} /> {option}</label>)}</div>;
  else if (field.type === 'checkbox' && field.options.length) {
    const selected = Array.isArray(value) ? value as string[] : [];
    control = <div className="grid gap-2 sm:grid-cols-2">{field.options.map(option => <label key={option} className="flex items-center gap-2 rounded-xl border-2 border-slate-200 p-3 text-sm font-semibold"><input type="checkbox" checked={selected.includes(option)} onChange={event => onChange(event.target.checked ? [...selected, option] : selected.filter(item => item !== option))} /> {option}</label>)}</div>;
  } else if (field.type === 'checkbox') control = <label className="flex items-center gap-2 rounded-xl border-2 border-slate-200 p-3 text-sm font-semibold"><input type="checkbox" checked={Boolean(value)} onChange={event => onChange(event.target.checked)} /> {field.placeholder || field.label}</label>;
  else if (field.type === 'file') control = <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 ${error ? 'border-red-500' : 'border-slate-300'}`}><Upload className="h-5 w-5" /><span className="min-w-0 text-sm font-semibold"><span className="block">Choose file</span><span className="block truncate text-xs font-medium text-slate-400">{field.validation.accept || 'Images and documents'}</span></span><input id={id} type="file" className="sr-only" required={field.required} accept={field.validation.accept} onChange={event => onFile(event.target.files?.[0])} /></label>;
  else control = <input {...shared} type={field.type === 'phone' ? 'tel' : field.type} value={String(value ?? '')} min={field.validation.min} max={field.validation.max} onChange={event => onChange(event.target.value)} />;
  return <label htmlFor={!['radio', 'checkbox', 'file'].includes(field.type) ? id : undefined} className="block">{label}{control}{error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}</label>;
}
