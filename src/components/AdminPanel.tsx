import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  arrayUnion,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  limit,
  orderBy,
  query,
  QuerySnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  ClipboardCheck,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  Gavel,
  Lock,
  Mail,
  Medal,
  Megaphone,
  Monitor,
  PlusCircle,
  Printer,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Trophy,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { db, functions } from '../lib/firebase';
import { AttendanceList, AttendanceMark, IdeaSubmission, StoredRegistration, TeamMember, Volunteer } from '../types';
import {
  defaultLandingContent,
  landingDraftDocId,
  LandingEditorContent,
  landingContentCollection,
  landingContentDocId,
  normalizeLandingContent,
} from '../lib/landingContent';
import LandingEditorPage, { type SaveState, type SelectedLandingBlock } from './landing-editor/LandingEditorPage';
import {
  defaultFormSettings,
  formSettingsCollection,
  formSettingsDocId,
  normalizeFormSettings,
} from '../lib/formSettings';
import type { DashboardDomainSetting, EventFormSettings, IdeaSectionSetting, LinkFieldSetting } from '../lib/formSettings';
import { FormBuilderTab, FormSubmissionsTab } from './AdminFormsManager';
import AppleStyleAvatar from './AppleStyleAvatar';

type AdminTab = 'overview' | 'landing' | 'form-builder' | 'form-submissions' | 'forms' | 'teams' | 'attendance' | 'judges' | 'assignments' | 'reviews' | 'leaderboard' | 'rounds' | 'announcements' | 'finalists' | 'users' | 'audit';
type ReviewStatus = 'pending' | 'under-review' | 'approved' | 'rejected' | 'needs-revision';
type RoundName = 'Round 1' | 'Round 2' | 'Round 3';
const ROUND_NAMES: RoundName[] = ['Round 1', 'Round 2', 'Round 3'];
const roundForTeam = (team: StoredRegistration): RoundName => (
  ROUND_NAMES.includes(team.currentRound as RoundName) ? team.currentRound as RoundName : 'Round 1'
);
const nextRoundForTeam = (team: StoredRegistration): RoundName | null => {
  const index = ROUND_NAMES.indexOf(roundForTeam(team));
  return index >= 0 && index < ROUND_NAMES.length - 1 ? ROUND_NAMES[index + 1] : null;
};

interface AdminPanelProps {
  user: FirebaseUser | null;
  isAdmin: boolean;
  onBack: () => void;
  onLogin: () => void;
  onOpenLandingEditor: () => void;
}

interface Judge {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  designation: string;
  expertise: string;
  domains: string[];
  active: boolean;
  assignedTeamIds?: string[];
  createdAt?: unknown;
}

interface Assignment {
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

interface Score {
  id: string;
  assignmentId?: string;
  teamId: string;
  judgeId: string;
  round: RoundName;
  innovation: number;
  problemRelevance: number;
  feasibility: number;
  technicalStrength: number;
  sdgImpact: number;
  scalability: number;
  marketPotential: number;
  presentation: number;
  comments?: string;
  createdAt?: unknown;
}

type ScoreForm = Omit<Score, 'id' | 'createdAt'>;

interface Announcement {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high';
  target: 'all-users' | 'all-teams' | 'specific-teams' | 'judges' | 'finalists';
  targetTeamIds?: string[];
  publishDate: string;
  createdAt?: unknown;
}

interface AuditLog {
  id: string;
  action: string;
  adminName: string;
  createdAt?: unknown;
}

interface Finalist {
  id: string;
  teamId: string;
  approved: boolean;
  presentationTime?: string;
  createdAt?: unknown;
}

interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  providerIds?: string[];
  createdAt?: unknown;
  lastLoginAt?: unknown;
  lastSeenAt?: unknown;
  updatedAt?: unknown;
}

interface AdminCache {
  expiresAt: number;
  registrations: StoredRegistration[];
  submissions: IdeaSubmission[];
  judges: Judge[];
  assignments: Assignment[];
  scores: Score[];
  announcements: Announcement[];
  auditLogs: AuditLog[];
  finalists: Finalist[];
  userProfiles: UserProfile[];
  volunteers?: Volunteer[];
  attendanceLists?: AttendanceList[];
  attendanceMarks?: AttendanceMark[];
  loadedCollections?: AdminDataKey[];
}

type AdminDataKey = 'registrations' | 'submissions' | 'judges' | 'assignments' | 'scores' | 'announcements' | 'auditLogs' | 'finalists' | 'userProfiles' | 'volunteers' | 'attendanceLists' | 'attendanceMarks';

const ADMIN_CACHE_KEY = 'shifa-sdg-admin-cache-v1';
const ADMIN_CACHE_TTL = 30 * 60 * 1000;
const PAGE_SIZE = 100;

const blankJudge: Omit<Judge, 'id'> = {
  name: '',
  email: '',
  phone: '',
  organization: '',
  designation: '',
  expertise: '',
  domains: [],
  active: true,
  assignedTeamIds: [],
};

const blankAnnouncement: Omit<Announcement, 'id'> = {
  title: '',
  description: '',
  priority: 'normal',
  target: 'all-users',
  targetTeamIds: [],
  publishDate: new Date().toISOString().slice(0, 10),
};

const blankVolunteer: Omit<Volunteer, 'id'> = {
  name: '',
  email: '',
  active: true,
  allowedListIds: [],
};

const blankAttendanceList: Omit<AttendanceList, 'id'> = {
  title: '',
  description: '',
  active: true,
  type: 'workshop',
  color: 'mint',
};

const ATTENDANCE_SECTION_TYPES: Array<{ value: NonNullable<AttendanceList['type']>; label: string }> = [
  { value: 'workshop', label: 'Workshop' },
  { value: 'entry', label: 'Entry Check-in' },
  { value: 'food', label: 'Food' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'gmc', label: 'GMC' },
  { value: 'custom', label: 'Custom' },
];

const blankScoreForm: ScoreForm = {
  teamId: '',
  judgeId: '',
  round: 'Round 1',
  innovation: 0,
  problemRelevance: 0,
  feasibility: 0,
  technicalStrength: 0,
  sdgImpact: 0,
  scalability: 0,
  marketPotential: 0,
  presentation: 0,
  comments: '',
};

const CRITERIA: Array<{ key: keyof Omit<Score, 'id' | 'teamId' | 'judgeId' | 'round' | 'comments' | 'createdAt'>; label: string }> = [
  { key: 'innovation', label: 'Innovation' },
  { key: 'problemRelevance', label: 'Problem Relevance' },
  { key: 'feasibility', label: 'Feasibility' },
  { key: 'technicalStrength', label: 'Technical Strength' },
  { key: 'sdgImpact', label: 'SDG Impact' },
  { key: 'scalability', label: 'Scalability' },
  { key: 'marketPotential', label: 'Market Potential' },
  { key: 'presentation', label: 'Presentation' },
];

const formatDate = (value: unknown) => {
  if (value instanceof Timestamp) return value.toDate().toLocaleString();
  if (typeof value === 'string') return value;
  return '';
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const emailDocId = (email: string) => encodeURIComponent(normalizeEmail(email));
const judgeDocId = (email: string) => normalizeEmail(email);
const roundDocId = (round: string) => round.replace(/\s+/g, '-').toLowerCase();

const isLikelyUrl = (value: string) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

const adminWriteError = (err: unknown, fallback: string) => {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: unknown }).code || '') : '';
  const rawDetails = typeof err === 'object' && err && 'details' in err ? (err as { details?: unknown }).details : '';
  const customData = typeof err === 'object' && err && 'customData' in err ? (err as { customData?: { serverResponse?: unknown } }).customData : undefined;
  const details = (() => {
    if (typeof rawDetails === 'string') return rawDetails;
    if (rawDetails && typeof rawDetails === 'object') {
      const detail = rawDetails as { code?: unknown; message?: unknown };
      return [detail.code, detail.message].filter(Boolean).join(' ');
    }
    if (customData?.serverResponse) return String(customData.serverResponse);
    return '';
  })();
  const message = err instanceof Error ? err.message : fallback;
  if (message.toLowerCase().includes('permission')) {
    return `${fallback} Firebase rules rejected the write. Publish the latest firestore.rules and confirm this account is an active admin.`;
  }
  if (code || details) {
    return `${fallback} ${code ? `[${code}] ` : ''}${message}${details ? ` ${details}` : ''}`;
  }
  return message;
};

