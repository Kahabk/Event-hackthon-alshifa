import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  collection,
  arrayUnion,
  deleteDoc,
  doc,
  getDocs,
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
import {
  ArrowLeft,
  BarChart3,
  Bell,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileText,
  Gavel,
  Lock,
  Mail,
  Medal,
  Megaphone,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Trophy,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '../lib/firebase';
import { IdeaSubmission, StoredRegistration, TeamMember } from '../types';

type AdminTab = 'overview' | 'teams' | 'judges' | 'assignments' | 'reviews' | 'leaderboard' | 'rounds' | 'announcements' | 'finalists' | 'users' | 'audit';
type ReviewStatus = 'pending' | 'under-review' | 'approved' | 'rejected' | 'needs-revision';
type RoundName = 'Round 1' | 'Round 2' | 'Round 3';

interface AdminPanelProps {
  user: FirebaseUser | null;
  isAdmin: boolean;
  onBack: () => void;
  onLogin: () => void;
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
}

const ADMIN_CACHE_KEY = 'shifa-sdg-admin-cache-v1';
const ADMIN_CACHE_TTL = 5 * 60 * 1000;
const PAGE_SIZE = 200;

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
  const message = err instanceof Error ? err.message : fallback;
  if (message.toLowerCase().includes('permission')) {
    return `${fallback} Firebase rules rejected the write. Publish the latest firestore.rules and confirm this account is an active admin.`;
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

export default function AdminPanel({ user, isAdmin, onBack, onLogin }: AdminPanelProps) {
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
  const [assignmentJudgeId, setAssignmentJudgeId] = useState('');
  const [assignmentRound, setAssignmentRound] = useState<RoundName>('Round 1');
  const [selectedAssignmentTeams, setSelectedAssignmentTeams] = useState<string[]>([]);
  const [scoreForm, setScoreForm] = useState<ScoreForm>(blankScoreForm);

  const adminName = user?.displayName || user?.email || 'Admin';

  const refreshData = async (force = false) => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cached = !force ? readCache() : null;
      if (cached) {
        setRegistrations(cached.registrations);
        setSubmissions(cached.submissions);
        setJudges(cached.judges);
        setAssignments(cached.assignments);
        setScores(cached.scores);
        setAnnouncements(cached.announcements);
        setAuditLogs(cached.auditLogs);
        setFinalists(cached.finalists);
        setUserProfiles(cached.userProfiles || []);
        setLoading(false);
        return;
      }

      const [
        registrationsResult,
        submissionsResult,
        judgesResult,
        assignmentsResult,
        scoresResult,
        announcementsResult,
        auditResult,
        finalistsResult,
        userProfilesResult,
      ] = await Promise.all([
        safeAdminRead('registrations', getDocs(query(collection(db, 'registrations'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE))), snapshot => ({ id: snapshot.id, ...snapshot.data() } as StoredRegistration)),
        safeAdminRead('ideaSubmissions', getDocs(query(collection(db, 'ideaSubmissions'), orderBy('updatedAt', 'desc'), limit(PAGE_SIZE))), snapshot => ({ id: snapshot.id, ...snapshot.data() } as IdeaSubmission)),
        safeAdminRead('judges', getDocs(query(collection(db, 'judges'), limit(PAGE_SIZE))), snapshot => ({ id: snapshot.id, ...snapshot.data() } as Judge)),
        safeAdminRead('judgeAssignments', getDocs(query(collection(db, 'judgeAssignments'), limit(PAGE_SIZE))), snapshot => ({ id: snapshot.id, ...snapshot.data() } as Assignment)),
        safeAdminRead('scores', getDocs(query(collection(db, 'scores'), limit(PAGE_SIZE))), snapshot => ({ id: snapshot.id, ...snapshot.data() } as Score)),
        safeAdminRead('announcements', getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE))), snapshot => ({ id: snapshot.id, ...snapshot.data() } as Announcement)),
        safeAdminRead('auditLogs', getDocs(query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(80))), snapshot => ({ id: snapshot.id, ...snapshot.data() } as AuditLog)),
        safeAdminRead('finalists', getDocs(query(collection(db, 'finalists'), limit(PAGE_SIZE))), snapshot => ({ id: snapshot.id, ...snapshot.data() } as Finalist)),
        safeAdminRead('userProfiles', getDocs(query(collection(db, 'userProfiles'), orderBy('updatedAt', 'desc'), limit(PAGE_SIZE))), snapshot => ({ id: snapshot.id, ...snapshot.data() } as UserProfile)),
      ]);

      const nextData = {
        registrations: registrationsResult.data,
        submissions: submissionsResult.data,
        judges: judgesResult.data,
        assignments: assignmentsResult.data,
        scores: scoresResult.data,
        announcements: announcementsResult.data,
        auditLogs: auditResult.data,
        finalists: finalistsResult.data,
        userProfiles: userProfilesResult.data,
      };

      const blockedCollections = [
        registrationsResult,
        submissionsResult,
        judgesResult,
        assignmentsResult,
        scoresResult,
        announcementsResult,
        auditResult,
        finalistsResult,
        userProfilesResult,
      ].filter(result => result.error).map(result => result.label);

      if (blockedCollections.length) {
        setError(`Firebase rules are blocking: ${blockedCollections.join(', ')}. Publish the latest firestore.rules and refresh.`);
      }

      setRegistrations(nextData.registrations);
      setSubmissions(nextData.submissions);
      setJudges(nextData.judges);
      setAssignments(nextData.assignments);
      setScores(nextData.scores);
      setAnnouncements(nextData.announcements);
      setAuditLogs(nextData.auditLogs);
      setFinalists(nextData.finalists);
      setUserProfiles(nextData.userProfiles);
      writeCache(nextData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, [isAdmin]);

  const logAction = async (action: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await setDoc(doc(db, 'auditLogs', id), {
      action,
      adminName,
      createdAt: serverTimestamp(),
    });
    setAuditLogs(prev => [{ id, action, adminName, createdAt: new Date().toISOString() }, ...prev].slice(0, 80));
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
    const submission = submissionByTeamId[registration.userId] || submissionByTeamId[registration.id];
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
      const submission = submissionByTeamId[registration.userId] || submissionByTeamId[registration.id];
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
        submission: submissionByTeamId[registration.userId] || submissionByTeamId[registration.id],
        average: averageScore(registration.id),
        judgeCount: new Set((scoresByTeamId[registration.id] || []).map(score => score.judgeId)).size,
      }))
      .sort((a, b) => b.average - a.average);
  }, [registrations, scoresByTeamId, submissionByTeamId]);

  const selectedTeam = registrations.find(registration => registration.id === selectedTeamId) || filteredTeams[0];
  const selectedSubmission = selectedTeam ? submissionByTeamId[selectedTeam.userId] || submissionByTeamId[selectedTeam.id] : undefined;
  const selectedScores = selectedTeam ? scoresByTeamId[selectedTeam.id] || [] : [];
  const selectedAssignments = selectedTeam ? assignmentByTeamId[selectedTeam.id] || [] : [];

  const setToastMessage = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  };

  const runAdminWrite = async (label: string, action: () => Promise<void>) => {
    setError('');
    try {
      await action();
    } catch (err) {
      setError(adminWriteError(err, `${label} failed.`));
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
    await runAdminWrite('Update review status', async () => {
      await updateDoc(doc(db, 'registrations', registration.id), {
        reviewStatus: status,
        updatedAt: serverTimestamp(),
      });
      await logAction(`Marked ${registration.teamName} as ${status}`);
      setRegistrations(prev => prev.map(item => item.id === registration.id ? { ...item, reviewStatus: status } : item));
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage(`Team ${status}.`);
    });
  };

  const saveScore = async (event: FormEvent) => {
    event.preventDefault();
    if (!scoreForm.teamId || !scoreForm.judgeId) {
      setToastMessage('Select a team and judge before saving a score.');
      return;
    }

    await runAdminWrite('Save score', async () => {
      const id = `${scoreForm.judgeId}_${scoreForm.teamId}_${roundDocId(scoreForm.round)}`;
      const payload = {
        ...scoreForm,
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
      await setDoc(doc(db, 'scores', id), payload, { merge: true });
      const nextScore: Score = { id, ...scoreForm };
      await logAction(`Saved score for ${registrations.find(team => team.id === scoreForm.teamId)?.teamName || scoreForm.teamId}`);
      setScores(prev => [nextScore, ...prev.filter(score => score.id !== id)]);
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

    await runAdminWrite('Assign teams', async () => {
      const batch = writeBatch(db);
      const newAssignments: Assignment[] = selectedAssignmentTeams.map(teamId => {
        const team = registrations.find(item => item.id === teamId);
        const submission = team ? submissionByTeamId[team.userId] || submissionByTeamId[team.id] : undefined;
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
          batch.set(doc(db, 'registrations', team.id), { assignedJudgeIds: arrayUnion(assignmentJudgeId), updatedAt: serverTimestamp() }, { merge: true });
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
    await runAdminWrite('Move round', async () => {
      await updateDoc(doc(db, 'registrations', registration.id), { currentRound: round, updatedAt: serverTimestamp() });
      await logAction(`Moved ${registration.teamName} to ${round}`);
      setRegistrations(prev => prev.map(item => item.id === registration.id ? { ...item, currentRound: round } : item));
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
    const confirmed = window.confirm(`Delete database records for ${profile.email || profile.uid}? This does not delete the Firebase Auth account.`);
    if (!confirmed) return;

    await runAdminWrite('Delete database user', async () => {
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
      await logAction(`Deleted database user ${profile.email || profile.uid}`);
      setUserProfiles(prev => prev.filter(item => item.id !== profile.id));
      setSubmissions(prev => prev.filter(item => item.userId !== profile.uid && item.id !== profile.uid));
      setRegistrations(prev => prev
        .filter(item => item.id !== ownedTeam?.id)
        .map(item => {
          if (!email) return item;
          const nextMembers = (item.members || []).filter(member => normalizeEmail(member.email || '') !== email);
          return nextMembers.length === (item.members || []).length ? item : { ...item, members: nextMembers, teamSize: nextMembers.length + 1 };
        }));
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      setToastMessage('Database user records deleted.');
    });
  };

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-28 text-slate-950 md:px-8">
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
    { id: 'teams', label: 'Teams', icon: <Users className="h-4 w-4" /> },
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

  return (
    <main className="admin-print-section min-h-screen bg-slate-50 px-4 pb-16 pt-28 text-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {toast && (
          <div className="fixed right-4 top-24 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg">
            {toast}
          </div>
        )}

        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950">
              <ArrowLeft className="w-4 h-4" /> Back to event
            </button>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
              <ShieldCheck className="w-4 h-4" /> Admin Dashboard
            </span>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Challenge Control Room</h1>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
              Manage registrations, judges, reviews, scoring, finalists, announcements, and reports from one clean admin workspace.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => refreshData(true)} className="admin-secondary-btn inline-flex items-center justify-center gap-2 px-5 py-3 text-sm">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button type="button" onClick={handleCsvDownload} className="admin-primary-btn inline-flex items-center justify-center gap-2 px-5 py-3 text-sm">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button type="button" onClick={handlePrint} className="admin-secondary-btn inline-flex items-center justify-center gap-2 px-5 py-3 text-sm">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
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
                teams={registrations}
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
            {activeTab === 'rounds' && <RoundsTab teams={registrations} onMove={moveRound} onReject={(team) => updateTeamStatus(team, 'rejected')} />}
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

      <div className="grid gap-5 xl:grid-cols-3">
        <AnalyticsCard title="Registration Trends" data={registrations.slice(0, 8).reduce<Record<string, number>>((acc, registration) => {
          const date = formatDate(registration.createdAt).slice(0, 10) || 'Recent';
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {})} />
        <AnalyticsCard title="District Participation" data={districtCount} />
        <AnalyticsCard title="College Participation" data={collegeCount} />
        <AnalyticsCard title="Domain Distribution" data={domainCount} />
        <AnalyticsCard title="Submission Completion" data={{
          Submitted: submissions.filter(submission => submission.status === 'submitted').length,
          Draft: submissions.filter(submission => submission.status !== 'submitted').length,
          Missing: Math.max(registrations.length - submissions.length, 0),
        }} />
        <AnalyticsCard title="Review Status" data={{ Pending: stats.pendingReviews, Approved: stats.approvedTeams, Rejected: stats.rejectedTeams }} />
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
                return (
                  <tr key={team.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold">
                      <button type="button" onClick={() => props.setSelectedTeamId(team.id)} className="hover:underline">{team.teamName}</button>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-700">{team.leaderName}<br /><span className="font-mono text-slate-400">{team.leaderEmail}</span></td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{team.location || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">{team.collegeName || '-'}</td>
                    <td className="px-4 py-3"><StatusBadge label={submission?.status || 'not submitted'} tone={submission?.status === 'submitted' ? 'green' : 'neutral'} /></td>
                    <td className="px-4 py-3"><StatusBadge label={status} tone={status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'neutral'} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => props.onApprove(team)} className="mini-btn bg-slate-950 text-white">Approve</button>
                        <button type="button" onClick={() => props.onReject(team)} className="mini-btn bg-white">Reject</button>
                        <button type="button" onClick={() => props.onDelete(team)} className="mini-btn bg-red-50 text-red-700"><Trash2 className="h-3 w-3" /></button>
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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected Teams</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{props.selectedAssignmentTeams.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Round</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{props.assignmentRound}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {props.teams.map(team => {
          const checked = props.selectedAssignmentTeams.includes(team.id);
          const alreadyAssigned = props.assignmentJudgeId
            ? props.assignments.some(assignment => assignment.judgeId === props.assignmentJudgeId && assignment.teamId === team.id && assignment.round === props.assignmentRound)
            : false;
          return (
            <label key={team.id} className={`rounded-xl border p-3 text-sm font-semibold transition ${checked ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
              <input type="checkbox" className="mr-2 accent-slate-950" checked={checked} onChange={() => props.setSelectedAssignmentTeams(checked ? props.selectedAssignmentTeams.filter(id => id !== team.id) : [...props.selectedAssignmentTeams, team.id])} />
              {team.teamName}
              {alreadyAssigned && <span className={`ml-2 text-xs ${checked ? 'text-slate-300' : 'text-slate-400'}`}>assigned</span>}
            </label>
          );
        })}
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
            {teams.map(team => <option key={team.id} value={team.id}>{team.teamName}</option>)}
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

function RoundsTab({ teams, onMove, onReject }: { teams: StoredRegistration[]; onMove: (team: StoredRegistration, round: RoundName) => void; onReject: (team: StoredRegistration) => void }) {
  return (
    <Panel title="Multi-Round Evaluation" icon={<Medal className="h-5 w-5" />}>
      <div className="grid gap-4 lg:grid-cols-3">
        {(['Round 1', 'Round 2', 'Round 3'] as RoundName[]).map(round => (
          <div key={round} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-slate-950">{round}</h3>
            <p className="mt-1 text-xs font-medium text-slate-500">{round === 'Round 1' ? 'Initial Screening' : round === 'Round 2' ? 'Technical Evaluation' : 'Final Presentation'}</p>
            <div className="mt-4 space-y-2">{teams.slice(0, 8).map(team => <div key={`${round}-${team.id}`} className="rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-700"><p>{team.teamName}</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => onMove(team, round)} className="mini-btn bg-slate-950 text-white">Move</button><button type="button" onClick={() => onReject(team)} className="mini-btn bg-white">Reject</button></div></div>)}</div>
          </div>
        ))}
      </div>
    </Panel>
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
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-800">
          Browser apps can delete Firestore database records. Deleting the actual Firebase Auth account requires a backend Admin SDK or Cloud Function.
        </div>
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
                    <Trash2 className="h-3 w-3" /> Delete login record
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
