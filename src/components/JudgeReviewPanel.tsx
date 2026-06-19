import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { ArrowLeft, ArrowUpDown, BarChart3, CheckCircle2, ClipboardCheck, ExternalLink, FileText, Gavel, Loader2, Lock, Save, Search, Star } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { db } from '../lib/firebase';
import { IdeaSubmission, TeamMember } from '../types';

type RoundName = 'Round 1' | 'Round 2' | 'Round 3';
type JudgeTab = 'overview' | 'assigned' | 'completed';
type ReviewFilter = 'all' | 'pending' | 'completed';
type ReviewSort = 'status' | 'team' | 'round' | 'newest';

interface JudgeReviewPanelProps {
  user: FirebaseUser | null;
  onBack: () => void;
  onLogin: () => void;
}

interface Judge {
  id: string;
  name: string;
  email: string;
  organization?: string;
  designation?: string;
  expertise?: string;
  active?: boolean;
}

interface JudgeAssignment {
  id: string;
  judgeId: string;
  teamId: string;
  teamUserId?: string;
  round: RoundName;
  status: 'pending' | 'completed';
  teamSnapshot?: {
    teamName: string;
    leaderName: string;
    leaderEmail: string;
    collegeName?: string;
    location?: string;
    track?: string;
    teamSize?: number;
    members?: TeamMember[];
  };
  submissionSnapshot?: Partial<IdeaSubmission>;
  createdAt?: unknown;
}

interface JudgeScore {
  id?: string;
  assignmentId: string;
  teamId: string;
  judgeId: string;
  round: RoundName;
  innovation: number;
  feasibility: number;
  sdgImpact: number;
  presentation: number;
  technicalStrength: number;
  marketPotential: number;
  problemRelevance: number;
  scalability: number;
  comments?: string;
}

type ScoreForm = Pick<JudgeScore, 'innovation' | 'feasibility' | 'sdgImpact' | 'presentation' | 'technicalStrength' | 'marketPotential' | 'comments'>;

const blankScore: ScoreForm = {
  innovation: 0,
  feasibility: 0,
  sdgImpact: 0,
  presentation: 0,
  technicalStrength: 0,
  marketPotential: 0,
  comments: '',
};

const CRITERIA: Array<{ key: keyof Omit<ScoreForm, 'comments'>; label: string }> = [
  { key: 'innovation', label: 'Innovation' },
  { key: 'feasibility', label: 'Feasibility' },
  { key: 'sdgImpact', label: 'Impact' },
  { key: 'presentation', label: 'Presentation' },
  { key: 'technicalStrength', label: 'Technical Quality' },
  { key: 'marketPotential', label: 'Business Potential' },
];

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const judgeDocId = (email: string) => normalizeEmail(email);
const roundDocId = (round: string) => round.replace(/\s+/g, '-').toLowerCase();
const isUrl = (value?: string) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