const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const downloadCsv = (filename: string, rows: unknown[][]) => {
  const blob = new Blob([rows.map(row => row.map(escapeCsv).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const completionForSubmission = (submission?: IdeaSubmission) => {
  if (!submission) return 0;

  const fields: Array<keyof IdeaSubmission> = [
    'track',
    'title',
    'problemStatement',
    'existingGaps',
    'proposedSolution',
    'innovation',
    'useCases',
    'architectureWorkflow',
    'technologyStack',
    'validation',
    'marketPotential',
    'businessModel',
    'demo',
    'futureScope',
    'impact',
    'conclusion',
    'pptUrl',
  ];
  const completed = fields.filter(field => String(submission[field] || '').trim()).length;
  return Math.round((completed / fields.length) * 100);
};

const readCache = (): AdminCache | null => {
  try {
    const raw = sessionStorage.getItem(ADMIN_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as AdminCache;
    if (cache.expiresAt < Date.now()) {
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      return null;
    }
    return cache;
  } catch {
    return null;
  }
};

const writeCache = (cache: Omit<AdminCache, 'expiresAt'>) => {
  try {
    sessionStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify({ ...cache, expiresAt: Date.now() + ADMIN_CACHE_TTL }));
  } catch {
    // Cache is optional.
  }
};

const registrationEmails = (registration: StoredRegistration) => Array.from(new Set([
  registration.leaderEmail,
  registration.accountEmail || '',
  ...(registration.members || []).map(member => member.email || ''),
].map(normalizeEmail).filter(Boolean)));

const safeAdminRead = async <T,>(
  label: string,
  request: Promise<QuerySnapshot>,
  mapItem: (snapshot: QuerySnapshot['docs'][number]) => T,
) => {
  try {
    const snapshot = await request;
    return { label, data: snapshot.docs.map(mapItem), error: '' };
  } catch (err) {
    return {
      label,
      data: [] as T[],
      error: err instanceof Error ? err.message : 'Missing or insufficient permissions.',
    };
  }
};

const deleteAuthUserAccount = httpsCallable<
  { uid: string },
  { deletedUid: string; deletedEmail?: string; ownedTeamIds?: string[]; updatedMemberTeamIds?: string[] }
>(functions, 'deleteAuthUser');

export default function AdminPanel({ user, isAdmin, onBack, onLogin, onOpenLandingEditor }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [registrations, setRegistrations] = useState<StoredRegistration[]>([]);
  const [submissions, setSubmissions] = useState<IdeaSubmission[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [finalists, setFinalists] = useState<Finalist[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [attendanceLists, setAttendanceLists] = useState<AttendanceList[]>([]);
  const [attendanceMarks, setAttendanceMarks] = useState<AttendanceMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [submissionFilter, setSubmissionFilter] = useState('');
  const [reviewFilter, setReviewFilter] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [judgeForm, setJudgeForm] = useState(blankJudge);
  const [announcementForm, setAnnouncementForm] = useState(blankAnnouncement);
  const [volunteerForm, setVolunteerForm] = useState(blankVolunteer);
  const [attendanceListForm, setAttendanceListForm] = useState(blankAttendanceList);
  const [assignmentJudgeId, setAssignmentJudgeId] = useState('');
  const [assignmentRound, setAssignmentRound] = useState<RoundName>('Round 1');
  const [selectedAssignmentTeams, setSelectedAssignmentTeams] = useState<string[]>([]);
  const [scoreForm, setScoreForm] = useState<ScoreForm>(blankScoreForm);
  const [landingDraft, setLandingDraft] = useState<LandingEditorContent>(defaultLandingContent);
  const [landingPublished, setLandingPublished] = useState<LandingEditorContent>(defaultLandingContent);
  const [selectedLandingSectionId, setSelectedLandingSectionId] = useState<SelectedLandingBlock>('hero');
  const [landingSaveState, setLandingSaveState] = useState<SaveState>('idle');
  const [landingEditorError, setLandingEditorError] = useState('');
  const [formDraft, setFormDraft] = useState<EventFormSettings>(defaultFormSettings);
  const loadedCollectionsRef = useRef<Set<AdminDataKey>>(new Set());
  const cacheHydratedRef = useRef(false);

  const adminName = user?.displayName || user?.email || 'Admin';

  const hydrateCache = () => {
    if (cacheHydratedRef.current) return;
    cacheHydratedRef.current = true;
    const cached = readCache();
    if (!cached) return;
    setRegistrations(cached.registrations || []);
    setSubmissions(cached.submissions || []);
    setJudges(cached.judges || []);
    setAssignments(cached.assignments || []);
    setScores(cached.scores || []);
    setAnnouncements(cached.announcements || []);
    setAuditLogs(cached.auditLogs || []);
    setFinalists(cached.finalists || []);
    setUserProfiles(cached.userProfiles || []);
    setVolunteers(cached.volunteers || []);
    setAttendanceLists(cached.attendanceLists || []);
    setAttendanceMarks(cached.attendanceMarks || []);
    loadedCollectionsRef.current = new Set(cached.loadedCollections || [
      'registrations', 'submissions', 'judges', 'assignments', 'scores', 'announcements',
      'auditLogs', 'finalists', 'userProfiles', 'volunteers', 'attendanceLists', 'attendanceMarks',
    ]);
  };

  const loadCollections = async (requested: AdminDataKey[], force = false) => {
    const keys = requested.filter(key => force || !loadedCollectionsRef.current.has(key));
    if (!keys.length) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const read = async (key: AdminDataKey) => {
      if (key === 'registrations') return { key, ...(await safeAdminRead('registrations', getDocs(query(collection(db, 'registrations'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE))), item => ({ id: item.id, ...item.data() } as StoredRegistration))) };
      if (key === 'submissions') return { key, ...(await safeAdminRead('ideaSubmissions', getDocs(query(collection(db, 'ideaSubmissions'), orderBy('updatedAt', 'desc'), limit(PAGE_SIZE))), item => ({ id: item.id, ...item.data() } as IdeaSubmission))) };
      if (key === 'judges') return { key, ...(await safeAdminRead('judges', getDocs(query(collection(db, 'judges'), limit(PAGE_SIZE))), item => ({ id: item.id, ...item.data() } as Judge))) };
      if (key === 'assignments') return { key, ...(await safeAdminRead('judgeAssignments', getDocs(query(collection(db, 'judgeAssignments'), limit(PAGE_SIZE))), item => ({ id: item.id, ...item.data() } as Assignment))) };
      if (key === 'scores') return { key, ...(await safeAdminRead('scores', getDocs(query(collection(db, 'scores'), limit(PAGE_SIZE))), item => ({ id: item.id, ...item.data() } as Score))) };
      if (key === 'announcements') return { key, ...(await safeAdminRead('announcements', getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE))), item => ({ id: item.id, ...item.data() } as Announcement))) };
      if (key === 'auditLogs') return { key, ...(await safeAdminRead('auditLogs', getDocs(query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(20))), item => ({ id: item.id, ...item.data() } as AuditLog))) };
      if (key === 'finalists') return { key, ...(await safeAdminRead('finalists', getDocs(query(collection(db, 'finalists'), limit(PAGE_SIZE))), item => ({ id: item.id, ...item.data() } as Finalist))) };
      if (key === 'userProfiles') return { key, ...(await safeAdminRead('userProfiles', getDocs(query(collection(db, 'userProfiles'), orderBy('updatedAt', 'desc'), limit(PAGE_SIZE))), item => ({ id: item.id, ...item.data() } as UserProfile))) };
      if (key === 'volunteers') return { key, ...(await safeAdminRead('volunteers', getDocs(query(collection(db, 'volunteers'), limit(PAGE_SIZE))), item => ({ id: item.id, ...item.data() } as Volunteer))) };
      if (key === 'attendanceLists') return { key, ...(await safeAdminRead('attendanceLists', getDocs(query(collection(db, 'attendanceLists'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE))), item => ({ id: item.id, ...item.data() } as AttendanceList))) };
      return { key, ...(await safeAdminRead('attendanceMarks', getDocs(query(collection(db, 'attendanceMarks'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE))), item => ({ id: item.id, ...item.data() } as AttendanceMark))) };
    };
    try {
      const results = await Promise.all(keys.map(read));
      const cacheData: Omit<AdminCache, 'expiresAt'> = { registrations, submissions, judges, assignments, scores, announcements, auditLogs, finalists, userProfiles, volunteers, attendanceLists, attendanceMarks, loadedCollections: [] };
      results.forEach(result => {
        if (result.error) return;
        loadedCollectionsRef.current.add(result.key);
        if (result.key === 'registrations') { setRegistrations(result.data as StoredRegistration[]); cacheData.registrations = result.data as StoredRegistration[]; }
        else if (result.key === 'submissions') { setSubmissions(result.data as IdeaSubmission[]); cacheData.submissions = result.data as IdeaSubmission[]; }
        else if (result.key === 'judges') { setJudges(result.data as Judge[]); cacheData.judges = result.data as Judge[]; }
        else if (result.key === 'assignments') { setAssignments(result.data as Assignment[]); cacheData.assignments = result.data as Assignment[]; }
        else if (result.key === 'scores') { setScores(result.data as Score[]); cacheData.scores = result.data as Score[]; }
        else if (result.key === 'announcements') { setAnnouncements(result.data as Announcement[]); cacheData.announcements = result.data as Announcement[]; }
        else if (result.key === 'auditLogs') { setAuditLogs(result.data as AuditLog[]); cacheData.auditLogs = result.data as AuditLog[]; }
        else if (result.key === 'finalists') { setFinalists(result.data as Finalist[]); cacheData.finalists = result.data as Finalist[]; }
        else if (result.key === 'userProfiles') { setUserProfiles(result.data as UserProfile[]); cacheData.userProfiles = result.data as UserProfile[]; }
        else if (result.key === 'volunteers') { setVolunteers(result.data as Volunteer[]); cacheData.volunteers = result.data as Volunteer[]; }
        else if (result.key === 'attendanceLists') { setAttendanceLists(result.data as AttendanceList[]); cacheData.attendanceLists = result.data as AttendanceList[]; }
        else { setAttendanceMarks(result.data as AttendanceMark[]); cacheData.attendanceMarks = result.data as AttendanceMark[]; }
      });
      cacheData.loadedCollections = Array.from(loadedCollectionsRef.current);
      writeCache(cacheData);
      const blocked = results.filter(result => result.error).map(result => result.label);
      if (blocked.length) setError(`Firebase rules are blocking: ${blocked.join(', ')}.`);
    } finally {
      setLoading(false);
    }
  };

  const collectionsForTab = (tab: AdminTab): AdminDataKey[] => {
    const core: AdminDataKey[] = ['registrations', 'submissions', 'judges', 'auditLogs', 'finalists'];
    if (tab === 'overview') return core;
    if (tab === 'attendance') return ['registrations', 'volunteers', 'attendanceLists', 'attendanceMarks'];
    if (tab === 'announcements') return ['registrations', 'announcements', 'finalists'];
    if (tab === 'users') return ['registrations', 'userProfiles'];
    if (tab === 'audit') return ['auditLogs'];
    if (['teams', 'assignments', 'reviews', 'leaderboard', 'finalists'].includes(tab)) return ['registrations', 'submissions', 'judges', 'assignments', 'scores', 'finalists'];
    if (tab === 'rounds') return ['registrations'];
    if (tab === 'judges') return ['judges'];
    return [];
  };

  const refreshData = async (force = false) => {
    if (!isAdmin) { setLoading(false); return; }
    hydrateCache();
    await loadCollections(collectionsForTab(activeTab), force);
  };

  useEffect(() => {
    void refreshData();
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'landing') return;
    void getDoc(doc(db, landingContentCollection, landingContentDocId)).then(snapshot => {
      setLandingPublished(snapshot.exists() ? normalizeLandingContent(snapshot.data() as LandingEditorContent) : defaultLandingContent);
    }).catch(err => setError(err instanceof Error ? err.message : 'Could not load landing page editor.'));
  }, [isAdmin, activeTab]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'landing') return;
    void getDoc(doc(db, landingContentCollection, landingDraftDocId)).then(snapshot => {
      const nextContent = snapshot.exists() ? normalizeLandingContent(snapshot.data() as LandingEditorContent) : landingPublished;
      setLandingDraft(nextContent);
      setSelectedLandingSectionId(prev => prev === 'header' || prev === 'hero' || prev === 'footer' || nextContent.sections.some(section => section.id === prev) ? prev : 'hero');
    }).catch(err => setLandingEditorError(err instanceof Error ? err.message : 'Could not load landing page draft.'));
  }, [isAdmin, activeTab, landingPublished]);

  useEffect(() => {
    if (!isAdmin || activeTab !== 'forms') return;
    void getDoc(doc(db, formSettingsCollection, formSettingsDocId)).then(snapshot => {
      setFormDraft(snapshot.exists() ? normalizeFormSettings(snapshot.data()) : defaultFormSettings);
    }).catch(err => setError(err instanceof Error ? err.message : 'Could not load form settings.'));
  }, [isAdmin, activeTab]);

  const logAction = async (action: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await setDoc(doc(db, 'auditLogs', id), {
      action,
      adminName,
      createdAt: serverTimestamp(),
    });
    setAuditLogs(prev => [{ id, action, adminName, createdAt: new Date().toISOString() }, ...prev].slice(0, 80));
  };

  const landingPayload = (statusLabel: string): LandingEditorContent => {
    const cleanDraft = JSON.parse(JSON.stringify(landingDraft)) as LandingEditorContent;
    const selectedSection = landingDraft.sections.find(section => section.id === selectedLandingSectionId);
    return {
      ...cleanDraft,
      sections: cleanDraft.sections.map((section, index) => ({ ...section, order: index + 1 })),
      updatedAt: serverTimestamp(),
      updatedBy: adminName,
      updatedByEmail: user?.email || '',
      updatedSection: selectedSection?.title || statusLabel,
    };
  };

  const saveLandingDraft = async () => {
    setLandingSaveState('saving');
    setLandingEditorError('');
    const ok = await runAdminWrite('Save landing draft', async () => {
      await setDoc(doc(db, landingContentCollection, landingDraftDocId), landingPayload('Landing draft'), { merge: true });
      await logAction('Saved landing page draft');
      setLandingSaveState('saved');
      setToastMessage('Landing page draft saved.');
    });
    if (!ok) {
      setLandingSaveState('error');
      setLandingEditorError('Draft could not be saved. Check admin permissions and Firestore rules.');
    }
  };

  const publishLandingContent = async () => {
    setLandingSaveState('publishing');
    setLandingEditorError('');
    const ok = await runAdminWrite('Publish landing page', async () => {
      const payload = landingPayload('Landing page');
      await setDoc(doc(db, landingContentCollection, landingContentDocId), payload, { merge: true });
      await setDoc(doc(db, landingContentCollection, landingDraftDocId), payload, { merge: true });
      await logAction(`Published landing page content: ${payload.updatedSection || 'Landing page'}`);
      setLandingSaveState('published');
      setToastMessage('Landing page published.');
    });
    if (!ok) {
      setLandingSaveState('error');
      setLandingEditorError('Landing page could not be published. Check admin permissions and Firestore rules.');
    }
  };

  const saveFormSettings = async () => {
    await runAdminWrite('Publish form settings', async () => {
      const payload = normalizeFormSettings({
        ...formDraft,
        updatedAt: serverTimestamp(),
        updatedBy: adminName,
        updatedByEmail: user?.email || '',
      });
      await setDoc(doc(db, formSettingsCollection, formSettingsDocId), payload, { merge: true });
      await logAction('Published registration and submission form settings');
      setToastMessage('Form settings published.');
    });
  };

  const saveVolunteer = async (event: FormEvent) => {
    event.preventDefault();
    const email = normalizeEmail(volunteerForm.email);
    if (!email) return;

    await runAdminWrite('Save volunteer', async () => {
      const id = email;
      const payload: Omit<Volunteer, 'id'> = {
        name: volunteerForm.name.trim() || email.split('@')[0],
        email,
        active: volunteerForm.active,
        allowedListIds: volunteerForm.allowedListIds,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'volunteers', id), payload, { merge: true });
      setVolunteers(prev => {
        const next = { id, ...payload } as Volunteer;
        return prev.some(item => item.id === id)
          ? prev.map(item => item.id === id ? next : item)
          : [next, ...prev];
      });
      setVolunteerForm(blankVolunteer);
      await logAction(`Saved volunteer ${email}`);
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage('Volunteer saved.');
    });
  };

  const saveAttendanceList = async (event: FormEvent) => {
    event.preventDefault();
    const title = attendanceListForm.title.trim();
    if (!title) return;
    const id = title.trim().replace(/\s+/g, '-').toLowerCase();

    if (attendanceLists.some(list => list.id === id)) {
      setToastMessage('Section label already taken. Use a different section name.');
      return;
    }

    await runAdminWrite('Save attendance list', async () => {
      const payload: Omit<AttendanceList, 'id'> = {
        title,
        description: attendanceListForm.description?.trim() || '',
        active: attendanceListForm.active,
        type: attendanceListForm.type || 'custom',
        color: attendanceListForm.color || 'mint',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'attendanceLists', id), payload, { merge: true });
      setAttendanceLists(prev => {
        const next = { id, ...payload } as AttendanceList;
        return prev.some(item => item.id === id)
          ? prev.map(item => item.id === id ? next : item)
          : [next, ...prev];
      });
      setAttendanceListForm(blankAttendanceList);
      await logAction(`Created attendance list ${title}`);
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage('Attendance list saved.');
    });
  };

  const toggleVolunteerList = async (volunteer: Volunteer, listId: string) => {
    const allowedListIds = volunteer.allowedListIds.includes(listId)
      ? volunteer.allowedListIds.filter(id => id !== listId)
      : [...volunteer.allowedListIds, listId];

    await runAdminWrite('Assign volunteer checkpoint', async () => {
      await updateDoc(doc(db, 'volunteers', volunteer.id), { allowedListIds, updatedAt: serverTimestamp() });
      setVolunteers(prev => prev.map(item => item.id === volunteer.id ? { ...item, allowedListIds } : item));
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage('Volunteer assignment updated.');
    });
  };

  const toggleVolunteerActive = async (volunteer: Volunteer) => {
    await runAdminWrite('Update volunteer', async () => {
      await updateDoc(doc(db, 'volunteers', volunteer.id), { active: !volunteer.active, updatedAt: serverTimestamp() });
      setVolunteers(prev => prev.map(item => item.id === volunteer.id ? { ...item, active: !item.active } : item));
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage(`Volunteer ${volunteer.active ? 'disabled' : 'enabled'}.`);
    });
  };

  const toggleAttendanceListActive = async (list: AttendanceList) => {
    await runAdminWrite('Update attendance list', async () => {
      await updateDoc(doc(db, 'attendanceLists', list.id), { active: !list.active, updatedAt: serverTimestamp() });
      setAttendanceLists(prev => prev.map(item => item.id === list.id ? { ...item, active: !item.active } : item));
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage(`Attendance list ${list.active ? 'closed' : 'opened'}.`);
    });
  };

  const deleteVolunteer = async (volunteer: Volunteer) => {
    if (!window.confirm(`Delete volunteer "${volunteer.name || volunteer.email}"? Their existing attendance marks will remain for audit history.`)) return;

    await runAdminWrite('Delete volunteer', async () => {
      await deleteDoc(doc(db, 'volunteers', volunteer.id));
      setVolunteers(prev => prev.filter(item => item.id !== volunteer.id));
      await logAction(`Deleted volunteer ${volunteer.email}`);
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage('Volunteer deleted.');
    });
  };

  const deleteAttendanceList = async (list: AttendanceList) => {
    const listMarks = attendanceMarks.filter(mark => mark.listId === list.id);
    if (!window.confirm(`Delete section "${list.title}" and ${listMarks.length} attendance mark${listMarks.length === 1 ? '' : 's'}?`)) return;

    await runAdminWrite('Delete attendance list', async () => {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'attendanceLists', list.id));
      listMarks.forEach(mark => batch.delete(doc(db, 'attendanceMarks', mark.id)));
      volunteers
        .filter(volunteer => volunteer.allowedListIds.includes(list.id))
        .forEach(volunteer => {
          batch.update(doc(db, 'volunteers', volunteer.id), {
            allowedListIds: volunteer.allowedListIds.filter(id => id !== list.id),
            updatedAt: serverTimestamp(),
          });
        });
      await batch.commit();
      setAttendanceLists(prev => prev.filter(item => item.id !== list.id));
      setAttendanceMarks(prev => prev.filter(mark => mark.listId !== list.id));
      setVolunteers(prev => prev.map(volunteer => ({
        ...volunteer,
        allowedListIds: volunteer.allowedListIds.filter(id => id !== list.id),
      })));
      await logAction(`Deleted attendance section ${list.title}`);
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage('Attendance section deleted.');
    });
  };

  const submissionByTeamId = useMemo(() => {
    return submissions.reduce<Record<string, IdeaSubmission>>((acc, submission) => {
      if (submission.userId) acc[submission.userId] = submission;
      if (submission.id) acc[submission.id] = submission;
      if (submission.registrationId) acc[submission.registrationId] = submission;
      if (submission.teamNameKey) acc[submission.teamNameKey] = submission;
      return acc;
    }, {});
  }, [submissions]);

  const submissionForTeam = (team: StoredRegistration) => (
    submissionByTeamId[team.userId]
    || submissionByTeamId[team.id]
    || submissionByTeamId[team.registrationId || '']
    || submissionByTeamId[team.teamNameKey || '']
  );

  const assignmentByTeamId = useMemo(() => {
    return assignments.reduce<Record<string, Assignment[]>>((acc, assignment) => {
      acc[assignment.teamId] = [...(acc[assignment.teamId] || []), assignment];
      return acc;
    }, {});
  }, [assignments]);

  const scoresByTeamId = useMemo(() => {
    return scores.reduce<Record<string, Score[]>>((acc, score) => {
      acc[score.teamId] = [...(acc[score.teamId] || []), score];
      return acc;
    }, {});
  }, [scores]);

  const averageScore = (teamId: string) => {
    const teamScores = scoresByTeamId[teamId] || [];
    if (!teamScores.length) return 0;
    const scoreTotals = teamScores.map(score => CRITERIA.reduce((sum, criterion) => sum + Number(score[criterion.key] || 0), 0) / CRITERIA.length);
    return Number((scoreTotals.reduce((sum, value) => sum + value, 0) / scoreTotals.length).toFixed(1));
  };

  const reviewStatusForTeam = (registration: StoredRegistration): ReviewStatus => {
    const savedStatus = (registration as StoredRegistration & { reviewStatus?: ReviewStatus }).reviewStatus;
    if (savedStatus) return savedStatus;
    const submission = submissionForTeam(registration);
    if (!submission) return 'pending';
    return (submission.status === 'submitted' ? 'under-review' : 'pending') as ReviewStatus;
  };

  const stats = useMemo(() => {
    const totalParticipants = registrations.reduce((sum, registration) => sum + (registration.teamSize || 1), 0);
    const submitted = submissions.filter(submission => submission.status === 'submitted').length;
    const approvedTeams = registrations.filter(registration => (registration as StoredRegistration & { reviewStatus?: string }).reviewStatus === 'approved').length;
    const rejectedTeams = registrations.filter(registration => (registration as StoredRegistration & { reviewStatus?: string }).reviewStatus === 'rejected').length;
    const completionAverage = submissions.length
      ? Math.round(submissions.reduce((sum, submission) => sum + completionForSubmission(submission), 0) / submissions.length)
      : 0;

    return {
      totalUsers: userProfiles.length || new Set(registrations.flatMap(registration => registrationEmails(registration))).size,
      totalTeams: registrations.length,
      totalParticipants,
      totalSubmissions: submitted,
      pendingReviews: Math.max(submitted - scores.length, 0),
      approvedTeams,
      rejectedTeams,
      totalJudges: judges.length,
      finalists: finalists.length,
      completionAverage,
    };
  }, [finalists.length, judges.length, registrations, scores.length, submissions, userProfiles.length]);

  const districts = useMemo(() => Array.from(new Set(registrations.map(registration => registration.location).filter(Boolean))).sort(), [registrations]);
  const colleges = useMemo(() => Array.from(new Set(registrations.map(registration => registration.collegeName).filter(Boolean))).sort(), [registrations]);
  const domainCount = useMemo(() => {
    return submissions.reduce<Record<string, number>>((acc, submission) => {
      const domain = submission.track || 'Not selected';
      acc[domain] = (acc[domain] || 0) + 1;
      return acc;
    }, {});
  }, [submissions]);
  const districtCount = useMemo(() => registrations.reduce<Record<string, number>>((acc, registration) => {
    const district = registration.location || 'Not set';
    acc[district] = (acc[district] || 0) + 1;
    return acc;
  }, {}), [registrations]);
  const collegeCount = useMemo(() => registrations.reduce<Record<string, number>>((acc, registration) => {
    const college = registration.collegeName || 'Not set';
    acc[college] = (acc[college] || 0) + 1;
    return acc;
  }, {}), [registrations]);

  const filteredTeams = useMemo(() => {
    return registrations.filter(registration => {
      const submission = submissionForTeam(registration);
      const haystack = `${registration.teamName} ${registration.leaderName} ${registration.leaderEmail} ${registration.location} ${registration.collegeName}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search.toLowerCase());
      const matchesDistrict = !districtFilter || registration.location === districtFilter;
      const matchesCollege = !collegeFilter || registration.collegeName === collegeFilter;
      const matchesSubmission = !submissionFilter || (submissionFilter === 'submitted' ? submission?.status === 'submitted' : !submission || submission.status !== 'submitted');
      const status = reviewStatusForTeam(registration);
      const matchesReview = !reviewFilter || status === reviewFilter;
      return matchesSearch && matchesDistrict && matchesCollege && matchesSubmission && matchesReview;
    });
  }, [collegeFilter, districtFilter, registrations, reviewFilter, search, submissionByTeamId, submissionFilter]);

  const leaderboard = useMemo(() => {
    return registrations
      .map(registration => ({
        registration,
        submission: submissionForTeam(registration),
        average: averageScore(registration.id),
        judgeCount: new Set((scoresByTeamId[registration.id] || []).map(score => score.judgeId)).size,
      }))
      .sort((a, b) => b.average - a.average);
  }, [registrations, scoresByTeamId, submissionByTeamId]);

  const submittedAssignmentTeams = useMemo(
    () => registrations.filter(registration => submissionForTeam(registration)?.status === 'submitted'),
    [registrations, submissionByTeamId],
  );
  const assignmentEligibleTeams = useMemo(
    () => submittedAssignmentTeams.filter(team => (
      reviewStatusForTeam(team) !== 'rejected'
      && roundForTeam(team) === assignmentRound
    )),
    [assignmentRound, submittedAssignmentTeams],
  );

  const selectedTeam = registrations.find(registration => registration.id === selectedTeamId) || filteredTeams[0];
  const selectedSubmission = selectedTeam ? submissionForTeam(selectedTeam) : undefined;
  const selectedScores = selectedTeam ? scoresByTeamId[selectedTeam.id] || [] : [];
  const selectedAssignments = selectedTeam ? assignmentByTeamId[selectedTeam.id] || [] : [];

  useEffect(() => {
    const eligibleIds = new Set(assignmentEligibleTeams.map(team => team.id));
    setSelectedAssignmentTeams(prev => prev.filter(teamId => eligibleIds.has(teamId)));
  }, [assignmentEligibleTeams]);

  useEffect(() => {
    if (!assignmentJudgeId) return;
    const alreadyAssignedIds = new Set(assignments
      .filter(assignment => assignment.judgeId === assignmentJudgeId && assignment.round === assignmentRound)
      .map(assignment => assignment.teamId));
    setSelectedAssignmentTeams(prev => prev.filter(teamId => !alreadyAssignedIds.has(teamId)));
  }, [assignmentJudgeId, assignmentRound, assignments]);

  const setToastMessage = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  };

  const runAdminWrite = async (label: string, action: () => Promise<void>) => {
    setError('');
    try {
      await action();
      return true;
    } catch (err) {
      setError(adminWriteError(err, `${label} failed.`));
      return false;
    }
  };

  const handleCsvDownload = () => {
    downloadCsv(`shifa-sdg-admin-teams-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Registration ID', 'Team Name', 'Leader', 'Email', 'Phone', 'District', 'College', 'Members', 'Submission', 'Review', 'Score'],
      ...filteredTeams.map(registration => [
        registration.registrationId || registration.id,
        registration.teamName,
        registration.leaderName,
        registration.leaderEmail,
        registration.phoneNumber || '',
        registration.location || '',
        registration.collegeName || '',
        registration.members?.map(member => `${member.name} <${member.email || ''}>`).join('; ') || '',
        (submissionByTeamId[registration.userId] || submissionByTeamId[registration.id])?.status || 'draft',
        reviewStatusForTeam(registration),
        averageScore(registration.id),
      ]),
    ]);
  };

  const handlePrint = () => window.print();

  const handleDeleteTeam = async (registration: StoredRegistration) => {
    const confirmed = window.confirm(`Delete team "${registration.teamName}" and free all reserved emails?`);
    if (!confirmed) return;

    await runAdminWrite('Delete team', async () => {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'registrations', registration.id));
      batch.delete(doc(db, 'teamNames', registration.id));
      batch.delete(doc(db, 'accountRegistrations', registration.userId));
      registrationEmails(registration).forEach(email => batch.delete(doc(db, 'participantEmails', emailDocId(email))));
      await batch.commit();
      await logAction(`Deleted team ${registration.teamName}`);
      setRegistrations(prev => prev.filter(item => item.id !== registration.id));
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage('Team deleted.');
    });
  };

  const handleDeleteMember = async (registration: StoredRegistration, member: TeamMember, index: number) => {
    const confirmed = window.confirm(`Remove ${member.name} from team "${registration.teamName}"?`);
    if (!confirmed) return;

    await runAdminWrite('Remove member', async () => {
      const nextMembers = (registration.members || []).filter((_, memberIndex) => memberIndex !== index);
      await updateDoc(doc(db, 'registrations', registration.id), {
        members: nextMembers,
        teamSize: nextMembers.length + 1,
        updatedAt: serverTimestamp(),
      });
      if (member.email) await deleteDoc(doc(db, 'participantEmails', emailDocId(member.email)));
      await logAction(`Removed ${member.name} from ${registration.teamName}`);
      setRegistrations(prev => prev.map(item => item.id === registration.id ? { ...item, members: nextMembers, teamSize: nextMembers.length + 1 } : item));
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage('Member removed.');
    });
  };

  const updateTeamStatus = async (registration: StoredRegistration, status: ReviewStatus) => {
    if (reviewStatusForTeam(registration) === 'rejected' && status !== 'rejected') {
      setToastMessage(`${registration.teamName} is already rejected. Rejection is final for this event.`);
      return;
    }
    if (status === 'approved') {
      const currentRound = roundForTeam(registration);
      const currentAssignments = assignments.filter(assignment => assignment.teamId === registration.id && assignment.round === currentRound);
      if (!currentAssignments.length) {
        setToastMessage(`Assign at least one judge to ${registration.teamName} in ${currentRound} before approval.`);
        return;
      }
      const pendingCount = currentAssignments.filter(assignment => assignment.status !== 'completed').length;
      if (pendingCount) {
        setToastMessage(`Complete ${pendingCount} pending judge review${pendingCount === 1 ? '' : 's'} before approving ${registration.teamName}.`);
        return;
      }
    }
    await runAdminWrite('Update review status', async () => {
      const pendingAssignments = status === 'rejected'
        ? assignments.filter(assignment => assignment.teamId === registration.id && assignment.status === 'pending')
        : [];
      const batch = writeBatch(db);
      batch.update(doc(db, 'registrations', registration.id), {
        reviewStatus: status,
        updatedAt: serverTimestamp(),
      });
      pendingAssignments.forEach(assignment => batch.delete(doc(db, 'judgeAssignments', assignment.id)));
      await batch.commit();
      await logAction(`Marked ${registration.teamName} as ${status}`);
      setRegistrations(prev => prev.map(item => item.id === registration.id ? { ...item, reviewStatus: status } : item));
      if (status === 'rejected') {
        setAssignments(prev => prev.filter(assignment => !pendingAssignments.some(pending => pending.id === assignment.id)));
        setSelectedAssignmentTeams(prev => prev.filter(teamId => teamId !== registration.id));
      }
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage(status === 'rejected' && pendingAssignments.length
        ? `Team rejected and ${pendingAssignments.length} pending assignment${pendingAssignments.length === 1 ? '' : 's'} removed.`
        : `Team ${status}.`);
    });
  };

  const saveScore = async (event: FormEvent) => {
    event.preventDefault();
    if (!scoreForm.teamId || !scoreForm.judgeId) {
      setToastMessage('Select a team and judge before saving a score.');
      return;
    }
    const scoringTeam = registrations.find(team => team.id === scoreForm.teamId);
    if (!scoringTeam || reviewStatusForTeam(scoringTeam) === 'rejected' || roundForTeam(scoringTeam) !== scoreForm.round) {
      setToastMessage('This team is rejected or is not active in the selected round.');
      return;
    }

    await runAdminWrite('Save score', async () => {
      const id = `${scoreForm.judgeId}_${scoreForm.teamId}_${roundDocId(scoreForm.round)}`;
      const matchingAssignment = assignments.find(assignment => (
        assignment.teamId === scoreForm.teamId
        && assignment.judgeId === scoreForm.judgeId
        && assignment.round === scoreForm.round
      ));
      const payload = {
        ...scoreForm,
        ...(matchingAssignment ? { assignmentId: matchingAssignment.id } : {}),
        innovation: Number(scoreForm.innovation),
        problemRelevance: Number(scoreForm.problemRelevance),
        feasibility: Number(scoreForm.feasibility),
        technicalStrength: Number(scoreForm.technicalStrength),
        sdgImpact: Number(scoreForm.sdgImpact),
        scalability: Number(scoreForm.scalability),
        marketPotential: Number(scoreForm.marketPotential),
        presentation: Number(scoreForm.presentation),
        createdAt: serverTimestamp(),
      };
      const batch = writeBatch(db);
      batch.set(doc(db, 'scores', id), payload, { merge: true });
      if (matchingAssignment) {
        batch.update(doc(db, 'judgeAssignments', matchingAssignment.id), {
          status: 'completed',
          reviewedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      const nextScore: Score = { id, ...scoreForm, ...(matchingAssignment ? { assignmentId: matchingAssignment.id } : {}) };
      await logAction(`Saved score for ${registrations.find(team => team.id === scoreForm.teamId)?.teamName || scoreForm.teamId}`);
      setScores(prev => [nextScore, ...prev.filter(score => score.id !== id)]);
      if (matchingAssignment) {
        setAssignments(prev => prev.map(assignment => assignment.id === matchingAssignment.id ? { ...assignment, status: 'completed' } : assignment));
      }
      setScoreForm(blankScoreForm);
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage('Score saved.');
    });
  };

  const saveJudge = async (event: FormEvent) => {
    event.preventDefault();
    if (!judgeForm.name.trim() || !judgeForm.email.trim()) {
      setToastMessage('Judge name and email are required.');
      return;
    }

    await runAdminWrite('Save judge', async () => {
      const id = judgeDocId(judgeForm.email);
      const payload = { ...judgeForm, email: normalizeEmail(judgeForm.email), createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      await setDoc(doc(db, 'judges', id), payload, { merge: true });
      await logAction(`Saved judge ${judgeForm.name || judgeForm.email}`);
      setJudges(prev => [{ id, ...judgeForm, email: normalizeEmail(judgeForm.email) }, ...prev.filter(judge => judge.id !== id)]);
      setJudgeForm(blankJudge);
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage('Judge saved.');
    });
  };

  const removeJudge = async (judge: Judge) => {
    if (!window.confirm(`Remove judge ${judge.name}?`)) return;
    await runAdminWrite('Remove judge', async () => {
      await deleteDoc(doc(db, 'judges', judge.id));
      await logAction(`Removed judge ${judge.name}`);
      setJudges(prev => prev.filter(item => item.id !== judge.id));
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage('Judge removed.');
    });
  };

  const bulkAssign = async () => {
    if (!assignmentJudgeId) {
      setToastMessage('Select a judge before assigning teams.');
      return;
    }
    if (selectedAssignmentTeams.length === 0) {
      setToastMessage('Select at least one team to assign.');
      return;
    }
    const submittedTeamIds = new Set(assignmentEligibleTeams.map(team => team.id));
    const blockedTeamNames = selectedAssignmentTeams
      .filter(teamId => !submittedTeamIds.has(teamId))
      .map(teamId => registrations.find(team => team.id === teamId)?.teamName || teamId);
    if (blockedTeamNames.length) {
      setToastMessage(`These teams are rejected or not active in ${assignmentRound}: ${blockedTeamNames.join(', ')}`);
      return;
    }

    const duplicateTeamNames = selectedAssignmentTeams
      .filter(teamId => assignments.some(assignment => assignment.judgeId === assignmentJudgeId && assignment.teamId === teamId && assignment.round === assignmentRound))
      .map(teamId => registrations.find(team => team.id === teamId)?.teamName || teamId);
    if (duplicateTeamNames.length) {
      setToastMessage(`Already assigned to this judge in ${assignmentRound}: ${duplicateTeamNames.join(', ')}`);
      return;
    }

    await runAdminWrite('Assign teams', async () => {
      const batch = writeBatch(db);
      const newAssignments: Assignment[] = selectedAssignmentTeams.map(teamId => {
        const team = registrations.find(item => item.id === teamId);
        const submission = team ? submissionForTeam(team) : undefined;
        const id = `${assignmentJudgeId}_${teamId}_${roundDocId(assignmentRound)}`;
        const assignment: Assignment = {
          id,
          judgeId: assignmentJudgeId,
          teamId,
          teamUserId: team?.userId,
          round: assignmentRound,
          status: 'pending',
          teamSnapshot: team ? {
            teamName: team.teamName,
            leaderName: team.leaderName,
            leaderEmail: team.leaderEmail,
            collegeName: team.collegeName,
            location: team.location,
            track: team.track,
            teamSize: team.teamSize,
            members: team.members,
          } : undefined,
          submissionSnapshot: submission ? {
            teamName: submission.teamName,
            track: submission.track,
            title: submission.title,
            problemStatement: submission.problemStatement,
            existingGaps: submission.existingGaps,
            proposedSolution: submission.proposedSolution,
            innovation: submission.innovation,
            useCases: submission.useCases,
            architectureWorkflow: submission.architectureWorkflow,
            technologyStack: submission.technologyStack,
            validation: submission.validation,
            marketPotential: submission.marketPotential,
            businessModel: submission.businessModel,
            demo: submission.demo,
            demoUrl: submission.demoUrl,
            pitchUrl: submission.pitchUrl,
            pptUrl: submission.pptUrl,
            futureScope: submission.futureScope,
            impact: submission.impact,
            conclusion: submission.conclusion,
            status: submission.status,
          } : undefined,
          createdAt: new Date().toISOString(),
        };
        batch.set(doc(db, 'judgeAssignments', id), { ...assignment, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
        if (team) {
          batch.set(doc(db, 'registrations', team.id), {
            assignedJudgeIds: arrayUnion(assignmentJudgeId),
            currentRound: assignmentRound,
            reviewStatus: 'under-review',
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
        return assignment;
      });
      const nextAssignedTeamIds = Array.from(new Set([...(judges.find(judge => judge.id === assignmentJudgeId)?.assignedTeamIds || []), ...selectedAssignmentTeams]));
      batch.update(doc(db, 'judges', assignmentJudgeId), {
        assignedTeamIds: nextAssignedTeamIds,
      });
      await batch.commit();
      await logAction(`Assigned ${selectedAssignmentTeams.length} teams to ${judges.find(judge => judge.id === assignmentJudgeId)?.name || 'judge'}`);
      setAssignments(prev => [...newAssignments, ...prev.filter(item => !newAssignments.some(next => next.id === item.id))]);
      setRegistrations(prev => prev.map(team => selectedAssignmentTeams.includes(team.id)
        ? { ...team, currentRound: assignmentRound, reviewStatus: 'under-review' }
        : team));
      setJudges(prev => prev.map(judge => judge.id === assignmentJudgeId ? { ...judge, assignedTeamIds: nextAssignedTeamIds } : judge));
      setSelectedAssignmentTeams([]);
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage('Assignments saved.');
    });
  };

  const saveAnnouncement = async (event: FormEvent) => {
    event.preventDefault();
    if (announcementForm.target === 'specific-teams' && !announcementForm.targetTeamIds?.length) {
      setToastMessage('Select at least one target team.');
      return;
    }

    await runAdminWrite('Publish announcement', async () => {
      const id = `${Date.now()}-${announcementForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}`;
      const batch = writeBatch(db);
      const basePayload = {
        ...announcementForm,
        targetTeamIds: announcementForm.target === 'specific-teams' ? announcementForm.targetTeamIds || [] : [],
        createdAt: serverTimestamp(),
      };
      batch.set(doc(db, 'announcements', id), basePayload);

      const recipientTeams = registrations.filter(team => {
        if (announcementForm.target === 'all-users' || announcementForm.target === 'all-teams') return true;
        if (announcementForm.target === 'specific-teams') return announcementForm.targetTeamIds?.includes(team.id);
        if (announcementForm.target === 'finalists') return finalists.some(finalist => finalist.teamId === team.id);
        return false;
      });

      if (recipientTeams.length > 0) {
        recipientTeams.forEach(team => {
          batch.set(doc(db, 'notifications', `${id}_${team.userId}`), {
            title: announcementForm.title,
            description: announcementForm.description,
            priority: announcementForm.priority,
            publishDate: announcementForm.publishDate,
            target: announcementForm.target,
            userId: team.userId,
            teamId: team.id,
            type: 'announcement',
            read: false,
            createdAt: serverTimestamp(),
          });
        });
      } else {
        batch.set(doc(db, 'notifications', id), {
          title: announcementForm.title,
          description: announcementForm.description,
          priority: announcementForm.priority,
          publishDate: announcementForm.publishDate,
          target: announcementForm.target,
          type: 'announcement',
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();
      await logAction(`Created announcement ${announcementForm.title}`);
      setAnnouncements(prev => [{ id, ...announcementForm, createdAt: new Date().toISOString() }, ...prev]);
      setAnnouncementForm(blankAnnouncement);
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage(`Announcement published to ${recipientTeams.length || 'the selected audience'}.`);
    });
  };

  const deleteAnnouncement = async (announcement: Announcement) => {
    if (!window.confirm(`Delete announcement "${announcement.title}"?`)) return;

    await runAdminWrite('Delete announcement', async () => {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'announcements', announcement.id));
      batch.delete(doc(db, 'notifications', announcement.id));
      registrations.forEach(team => {
        batch.delete(doc(db, 'notifications', `${announcement.id}_${team.userId}`));
      });
      await batch.commit();
      await logAction(`Deleted announcement ${announcement.title}`);
      setAnnouncements(prev => prev.filter(item => item.id !== announcement.id));
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage('Announcement deleted.');
    });
  };

  const toggleFinalist = async (registration: StoredRegistration) => {
    if (reviewStatusForTeam(registration) === 'rejected') {
      setToastMessage('Rejected teams cannot be selected as finalists.');
      return;
    }
    await runAdminWrite('Update finalist', async () => {
      const exists = finalists.some(finalist => finalist.teamId === registration.id);
      if (exists) {
        const finalist = finalists.find(item => item.teamId === registration.id);
        if (finalist) await deleteDoc(doc(db, 'finalists', finalist.id));
        setFinalists(prev => prev.filter(item => item.teamId !== registration.id));
        await logAction(`Removed finalist ${registration.teamName}`);
        sessionStorage.removeItem(ADMIN_CACHE_KEY);
        setToastMessage('Finalist removed.');
        return;
      }

      const id = registration.id;
      const payload: Finalist = { id, teamId: registration.id, approved: true, createdAt: new Date().toISOString() };
      await setDoc(doc(db, 'finalists', id), { ...payload, createdAt: serverTimestamp() });
      setFinalists(prev => [payload, ...prev]);
      await logAction(`Selected finalist ${registration.teamName}`);
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage('Finalist selected.');
    });
  };

  const moveRound = async (registration: StoredRegistration, round: RoundName) => {
    const currentRound = roundForTeam(registration);
    const expectedNextRound = nextRoundForTeam(registration);
    const status = reviewStatusForTeam(registration);
    if (status === 'rejected') {
      setToastMessage(`${registration.teamName} is rejected and cannot move to another round.`);
      return;
    }
    const currentAssignments = assignments.filter(assignment => assignment.teamId === registration.id && assignment.round === currentRound);
    if (!currentAssignments.length || currentAssignments.some(assignment => assignment.status !== 'completed')) {
      const pendingCount = currentAssignments.filter(assignment => assignment.status !== 'completed').length;
      setToastMessage(!currentAssignments.length
        ? `Assign and complete a judge review for ${registration.teamName} in ${currentRound} first.`
        : `${pendingCount} judge review${pendingCount === 1 ? ' is' : 's are'} still pending in ${currentRound}.`);
      return;
    }
    if (status !== 'approved') {
      setToastMessage(`Approve ${registration.teamName} in ${currentRound} before advancing.`);
      return;
    }
    if (!expectedNextRound || round !== expectedNextRound) {
      setToastMessage(`${registration.teamName} can only advance from ${currentRound}${expectedNextRound ? ` to ${expectedNextRound}` : '; Round 3 is final'}.`);
      return;
    }
    await runAdminWrite('Move round', async () => {
      await updateDoc(doc(db, 'registrations', registration.id), {
        currentRound: round,
        reviewStatus: 'under-review',
        updatedAt: serverTimestamp(),
      });
      await logAction(`Moved ${registration.teamName} to ${round}`);
      setRegistrations(prev => prev.map(item => item.id === registration.id ? { ...item, currentRound: round, reviewStatus: 'under-review' } : item));
      setSelectedAssignmentTeams(prev => prev.filter(teamId => teamId !== registration.id));
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage(`${registration.teamName} moved to ${round}.`);
    });
  };

  const updateUserAccess = async (registration: StoredRegistration, action: 'enable' | 'disable' | 'reset') => {
    await runAdminWrite('Update user access', async () => {
      const nextStatus = action === 'disable' ? 'disabled' : 'enabled';
      const updatePayload = action === 'reset'
        ? { accessStatus: 'enabled', accessResetRequestedAt: serverTimestamp(), accessUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp() }
        : { accessStatus: nextStatus, accessUpdatedAt: serverTimestamp(), updatedAt: serverTimestamp() };

      await updateDoc(doc(db, 'registrations', registration.id), updatePayload);
      await logAction(`${action === 'reset' ? 'Reset access for' : `${nextStatus === 'enabled' ? 'Enabled' : 'Disabled'} access for`} ${registration.teamName}`);
      setRegistrations(prev => prev.map(item => item.id === registration.id ? {
        ...item,
        accessStatus: nextStatus,
        ...(action === 'reset' ? { accessResetRequestedAt: new Date().toISOString() } : {}),
      } : item));
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage(action === 'reset' ? 'Access reset marker saved.' : `User access ${nextStatus}.`);
    });
  };

  const deleteDatabaseUser = async (profile: UserProfile) => {
    const email = normalizeEmail(profile.email || '');
    const ownedTeam = registrations.find(registration => registration.userId === profile.uid);
    const memberTeams = email
      ? registrations.filter(registration => (registration.members || []).some(member => normalizeEmail(member.email || '') === email))
      : [];
    const confirmed = window.confirm(`Delete the Firebase Auth account and linked database records for ${profile.email || profile.uid}?`);
    if (!confirmed) return;

    await runAdminWrite('Delete user account', async () => {
      let deletedTeamIds = new Set(ownedTeam ? [ownedTeam.id] : []);
      let deletedEmail = email;
      let authDeleteCompleted = true;

      try {
        const result = await deleteAuthUserAccount({ uid: profile.uid });
        deletedTeamIds = new Set(result.data.ownedTeamIds || (ownedTeam ? [ownedTeam.id] : []));
        deletedEmail = normalizeEmail(result.data.deletedEmail || email);
      } catch (err) {
        const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: unknown }).code || '') : '';
        if (!code.includes('internal')) throw err;

        authDeleteCompleted = false;
        const batch = writeBatch(db);
        batch.delete(doc(db, 'userProfiles', profile.id));
        batch.delete(doc(db, 'accountRegistrations', profile.uid));
        batch.delete(doc(db, 'ideaSubmissions', profile.uid));
        if (email) batch.delete(doc(db, 'participantEmails', emailDocId(email)));

        if (ownedTeam) {
          batch.delete(doc(db, 'registrations', ownedTeam.id));
          batch.delete(doc(db, 'teamNames', ownedTeam.id));
          batch.delete(doc(db, 'finalists', ownedTeam.id));
          registrationEmails(ownedTeam).forEach(item => batch.delete(doc(db, 'participantEmails', emailDocId(item))));
        }

        memberTeams.forEach(team => {
          if (ownedTeam?.id === team.id) return;
          const nextMembers = (team.members || []).filter(member => normalizeEmail(member.email || '') !== email);
          batch.update(doc(db, 'registrations', team.id), {
            members: nextMembers,
            teamSize: nextMembers.length + 1,
            updatedAt: serverTimestamp(),
          });
        });

        await batch.commit();
        await logAction(`Deleted database records for ${profile.email || profile.uid}; Auth delete needs Cloud Function deploy`);
      }

      setUserProfiles(prev => prev.filter(item => item.id !== profile.id));
      setSubmissions(prev => prev.filter(item => item.userId !== profile.uid && item.id !== profile.uid));
      setRegistrations(prev => prev
        .filter(item => !deletedTeamIds.has(item.id))
        .map(item => {
          if (!deletedEmail) return item;
          const nextMembers = (item.members || []).filter(member => normalizeEmail(member.email || '') !== deletedEmail);
          return nextMembers.length === (item.members || []).length ? item : { ...item, members: nextMembers, teamSize: nextMembers.length + 1 };
        }));
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage(authDeleteCompleted ? 'User account and records deleted.' : 'Database records deleted. Deploy functions to remove Firebase Auth login too.');
      void refreshData(true);
    });
  };

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 text-slate-950 md:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
            <ArrowLeft className="w-4 h-4" /> Back to event
          </button>
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-slate-950 p-3 text-white">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold text-slate-950">Admin Dashboard Locked</h1>
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

  const navItems: Array<{ id: AdminTab; label: string; icon: ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'landing', label: 'Landing Editor', icon: <Monitor className="h-4 w-4" /> },
    { id: 'form-builder', label: 'Form Builder', icon: <PlusCircle className="h-4 w-4" /> },
    { id: 'form-submissions', label: 'Form Submissions', icon: <Download className="h-4 w-4" /> },
    { id: 'forms', label: 'Form Settings', icon: <FileText className="h-4 w-4" /> },
    { id: 'teams', label: 'Teams', icon: <Users className="h-4 w-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: 'judges', label: 'Judges', icon: <Gavel className="h-4 w-4" /> },
    { id: 'assignments', label: 'Assignments', icon: <ClipboardCheck className="h-4 w-4" /> },
    { id: 'reviews', label: 'Reviews', icon: <FileText className="h-4 w-4" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="h-4 w-4" /> },
    { id: 'rounds', label: 'Rounds', icon: <Medal className="h-4 w-4" /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4" /> },
    { id: 'finalists', label: 'Finalists', icon: <Star className="h-4 w-4" /> },
    { id: 'users', label: 'Login Users', icon: <UserCheck className="h-4 w-4" /> },
    { id: 'audit', label: 'Audit', icon: <ShieldCheck className="h-4 w-4" /> },
  ];
  const activeNavItem = navItems.find(item => item.id === activeTab) || navItems[0];
  const publicNavItems = [
    { label: 'Domains', href: '/#tracks' },
    { label: 'Stages', href: '/#schedule' },
    { label: 'Prizes', href: '/#prizes' },
    { label: 'Mentors', href: '/#mentors' },
    { label: 'FAQ', href: '/#faq' },
  ];

  return (
    <main className="admin-print-section min-h-screen w-full bg-[#f7f5ef] text-slate-950">
      <header className="sticky top-0 z-50 border-b-2 border-[#191A23] bg-[#fbf8f1]/95 px-3 py-3 backdrop-blur-xl sm:px-5 lg:px-8">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <button type="button" onClick={onBack} className="flex flex-none items-center gap-3" aria-label="Back to event">
            <span className="grid h-11 min-w-14 place-items-center rounded-2xl border-2 border-[#191A23] bg-[#b9efc8] px-3 font-mono text-lg font-black shadow-[0_4px_0_#191A23]">SDG</span>
            <span className="hidden text-xl font-black tracking-tight text-[#252323] sm:block">Kahab</span>
          </button>

          <nav className="hidden min-w-0 items-center gap-1 rounded-full border-2 border-[#191A23] bg-[#211f1f] p-1.5 text-white shadow-[0_5px_0_rgba(25,26,35,0.2)] xl:flex">
            <span className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold"><ShieldCheck className="h-4 w-4" /> Admin</span>
            {publicNavItems.map(item => <a key={item.label} href={item.href} className="rounded-full px-3 py-2.5 text-xs font-bold text-white/90 transition hover:bg-[rgba(255,255,255,0.1)] hover:text-white">{item.label}</a>)}
            <button type="button" className="rounded-full bg-[rgba(255,255,255,0.1)] px-3 py-2.5 text-xs font-bold text-[#b9efc8]" onClick={() => setActiveTab('overview')}>Control Room</button>
            <a href="/volunteer" className="rounded-full px-3 py-2.5 text-xs font-bold text-white/90 transition hover:bg-[rgba(255,255,255,0.1)]">Volunteer</a>
            <a href="/register" className="rounded-full border border-[#191A23] bg-[#b9efc8] px-4 py-2.5 text-xs font-black text-[#191A23] transition hover:-translate-y-0.5">Register</a>
          </nav>

          <div className="flex flex-none items-center gap-2 rounded-full border border-[#191A23] bg-white py-1.5 pl-1.5 pr-4 shadow-[0_3px_0_rgba(25,26,35,0.18)]">
            <span className="rounded-full border border-slate-300 bg-white p-0.5"><AppleStyleAvatar size="sm" variant="admin" imageUrl={user?.photoURL} /></span>
            <span className="hidden min-w-0 sm:block"><span className="block max-w-28 truncate text-sm font-black leading-tight">{user?.displayName || 'Admin'}</span><span className="block text-[10px] font-semibold text-slate-500">Event Manager</span></span>
          </div>
        </div>

        <nav className="mt-3 flex gap-1 overflow-x-auto rounded-full bg-[#211f1f] p-1.5 text-white xl:hidden">
          <span className="inline-flex flex-none items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold"><ShieldCheck className="h-3.5 w-3.5" /> Admin</span>
          {publicNavItems.map(item => <a key={item.label} href={item.href} className="flex-none rounded-full px-3 py-2 text-xs font-bold text-white/85">{item.label}</a>)}
          <a href="/volunteer" className="flex-none rounded-full px-3 py-2 text-xs font-bold">Volunteer</a>
          <a href="/register" className="flex-none rounded-full bg-[#b9efc8] px-4 py-2 text-xs font-black text-[#191A23]">Register</a>
        </nav>
      </header>

      <div className="w-full space-y-4 p-3 sm:p-5">
        {toast && (
          <div className="fixed right-4 top-36 z-[60] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg xl:top-24">
            {toast}
          </div>
        )}

        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white">{activeNavItem.icon}</span>
            <span><span className="block text-sm font-black">{activeNavItem.label}</span><span className="block text-xs font-medium text-slate-500">Admin workspace</span></span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => refreshData(true)} className="admin-secondary-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button type="button" onClick={handleCsvDownload} className="admin-primary-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button type="button" onClick={handlePrint} className="admin-secondary-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </section>

        <nav className="sticky top-[132px] z-30 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur xl:top-[82px]">
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => item.id === 'landing' ? onOpenLandingEditor() : setActiveTab(item.id)}
              className={`inline-flex min-h-10 flex-none items-center gap-2 rounded-xl px-3 text-xs font-semibold transition ${
                activeTab === item.id ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        {loading ? (
          <SkeletonDashboard />
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab
                stats={stats}
                registrations={registrations}
                submissions={submissions}
                domainCount={domainCount}
                districtCount={districtCount}
                collegeCount={collegeCount}
                auditLogs={auditLogs}
              />
            )}
            {activeTab === 'landing' && (
              <LandingEditorPage
                content={landingDraft}
                selectedBlockId={selectedLandingSectionId}
                onSelectBlock={setSelectedLandingSectionId}
                onChange={(nextContent) => {
                  setLandingDraft(normalizeLandingContent(nextContent));
                  setLandingSaveState('idle');
                }}
                onSaveDraft={saveLandingDraft}
                onPublish={publishLandingContent}
                saveState={landingSaveState}
                error={landingEditorError}
                updatedLabel={formatDate(landingDraft.updatedAt) || 'Not saved yet'}
              />
            )}
            {activeTab === 'forms' && (
              <FormSettingsTab
                settings={formDraft}
                onChange={setFormDraft}
                onSave={saveFormSettings}
              />
            )}
            {activeTab === 'form-builder' && <FormBuilderTab />}
            {activeTab === 'form-submissions' && <FormSubmissionsTab />}
            {activeTab === 'teams' && (
              <TeamsTab
                teams={filteredTeams}
                selectedTeam={selectedTeam}
                selectedSubmission={selectedSubmission}
                selectedScores={selectedScores}
                selectedAssignments={selectedAssignments}
                judges={judges}
                districts={districts}
                colleges={colleges}
                search={search}
                setSearch={setSearch}
                districtFilter={districtFilter}
                setDistrictFilter={setDistrictFilter}
                collegeFilter={collegeFilter}
                setCollegeFilter={setCollegeFilter}
                submissionFilter={submissionFilter}
                setSubmissionFilter={setSubmissionFilter}
                reviewFilter={reviewFilter}
                setReviewFilter={setReviewFilter}
                setSelectedTeamId={setSelectedTeamId}
                onApprove={(team) => updateTeamStatus(team, 'approved')}
                onReject={(team) => updateTeamStatus(team, 'rejected')}
                onDelete={handleDeleteTeam}
                onDeleteMember={handleDeleteMember}
                submissionByTeamId={submissionByTeamId}
                reviewStatusForTeam={reviewStatusForTeam}
              />
            )}
            {activeTab === 'attendance' && (
              <AttendanceAdminTab
                teams={registrations}
                volunteers={volunteers}
                lists={attendanceLists}
                marks={attendanceMarks}
                volunteerForm={volunteerForm}
                setVolunteerForm={setVolunteerForm}
                listForm={attendanceListForm}
                setListForm={setAttendanceListForm}
                onSaveVolunteer={saveVolunteer}
                onSaveList={saveAttendanceList}
                onToggleVolunteerList={toggleVolunteerList}
                onToggleVolunteerActive={toggleVolunteerActive}
                onToggleListActive={toggleAttendanceListActive}
                onDeleteVolunteer={deleteVolunteer}
                onDeleteList={deleteAttendanceList}
              />
            )}
            {activeTab === 'judges' && (
              <JudgesTab
                judges={judges}
                assignments={assignments}
                teams={registrations}
                judgeForm={judgeForm}
                setJudgeForm={setJudgeForm}
                onSubmit={saveJudge}
                onRemove={removeJudge}
                onToggle={async (judge) => {
                  await runAdminWrite('Update judge', async () => {
                    await updateDoc(doc(db, 'judges', judge.id), { active: !judge.active });
                    setJudges(prev => prev.map(item => item.id === judge.id ? { ...item, active: !item.active } : item));
                    await logAction(`${judge.active ? 'Deactivated' : 'Activated'} judge ${judge.name}`);
                    sessionStorage.removeItem(ADMIN_CACHE_KEY);
                    setToastMessage(`Judge ${judge.active ? 'deactivated' : 'activated'}.`);
                  });
                }}
              />
            )}
            {activeTab === 'assignments' && (
              <AssignmentsTab
                judges={judges}
                teams={assignmentEligibleTeams}
                totalTeams={registrations.length}
                assignments={assignments}
                assignmentJudgeId={assignmentJudgeId}
                setAssignmentJudgeId={setAssignmentJudgeId}
                assignmentRound={assignmentRound}
                setAssignmentRound={setAssignmentRound}
                selectedAssignmentTeams={selectedAssignmentTeams}
                setSelectedAssignmentTeams={setSelectedAssignmentTeams}
                onAssign={bulkAssign}
              />
            )}
            {activeTab === 'reviews' && (
              <ReviewsTab
                teams={registrations}
                submissions={submissions}
                judges={judges}
                scoreForm={scoreForm}
                setScoreForm={setScoreForm}
                onScoreSubmit={saveScore}
                onStatus={updateTeamStatus}
              />
            )}
            {activeTab === 'leaderboard' && <LeaderboardTab leaderboard={leaderboard} onExport={() => downloadCsv('shifa-sdg-leaderboard.csv', [['Rank', 'Team', 'Domain', 'Average Score', 'Judge Count', 'Status'], ...leaderboard.map((row, index) => [index + 1, row.registration.teamName, row.submission?.track || '', row.average, row.judgeCount, row.submission?.status || 'draft'])])} />}
            {activeTab === 'rounds' && <RoundsTab teams={submittedAssignmentTeams} reviewStatusForTeam={reviewStatusForTeam} onApprove={(team) => updateTeamStatus(team, 'approved')} onMove={moveRound} onReject={(team) => updateTeamStatus(team, 'rejected')} />}
            {activeTab === 'announcements' && <AnnouncementsTab form={announcementForm} setForm={setAnnouncementForm} onSubmit={saveAnnouncement} onDelete={deleteAnnouncement} announcements={announcements} teams={registrations} finalists={finalists} />}
            {activeTab === 'finalists' && <FinalistsTab leaderboard={leaderboard} finalists={finalists} onToggle={toggleFinalist} onExport={() => downloadCsv('shifa-sdg-finalists.csv', [['Team', 'Score', 'Domain'], ...leaderboard.filter(row => finalists.some(finalist => finalist.teamId === row.registration.id)).map(row => [row.registration.teamName, row.average, row.submission?.track || ''])])} />}
            {activeTab === 'users' && <UsersTab teams={registrations} userProfiles={userProfiles} onAccess={updateUserAccess} onDeleteUser={deleteDatabaseUser} />}
            {activeTab === 'audit' && <AuditTab logs={auditLogs} />}
          </>
        )}
      </div>
    </main>
  );
}

function OverviewTab({
  stats,
  registrations,
  submissions,
  domainCount,
  districtCount,
  collegeCount,
  auditLogs,
}: {
  stats: Record<string, number>;
  registrations: StoredRegistration[];
  submissions: IdeaSubmission[];
  domainCount: Record<string, number>;
  districtCount: Record<string, number>;
  collegeCount: Record<string, number>;
  auditLogs: AuditLog[];
}) {
  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const trendDays = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (13 - index));
    return { key: dateKey(date), label: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), value: 0 };
  });
  const trendMap = new Map(trendDays.map((item, index) => [item.key, index]));
  registrations.forEach(registration => {
    const raw = registration.createdAt;
    const date = raw && typeof raw === 'object' && 'toDate' in raw && typeof (raw as { toDate?: unknown }).toDate === 'function'
      ? (raw as { toDate: () => Date }).toDate()
      : raw ? new Date(String(raw)) : null;
    if (!date || Number.isNaN(date.getTime())) return;
    const index = trendMap.get(dateKey(date));
    if (index !== undefined) trendDays[index].value += 1;
  });
  const submissionBreakdown = {
    Submitted: submissions.filter(submission => submission.status === 'submitted').length,
    Draft: submissions.filter(submission => submission.status !== 'submitted').length,
    Missing: Math.max(registrations.length - submissions.length, 0),
  };
  const reviewBreakdown = {
    Approved: registrations.filter(team => team.reviewStatus === 'approved').length,
    'Under review': registrations.filter(team => team.reviewStatus === 'under-review').length,
    'Needs revision': registrations.filter(team => team.reviewStatus === 'needs-revision').length,
    Rejected: registrations.filter(team => team.reviewStatus === 'rejected').length,
    Pending: registrations.filter(team => !team.reviewStatus || team.reviewStatus === 'pending').length,
  };
  const cards = [
    ['Total Users', stats.totalUsers, <UserCheck className="h-5 w-5" />],
    ['Total Teams', stats.totalTeams, <Users className="h-5 w-5" />],
    ['Total Participants', stats.totalParticipants, <Users className="h-5 w-5" />],
    ['Idea Submissions', stats.totalSubmissions, <FileText className="h-5 w-5" />],
    ['Pending Reviews', stats.pendingReviews, <ClipboardCheck className="h-5 w-5" />],
    ['Approved Teams', stats.approvedTeams, <ShieldCheck className="h-5 w-5" />],
    ['Rejected Teams', stats.rejectedTeams, <Trash2 className="h-5 w-5" />],
    ['Total Judges', stats.totalJudges, <Gavel className="h-5 w-5" />],
    ['Finalists', stats.finalists, <Star className="h-5 w-5" />],
    ['Completion %', stats.completionAverage, <BarChart3 className="h-5 w-5" />],
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value, icon]) => <StatCard key={String(label)} label={String(label)} value={Number(value)} icon={icon as ReactNode} />)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr_1fr]">
        <TrendChartCard title="Registrations · Last 14 days" data={trendDays} />
        <DonutChartCard title="Submission Progress" data={submissionBreakdown} colors={['#10b981', '#f59e0b', '#e2e8f0']} />
        <DonutChartCard title="Review Status" data={reviewBreakdown} colors={['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#cbd5e1']} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <AnalyticsCard title="Domain Distribution" data={domainCount} />
        <AnalyticsCard title="District Participation" data={districtCount} />
        <AnalyticsCard title="College Participation" data={collegeCount} />
      </div>

      <Panel title="Recent Activity Feed" icon={<Bell className="h-5 w-5" />}>
        <div className="grid gap-3">
          {auditLogs.slice(0, 8).map(log => (
            <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">{log.action}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{log.adminName} • {formatDate(log.createdAt)}</p>
            </div>
          ))}
          {auditLogs.length === 0 && <EmptyState text="No admin activity yet." />}
        </div>
      </Panel>
    </div>
  );
}

function FormSettingsTab({
  settings,
  onChange,
  onSave,
}: {
  settings: EventFormSettings;
  onChange: (settings: EventFormSettings) => void;
  onSave: () => void;
}) {
  const updateRegistration = (patch: Partial<EventFormSettings['registration']>) => {
    onChange({ ...settings, registration: { ...settings.registration, ...patch } });
  };
  const updateDashboard = (patch: Partial<EventFormSettings['dashboard']>) => {
    onChange({ ...settings, dashboard: { ...settings.dashboard, ...patch } });
  };
  const updateDomain = (id: string, patch: Partial<DashboardDomainSetting>) => {
    updateDashboard({
      domains: settings.dashboard.domains.map(domain => domain.id === id ? { ...domain, ...patch } : domain),
    });
  };
  const updateSection = (key: IdeaSectionSetting['key'], patch: Partial<IdeaSectionSetting>) => {
    updateDashboard({
      sections: settings.dashboard.sections.map(section => section.key === key ? { ...section, ...patch } : section),
    });
  };
  const updateLink = (key: LinkFieldSetting['key'], patch: Partial<LinkFieldSetting>) => {
    updateDashboard({
      links: settings.dashboard.links.map(link => link.key === key ? { ...link, ...patch } : link),
    });
  };

  return (
    <div className="space-y-5">
      <Panel title="Registration Form" icon={<Users className="h-5 w-5" />}>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Eyebrow
            <input className="admin-input" value={settings.registration.eyebrow} onChange={event => updateRegistration({ eyebrow: event.target.value })} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Page title
            <input className="admin-input" value={settings.registration.title} onChange={event => updateRegistration({ title: event.target.value })} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Team sizes
            <input
              className="admin-input"
              value={settings.registration.teamSizes.join(', ')}
              onChange={event => updateRegistration({ teamSizes: event.target.value.split(',').map(item => Number(item.trim())).filter(Boolean) })}
              placeholder="3, 4, 5"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Submit button
            <input className="admin-input" value={settings.registration.submitLabel} onChange={event => updateRegistration({ submitLabel: event.target.value })} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700 lg:col-span-2">
            Idea stages
            <textarea
              className="admin-input min-h-24"
              value={settings.registration.ideaStages.join('\n')}
              onChange={event => updateRegistration({ ideaStages: event.target.value.split('\n').map(item => item.trim()).filter(Boolean) })}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700 lg:col-span-2">
            Declaration text
            <textarea className="admin-input min-h-28" value={settings.registration.declaration} onChange={event => updateRegistration({ declaration: event.target.value })} />
          </label>
        </div>
      </Panel>

      <Panel title="Dashboard Copy and Domains" icon={<FileText className="h-5 w-5" />}>
        <div className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Dashboard title
              <input className="admin-input" value={settings.dashboard.title} onChange={event => updateDashboard({ title: event.target.value })} />
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={settings.dashboard.requireDomain} onChange={event => updateDashboard({ requireDomain: event.target.checked })} />
              Require domain selection
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Dashboard subtitle
            <textarea className="admin-input min-h-24" value={settings.dashboard.subtitle} onChange={event => updateDashboard({ subtitle: event.target.value })} />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            {settings.dashboard.domains.map(domain => (
              <div key={domain.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <label className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                  <input type="checkbox" checked={domain.enabled} onChange={event => updateDomain(domain.id, { enabled: event.target.checked })} />
                  Enabled
                </label>
                <input className="admin-input" value={domain.title} onChange={event => updateDomain(domain.id, { title: event.target.value })} />
                <textarea className="admin-input mt-2 min-h-20" value={domain.description} onChange={event => updateDomain(domain.id, { description: event.target.value })} />
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Idea Submission Sections" icon={<ClipboardCheck className="h-5 w-5" />}>
        <div className="grid gap-3">
          {settings.dashboard.sections.map(section => (
            <div key={section.key} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:grid-cols-[1fr_120px_100px_160px]">
              <div className="grid gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                    <input type="checkbox" checked={section.enabled} onChange={event => updateSection(section.key, { enabled: event.target.checked })} />
                    Show
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                    <input type="checkbox" checked={section.required} onChange={event => updateSection(section.key, { required: event.target.checked })} />
                    Required
                  </label>
                  <span className="font-mono text-xs font-semibold text-slate-400">{section.key}</span>
                </div>
                <input className="admin-input" value={section.title} onChange={event => updateSection(section.key, { title: event.target.value })} />
                <textarea className="admin-input min-h-20" value={section.placeholder} onChange={event => updateSection(section.key, { placeholder: event.target.value })} />
              </div>
              <label className="grid gap-1.5 text-xs font-semibold uppercase text-slate-500">
                Limit
                <input className="admin-input" type="number" value={section.limit} onChange={event => updateSection(section.key, { limit: Number(event.target.value) || 100 })} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold uppercase text-slate-500">
                Rows
                <input className="admin-input" type="number" value={section.rows} onChange={event => updateSection(section.key, { rows: Number(event.target.value) || 3 })} />
              </label>
              <div className="flex items-center text-xs font-semibold text-slate-500">
                Visible on team dashboard
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Attachment Fields" icon={<ExternalLink className="h-5 w-5" />}>
        <div className="grid gap-3 md:grid-cols-3">
          {settings.dashboard.links.map(link => (
            <div key={link.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                  <input type="checkbox" checked={link.enabled} onChange={event => updateLink(link.key, { enabled: event.target.checked })} />
                  Show
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                  <input type="checkbox" checked={link.required} onChange={event => updateLink(link.key, { required: event.target.checked })} />
                  Required
                </label>
              </div>
              <input className="admin-input" value={link.title} onChange={event => updateLink(link.key, { title: event.target.value })} />
              <input className="admin-input mt-2" value={link.placeholder} onChange={event => updateLink(link.key, { placeholder: event.target.value })} />
              <input className="admin-input mt-2" type="number" value={link.limit} onChange={event => updateLink(link.key, { limit: Number(event.target.value) || 250 })} />
            </div>
          ))}
        </div>
      </Panel>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <button type="button" onClick={onSave} className="admin-primary-btn inline-flex items-center gap-2 px-6 py-3 text-sm shadow-lg">
          <Save className="h-4 w-4" /> Publish form settings
        </button>
      </div>
    </div>
  );
}

function AttendanceAdminTab({
  teams,
  volunteers,
  lists,
  marks,
  volunteerForm,
  setVolunteerForm,
  listForm,
  setListForm,
  onSaveVolunteer,
  onSaveList,
  onToggleVolunteerList,
  onToggleVolunteerActive,
  onToggleListActive,
  onDeleteVolunteer,
  onDeleteList,
}: {
  teams: StoredRegistration[];
  volunteers: Volunteer[];
  lists: AttendanceList[];
  marks: AttendanceMark[];
  volunteerForm: Omit<Volunteer, 'id'>;
  setVolunteerForm: (value: Omit<Volunteer, 'id'>) => void;
  listForm: Omit<AttendanceList, 'id'>;
  setListForm: (value: Omit<AttendanceList, 'id'>) => void;
  onSaveVolunteer: (event: FormEvent) => void;
  onSaveList: (event: FormEvent) => void;
  onToggleVolunteerList: (volunteer: Volunteer, listId: string) => void;
  onToggleVolunteerActive: (volunteer: Volunteer) => void;
  onToggleListActive: (list: AttendanceList) => void;
  onDeleteVolunteer: (volunteer: Volunteer) => void;
  onDeleteList: (list: AttendanceList) => void;
}) {
  const activeLists = lists.filter(list => list.active);
  const marksByList = marks.reduce<Record<string, AttendanceMark[]>>((acc, mark) => {
    acc[mark.listId] = [...(acc[mark.listId] || []), mark];
    return acc;
  }, {});
  const liveTeamIds = new Set(marks.map(mark => mark.teamId));
  const sectionTypeLabel = (type?: AttendanceList['type']) => ATTENDANCE_SECTION_TYPES.find(item => item.value === (type || 'custom'))?.label || 'Custom';

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Checkpoints" value={lists.length} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Open" value={activeLists.length} icon={<ClipboardCheck className="h-5 w-5" />} />
        <StatCard label="Volunteers" value={volunteers.length} icon={<UserPlus className="h-5 w-5" />} />
        <StatCard label="Live Teams" value={liveTeamIds.size} icon={<Users className="h-5 w-5" />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Create Attendance Checkpoint" icon={<CheckCircle2 className="h-5 w-5" />}>
          <form onSubmit={onSaveList} className="grid gap-3">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Section name
              <input className="admin-input" value={listForm.title} onChange={event => setListForm({ ...listForm, title: event.target.value })} placeholder="Food counter, Entry, GMC, Session 1" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
              Volunteer note
              <textarea className="admin-input min-h-24" value={listForm.description || ''} onChange={event => setListForm({ ...listForm, description: event.target.value })} placeholder="What should the volunteer verify here?" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Section type
                <select className="admin-input" value={listForm.type || 'custom'} onChange={event => setListForm({ ...listForm, type: event.target.value as AttendanceList['type'] })}>
                  {ATTENDANCE_SECTION_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Label color
                <select className="admin-input" value={listForm.color || 'mint'} onChange={event => setListForm({ ...listForm, color: event.target.value as AttendanceList['color'] })}>
                  <option value="mint">Mint</option>
                  <option value="purple">Purple</option>
                  <option value="yellow">Yellow</option>
                  <option value="white">White</option>
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={listForm.active} onChange={event => setListForm({ ...listForm, active: event.target.checked })} />
                Open for marking
              </label>
            </div>
            <button type="submit" className="admin-primary-btn inline-flex items-center justify-center gap-2 py-3 text-sm">
              <PlusCircle className="h-4 w-4" /> Save checkpoint
            </button>
          </form>
        </Panel>

        <Panel title="Assign Volunteer" icon={<UserPlus className="h-5 w-5" />}>
          <form onSubmit={onSaveVolunteer} className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Name
                <input className="admin-input" value={volunteerForm.name} onChange={event => setVolunteerForm({ ...volunteerForm, name: event.target.value })} placeholder="Volunteer name" />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                Login email
                <input className="admin-input" value={volunteerForm.email} onChange={event => setVolunteerForm({ ...volunteerForm, email: event.target.value })} placeholder="volunteer@gmail.com" />
              </label>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Allowed sections</p>
              <div className="flex flex-wrap gap-2">
                {lists.map(list => (
                  <label key={list.id} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${volunteerForm.allowedListIds.includes(list.id) ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={volunteerForm.allowedListIds.includes(list.id)}
                      onChange={() => setVolunteerForm({
                        ...volunteerForm,
                        allowedListIds: volunteerForm.allowedListIds.includes(list.id)
                          ? volunteerForm.allowedListIds.filter(id => id !== list.id)
                          : [...volunteerForm.allowedListIds, list.id],
                      })}
                    />
                    <span>{list.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${volunteerForm.allowedListIds.includes(list.id) ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{sectionTypeLabel(list.type)}</span>
                  </label>
                ))}
                {lists.length === 0 && <p className="text-sm font-medium text-slate-500">Create a checkpoint first.</p>}
              </div>
            </div>
            <button type="submit" className="admin-primary-btn inline-flex items-center justify-center gap-2 py-3 text-sm">
              <Save className="h-4 w-4" /> Save volunteer
            </button>
          </form>
        </Panel>
      </div>

      <div className="grid gap-5">
        <Panel title="Volunteer Permissions" icon={<Users className="h-5 w-5" />}>
          <div className="grid gap-3 xl:grid-cols-2">
            {volunteers.map(volunteer => (
              <div key={volunteer.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{volunteer.name || volunteer.email}</p>
                    <p className="mt-1 break-all font-mono text-xs font-medium text-slate-500">{volunteer.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => onToggleVolunteerActive(volunteer)} className={`mini-btn ${volunteer.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {volunteer.active ? 'Active' : 'Disabled'}
                    </button>
                    <button type="button" onClick={() => onDeleteVolunteer(volunteer)} className="mini-btn bg-red-50 text-red-700">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {lists.map(list => {
                    const checked = volunteer.allowedListIds.includes(list.id);
                    return (
                      <button key={list.id} type="button" onClick={() => onToggleVolunteerList(volunteer, list.id)} className={`mini-btn ${checked ? 'bg-slate-950 text-white' : 'bg-white'}`}>
                        {checked ? '✓ ' : ''}{list.title}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${checked ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{sectionTypeLabel(list.type)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {volunteers.length === 0 && <EmptyState text="No volunteers assigned yet." />}
          </div>
        </Panel>

        <Panel title="Attendance Dashboard" icon={<BarChart3 className="h-5 w-5" />}>
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[820px] grid-flow-col auto-cols-[minmax(300px,1fr)] gap-3">
            {lists.map(list => {
              const listMarks = marksByList[list.id] || [];
              return (
                <div key={list.id} className="flex max-h-[560px] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-950">{list.title}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{sectionTypeLabel(list.type)} • {listMarks.length}/{teams.length} teams marked</p>
                      {list.description && <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-400">{list.description}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => onToggleListActive(list)} className={`mini-btn ${list.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`} title={list.active ? 'Close this section' : 'Open this section'}>
                        {list.active ? 'Open' : 'Closed'}
                      </button>
                      <button type="button" onClick={() => onDeleteList(list)} className="mini-btn bg-red-50 text-red-700">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-xl bg-slate-50 p-2">
                    {listMarks.map(mark => (
                      <div key={mark.id} className="mb-2 rounded-xl bg-white p-3 text-xs shadow-sm ring-1 ring-slate-200/70 last:mb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">{mark.teamName}</p>
                            <p className="mt-1 truncate font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-400">{mark.registrationId || mark.teamId}</p>
                          </div>
                          <span className="flex-none rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{mark.teamSize || Math.max((mark.members || []).length + 1, 1)} members</span>
                        </div>
                        <div className="mt-2 grid gap-1 text-slate-500">
                          <p className="truncate"><span className="font-semibold text-slate-700">Leader:</span> {mark.leaderName || 'Not set'}</p>
                          <p className="truncate"><span className="font-semibold text-slate-700">College:</span> {mark.collegeName || 'Not set'}</p>
                          <p className="truncate"><span className="font-semibold text-slate-700">Marked by:</span> {mark.markedByName || mark.markedByEmail || 'Volunteer'}</p>
                          <p><span className="font-semibold text-slate-700">Time:</span> {formatDate(mark.createdAt) || 'marked'}</p>
                        </div>
                      </div>
                    ))}
                    {listMarks.length === 0 && <p className="p-2 text-sm font-medium text-slate-500">No teams marked yet.</p>}
                  </div>
                </div>
              );
            })}
            </div>
            {lists.length === 0 && <EmptyState text="Create attendance lists like Food, Entry, GMC, or Session 1." />}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function TeamsTab(props: {
  teams: StoredRegistration[];
  selectedTeam?: StoredRegistration;
  selectedSubmission?: IdeaSubmission;
  selectedScores: Score[];
  selectedAssignments: Assignment[];
  judges: Judge[];
  districts: string[];
  colleges: string[];
  search: string;
  setSearch: (value: string) => void;
  districtFilter: string;
  setDistrictFilter: (value: string) => void;
  collegeFilter: string;
  setCollegeFilter: (value: string) => void;
  submissionFilter: string;
  setSubmissionFilter: (value: string) => void;
  reviewFilter: string;
  setReviewFilter: (value: string) => void;
  setSelectedTeamId: (value: string) => void;
  onApprove: (team: StoredRegistration) => void;
  onReject: (team: StoredRegistration) => void;
  onDelete: (team: StoredRegistration) => void;
  onDeleteMember: (team: StoredRegistration, member: TeamMember, index: number) => void;
  submissionByTeamId: Record<string, IdeaSubmission>;
  reviewStatusForTeam: (team: StoredRegistration) => ReviewStatus;
}) {
  const { teams, selectedTeam, selectedSubmission } = props;
  return (
    <div className="space-y-5">
      <TeamStatusBarChart
        teams={teams}
        submissionByTeamId={props.submissionByTeamId}
        reviewStatusForTeam={props.reviewStatusForTeam}
      />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Team Management" icon={<Users className="h-5 w-5" />}>
        <FilterBar {...props} />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-slate-50 text-slate-500">
              <tr>{['Team', 'Leader', 'District', 'College', 'Submission', 'Review', 'Actions'].map(header => <th key={header} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">{header}</th>)}</tr>
            </thead>
            <tbody>
              {teams.map(team => {
                const submission = props.submissionByTeamId[team.userId] || props.submissionByTeamId[team.id];
                const status = props.reviewStatusForTeam(team);
                const isSelected = selectedTeam?.id === team.id;
                const selectTeam = () => props.setSelectedTeamId(team.id);
                return (
                  <tr
                    key={team.id}
                    tabIndex={0}
                    aria-selected={isSelected}
                    onClick={selectTeam}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        selectTeam();
                      }
                    }}
                    className={`cursor-pointer border-b border-slate-100 outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-950 ${isSelected ? 'bg-violet-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-4 py-3 text-sm font-semibold">{team.teamName}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-700">{team.leaderName}<br /><span className="font-mono text-slate-400">{team.leaderEmail}</span></td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{team.location || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{team.collegeName || '-'}</td>
                    <td className="px-4 py-3"><StatusBadge label={submission?.status || 'not submitted'} tone={submission?.status === 'submitted' ? 'green' : 'neutral'} /></td>
                    <td className="px-4 py-3"><StatusBadge label={status} tone={status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'neutral'} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={event => { event.stopPropagation(); props.onApprove(team); }} className="mini-btn bg-slate-950 text-white">Approve</button>
                        <button type="button" onClick={event => { event.stopPropagation(); props.onReject(team); }} className="mini-btn bg-white">Reject</button>
                        <button type="button" onClick={event => { event.stopPropagation(); props.onDelete(team); }} className="mini-btn bg-red-50 text-red-700" aria-label={`Delete ${team.teamName}`}><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {teams.length === 0 && <EmptyState text="No teams match the selected filters." />}
        </div>
        </Panel>

        <Panel title="Team Detail" icon={<FileText className="h-5 w-5" />}>
          {selectedTeam ? (
            <div className="space-y-4">
            <Detail label="Team" value={selectedTeam.teamName} />
            <Detail label="Leader" value={`${selectedTeam.leaderName} • ${selectedTeam.leaderEmail}`} />
            <Detail label="College" value={`${selectedTeam.collegeName || '-'} • ${selectedTeam.fieldOfStudy || '-'}`} />
            <Detail label="Registration Date" value={formatDate(selectedTeam.createdAt) || '-'} />
            <Detail label="Submission Status" value={selectedSubmission?.status || 'Not submitted'} />
            <Detail label="Domain" value={selectedSubmission?.track || 'Not selected'} />
            <LinkDetail label="Pitch Deck" value={selectedSubmission?.pptUrl || ''} />
            <LinkDetail label="Demo Link" value={selectedSubmission?.demoUrl || ''} />
            <LinkDetail label="Pitch Video / Supporting Link" value={selectedSubmission?.pitchUrl || ''} />
            <Detail label="Average Score" value={props.selectedScores.length ? `${props.selectedScores.length} score entries` : 'No scores'} />
            <Detail label="Assigned Judges" value={props.selectedAssignments.map(assignment => props.judges.find(judge => judge.id === assignment.judgeId)?.name || assignment.judgeId).join(', ') || 'None'} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Members</p>
              <div className="mt-2 space-y-2">
                {(selectedTeam.members || []).map((member, index) => (
                  <div key={`${member.email}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-700">
                    <span>{member.name} • {member.email}</span>
                    <button type="button" onClick={() => props.onDeleteMember(selectedTeam, member, index)} className="text-red-600"><UserMinus className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
            {selectedSubmission && <SubmissionPreview submission={selectedSubmission} />}
            </div>
          ) : <EmptyState text="Select a team to view details." />}
        </Panel>
      </div>
    </div>
  );
}

function TeamStatusBarChart({
  teams,
  submissionByTeamId,
  reviewStatusForTeam,
}: {
  teams: StoredRegistration[];
  submissionByTeamId: Record<string, IdeaSubmission>;
  reviewStatusForTeam: (team: StoredRegistration) => ReviewStatus;
}) {
  const bars = [
    { label: 'Total', value: teams.length, color: '#0f172a' },
    {
      label: 'Submitted',
      value: teams.filter(team => (submissionByTeamId[team.userId] || submissionByTeamId[team.id])?.status === 'submitted').length,
      color: '#10b981',
    },
    { label: 'Approved', value: teams.filter(team => reviewStatusForTeam(team) === 'approved').length, color: '#22c55e' },
    { label: 'Under review', value: teams.filter(team => reviewStatusForTeam(team) === 'under-review').length, color: '#8b5cf6' },
    { label: 'Rejected', value: teams.filter(team => reviewStatusForTeam(team) === 'rejected').length, color: '#ef4444' },
  ];
  const max = Math.max(...bars.map(bar => bar.value), 1);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filtered team pipeline</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Team Status Bar Chart</h2>
        </div>
        <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">{teams.length} matching teams</span>
      </div>
      <div className="mt-5 grid h-52 grid-cols-5 items-end gap-3 rounded-2xl bg-slate-50 px-4 pb-4 pt-8 sm:gap-5 sm:px-7">
        {bars.map(bar => {
          const height = bar.value ? Math.max((bar.value / max) * 100, 8) : 2;
          return (
            <div key={bar.label} className="flex h-full min-w-0 flex-col justify-end text-center">
              <span className="mb-2 text-sm font-black text-slate-950">{bar.value}</span>
              <div
                className="mx-auto w-full max-w-16 rounded-t-xl transition-[height] duration-300"
                style={{ height: `${height}%`, backgroundColor: bar.color }}
                role="img"
                aria-label={`${bar.label}: ${bar.value} teams`}
              />
              <span className="mt-2 truncate text-[10px] font-bold uppercase tracking-wide text-slate-500" title={bar.label}>{bar.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function JudgesTab({ judges, assignments, teams, judgeForm, setJudgeForm, onSubmit, onRemove, onToggle }: {
  judges: Judge[];
  assignments: Assignment[];
  teams: StoredRegistration[];
  judgeForm: Omit<Judge, 'id'>;
  setJudgeForm: (value: Omit<Judge, 'id'>) => void;
  onSubmit: (event: FormEvent) => void;
  onRemove: (judge: Judge) => void;
  onToggle: (judge: Judge) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <Panel title="Add Judge" icon={<Gavel className="h-5 w-5" />}>
        <form onSubmit={onSubmit} className="grid gap-3">
          {(['name', 'email', 'phone', 'organization', 'designation', 'expertise'] as const).map(field => (
            <input key={field} value={judgeForm[field]} onChange={event => setJudgeForm({ ...judgeForm, [field]: event.target.value })} className="admin-input" placeholder={field[0].toUpperCase() + field.slice(1)} />
          ))}
          <input value={judgeForm.domains.join(', ')} onChange={event => setJudgeForm({ ...judgeForm, domains: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} className="admin-input" placeholder="Assigned domains, comma separated" />
          <button type="submit" className="admin-primary-btn py-3 text-sm">Save Judge</button>
        </form>
      </Panel>
      <Panel title="Judge Management" icon={<Users className="h-5 w-5" />}>
        <div className="grid gap-3 md:grid-cols-2">
          {judges.map(judge => {
            const judgeAssignments = assignments.filter(assignment => assignment.judgeId === judge.id);
            const completed = judgeAssignments.filter(assignment => assignment.status === 'completed').length;
            const assignedTeamNames = judgeAssignments
              .map(assignment => assignment.teamSnapshot?.teamName || teams.find(team => team.id === assignment.teamId)?.teamName || assignment.teamId)
              .join(', ');

            return (
            <div key={judge.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{judge.name}</p>
                  <p className="text-xs font-medium text-slate-500">{judge.email}</p>
                </div>
                <StatusBadge label={judge.active ? 'Active' : 'Inactive'} tone={judge.active ? 'green' : 'neutral'} />
              </div>
              <p className="mt-3 text-xs font-medium leading-relaxed text-slate-500">{judge.designation} • {judge.organization}</p>
              <p className="mt-2 text-xs font-medium text-slate-700">{judge.expertise}</p>
              <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">{judgeAssignments.length} assigned • {completed} completed</p>
                <p className="text-xs font-medium leading-relaxed text-slate-500">{assignedTeamNames || 'No teams assigned yet.'}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => onToggle(judge)} className="mini-btn bg-slate-950 text-white">{judge.active ? 'Deactivate' : 'Activate'}</button>
                <button type="button" onClick={() => onRemove(judge)} className="mini-btn bg-red-50 text-red-700">Remove</button>
              </div>
            </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function AssignmentsTab(props: {
  judges: Judge[];
  teams: StoredRegistration[];
  totalTeams: number;
  assignments: Assignment[];
  assignmentJudgeId: string;
  setAssignmentJudgeId: (value: string) => void;
  assignmentRound: RoundName;
  setAssignmentRound: (value: RoundName) => void;
  selectedAssignmentTeams: string[];
  setSelectedAssignmentTeams: (value: string[]) => void;
  onAssign: () => void;
}) {
  const selectedJudge = props.judges.find(judge => judge.id === props.assignmentJudgeId);
  const activeJudges = props.judges.filter(judge => judge.active);

  return (
    <Panel title="Judge Assignment System" icon={<ClipboardCheck className="h-5 w-5" />}>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
        <select className="admin-input" value={props.assignmentJudgeId} onChange={event => props.setAssignmentJudgeId(event.target.value)}>
          <option value="">Select judge</option>
          {activeJudges.map(judge => <option key={judge.id} value={judge.id}>{judge.name}</option>)}
          {props.judges.filter(judge => !judge.active).map(judge => <option key={judge.id} value={judge.id}>{judge.name} (inactive)</option>)}
        </select>
        <select className="admin-input" value={props.assignmentRound} onChange={event => props.setAssignmentRound(event.target.value as RoundName)}>
          {(['Round 1', 'Round 2', 'Round 3'] as RoundName[]).map(round => <option key={round}>{round}</option>)}
        </select>
        <button
          type="button"
          onClick={props.onAssign}
          disabled={!props.assignmentJudgeId || props.selectedAssignmentTeams.length === 0}
          className="admin-primary-btn min-h-11 px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Assign {props.selectedAssignmentTeams.length || ''} Teams
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected Judge</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{selectedJudge ? `${selectedJudge.name} • ${selectedJudge.email}` : 'No judge selected'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Submitted Ideas</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{props.teams.length}/{props.totalTeams} assignable</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Round</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{props.assignmentRound}</p>
        </div>
      </div>
      <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
        Only submitted, non-rejected teams currently active in {props.assignmentRound} appear here. Existing assignments to the selected judge are locked.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {props.teams.map(team => {
          const checked = props.selectedAssignmentTeams.includes(team.id);
          const alreadyAssigned = props.assignmentJudgeId
            ? props.assignments.some(assignment => assignment.judgeId === props.assignmentJudgeId && assignment.teamId === team.id && assignment.round === props.assignmentRound)
            : false;
          return (
            <label key={team.id} className={`rounded-xl border p-3 text-sm font-semibold transition ${alreadyAssigned ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400' : checked ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
              <input type="checkbox" className="mr-2 accent-slate-950" checked={checked || alreadyAssigned} disabled={alreadyAssigned} onChange={() => props.setSelectedAssignmentTeams(checked ? props.selectedAssignmentTeams.filter(id => id !== team.id) : [...props.selectedAssignmentTeams, team.id])} />
              {team.teamName}
              {alreadyAssigned && <span className={`ml-2 text-xs ${checked ? 'text-slate-300' : 'text-slate-400'}`}>assigned</span>}
            </label>
          );
        })}
        {props.teams.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No eligible teams are active in {props.assignmentRound}.</p>}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {props.judges.map(judge => {
          const assigned = props.assignments.filter(assignment => assignment.judgeId === judge.id);
          return <StatCard key={judge.id} label={judge.name} value={assigned.length} icon={<Gavel className="h-5 w-5" />} sublabel={`${assigned.filter(item => item.status === 'pending').length} pending`} />;
        })}
      </div>
    </Panel>
  );
}

function ReviewsTab({
  teams,
  submissions,
  judges,
  scoreForm,
  setScoreForm,
  onScoreSubmit,
  onStatus,
}: {
  teams: StoredRegistration[];
  submissions: IdeaSubmission[];
  judges: Judge[];
  scoreForm: ScoreForm;
  setScoreForm: (form: ScoreForm) => void;
  onScoreSubmit: (event: FormEvent) => void;
  onStatus: (team: StoredRegistration, status: ReviewStatus) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <Panel title="Scoring Studio" icon={<Gavel className="h-5 w-5" />}>
        <form onSubmit={onScoreSubmit} className="grid gap-4">
          <select className="admin-input" value={scoreForm.teamId} onChange={event => setScoreForm({ ...scoreForm, teamId: event.target.value })} required>
            <option value="">Select team</option>
            {teams.filter(team => team.reviewStatus !== 'rejected').map(team => <option key={team.id} value={team.id}>{team.teamName} • {roundForTeam(team)}</option>)}
          </select>
          <select className="admin-input" value={scoreForm.judgeId} onChange={event => setScoreForm({ ...scoreForm, judgeId: event.target.value })} required>
            <option value="">Select judge</option>
            {judges.map(judge => <option key={judge.id} value={judge.id}>{judge.name}</option>)}
          </select>
          <select className="admin-input" value={scoreForm.round} onChange={event => setScoreForm({ ...scoreForm, round: event.target.value as RoundName })}>
            {(['Round 1', 'Round 2', 'Round 3'] as RoundName[]).map(round => <option key={round}>{round}</option>)}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            {CRITERIA.map(criterion => (
              <label key={criterion.key} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {criterion.label}
                <input
                  className="admin-input mt-1"
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={scoreForm[criterion.key]}
                  onChange={event => setScoreForm({ ...scoreForm, [criterion.key]: Number(event.target.value) })}
                />
              </label>
            ))}
          </div>
          <textarea className="admin-input min-h-24" value={scoreForm.comments || ''} onChange={event => setScoreForm({ ...scoreForm, comments: event.target.value })} placeholder="Judge comments or admin notes" />
          <button type="submit" className="admin-primary-btn py-3 text-sm">Save Score</button>
        </form>
      </Panel>

      <Panel title="Idea Review Management" icon={<FileText className="h-5 w-5" />}>
        <div className="grid gap-4">
          {submissions.map(submission => {
            const team = teams.find(item => item.userId === submission.userId || item.id === submission.teamNameKey || item.registrationId === submission.registrationId);
            const completeness = completionForSubmission(submission);
            return (
              <div key={submission.userId || submission.id || submission.teamName} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{submission.teamName}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{submission.track || 'Domain not selected'} • {completeness}% complete</p>
                  </div>
                  {team && (
                    <div className="flex flex-wrap gap-2">
                      {(['pending', 'under-review', 'approved', 'rejected', 'needs-revision'] as ReviewStatus[]).map(status => (
                        <button key={status} type="button" onClick={() => onStatus(team, status)} className="mini-btn bg-white">{status}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <ValidationItem label="Required fields" done={completeness > 90} />
                  <ValidationItem label="Pitch deck available" done={Boolean(submission.pptUrl)} />
                  <ValidationItem label="Demo link available" done={Boolean(submission.demoUrl)} />
                </div>
                <SubmissionPreview submission={submission} />
              </div>
            );
          })}
          {submissions.length === 0 && <EmptyState text="No idea submissions yet." />}
        </div>
      </Panel>
    </div>
  );
}

function LeaderboardTab({ leaderboard, onExport }: { leaderboard: Array<{ registration: StoredRegistration; submission?: IdeaSubmission; average: number; judgeCount: number }>; onExport: () => void }) {
  return (
    <Panel title="Live Leaderboard" icon={<Trophy className="h-5 w-5" />}>
      <button type="button" onClick={onExport} className="admin-secondary-btn mb-4 inline-flex items-center gap-2 px-4 py-2 text-xs"><Download className="h-4 w-4" /> Export Rankings</button>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-slate-50 text-slate-500"><tr>{['Rank', 'Team', 'Domain', 'Average Score', 'Judge Count', 'Status'].map(header => <th key={header} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">{header}</th>)}</tr></thead>
          <tbody>{leaderboard.map((row, index) => <tr key={row.registration.id} className="border-b border-slate-100"><td className="px-4 py-3 font-semibold">#{index + 1}</td><td className="px-4 py-3 font-semibold">{row.registration.teamName}</td><td className="px-4 py-3 text-sm font-medium text-slate-600">{row.submission?.track || '-'}</td><td className="px-4 py-3 font-semibold">{row.average}</td><td className="px-4 py-3 text-slate-600">{row.judgeCount}</td><td className="px-4 py-3 text-slate-600">{row.submission?.status || 'draft'}</td></tr>)}</tbody>
        </table>
      </div>
    </Panel>
  );
}

function RoundsTab({ teams, reviewStatusForTeam, onApprove, onMove, onReject }: {
  teams: StoredRegistration[];
  reviewStatusForTeam: (team: StoredRegistration) => ReviewStatus;
  onApprove: (team: StoredRegistration) => void;
  onMove: (team: StoredRegistration, round: RoundName) => void;
  onReject: (team: StoredRegistration) => void;
}) {
  const rejectedTeams = teams.filter(team => reviewStatusForTeam(team) === 'rejected');
  const activeTeams = teams.filter(team => reviewStatusForTeam(team) !== 'rejected');

  return (
    <div className="space-y-5">
      <Panel title="Multi-Round Evaluation" icon={<Medal className="h-5 w-5" />}>
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Teams advance sequentially only after approval. Rejection is final: rejected teams are removed from pending judge assignments and cannot enter a later round.
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {ROUND_NAMES.map(round => {
            const roundTeams = activeTeams.filter(team => roundForTeam(team) === round);
            return (
              <div key={round} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-950">{round}</h3>
                    <p className="mt-1 text-xs font-medium text-slate-500">{round === 'Round 1' ? 'Initial Screening' : round === 'Round 2' ? 'Technical Evaluation' : 'Final Presentation'}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{roundTeams.length}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {roundTeams.map(team => {
                    const status = reviewStatusForTeam(team);
                    const nextRound = nextRoundForTeam(team);
                    return (
                      <div key={team.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-700">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-900">{team.teamName}</p>
                          <StatusBadge label={status} tone={status === 'approved' ? 'green' : 'neutral'} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {status !== 'approved' && <button type="button" onClick={() => onApprove(team)} className="mini-btn bg-emerald-50 text-emerald-700">Approve round</button>}
                          {nextRound ? (
                            <button type="button" disabled={status !== 'approved'} onClick={() => onMove(team, nextRound)} className="mini-btn bg-slate-950 text-white disabled:cursor-not-allowed disabled:opacity-40">
                              {status === 'approved' ? `Advance to ${nextRound}` : 'Approve first'}
                            </button>
                          ) : <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">Final round</span>}
                          <button type="button" onClick={() => onReject(team)} className="mini-btn bg-red-50 text-red-700">Reject</button>
                        </div>
                      </div>
                    );
                  })}
                  {roundTeams.length === 0 && <EmptyState text={`No active teams in ${round}.`} />}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Rejected Teams" icon={<UserMinus className="h-5 w-5" />}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rejectedTeams.map(team => (
            <div key={team.id} className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="font-semibold text-red-900">{team.teamName}</p>
              <p className="mt-1 text-xs font-medium text-red-700">Rejected in {roundForTeam(team)} • not eligible for assignment or advancement</p>
            </div>
          ))}
          {rejectedTeams.length === 0 && <EmptyState text="No rejected teams." />}
        </div>
      </Panel>
    </div>
  );
}

function AnnouncementsTab({
  form,
  setForm,
  onSubmit,
  onDelete,
  announcements,
  teams,
  finalists,
}: {
  form: Omit<Announcement, 'id'>;
  setForm: (form: Omit<Announcement, 'id'>) => void;
  onSubmit: (event: FormEvent) => void;
  onDelete: (announcement: Announcement) => void;
  announcements: Announcement[];
  teams: StoredRegistration[];
  finalists: Finalist[];
}) {
  const selectedTeamIds = form.targetTeamIds || [];
  const targetCount = form.target === 'specific-teams'
    ? selectedTeamIds.length
    : form.target === 'finalists'
      ? finalists.length
      : form.target === 'judges'
        ? 'judges'
        : teams.length;

  return (
    <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <Panel title="Announcement Center" icon={<Megaphone className="h-5 w-5" />}>
        <form onSubmit={onSubmit} className="grid gap-3">
          <input className="admin-input" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Title" required />
          <textarea className="admin-input min-h-28" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Description" required />
          <select className="admin-input" value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value as Announcement['priority'] })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select>
          <select className="admin-input" value={form.target} onChange={event => setForm({ ...form, target: event.target.value as Announcement['target'], targetTeamIds: [] })}><option value="all-users">All users</option><option value="all-teams">All teams</option><option value="specific-teams">Specific teams</option><option value="judges">Judges</option><option value="finalists">Finalists</option></select>
          {form.target === 'specific-teams' && (
            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Choose Teams</p>
                <button type="button" className="mini-btn bg-white" onClick={() => setForm({ ...form, targetTeamIds: selectedTeamIds.length === teams.length ? [] : teams.map(team => team.id) })}>
                  {selectedTeamIds.length === teams.length ? 'Clear' : 'Select all'}
                </button>
              </div>
              <div className="grid gap-2">
                {teams.map(team => {
                  const checked = selectedTeamIds.includes(team.id);
                  return (
                    <label key={team.id} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${checked ? 'border-slate-950 bg-white text-slate-950' : 'border-slate-200 bg-white/70 text-slate-600'}`}>
                      <input
                        type="checkbox"
                        className="mr-2 accent-slate-950"
                        checked={checked}
                        onChange={() => setForm({
                          ...form,
                          targetTeamIds: checked ? selectedTeamIds.filter(id => id !== team.id) : [...selectedTeamIds, team.id],
                        })}
                      />
                      {team.teamName}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <input className="admin-input" type="date" value={form.publishDate} onChange={event => setForm({ ...form, publishDate: event.target.value })} />
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600">
            Target audience: {targetCount} {typeof targetCount === 'number' ? 'recipient team/account records' : ''}
          </div>
          <button className="admin-primary-btn py-3 text-sm">Publish Announcement</button>
        </form>
      </Panel>
      <Panel title="Published Announcements" icon={<Bell className="h-5 w-5" />}>
        <div className="grid gap-3">
          {announcements.map(item => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{item.target} • {item.priority} • {item.publishDate || formatDate(item.createdAt)}</p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <StatusBadge label={item.priority} tone={item.priority === 'high' ? 'red' : item.priority === 'normal' ? 'green' : 'neutral'} />
                  <button type="button" onClick={() => onDelete(item)} className="mini-btn bg-red-50 text-red-700">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-600">{item.description}</p>
            </div>
          ))}
          {announcements.length === 0 && <EmptyState text="No announcements published yet." />}
        </div>
      </Panel>
    </div>
  );
}

function FinalistsTab({ leaderboard, finalists, onToggle, onExport }: { leaderboard: Array<{ registration: StoredRegistration; submission?: IdeaSubmission; average: number }>; finalists: Finalist[]; onToggle: (team: StoredRegistration) => void; onExport: () => void }) {
  return (
    <Panel title="Finalist & Winner Management" icon={<Star className="h-5 w-5" />}>
      <button type="button" onClick={onExport} className="admin-secondary-btn mb-4 inline-flex items-center gap-2 px-4 py-2 text-xs"><Download className="h-4 w-4" /> Export Finalists</button>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {leaderboard.slice(0, 18).map(row => {
          const selected = finalists.some(finalist => finalist.teamId === row.registration.id);
          return <div key={row.registration.id} className={`rounded-2xl border p-4 shadow-sm ${selected ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-950'}`}><p className="font-semibold">{row.registration.teamName}</p><p className={`mt-1 text-xs font-medium ${selected ? 'text-slate-300' : 'text-slate-500'}`}>Score {row.average} • {row.submission?.track || 'No domain'}</p><button type="button" onClick={() => onToggle(row.registration)} className="mini-btn mt-3 bg-white text-slate-950">{selected ? 'Remove finalist' : 'Select finalist'}</button></div>;
        })}
      </div>
    </Panel>
  );
}

function UsersTab({
  teams,
  userProfiles,
  onAccess,
  onDeleteUser,
}: {
  teams: StoredRegistration[];
  userProfiles: UserProfile[];
  onAccess: (team: StoredRegistration, action: 'enable' | 'disable' | 'reset') => void;
  onDeleteUser: (profile: UserProfile) => void;
}) {
  const teamMembers = teams.flatMap(team => [
    { name: team.leaderName, email: team.leaderEmail, team: team.teamName, role: 'Leader', registration: team },
    ...(team.members || []).map(member => ({ name: member.name, email: member.email || '', team: team.teamName, role: 'Member', registration: team })),
  ]);
  const profileByEmail = userProfiles.reduce<Record<string, UserProfile>>((acc, profile) => {
    if (profile.email) acc[normalizeEmail(profile.email)] = profile;
    return acc;
  }, {});

  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <Panel title="Logged-In Accounts" icon={<UserCheck className="h-5 w-5" />}>
        <div className="grid gap-3">
          {userProfiles.map(profile => {
            const ownedTeam = teams.find(team => team.userId === profile.uid);
            const lastSeen = formatDate(profile.lastSeenAt || profile.lastLoginAt || profile.updatedAt);
            return (
              <div key={profile.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-slate-950">{profile.displayName || profile.email || 'Unnamed account'}</p>
                    <p className="mt-1 break-all text-xs font-mono font-medium text-slate-500">{profile.email || profile.uid}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      {ownedTeam ? `Registered team: ${ownedTeam.teamName}` : 'No team registration linked'}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-400">{lastSeen ? `Last seen: ${lastSeen}` : 'Waiting for next login timestamp'}</p>
                  </div>
                  <StatusBadge label={ownedTeam?.accessStatus === 'disabled' ? 'Disabled' : 'Active'} tone={ownedTeam?.accessStatus === 'disabled' ? 'red' : 'green'} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ownedTeam && (
                    <>
                      <button type="button" onClick={() => onAccess(ownedTeam, 'enable')} className="mini-btn bg-slate-950 text-white">Enable</button>
                      <button type="button" onClick={() => onAccess(ownedTeam, 'disable')} className="mini-btn bg-white">Disable</button>
                      <button type="button" onClick={() => onAccess(ownedTeam, 'reset')} className="mini-btn bg-white">Reset access</button>
                    </>
                  )}
                  <button type="button" onClick={() => onDeleteUser(profile)} className="mini-btn bg-red-50 text-red-700">
                    <Trash2 className="h-3 w-3" /> Delete account
                  </button>
                </div>
              </div>
            );
          })}
          {userProfiles.length === 0 && <EmptyState text="No login profiles yet. Users will appear after their next login." />}
        </div>
      </Panel>

      <Panel title="Team Member Directory" icon={<Users className="h-5 w-5" />}>
        <div className="grid gap-3">
          {teamMembers.map((member, index) => {
            const disabled = member.registration.accessStatus === 'disabled';
            const linkedProfile = member.email ? profileByEmail[normalizeEmail(member.email)] : undefined;
            return (
              <div key={`${member.email}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-slate-950">{member.name}</p>
                    <p className="mt-1 break-all text-xs font-mono font-medium text-slate-500">{member.email || 'No email'}</p>
                  </div>
                  <StatusBadge label={linkedProfile ? 'Login found' : 'No login'} tone={linkedProfile ? 'green' : 'neutral'} />
                </div>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{member.role} • {member.team}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => onAccess(member.registration, 'enable')} className="mini-btn bg-slate-950 text-white">Enable team</button>
                  <button type="button" onClick={() => onAccess(member.registration, 'disable')} className="mini-btn bg-white">Disable team</button>
                  <StatusBadge label={disabled ? 'Team disabled' : 'Team enabled'} tone={disabled ? 'red' : 'green'} />
                </div>
              </div>
            );
          })}
          {teamMembers.length === 0 && <EmptyState text="No team members yet." />}
        </div>
      </Panel>
    </div>
  );
}

function AuditTab({ logs }: { logs: AuditLog[] }) {
  return <Panel title="Audit Logs" icon={<ShieldCheck className="h-5 w-5" />}><div className="grid gap-3">{logs.map(log => <div key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="font-semibold text-slate-950">{log.action}</p><p className="mt-1 text-xs font-medium text-slate-500">{log.adminName} • {formatDate(log.createdAt)}</p></div>)}{logs.length === 0 && <EmptyState text="No audit logs yet." />}</div></Panel>;
}

function FilterBar(props: {
  districts: string[];
  colleges: string[];
  search: string;
  setSearch: (value: string) => void;
  districtFilter: string;
  setDistrictFilter: (value: string) => void;
  collegeFilter: string;
  setCollegeFilter: (value: string) => void;
  submissionFilter: string;
  setSubmissionFilter: (value: string) => void;
  reviewFilter: string;
  setReviewFilter: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-6">
      <div className="relative lg:col-span-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={props.search} onChange={event => props.setSearch(event.target.value)} className="admin-input pl-10" placeholder="Search teams" /></div>
      <select className="admin-input" value={props.districtFilter} onChange={event => props.setDistrictFilter(event.target.value)}><option value="">All districts</option>{props.districts.map(item => <option key={item}>{item}</option>)}</select>
      <select className="admin-input" value={props.collegeFilter} onChange={event => props.setCollegeFilter(event.target.value)}><option value="">All colleges</option>{props.colleges.map(item => <option key={item}>{item}</option>)}</select>
      <select className="admin-input" value={props.submissionFilter} onChange={event => props.setSubmissionFilter(event.target.value)}><option value="">All submissions</option><option value="submitted">Submitted</option><option value="missing">Missing or draft</option></select>
      <select className="admin-input" value={props.reviewFilter} onChange={event => props.setReviewFilter(event.target.value)}><option value="">All reviews</option><option value="pending">Pending</option><option value="under-review">Under Review</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="needs-revision">Need Revision</option></select>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-slate-100 p-2 text-slate-700">{icon}</span><h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2></div>{children}</section>;
}

function StatCard({ label, value, icon, sublabel }: { key?: string; label: string; value: number; icon: ReactNode; sublabel?: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span><span className="rounded-xl bg-slate-100 p-2 text-slate-600">{icon}</span></div><p className="mt-4 text-4xl font-semibold text-slate-950">{value}</p>{sublabel && <p className="mt-1 text-xs font-medium text-slate-500">{sublabel}</p>}</div>;
}

function AnalyticsCard({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = Math.max(...entries.map(([, value]) => value), 1);
  return <Panel title={title} icon={<BarChart3 className="h-5 w-5" />}><div className="space-y-3">{entries.map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between gap-3 text-xs font-semibold text-slate-600"><span className="truncate">{label}</span><span>{value}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-950" style={{ width: `${Math.max((value / max) * 100, 8)}%` }} /></div></div>)}{entries.length === 0 && <EmptyState text="No data yet." />}</div></Panel>;
}

function TrendChartCard({ title, data }: { title: string; data: Array<{ label: string; value: number }> }) {
  const width = 640;
  const height = 230;
  const paddingX = 34;
  const paddingTop = 20;
  const paddingBottom = 42;
  const graphHeight = height - paddingTop - paddingBottom;
  const max = Math.max(...data.map(item => item.value), 1);
  const points = data.map((item, index) => ({
    ...item,
    x: paddingX + (index / Math.max(data.length - 1, 1)) * (width - paddingX * 2),
    y: paddingTop + graphHeight - (item.value / max) * graphHeight,
  }));
  const line = points.map(point => `${point.x},${point.y}`).join(' ');
  const area = points.length
    ? `M ${points[0].x} ${paddingTop + graphHeight} L ${points.map(point => `${point.x} ${point.y}`).join(' L ')} L ${points[points.length - 1].x} ${paddingTop + graphHeight} Z`
    : '';
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const peak = Math.max(...data.map(item => item.value), 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Growth graph</p><h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2></div>
        <div className="flex gap-2"><span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">{total} new</span><span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">Peak {peak}/day</span></div>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl bg-slate-50 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full" preserveAspectRatio="none" role="img" aria-label={`${title}: ${total} total registrations`}>
          <defs>
            <linearGradient id="registration-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity="0.38" /><stop offset="100%" stopColor="#10b981" stopOpacity="0.02" /></linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map(value => <line key={value} x1={paddingX} x2={width - paddingX} y1={paddingTop + graphHeight * value} y2={paddingTop + graphHeight * value} stroke="#dbe3ea" strokeWidth="1" strokeDasharray="4 5" />)}
          {area && <path d={area} fill="url(#registration-area)" />}
          <polyline points={line} fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {points.map((point, index) => <g key={`${point.label}-${index}`}><circle cx={point.x} cy={point.y} r="5" fill="#fff" stroke="#059669" strokeWidth="3" vectorEffect="non-scaling-stroke"><title>{point.label}: {point.value}</title></circle>{(index === 0 || index === points.length - 1 || index % 4 === 0) && <text x={point.x} y={height - 12} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} fill="#64748b" fontSize="12" fontWeight="600">{point.label}</text>}</g>)}
        </svg>
      </div>
    </section>
  );
}

function DonutChartCard({ title, data, colors }: { title: string; data: Record<string, number>; colors: string[] }) {
  const entries = Object.entries(data);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  let cursor = 0;
  const segments = entries.map(([label, value], index) => {
    const start = cursor;
    const size = total ? (value / total) * 100 : 0;
    cursor += size;
    return { label, value, color: colors[index % colors.length], start, end: cursor };
  });
  const background = total
    ? `conic-gradient(${segments.map(segment => `${segment.color} ${segment.start}% ${segment.end}%`).join(', ')})`
    : '#e2e8f0';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-slate-100 p-2 text-slate-700"><BarChart3 className="h-5 w-5" /></span><h2 className="text-xl font-semibold tracking-tight">{title}</h2></div>
      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row">
        <div className="relative h-40 w-40 flex-none rounded-full" style={{ background }} role="img" aria-label={`${title}, ${total} total`}>
          <div className="absolute inset-8 grid place-items-center rounded-full bg-white shadow-inner"><span className="text-center"><span className="block text-3xl font-black text-slate-950">{total}</span><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span></span></div>
        </div>
        <div className="w-full min-w-0 space-y-2.5">{segments.map(segment => <div key={segment.label} className="flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2 font-semibold text-slate-600"><span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: segment.color }} /><span className="truncate">{segment.label}</span></span><span className="font-black text-slate-950">{segment.value}<span className="ml-1 font-semibold text-slate-400">{total ? `${Math.round((segment.value / total) * 100)}%` : '0%'}</span></span></div>)}</div>
      </div>
    </section>
  );
}

function SubmissionPreview({ submission }: { submission: IdeaSubmission }) {
  const links = [
    ['PPT', submission.pptUrl],
    ['Demo', submission.demoUrl],
    ['Pitch', submission.pitchUrl],
  ].filter(([, value]) => value && isLikelyUrl(String(value)));

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium leading-relaxed text-slate-700">
      <p className="font-semibold text-slate-950">Submitted Idea</p>
      <p className="mt-2">{submission.title || 'No title'}</p>
      <p className="mt-2 text-slate-500">{submission.problemStatement || 'Problem statement not added.'}</p>
      {links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {links.map(([label, value]) => (
            <a
              key={String(label)}
              href={String(value)}
              target="_blank"
              rel="noreferrer"
              className="mini-btn bg-white text-slate-700"
            >
              <ExternalLink className="h-3 w-3" /> {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-medium text-slate-700">{value}</p></div>;
}

function LinkDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      {isLikelyUrl(value) ? (
        <a href={value} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 break-all text-sm font-semibold text-slate-950 hover:underline">
          <ExternalLink className="h-3.5 w-3.5 flex-none" /> Open link
        </a>
      ) : (
        <p className="mt-1 break-words text-sm font-medium text-slate-700">-</p>
      )}
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: 'green' | 'red' | 'neutral' }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${tone === 'green' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : tone === 'red' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}>{label}</span>;
}

function ValidationItem({ label, done }: { label: string; done: boolean }) {
  return <div className={`rounded-xl border p-3 text-xs font-semibold ${done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{label}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-medium text-slate-500">{text}</p>;
}

function SkeletonDashboard() {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />)}</div>;
}
