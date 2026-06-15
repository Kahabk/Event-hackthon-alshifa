import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  Layers3,
  Lightbulb,
  Link as LinkIcon,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Rocket,
  Save,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { AccountRegistration, IdeaSubmission, Registration } from '../types';
import FullScreenVideoLoader from './FullScreenVideoLoader';
import { LOADER_CYCLE_MS } from '../loaderConfig';
import { TRACKS } from '../data';

interface TeamDashboardProps {
  user: FirebaseUser | null;
  onBack: () => void;
  onLogin: () => void;
  onRegisterClick: () => void;
}

type IdeaField = keyof Pick<
  IdeaSubmission,
  | 'title'
  | 'problemStatement'
  | 'existingGaps'
  | 'proposedSolution'
  | 'innovation'
  | 'useCases'
  | 'architectureWorkflow'
  | 'technologyStack'
  | 'validation'
  | 'marketPotential'
  | 'businessModel'
  | 'demo'
  | 'futureScope'
  | 'impact'
  | 'conclusion'
>;

type LinkField = keyof Pick<IdeaSubmission, 'demoUrl' | 'pitchUrl' | 'pptUrl'>;
type IdeaErrors = Partial<Record<IdeaField | LinkField | 'track' | 'submit', string>>;

const normalizeTeamName = (teamName: string) => teamName.trim().replace(/\s+/g, ' ').toLowerCase();
const teamNameDocId = (teamName: string) => encodeURIComponent(normalizeTeamName(teamName));
const isUrl = (value: string) => {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

const SECTION_FIELDS: Array<{
  key: IdeaField;
  title: string;
  limit: number;
  rows: number;
  icon: ReactNode;
  placeholder: string;
}> = [
  {
    key: 'title',
    title: 'Title',
    limit: 120,
    rows: 2,
    icon: <Sparkles className="h-4 w-4" />,
    placeholder: 'A clear, memorable title for your innovation.',
  },
  {
    key: 'problemStatement',
    title: 'Problem Statement',
    limit: 900,
    rows: 5,
    icon: <ClipboardList className="h-4 w-4" />,
    placeholder: 'Describe the real problem, who experiences it, where it happens, and why it matters.',
  },
  {
    key: 'existingGaps',
    title: 'Existing Gaps',
    limit: 900,
    rows: 5,
    icon: <Layers3 className="h-4 w-4" />,
    placeholder: 'Explain what current solutions miss, where access fails, or what remains inefficient.',
  },
  {
    key: 'proposedSolution',
    title: 'Proposed Solution',
    limit: 1000,
    rows: 6,
    icon: <Lightbulb className="h-4 w-4" />,
    placeholder: 'Describe your solution in practical terms, including the user journey and core features.',
  },
  {
    key: 'innovation',
    title: 'Innovation',
    limit: 800,
    rows: 4,
    icon: <Rocket className="h-4 w-4" />,
    placeholder: 'Show what is new, different, simpler, more affordable, more inclusive, or more scalable.',
  },
  {
    key: 'useCases',
    title: 'Use Cases',
    limit: 900,
    rows: 5,
    icon: <Users className="h-4 w-4" />,
    placeholder: 'List the main users, situations, and scenarios where your solution creates value.',
  },
  {
    key: 'architectureWorkflow',
    title: 'Architecture/Workflow',
    limit: 1000,
    rows: 6,
    icon: <Layers3 className="h-4 w-4" />,
    placeholder: 'Explain the workflow, system architecture, process flow, or implementation stages.',
  },
  {
    key: 'technologyStack',
    title: 'Technology Stack',
    limit: 700,
    rows: 4,
    icon: <FileText className="h-4 w-4" />,
    placeholder: 'Mention tools, platforms, hardware, software, APIs, datasets, or materials you will use.',
  },
  {
    key: 'validation',
    title: 'Validation',
    limit: 900,
    rows: 5,
    icon: <CheckCircle2 className="h-4 w-4" />,
    placeholder: 'Share survey results, interviews, tests, assumptions checked, mentors consulted, or evidence collected.',
  },
  {
    key: 'marketPotential',
    title: 'Market Potential',
    limit: 900,
    rows: 5,
    icon: <Rocket className="h-4 w-4" />,
    placeholder: 'Describe target users, adoption potential, reach, demand, and why the timing is right.',
  },
  {
    key: 'businessModel',
    title: 'Business Model',
    limit: 900,
    rows: 5,
    icon: <FileText className="h-4 w-4" />,
    placeholder: 'Explain revenue, cost, partnerships, operations, distribution, or sustainability model.',
  },
  {
    key: 'demo',
    title: 'Demo',
    limit: 600,
    rows: 4,
    icon: <LinkIcon className="h-4 w-4" />,
    placeholder: 'Describe the demo, prototype, mockup, pilot, or what you can show today.',
  },
  {
    key: 'futureScope',
    title: 'Future Scope',
    limit: 700,
    rows: 4,
    icon: <Rocket className="h-4 w-4" />,
    placeholder: 'Explain how the idea can improve after the challenge and what the next milestones are.',
  },
  {
    key: 'impact',
    title: 'Impact',
    limit: 800,
    rows: 4,
    icon: <Sparkles className="h-4 w-4" />,
    placeholder: 'Connect your idea to SDG impact, people served, environmental/social benefit, and measurable outcomes.',
  },
  {
    key: 'conclusion',
    title: 'Conclusion',
    limit: 800,
    rows: 5,
    icon: <CheckCircle2 className="h-4 w-4" />,
    placeholder: 'End with a strong summary of why this problem matters and why your team can build the solution.',
  },
];

const LINK_FIELDS: Array<{
  key: LinkField;
  title: string;
  limit: number;
  placeholder: string;
  required?: boolean;
}> = [
  {
    key: 'demoUrl',
    title: 'Demo or Prototype Link',
    limit: 250,
    placeholder: 'https://...',
  },
  {
    key: 'pitchUrl',
    title: 'Pitch Video / Supporting Link',
    limit: 250,
    placeholder: 'Drive, YouTube, Loom, GitHub, or portfolio link',
  },
  {
    key: 'pptUrl',
    title: 'PPT / Pitch Deck Link',
    limit: 250,
    placeholder: 'Drive or PDF link with view access',
    required: true,
  },
];

const initialSubmission: IdeaSubmission = {
  teamName: '',
  track: '',
  title: '',
  problemStatement: '',
  existingGaps: '',
  proposedSolution: '',
  innovation: '',
  useCases: '',
  architectureWorkflow: '',
  technologyStack: '',
  validation: '',
  marketPotential: '',
  businessModel: '',
  demo: '',
  demoUrl: '',
  pitchUrl: '',
  pptUrl: '',
  futureScope: '',
  impact: '',
  conclusion: '',
  status: 'draft',
};

const DASHBOARD_CACHE_TTL = 10 * 60 * 1000;
const DASHBOARD_CACHE_VERSION = 'v3';

type DashboardCache = {
  version: string;
  expiresAt: number;
  registration: Registration | null;
  submission: IdeaSubmission;
};

const dashboardCacheKey = (uid: string) => `shifa-sdg-dashboard-${uid}`;
const normalizedDashboardTrack = (track?: string) => (track && track !== 'Not selected' ? track : '');

const readDashboardCache = (uid: string): DashboardCache | null => {
  try {
    const raw = window.sessionStorage.getItem(dashboardCacheKey(uid));
    if (!raw) return null;

    const cache = JSON.parse(raw) as DashboardCache;
    if (cache.version !== DASHBOARD_CACHE_VERSION || cache.expiresAt < Date.now()) {
      window.sessionStorage.removeItem(dashboardCacheKey(uid));
      return null;
    }

    return cache;
  } catch {
    return null;
  }
};

const writeDashboardCache = (uid: string, registration: Registration | null, submission: IdeaSubmission) => {
  try {
    window.sessionStorage.setItem(dashboardCacheKey(uid), JSON.stringify({
      version: DASHBOARD_CACHE_VERSION,
      expiresAt: Date.now() + DASHBOARD_CACHE_TTL,
      registration,
      submission,
    } satisfies DashboardCache));
  } catch {
    // Storage can be unavailable in private mode; Firebase remains the source of truth.
  }
};

export default function TeamDashboard({ user, onBack, onLogin, onRegisterClick }: TeamDashboardProps) {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [submission, setSubmission] = useState<IdeaSubmission>(initialSubmission);
  const [loading, setLoading] = useState(true);
  const [loaderCycleDone, setLoaderCycleDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [errors, setErrors] = useState<IdeaErrors>({});

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setNotice('');
      setErrors({});

      try {
        const cachedDashboard = readDashboardCache(user.uid);
        if (cachedDashboard) {
          setRegistration(cachedDashboard.registration);
          setSubmission(cachedDashboard.submission);
        }

        const accountRef = doc(db, 'accountRegistrations', user.uid);
        const accountSnapshot = await getDoc(accountRef);

        if (!accountSnapshot.exists()) {
          if (active) {
            setRegistration(null);
            setSubmission(initialSubmission);
          }
          return;
        }

        const accountData = accountSnapshot.data() as AccountRegistration;
        const teamDocId = teamNameDocId(accountData.teamName || '');
        const registrationSnapshot = await getDoc(doc(db, 'registrations', teamDocId));
        const dbRegistration = registrationSnapshot.exists()
          ? ({ ...registrationSnapshot.data(), teamNameKey: teamDocId } as Registration)
          : null;
        const summaryRegistration = accountData.registrationSummary
          ? ({ ...accountData.registrationSummary, teamNameKey: accountData.registrationSummary.teamNameKey || teamDocId } as Registration)
          : null;
        const nextRegistration = dbRegistration || summaryRegistration;

        if (!active) return;

        const baseSubmission = {
          ...initialSubmission,
          teamName: nextRegistration?.teamName || accountData.teamName || '',
          registrationId: nextRegistration?.registrationId || accountData.registrationId || '',
          leaderEmail: nextRegistration?.leaderEmail || user.email || '',
          track: normalizedDashboardTrack(nextRegistration?.track),
          teamNameKey: teamDocId,
        };

        setRegistration(nextRegistration);
        setSubmission(baseSubmission);
        writeDashboardCache(user.uid, nextRegistration, baseSubmission);

        try {
          const submissionSnapshot = await getDoc(doc(db, 'ideaSubmissions', user.uid));
          const savedSubmission = submissionSnapshot.exists() ? (submissionSnapshot.data() as IdeaSubmission) : null;

          if (active && savedSubmission) {
            const nextSubmission = {
              ...baseSubmission,
              ...savedSubmission,
              teamName: nextRegistration?.teamName || accountData.teamName || '',
              registrationId: nextRegistration?.registrationId || accountData.registrationId || savedSubmission.registrationId || '',
              leaderEmail: nextRegistration?.leaderEmail || user.email || savedSubmission.leaderEmail || '',
              track: normalizedDashboardTrack(savedSubmission.track || nextRegistration?.track),
              teamNameKey: teamDocId,
            };
            setSubmission(nextSubmission);
            writeDashboardCache(user.uid, nextRegistration, nextSubmission);
          }
        } catch {
          if (active) {
            setNotice('Dashboard opened. Publish the latest Firestore rules to load or save idea drafts.');
          }
        }
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : 'Could not load dashboard.';
          setErrors({ submit: message });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    setLoaderCycleDone(false);
    const timer = window.setTimeout(() => setLoaderCycleDone(true), LOADER_CYCLE_MS);
    return () => window.clearTimeout(timer);
  }, [user?.uid]);

  const completion = useMemo(() => {
    const filledSections = SECTION_FIELDS.filter(field => String(submission[field.key] || '').trim().length > 0).length;
    const hasTrack = Boolean(submission.track?.trim());
    const hasPpt = Boolean(submission.pptUrl.trim());
    const isSubmitted = submission.status === 'submitted';
    const completedItems = 1 + (hasTrack ? 1 : 0) + filledSections + (hasPpt ? 1 : 0) + (isSubmitted ? 1 : 0);
    const totalItems = 1 + 1 + SECTION_FIELDS.length + 1 + 1;
    return Math.round((completedItems / totalItems) * 100);
  }, [submission]);

  const filledSections = useMemo(
    () => SECTION_FIELDS.filter(field => String(submission[field.key] || '').trim().length > 0),
    [submission],
  );

  const remainingItems = useMemo(() => {
    const missingSections = SECTION_FIELDS.filter(field => !String(submission[field.key] || '').trim());
    const items: string[] = [];

    if (!submission.track?.trim()) {
      items.push('Select the idea domain.');
    }
    if (missingSections.length > 0) {
      items.push(`Complete ${missingSections.length} idea section${missingSections.length === 1 ? '' : 's'}.`);
    }
    if (!submission.pptUrl.trim()) {
      items.push('Add the PPT / pitch deck link.');
    }
    if (submission.status !== 'submitted') {
      items.push('Submit the final idea after review.');
    }

    return items.length ? items : ['Everything required is complete.'];
  }, [submission]);

  const updateTextField = (key: IdeaField, value: string) => {
    const limit = SECTION_FIELDS.find(field => field.key === key)?.limit || 1000;
    setSubmission(prev => ({ ...prev, [key]: value.slice(0, limit) }));
  };

  const updateLinkField = (key: LinkField, value: string) => {
    const limit = LINK_FIELDS.find(field => field.key === key)?.limit || 250;
    setSubmission(prev => ({ ...prev, [key]: value.slice(0, limit) }));
  };

  const validate = (mode: 'draft' | 'submitted') => {
    const nextErrors: IdeaErrors = {};

    if (mode === 'submitted') {
      if (!submission.track?.trim()) {
        nextErrors.track = 'Select an idea domain.';
      }

      SECTION_FIELDS.forEach(field => {
        if (!String(submission[field.key] || '').trim()) {
          nextErrors[field.key] = `${field.title} is required.`;
        }
      });

      LINK_FIELDS.forEach(field => {
        if (field.required && !String(submission[field.key] || '').trim()) {
          nextErrors[field.key] = `${field.title} is required.`;
        }
      });
    }

    SECTION_FIELDS.forEach(field => {
      if (String(submission[field.key] || '').length > field.limit) {
        nextErrors[field.key] = `${field.title} must stay within ${field.limit} characters.`;
      }
    });

    LINK_FIELDS.forEach(field => {
      const value = String(submission[field.key] || '');
      if (value.length > field.limit) {
        nextErrors[field.key] = `${field.title} must stay within ${field.limit} characters.`;
      } else if (!isUrl(value)) {
        nextErrors[field.key] = 'Use a valid http or https link.';
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveSubmission = async (mode: 'draft' | 'submitted') => {
    if (!user || !registration) return;
    if (!validate(mode)) return;

    setSaving(true);
    setNotice('');

    const now = serverTimestamp();
    const payload: IdeaSubmission = {
      ...submission,
      teamName: registration.teamName,
      teamNameKey: registration.teamNameKey || teamNameDocId(registration.teamName),
      registrationId: registration.registrationId || '',
      leaderEmail: registration.leaderEmail || user.email || '',
      track: submission.track || '',
      userId: user.uid,
      status: mode,
    };

    try {
      await setDoc(
        doc(db, 'ideaSubmissions', user.uid),
        {
          ...payload,
          updatedAt: now,
          ...(mode === 'submitted' ? { submittedAt: now } : {}),
          createdAt: submission.createdAt || now,
        },
        { merge: true },
      );
      setSubmission(payload);
      writeDashboardCache(user.uid, registration, payload);
      setNotice(mode === 'submitted' ? 'Idea submitted successfully.' : 'Draft saved.');
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Could not save idea submission.';
      const message = rawMessage.toLowerCase().includes('permission')
        ? 'Firebase rules are blocking this draft save. Publish the latest firestore.rules, then refresh and try Save Draft again.'
        : rawMessage;
      setErrors({ submit: message });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await saveSubmission('submitted');
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] px-4 pb-16 pt-28 md:px-8">
        <EmptyState
          icon={<Lock className="h-7 w-7" />}
          eyebrow="Team Dashboard"
          title="Login to open your team workspace"
          text="Your idea submission dashboard is connected to your registered team account."
          actionLabel="Open Login"
          onAction={onLogin}
          onBack={onBack}
        />
      </main>
    );
  }

  if (loading || !loaderCycleDone) {
    return <FullScreenVideoLoader label="Loading team dashboard" />;
  }

  if (!registration) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] px-4 pb-16 pt-28 md:px-8">
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          eyebrow="Team Dashboard"
          title="Register your team first"
          text="After registration, this dashboard will unlock your detailed idea submission form and final PPT link section."
          actionLabel="Register Now"
          onAction={onRegisterClick}
          onBack={onBack}
        />
      </main>
    );
  }

  if (registration.accessStatus === 'disabled') {
    return (
      <main className="min-h-screen bg-[#F7F8FA] px-4 pb-16 pt-28 md:px-8">
        <EmptyState
          icon={<Lock className="h-7 w-7" />}
          eyebrow="Team Dashboard"
          title="Dashboard access is disabled"
          text="An event admin has paused access for this team account. Contact the organizing team if this looks incorrect."
          actionLabel="Back to Event"
          onAction={onBack}
          onBack={onBack}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-4 pb-16 pt-28 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-black text-[#191A23] hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to event
            </button>
            <span className="inline-flex items-center gap-2 rounded-md border-2 border-[#191A23] bg-[#B9FF66] px-3 py-1.5 text-xs font-black uppercase shadow-[2px_2px_0px_#191A23]">
              <ClipboardList className="h-4 w-4" /> Team Dashboard
            </span>
            <h1 className="text-4xl font-black tracking-tight text-[#191A23] md:text-6xl">Idea Submission</h1>
            <p className="max-w-2xl text-sm font-bold leading-relaxed text-[#191A23]/75 md:text-base">
              Build your submission section by section, keep each answer focused, and submit the final version only after adding the PPT link.
            </p>
          </div>

          <aside className="rounded-2xl border-2 border-[#191A23] bg-white p-5 shadow-[5px_5px_0px_#B9FF66] lg:min-w-[320px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-[#191A23]/55">Registered Team</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">{registration.teamName}</h2>
                <p className="mt-1 text-xs font-bold text-[#191A23]/60">{registration.collegeName || 'Team details saved'}</p>
              </div>
              <span className="rounded-xl border-2 border-[#191A23] bg-[#B9FF66] px-3 py-2 font-mono text-sm font-black shadow-[2px_2px_0px_#191A23]">
                {completion}%
              </span>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full border-2 border-[#191A23] bg-[#F3F3F3]">
              <div className="h-full bg-[#B9FF66]" style={{ width: `${completion}%` }} />
            </div>
            <p className="mt-3 text-xs font-bold leading-relaxed text-[#191A23]/65">
              Drafts can be saved anytime. Final submission checks every required section and the PPT link.
            </p>
          </aside>
        </div>

        <section className="grid gap-5 lg:grid-cols-3">
          <DashboardCard
            icon={<Users className="h-5 w-5" />}
            label="Team Setup"
            title={registration.teamName}
            tone="green"
          >
            <div className="space-y-3 text-sm font-bold text-[#191A23]/75">
              <InfoLine icon={<Mail className="h-4 w-4" />} label={registration.leaderEmail || user.email || 'Leader email'} />
              <InfoLine icon={<Phone className="h-4 w-4" />} label={registration.phoneNumber || 'Phone not added'} />
              <InfoLine icon={<MapPin className="h-4 w-4" />} label={registration.location || 'District not added'} />
              <div className="rounded-xl border-2 border-[#191A23]/10 bg-[#F7F8FA] p-3">
                <p className="text-xs font-black uppercase text-[#191A23]/45">College</p>
                <p className="mt-1">{registration.collegeName || 'Not added'}</p>
                <p className="mt-1 text-xs text-[#191A23]/55">{registration.fieldOfStudy || 'Department not added'}</p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard
            icon={<ClipboardList className="h-5 w-5" />}
            label="Submission Progress"
            title={`${filledSections.length}/${SECTION_FIELDS.length} sections`}
          >
            <div className="space-y-3">
              <ProgressTick done label="Team registered" />
              <ProgressTick done={Boolean(submission.track?.trim())} label="Domain selected" />
              <ProgressTick done={filledSections.length === SECTION_FIELDS.length} label="Idea sections completed" />
              <ProgressTick done={Boolean(submission.pptUrl.trim())} label="PPT link added" />
              <ProgressTick done={submission.status === 'submitted'} label="Final idea submitted" />
              <ProgressTick done={false} label="Payment gateway coming soon" muted />
            </div>
          </DashboardCard>

          <DashboardCard
            icon={<CreditCard className="h-5 w-5" />}
            label="Registration Payment"
            title="Gateway not active"
          >
            <div className="space-y-3">
              <p className="text-sm font-bold leading-relaxed text-[#191A23]/70">
                Payment will open here when the gateway is connected. For now, teams can finish registration and idea submission without payment.
              </p>
              <button
                type="button"
                disabled
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-[#191A23] bg-[#F3F3F3] px-4 text-sm font-black uppercase text-[#191A23]/45"
              >
                <CreditCard className="h-4 w-4" /> Payment Coming Soon
              </button>
            </div>
          </DashboardCard>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.58fr_0.42fr]">
          <div className="rounded-2xl border-2 border-[#191A23] bg-white p-5 shadow-[5px_5px_0px_#191A23]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-black uppercase text-[#191A23]/50">Team Members</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">{registration.teamSize} participants</h2>
              </div>
              <span className="rounded-xl border-2 border-[#191A23] bg-[#B9FF66] px-3 py-2 font-mono text-sm font-black shadow-[2px_2px_0px_#191A23]">
                {registration.teamName}
              </span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <MemberPill name={registration.leaderName} email={registration.leaderEmail || user.email || ''} role="Leader" />
              {(registration.members || []).map((member, index) => (
                <MemberPill key={`${member.email}-${index}`} name={member.name} email={member.email || ''} role={`Member ${index + 2}`} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-[#191A23] bg-[#191A23] p-5 text-white shadow-[5px_5px_0px_#B9FF66]">
            <p className="font-mono text-xs font-black uppercase text-[#B9FF66]">Remaining Work</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">What to finish next</h2>
            <div className="mt-5 space-y-3">
              {remainingItems.map(item => (
                <div key={item} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm font-bold text-white/80">
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 flex-none ${item === 'Everything required is complete.' ? 'text-[#B9FF66]' : 'text-white/35'}`} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[0.78fr_0.22fr]">
          <section className="space-y-5">
            <section className="rounded-2xl border-2 border-[#191A23] bg-white p-5 shadow-[5px_5px_0px_#191A23] md:p-7">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#191A23] bg-[#B9FF66] shadow-[2px_2px_0px_#191A23]">
                  <Layers3 className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#191A23]/55">Idea Domain</p>
                  <h2 className="text-2xl font-black tracking-tight">Select Your Domain</h2>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {TRACKS.map(track => {
                  const selected = submission.track === track.title;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => setSubmission(prev => ({ ...prev, track: track.title }))}
                      className={`min-h-16 rounded-xl border-2 border-[#191A23] p-3 text-left text-sm font-black transition ${
                        selected ? 'bg-[#B9FF66] shadow-[3px_3px_0px_#191A23]' : 'bg-[#F3F3F3] hover:bg-white'
                      }`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span>{track.title}</span>
                        {selected && <CheckCircle2 className="h-4 w-4 flex-none" />}
                      </span>
                      <span className="mt-1 block text-xs font-bold leading-relaxed text-[#191A23]/60">{track.description}</span>
                    </button>
                  );
                })}
              </div>
              {errors.track && <p className="mt-3 text-xs font-bold text-red-600">{errors.track}</p>}
            </section>

            {SECTION_FIELDS.map((field, index) => (
              <IdeaSection
                key={field.key}
                id={field.key}
                number={index + 1}
                title={field.title}
                icon={field.icon}
                limit={field.limit}
                rows={field.rows}
                value={String(submission[field.key] || '')}
                error={errors[field.key]}
                placeholder={field.placeholder}
                onChange={(value) => updateTextField(field.key, value)}
              />
            ))}

            <section className="rounded-2xl border-2 border-[#191A23] bg-white p-5 shadow-[5px_5px_0px_#191A23] md:p-7">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#191A23] bg-[#B9FF66] shadow-[2px_2px_0px_#191A23]">
                  <LinkIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#191A23]/55">Final Attachments</p>
                  <h2 className="text-2xl font-black tracking-tight">Links, Pitch, and PPT</h2>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {LINK_FIELDS.map(field => (
                  <LinkField
                    key={field.key}
                    label={field.title}
                    required={field.required}
                    limit={field.limit}
                    value={String(submission[field.key] || '')}
                    error={errors[field.key]}
                    placeholder={field.placeholder}
                    onChange={(value) => updateLinkField(field.key, value)}
                  />
                ))}
              </div>
            </section>

            {errors.submit && <p className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">{errors.submit}</p>}
            {notice && <p className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">{notice}</p>}

            <div className="flex flex-col gap-3 rounded-2xl border-2 border-[#191A23] bg-[#191A23] p-4 shadow-[5px_5px_0px_#B9FF66] sm:flex-row sm:items-center sm:justify-between">
              <div className="text-white">
                <p className="text-sm font-black">Ready for review?</p>
                <p className="text-xs font-bold text-white/60">The final submission button is here after every required section.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveSubmission('draft')}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-white bg-white px-5 text-sm font-black uppercase text-[#191A23] shadow-[3px_3px_0px_#B9FF66] disabled:opacity-60"
                >
                  <Save className="h-4 w-4" /> Save Draft
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-[#B9FF66] bg-[#B9FF66] px-6 text-sm font-black uppercase text-[#191A23] shadow-[3px_3px_0px_white] disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Final Idea
                </button>
              </div>
            </div>
          </section>

          <aside className="hidden h-fit rounded-2xl border-2 border-[#191A23] bg-white p-5 shadow-[5px_5px_0px_#B9FF66] xl:sticky xl:top-28 xl:block">
            <p className="font-mono text-xs font-black uppercase text-[#191A23]/55">Submission Map</p>
            <div className="mt-4 space-y-2">
              {SECTION_FIELDS.map((field, index) => {
                const filled = String(submission[field.key] || '').trim().length > 0;
                return (
                  <a
                    key={field.key}
                    href={`#${field.key}`}
                    className={`flex items-center justify-between rounded-xl border-2 px-3 py-2 text-xs font-black transition ${
                      filled ? 'border-[#191A23] bg-[#B9FF66]' : 'border-[#191A23]/15 bg-[#F7F8FA] text-[#191A23]/60'
                    }`}
                  >
                    <span>{String(index + 1).padStart(2, '0')} {field.title}</span>
                    {filled && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </a>
                );
              })}
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}

function DashboardCard({
  icon,
  label,
  title,
  tone = 'white',
  children,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  tone?: 'white' | 'green';
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border-2 border-[#191A23] p-5 shadow-[5px_5px_0px_#191A23] ${tone === 'green' ? 'bg-[#B9FF66]' : 'bg-white'}`}>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border-2 border-[#191A23] bg-white shadow-[2px_2px_0px_#191A23]">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#191A23]/55">{label}</p>
          <h2 className="mt-1 break-words text-2xl font-black tracking-tight">{title}</h2>
        </div>
      </div>
      {children}
    </div>
  );
}

function InfoLine({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[#191A23]/45">{icon}</span>
      <span className="min-w-0 break-words">{label}</span>
    </div>
  );
}

function ProgressTick({ done, label, muted }: { done: boolean; label: string; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border-2 px-3 py-2 text-sm font-black ${
      done
        ? 'border-[#191A23] bg-[#B9FF66]'
        : muted
          ? 'border-[#191A23]/15 bg-[#F7F8FA] text-[#191A23]/45'
          : 'border-[#191A23]/20 bg-[#F7F8FA] text-[#191A23]/70'
    }`}>
      <span>{label}</span>
      <CheckCircle2 className={`h-4 w-4 ${done ? 'text-[#191A23]' : 'text-[#191A23]/25'}`} />
    </div>
  );
}

function MemberPill({ name, email, role }: { key?: string; name: string; email: string; role: string }) {
  return (
    <div className="rounded-xl border-2 border-[#191A23]/15 bg-[#F7F8FA] p-3">
      <p className="font-mono text-[10px] font-black uppercase text-[#191A23]/50">{role}</p>
      <p className="mt-1 break-words text-sm font-black">{name || 'Name not added'}</p>
      <p className="mt-1 break-words text-xs font-bold text-[#191A23]/55">{email || 'Email not added'}</p>
    </div>
  );
}

function IdeaSection({
  id,
  number,
  title,
  icon,
  limit,
  rows,
  value,
  error,
  placeholder,
  onChange,
}: {
  key?: string;
  id: string;
  number: number;
  title: string;
  icon: ReactNode;
  limit: number;
  rows: number;
  value: string;
  error?: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const remaining = limit - value.length;

  return (
    <section id={id} className="rounded-2xl border-2 border-[#191A23] bg-white p-5 shadow-[5px_5px_0px_#191A23] md:p-7">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#191A23] bg-[#B9FF66] shadow-[2px_2px_0px_#191A23]">
            {icon}
          </span>
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#191A23]/55">Section {String(number).padStart(2, '0')}</p>
            <h2 className="text-2xl font-black tracking-tight">{title}</h2>
          </div>
        </div>
        <span className={`rounded-full border-2 border-[#191A23] px-3 py-1 font-mono text-xs font-black ${remaining < 60 ? 'bg-red-50 text-red-600' : 'bg-[#F3F3F3]'}`}>
          {value.length}/{limit}
        </span>
      </div>

      <textarea
        id={`${id}-input`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={limit}
        rows={rows}
        className="w-full resize-y rounded-xl border-2 border-[#191A23] bg-[#F3F3F3] px-4 py-3 text-sm font-bold leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
        placeholder={placeholder}
      />
      {error && <p className="mt-2 text-xs font-bold text-red-600">{error}</p>}
    </section>
  );
}

function LinkField({
  label,
  required,
  limit,
  value,
  error,
  placeholder,
  onChange,
}: {
  key?: string;
  label: string;
  required?: boolean;
  limit: number;
  value: string;
  error?: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-black">
        {label} {required ? <span className="text-red-600">*</span> : <span className="font-semibold text-[#191A23]/45">(optional)</span>}
      </span>
      <div className="relative">
        <LinkIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#191A23]/45" />
        <input
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={limit}
          className="w-full rounded-xl border-2 border-[#191A23] bg-[#F3F3F3] py-3 pl-10 pr-4 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
          placeholder={placeholder}
        />
      </div>
      <span className="block text-right font-mono text-[10px] font-black text-[#191A23]/45">{value.length}/{limit}</span>
      {error && <span className="block text-xs font-bold text-red-600">{error}</span>}
    </label>
  );
}

function EmptyState({
  icon,
  eyebrow,
  title,
  text,
  actionLabel,
  onAction,
  onBack,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  text: string;
  actionLabel: string;
  onAction: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border-2 border-[#191A23] bg-white p-7 shadow-[6px_6px_0px_#B9FF66] md:p-9">
      <button type="button" onClick={onBack} className="mb-7 inline-flex items-center gap-2 text-sm font-black text-[#191A23] hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to event
      </button>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#191A23] bg-[#B9FF66] shadow-[3px_3px_0px_#191A23]">
          {icon}
        </div>
        <div className="space-y-4">
          <span className="inline-flex rounded-md border-2 border-[#191A23] bg-[#F3F3F3] px-3 py-1 font-mono text-xs font-black uppercase shadow-[2px_2px_0px_#191A23]">
            {eyebrow}
          </span>
          <div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">{title}</h1>
            <p className="mt-3 max-w-xl text-sm font-bold leading-relaxed text-[#191A23]/70">{text}</p>
          </div>
          <button type="button" onClick={onAction} className="neo-btn inline-flex items-center gap-2 px-5 py-3 text-sm uppercase">
            {actionLabel} <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