export default function JudgeReviewPanel({ user, onBack, onLogin }: JudgeReviewPanelProps) {
  const [judge, setJudge] = useState<Judge | null>(null);
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  const [scores, setScores] = useState<JudgeScore[]>([]);
  const [forms, setForms] = useState<Record<string, ScoreForm>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState<JudgeTab>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewFilter>('all');
  const [sortBy, setSortBy] = useState<ReviewSort>('status');

  useEffect(() => {
    let active = true;

    const loadJudgeWorkspace = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const nextJudgeId = judgeDocId(user.email);
        const judgeSnapshot = await getDoc(doc(db, 'judges', nextJudgeId));
        if (!judgeSnapshot.exists()) {
          if (active) {
            setJudge(null);
            setAssignments([]);
            setScores([]);
          }
          return;
        }

        const nextJudge = { id: judgeSnapshot.id, ...judgeSnapshot.data() } as Judge;
        if (nextJudge.active === false) {
          if (active) {
            setJudge(nextJudge);
            setAssignments([]);
            setScores([]);
            setError('This judge account is inactive. Contact the event admin.');
          }
          return;
        }

        const [assignmentSnapshot, scoreSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'judgeAssignments'), where('judgeId', '==', nextJudge.id))),
          getDocs(query(collection(db, 'scores'), where('judgeId', '==', nextJudge.id))),
        ]);

        const nextAssignments = assignmentSnapshot.docs.map(item => ({ id: item.id, ...item.data() } as JudgeAssignment));
        const nextScores = scoreSnapshot.docs.map(item => ({ id: item.id, ...item.data() } as JudgeScore));
        const nextForms = nextAssignments.reduce<Record<string, ScoreForm>>((acc, assignment) => {
          const savedScore = nextScores.find(score => score.assignmentId === assignment.id || (score.teamId === assignment.teamId && score.round === assignment.round));
          acc[assignment.id] = savedScore ? {
            innovation: Number(savedScore.innovation || 0),
            feasibility: Number(savedScore.feasibility || 0),
            sdgImpact: Number(savedScore.sdgImpact || 0),
            presentation: Number(savedScore.presentation || 0),
            technicalStrength: Number(savedScore.technicalStrength || 0),
            marketPotential: Number(savedScore.marketPotential || 0),
            comments: savedScore.comments || '',
          } : blankScore;
          return acc;
        }, {});

        if (active) {
          setJudge(nextJudge);
          setAssignments(nextAssignments);
          setScores(nextScores);
          setForms(nextForms);
        }
      } catch (err) {
        if (active) {
          const raw = err instanceof Error ? err.message : 'Could not load judge workspace.';
          setError(raw.toLowerCase().includes('permission')
            ? 'Firestore rules blocked this judge workspace. Publish the latest rules and confirm this email is saved as an active judge.'
            : raw);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadJudgeWorkspace();

    return () => {
      active = false;
    };
  }, [user]);

  const scoreByAssignmentId = useMemo(() => {
    return scores.reduce<Record<string, JudgeScore>>((acc, score) => {
      if (score.assignmentId) acc[score.assignmentId] = score;
      return acc;
    }, {});
  }, [scores]);

  const visibleAssignments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const statusRank: Record<JudgeAssignment['status'], number> = { pending: 0, completed: 1 };
    const roundRank: Record<RoundName, number> = { 'Round 1': 1, 'Round 2': 2, 'Round 3': 3 };

    return assignments
      .filter(assignment => {
        const completed = assignment.status === 'completed' || Boolean(scoreByAssignmentId[assignment.id]);
        const matchesStatus = statusFilter === 'all'
          || (statusFilter === 'completed' ? completed : !completed);
        const haystack = [
          assignment.teamSnapshot?.teamName,
          assignment.teamSnapshot?.leaderName,
          assignment.teamSnapshot?.collegeName,
          assignment.teamSnapshot?.location,
          assignment.submissionSnapshot?.title,
          assignment.submissionSnapshot?.track,
          assignment.round,
        ].filter(Boolean).join(' ').toLowerCase();
        const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'team') {
          return (a.teamSnapshot?.teamName || a.teamId).localeCompare(b.teamSnapshot?.teamName || b.teamId);
        }
        if (sortBy === 'round') {
          return (roundRank[a.round] || 0) - (roundRank[b.round] || 0);
        }
        if (sortBy === 'newest') {
          return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
        }
        return (statusRank[a.status] || 0) - (statusRank[b.status] || 0)
          || (a.teamSnapshot?.teamName || a.teamId).localeCompare(b.teamSnapshot?.teamName || b.teamId);
      });
  }, [assignments, scoreByAssignmentId, search, sortBy, statusFilter]);

  const displayedAssignments = useMemo(() => {
    if (activeTab !== 'completed') return visibleAssignments;
    return visibleAssignments.filter(assignment => assignment.status === 'completed' || Boolean(scoreByAssignmentId[assignment.id]));
  }, [activeTab, scoreByAssignmentId, visibleAssignments]);

  const completedAssignments = useMemo(() => {
    return assignments.filter(assignment => assignment.status === 'completed' || Boolean(scoreByAssignmentId[assignment.id]));
  }, [assignments, scoreByAssignmentId]);

  const pendingAssignments = useMemo(() => {
    return assignments.filter(assignment => assignment.status !== 'completed' && !scoreByAssignmentId[assignment.id]);
  }, [assignments, scoreByAssignmentId]);

  const domainCount = useMemo(() => {
    return assignments.reduce<Record<string, number>>((acc, assignment) => {
      const domain = assignment.submissionSnapshot?.track || assignment.teamSnapshot?.track || 'Not selected';
      acc[domain] = (acc[domain] || 0) + 1;
      return acc;
    }, {});
  }, [assignments]);

  const updateForm = (assignmentId: string, key: keyof ScoreForm, value: string | number) => {
    setForms(prev => ({
      ...prev,
      [assignmentId]: {
        ...(prev[assignmentId] || blankScore),
        [key]: key === 'comments' ? String(value) : Number(value),
      },
    }));
  };

  const submitScore = async (event: FormEvent, assignment: JudgeAssignment) => {
    event.preventDefault();
    if (!judge) return;

    const form = forms[assignment.id] || blankScore;
    setSavingId(assignment.id);
    setError('');

    try {
      const scoreId = `${judge.id}_${assignment.teamId}_${roundDocId(assignment.round)}`;
      const payload: JudgeScore = {
        assignmentId: assignment.id,
        teamId: assignment.teamId,
        judgeId: judge.id,
        round: assignment.round,
        innovation: Number(form.innovation),
        feasibility: Number(form.feasibility),
        sdgImpact: Number(form.sdgImpact),
        presentation: Number(form.presentation),
        technicalStrength: Number(form.technicalStrength),
        marketPotential: Number(form.marketPotential),
        problemRelevance: Number(form.sdgImpact),
        scalability: Number(form.marketPotential),
        comments: form.comments || '',
      };

      await setDoc(doc(db, 'scores', scoreId), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await updateDoc(doc(db, 'judgeAssignments', assignment.id), {
        status: 'completed',
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setScores(prev => [{ id: scoreId, ...payload }, ...prev.filter(score => score.id !== scoreId && score.assignmentId !== assignment.id)]);
      setAssignments(prev => prev.map(item => item.id === assignment.id ? { ...item, status: 'completed' } : item));
      setToast('Review submitted.');
      window.setTimeout(() => setToast(''), 2500);
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Could not submit review.';
      setError(raw.toLowerCase().includes('permission')
        ? 'Firestore rules blocked this score. Confirm this team is assigned to your judge account.'
        : raw);
    } finally {
      setSavingId('');
    }
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-28 text-slate-950 md:px-8">
        <EmptyJudgeState icon={<Lock className="h-7 w-7" />} title="Judge login required" text="Login using the email address assigned by the event admin." actionLabel="Login" onAction={onLogin} onBack={onBack} />
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-28 text-slate-950 md:px-8">
        <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading judge review panel...
        </div>
      </main>
    );
  }

  if (!judge) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-28 text-slate-950 md:px-8">
        <EmptyJudgeState icon={<Lock className="h-7 w-7" />} title="No judge access found" text="This email is not assigned as a judge. Ask the admin to add your exact login email in Judge Management." actionLabel="Back to Event" onAction={onBack} onBack={onBack} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-28 text-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              className="fixed right-4 top-24 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
              <Gavel className="h-4 w-4" /> Judge Review Panel
            </span>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Judge Workspace</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
              Review assigned ideas, inspect submissions, and submit scores as {judge.name || judge.email}. Only your assigned teams are visible here.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <JudgeStat label="Assigned" value={assignments.length} />
            <JudgeStat label="Completed" value={completedAssignments.length} />
            <JudgeStat label="Pending" value={pendingAssignments.length} />
          </div>
        </motion.header>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

        <motion.nav
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.24 }}
          className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
        >
          {([
            { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
            { id: 'assigned', label: 'Assigned Ideas', icon: <ClipboardCheck className="h-4 w-4" /> },
            { id: 'completed', label: 'Completed Reviews', icon: <CheckCircle2 className="h-4 w-4" /> },
          ] as Array<{ id: JudgeTab; label: string; icon: ReactNode }>).map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                if (item.id === 'completed') setStatusFilter('completed');
                if (item.id === 'assigned') setStatusFilter('all');
              }}
              className={`relative inline-flex min-h-10 flex-none items-center gap-2 overflow-hidden rounded-xl px-3 text-xs font-semibold transition ${
                activeTab === item.id ? 'text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              {activeTab === item.id && <motion.span layoutId="judge-tab-pill" className="absolute inset-0 rounded-xl bg-slate-950 shadow-sm" />}
              <span className="relative z-10 inline-flex items-center gap-2">{item.icon} {item.label}</span>
            </button>
          ))}
        </motion.nav>

        {activeTab === 'overview' && (
          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel title="Review Progress" icon={<BarChart3 className="h-5 w-5" />}>
              <div className="space-y-4">
                <ProgressRow label="Completed" value={completedAssignments.length} total={Math.max(assignments.length, 1)} />
                <ProgressRow label="Pending" value={pendingAssignments.length} total={Math.max(assignments.length, 1)} />
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-600">
                  Open Assigned Ideas to review team details, project idea, pitch links, and scoring fields.
                </div>
              </div>
            </Panel>
            <Panel title="Assigned Domains" icon={<FileText className="h-5 w-5" />}>
              <div className="space-y-3">
                {Object.entries(domainCount).map(([domain, count]) => (
                  <ProgressRow key={domain} label={domain} value={Number(count)} total={Math.max(assignments.length, 1)} />
                ))}
                {Object.keys(domainCount).length === 0 && <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-medium text-slate-500">No domains assigned yet.</p>}
              </div>
            </Panel>
          </section>
        )}

        {activeTab !== 'overview' && (
        <>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="admin-input pl-12"
                placeholder="Search assigned ideas, teams, college, domain"
              />
            </div>
            <select className="admin-input lg:w-44" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ReviewFilter)}>
              <option value="all">All reviews</option>
              <option value="pending">Pending only</option>
              <option value="completed">Completed only</option>
            </select>
            <label className="relative block lg:w-52">
              <ArrowUpDown className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select className="admin-input pl-12" value={sortBy} onChange={(event) => setSortBy(event.target.value as ReviewSort)}>
                <option value="status">Sort: Pending first</option>
                <option value="team">Sort: Team name</option>
                <option value="round">Sort: Round</option>
                <option value="newest">Sort: Newest</option>
              </select>
            </label>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-500">
            Showing {visibleAssignments.length} of {assignments.length} assigned review{assignments.length === 1 ? '' : 's'}.
          </p>
        </section>

        <section className="grid gap-5">
          {(activeTab === 'completed' ? visibleAssignments.filter(assignment => assignment.status === 'completed' || Boolean(scoreByAssignmentId[assignment.id])) : visibleAssignments).map(assignment => {
            const team = assignment.teamSnapshot;
            const submission = assignment.submissionSnapshot;
            const form = forms[assignment.id] || blankScore;
            const completed = assignment.status === 'completed' || Boolean(scoreByAssignmentId[assignment.id]);

            return (
              <article key={assignment.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold text-slate-950">{team?.teamName || assignment.teamId}</h2>
                      <StatusBadge label={completed ? 'Completed' : 'Pending'} tone={completed ? 'green' : 'neutral'} />
                    </div>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{assignment.round}</p>
                    <p className="mt-2 text-sm font-medium text-slate-600">{team?.collegeName || 'College not provided'} • {team?.location || 'Location not provided'}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600">
                    {team?.teamSize || 1} participant{(team?.teamSize || 1) === 1 ? '' : 's'}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.8fr]">
                  <div className="space-y-4">
                    <InfoBlock title="Team Details">
                      <p>Leader: {team?.leaderName || '-'} • {team?.leaderEmail || '-'}</p>
                      <p>Members: {team?.members?.map(member => `${member.name}${member.email ? ` (${member.email})` : ''}`).join(', ') || 'No members listed'}</p>
                    </InfoBlock>
                    <InfoBlock title="Project Idea">
                      <p className="font-semibold text-slate-950">{submission?.title || 'No title submitted'}</p>
                      <p>{submission?.problemStatement || 'Problem statement not available in this assignment snapshot.'}</p>
                      <p>{submission?.proposedSolution || 'Solution summary not available.'}</p>
                    </InfoBlock>
                    <InfoBlock title="Technical and Business Notes">
                      <p>Technology: {submission?.technologyStack || '-'}</p>
                      <p>Validation: {submission?.validation || '-'}</p>
                      <p>Business model: {submission?.businessModel || '-'}</p>
                      <p>Impact: {submission?.impact || '-'}</p>
                    </InfoBlock>
                    <div className="flex flex-wrap gap-2">
                      <LinkButton label="PPT / Deck" value={submission?.pptUrl} />
                      <LinkButton label="Demo" value={submission?.demoUrl} />
                      <LinkButton label="Pitch" value={submission?.pitchUrl} />
                    </div>
                  </div>

                  <form onSubmit={(event) => submitScore(event, assignment)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <Star className="h-5 w-5 text-slate-700" />
                      <h3 className="text-lg font-semibold text-slate-950">Marks and Feedback</h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {CRITERIA.map(criterion => (
                        <label key={criterion.key} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {criterion.label}
                          <input
                            type="number"
                            min="0"
                            max="10"
                            step="0.5"
                            value={form[criterion.key]}
                            onChange={(event) => updateForm(assignment.id, criterion.key, event.target.value)}
                            className="admin-input mt-1"
                            required
                          />
                        </label>
                      ))}
                    </div>
                    <textarea
                      value={form.comments || ''}
                      onChange={(event) => updateForm(assignment.id, 'comments', event.target.value)}
                      className="admin-input mt-3 min-h-24"
                      placeholder="Optional comments or feedback"
                    />
                    <button type="submit" disabled={savingId === assignment.id} className="admin-primary-btn mt-3 inline-flex w-full items-center justify-center gap-2 py-3 text-sm disabled:opacity-60">
                      {savingId === assignment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : completed ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                      {completed ? 'Update Review' : 'Submit Review'}
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
          {assignments.length === 0 && <EmptyJudgeState icon={<FileText className="h-7 w-7" />} title="No assigned teams yet" text="Assignments will appear here after the admin assigns teams to your judge account." actionLabel="Refresh Later" onAction={() => window.location.reload()} onBack={onBack} />}
          {assignments.length > 0 && visibleAssignments.length === 0 && <EmptyJudgeState icon={<Search className="h-7 w-7" />} title="No matching assigned ideas" text="Clear the search or change the review status filter to see more assigned teams." actionLabel="Clear Filters" onAction={() => { setSearch(''); setStatusFilter('all'); setSortBy('status'); }} onBack={onBack} />}
        </section>
        </>
        )}
      </div>
    </main>
  );
}

function JudgeStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-3xl font-semibold text-slate-950">{value}</p></div>;
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-slate-100 p-2 text-slate-700">{icon}</span><h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2></div>{children}</section>;
}

function ProgressRow({ label, value, total }: { key?: string; label: string; value: number; total: number }) {
  const width = total > 0 ? Math.max((value / total) * 100, value ? 8 : 0) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-xs font-semibold text-slate-600">
        <span className="truncate">{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-950" style={{ width: `${width}%` }} /></div>
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium leading-relaxed text-slate-600"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p><div className="space-y-2">{children}</div></div>;
}

function LinkButton({ label, value }: { label: string; value?: string }) {
  if (!isUrl(value)) return null;
  return <a href={value} target="_blank" rel="noreferrer" className="mini-btn bg-white text-slate-700"><ExternalLink className="h-3 w-3" /> {label}</a>;
}

function StatusBadge({ label, tone }: { label: string; tone: 'green' | 'neutral' }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${tone === 'green' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}>{label}</span>;
}

function EmptyJudgeState({ icon, title, text, actionLabel, onAction, onBack }: { icon: ReactNode; title: string; text: string; actionLabel: string; onAction: () => void; onBack: () => void }) {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" /> Back to event
      </button>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="rounded-xl bg-slate-950 p-3 text-white">{icon}</div>
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-slate-500">{text}</p>
          <button type="button" onClick={onAction} className="admin-primary-btn mt-5 px-5 py-3 text-sm">{actionLabel}</button>
        </div>
      </div>
    </div>
  );
}
