import { useEffect, useState } from 'react';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  defaultLandingContent,
  landingContentCollection,
  landingContentDocId,
  landingDraftDocId,
  LandingEditorContent,
  normalizeLandingContent,
} from '../lib/landingContent';
import LandingEditorPage, { type SaveState, type SelectedLandingBlock } from './landing-editor/LandingEditorPage';

interface AdminLandingEditorPageProps {
  user: FirebaseUser | null;
  isAdmin: boolean;
  onBackToAdmin: () => void;
  onBackToEvent: () => void;
  onLogin: () => void;
}

const formatDate = (value: unknown) => {
  if (!value) return '';
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return ((value as { toDate: () => Date }).toDate()).toLocaleString();
  }
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'string') return value;
  return '';
};

const writeError = (err: unknown, fallback: string) => {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: unknown }).code || '') : '';
  const message = err instanceof Error ? err.message : fallback;
  return code ? `${fallback} [${code}] ${message}` : message;
};

export default function AdminLandingEditorPage({ user, isAdmin, onBackToAdmin, onBackToEvent, onLogin }: AdminLandingEditorPageProps) {
  const [landingPublished, setLandingPublished] = useState<LandingEditorContent>(defaultLandingContent);
  const [landingDraft, setLandingDraft] = useState<LandingEditorContent>(defaultLandingContent);
  const [selectedBlockId, setSelectedBlockId] = useState<SelectedLandingBlock>('hero');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const adminName = user?.displayName || user?.email || 'Admin';

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    void Promise.all([
      getDoc(doc(db, landingContentCollection, landingContentDocId)),
      getDoc(doc(db, landingContentCollection, landingDraftDocId)),
    ]).then(([publishedSnapshot, draftSnapshot]) => {
      if (cancelled) return;
      const published = publishedSnapshot.exists() ? normalizeLandingContent(publishedSnapshot.data() as LandingEditorContent) : defaultLandingContent;
      const draft = draftSnapshot.exists() ? normalizeLandingContent(draftSnapshot.data() as LandingEditorContent) : published;
      setLandingPublished(published);
      setLandingDraft(draft);
      setSelectedBlockId(prev => prev === 'header' || prev === 'hero' || prev === 'footer' || draft.sections.some(section => section.id === prev) ? prev : 'hero');
    }).catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load landing page editor.'); });
    return () => { cancelled = true; };
  }, [isAdmin]);

  const setToastMessage = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  };

  const landingPayload = (statusLabel: string): LandingEditorContent => {
    const cleanDraft = JSON.parse(JSON.stringify(landingDraft)) as LandingEditorContent;
    const selectedSection = landingDraft.sections.find(section => section.id === selectedBlockId);
    return {
      ...cleanDraft,
      sections: cleanDraft.sections.map((section, index) => ({ ...section, order: index + 1 })),
      updatedAt: serverTimestamp(),
      updatedBy: adminName,
      updatedByEmail: user?.email || '',
      updatedSection: selectedSection?.title || statusLabel,
    };
  };

  const saveDraft = async () => {
    setSaveState('saving');
    setError('');
    try {
      await setDoc(doc(db, landingContentCollection, landingDraftDocId), landingPayload('Landing draft'), { merge: true });
      setSaveState('saved');
      setToastMessage('Landing page draft saved.');
    } catch (err) {
      setSaveState('error');
      setError(writeError(err, 'Save landing draft failed.'));
    }
  };

  const publish = async () => {
    setSaveState('publishing');
    setError('');
    try {
      const payload = landingPayload('Landing page');
      await setDoc(doc(db, landingContentCollection, landingContentDocId), payload, { merge: true });
      await setDoc(doc(db, landingContentCollection, landingDraftDocId), payload, { merge: true });
      setSaveState('published');
      setToastMessage('Landing page published.');
    } catch (err) {
      setSaveState('error');
      setError(writeError(err, 'Publish landing page failed.'));
    }
  };

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 md:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <button type="button" onClick={onBackToEvent} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" /> Back to event
          </button>
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-slate-950 p-3 text-white">
              <Lock className="h-6 w-6" />
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold text-slate-950">Landing Editor Locked</h1>
              <p className="text-sm font-medium text-slate-500">
                {user ? 'This account is logged in, but it is not marked as an admin.' : 'Please login with an admin account to continue.'}
              </p>
              {!user && <button type="button" onClick={onLogin} className="admin-primary-btn px-5 py-3 text-sm">Login as Admin</button>}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="landing-editor-fullscreen bg-slate-50 text-slate-950">
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg">
          {toast}
        </div>
      )}

      <header className="landing-editor-fullscreen-header">
        <div className="flex min-w-0 items-center gap-3.5">
          <button type="button" onClick={onBackToAdmin} className="landing-editor-fullscreen-back hover:bg-slate-50 transition" title="Back to admin">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1>Landing Editor</h1>
            <p>Full-screen public page customizer</p>
          </div>
        </div>
        <div className="flex-none">
          <span className="landing-editor-fullscreen-badge bg-[#B9FF66] border-2 border-[#191A23] shadow-[2px_2px_0px_#191A23] text-[#191A23] font-black">
            <ShieldCheck className="h-4 w-4" /> Admin workspace
          </span>
        </div>
      </header>

      <LandingEditorPage
        content={landingDraft}
        selectedBlockId={selectedBlockId}
        onSelectBlock={setSelectedBlockId}
        onChange={(nextContent) => {
          setLandingDraft(normalizeLandingContent(nextContent));
          setSaveState('idle');
        }}
        onSaveDraft={saveDraft}
        onPublish={publish}
        saveState={saveState}
        error={error}
        updatedLabel={formatDate(landingDraft.updatedAt) || 'Not saved yet'}
      />
    </main>
  );
}
