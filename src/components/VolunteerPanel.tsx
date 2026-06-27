import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { ArrowLeft, Camera, CheckCircle2, ClipboardCheck, Clock, ImageUp, Lock, LogIn, LogOut, RotateCcw, Search, Users, X } from 'lucide-react';
import { signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp } from 'firebase/firestore';
import jsQR from 'jsqr';
import { AttendanceList, AttendanceMark, StoredRegistration, Volunteer } from '../types';
import { auth, db } from '../lib/firebase';
import { EVENT_ID, ParsedEventTicket, parseEventTicketPayload } from '../lib/eventTicket';

interface VolunteerPanelProps {
  user: FirebaseUser | null;
  isAdmin: boolean;
  isVolunteer: boolean;
  onBack: () => void;
  onLogin: () => void;
}

type ScanSource = 'camera' | 'upload' | 'manual';

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
const markDocId = (listId: string, teamId: string) => `${listId}_${teamId}`;

const timestampToDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value && typeof (value as { seconds: number }).seconds === 'number') {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return null;
};

const formatDateTime = (value: unknown) => {
  const date = timestampToDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function VolunteerPanel({ user, isAdmin, isVolunteer, onBack, onLogin }: VolunteerPanelProps) {
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [lists, setLists] = useState<AttendanceList[]>([]);
  const [marks, setMarks] = useState<AttendanceMark[]>([]);
  const [teams, setTeams] = useState<StoredRegistration[]>([]);
  const [scanValue, setScanValue] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<StoredRegistration | null>(null);
  const [lastScan, setLastScan] = useState<ParsedEventTicket | null>(null);
  const [lastScanSource, setLastScanSource] = useState<ScanSource>('manual');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('');
  const [scannerError, setScannerError] = useState('');
  const [scannerSuccess, setScannerSuccess] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [markingListId, setMarkingListId] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  useEffect(() => {
    if (!user?.email) {
      setVolunteer(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'volunteers', normalizeEmail(user.email)),
      snapshot => {
        setVolunteer(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Volunteer : null);
      },
      () => setVolunteer(null),
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user || (!isVolunteer && !isAdmin)) return;

    const unsubscribeLists = onSnapshot(
      query(collection(db, 'attendanceLists'), orderBy('createdAt', 'desc')),
      snapshot => setLists(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AttendanceList))),
      () => setError('Could not load attendance checkpoints.'),
    );
    const unsubscribeMarks = onSnapshot(
      query(collection(db, 'attendanceMarks'), orderBy('createdAt', 'desc')),
      snapshot => setMarks(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AttendanceMark))),
      () => setError('Could not load attendance records.'),
    );
    const unsubscribeTeams = onSnapshot(
      query(collection(db, 'registrations'), orderBy('createdAt', 'desc')),
      snapshot => setTeams(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as StoredRegistration))),
      () => setError('Could not load registered teams.'),
    );

    return () => {
      unsubscribeLists();
      unsubscribeMarks();
      unsubscribeTeams();
    };
  }, [isAdmin, isVolunteer, user]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const allowedLists = useMemo(() => {
    const allowed = volunteer?.allowedListIds || [];
    return lists
      .filter(list => list.active)
      .filter(list => isAdmin || allowed.includes(list.id));
  }, [isAdmin, lists, volunteer?.allowedListIds]);

  const marksByTeamAndList = useMemo(() => marks.reduce<Record<string, AttendanceMark>>((acc, mark) => {
    acc[`${mark.teamId}:${mark.listId}`] = mark;
    return acc;
  }, {}), [marks]);

  const volunteerMarks = useMemo(() => {
    const allowedIds = new Set(allowedLists.map(list => list.id));
    return marks.filter(mark => isAdmin || allowedIds.has(mark.listId));
  }, [allowedLists, isAdmin, marks]);

  const arrivedTeamCount = useMemo(() => {
    const arrivalListIds = new Set(
      allowedLists
        .filter(list => /(entry|check.?in|workshop)/i.test(`${list.title} ${list.description || ''}`))
        .map(list => list.id),
    );
    const relevantMarks = arrivalListIds.size
      ? volunteerMarks.filter(mark => arrivalListIds.has(mark.listId))
      : volunteerMarks;
    return new Set(relevantMarks.map(mark => mark.teamId)).size;
  }, [allowedLists, volunteerMarks]);

  const findTeam = (parsed: ParsedEventTicket) => {
    if (parsed.validationStatus === 'invalid') return null;
    if (parsed.validationStatus === 'verified-ticket') {
      return teams.find(team => (
        team.ticketId === parsed.ticketId
        && team.registrationId === parsed.registrationId
        && [team.id, team.teamId, team.teamNameKey].filter(Boolean).some(id => normalizeText(String(id)) === normalizeText(parsed.teamId || ''))
      )) || null;
    }
    const normalizedCandidates = parsed.candidates.map(normalizeText).filter(Boolean);
    const exact = teams.find(team => {
      const fields = [
        team.id,
        team.registrationId || '',
        team.teamName,
        team.teamNameKey || '',
        team.leaderEmail || '',
        team.phoneNumber || '',
      ].map(normalizeText);
      return normalizedCandidates.some(candidate => fields.includes(candidate));
    });
    if (exact) return exact;

    if (parsed.validationStatus !== 'manual-lookup') return null;
    const searchableName = normalizeText(parsed.raw);
    if (!searchableName || searchableName.length < 2) return null;
    return teams.find(team => normalizeText(team.teamName).includes(searchableName) || searchableName.includes(normalizeText(team.teamName))) || null;
  };

  const loadTeamFromPayload = (value: string, source: ScanSource) => {
    const parsed = parseEventTicketPayload(value);
    setLastScan(parsed);
    setLastScanSource(source);
    setScanValue(value);
    setError('');
    setStatus('');

    if (parsed.error || parsed.validationStatus === 'invalid') {
      setSelectedTeam(null);
      setError(parsed.error);
      return null;
    }

    const team = findTeam(parsed);
    if (team?.accessStatus === 'disabled') {
      setSelectedTeam(null);
      setError('This team ticket has been disabled by an administrator.');
      return null;
    }
    setSelectedTeam(team);
    if (team) {
      setStatus(parsed.validationStatus === 'verified-ticket' ? `Verified ticket for ${team.teamName}.` : `Loaded ${team.teamName}.`);
    } else {
      setError(parsed.validationStatus === 'verified-ticket'
        ? 'Ticket identifiers did not match the registered team. Do not admit this ticket.'
        : 'No registered team found for this QR, team ID, registration ID, or team name.');
    }
    return team;
  };

  const handleManualSearch = () => {
    loadTeamFromPayload(scanValue, 'manual');
  };

  const closeScanner = () => {
    stopCamera();
    setScannerOpen(false);
  };

  const handleDecodedQr = (value: string, source: ScanSource) => {
    const parsedTicket = parseEventTicketPayload(value);
    const team = loadTeamFromPayload(value, source);
    if (team) {
      setScannerSuccess(`Scanned ${team.teamName}.`);
      setScannerError('');
      stopCamera();
      if (allowedLists.length === 1) {
        void markAttendanceForTeam(allowedLists[0], team, value, source, parsedTicket);
      }
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = window.setTimeout(() => setScannerOpen(false), 650);
    } else {
      setScannerError('QR decoded, but no registered team matched it. Try another QR or use manual search.');
    }
  };

  const scanCameraFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;

    context.drawImage(video, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    const code = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
    if (code?.data) handleDecodedQr(code.data, 'camera');
  };

  const startCamera = async () => {
    setScannerStatus('Starting camera...');
    setScannerError('');
    setScannerSuccess('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError('Camera access is not available in this browser. Use upload or manual search.');
      setScannerStatus('');
      return;
    }

    if (window.location.hostname !== 'localhost' && !window.isSecureContext) {
      setScannerError('Camera scanning requires HTTPS. Use upload or manual search on this connection.');
      setScannerStatus('');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      setScannerStatus('Point the camera at the team QR pass.');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      scanTimerRef.current = window.setInterval(scanCameraFrame, 250);
    } catch (err) {
      const errorName = err instanceof DOMException ? err.name : '';
      const message = errorName === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access or use upload/manual search.'
        : errorName === 'NotFoundError'
          ? 'No camera was found on this device. Use upload or manual search.'
          : 'Could not start the camera. Use upload or manual search.';
      setScannerError(message);
      setScannerStatus('');
      stopCamera();
    }
  };

  useEffect(() => {
    if (!scannerOpen) return;
    void startCamera();
    return () => stopCamera();
  }, [scannerOpen]);

  const scanImageFile = (file?: File) => {
    if (!file) return;
    setError('');
    setStatus('Reading QR image...');

    const reader = new FileReader();
    reader.onerror = () => {
      setStatus('');
      setError('Could not read that image file.');
    };
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          setStatus('');
          setError('This browser could not prepare the QR image reader.');
          return;
        }
        context.drawImage(image, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
        if (code?.data) {
          handleDecodedQr(code.data, 'upload');
          setStatus('QR image scanned.');
        } else {
          setStatus('');
          setError('Could not read a QR code from that image.');
        }
      };
      image.onerror = () => {
        setStatus('');
        setError('That file is not a readable QR image.');
      };
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  };

  const markAttendanceForTeam = async (
    list: AttendanceList,
    team: StoredRegistration,
    qrPayload = lastScan?.raw || scanValue || '',
    scanSource = lastScanSource,
    parsedTicket = lastScan,
  ) => {
    if (!user) return;
    if (!isAdmin && !allowedLists.some(item => item.id === list.id)) {
      setError('You are not assigned to this attendance section.');
      return;
    }

    const existing = marksByTeamAndList[`${team.id}:${list.id}`];
    if (existing) {
      setStatus(`${team.teamName} is already marked for ${list.title}.`);
      return;
    }

    setMarkingListId(list.id);
    setError('');
    try {
      const id = markDocId(list.id, team.id);
      const markRef = doc(db, 'attendanceMarks', id);
      const teamRef = doc(db, 'registrations', team.id);
      const listRef = doc(db, 'attendanceLists', list.id);
      const volunteerRef = user.email ? doc(db, 'volunteers', normalizeEmail(user.email)) : null;

      await runTransaction(db, async transaction => {
        const [markSnapshot, teamSnapshot, listSnapshot, volunteerSnapshot] = await Promise.all([
          transaction.get(markRef),
          transaction.get(teamRef),
          transaction.get(listRef),
          volunteerRef ? transaction.get(volunteerRef) : Promise.resolve(null),
        ]);

        if (markSnapshot.exists()) throw new Error('duplicate');
        if (!teamSnapshot.exists()) throw new Error('team-missing');
        if (!listSnapshot.exists() || listSnapshot.data()?.active === false) throw new Error('section-closed');
        if (!isAdmin) {
          const volunteerData = volunteerSnapshot?.data() as Volunteer | undefined;
          if (!volunteerSnapshot?.exists() || volunteerData?.active === false || !volunteerData?.allowedListIds?.includes(list.id)) {
            throw new Error('unauthorized-section');
          }
        }

        const teamData = teamSnapshot.data() as StoredRegistration;
        const listData = listSnapshot.data() as AttendanceList;
        if (teamData.accessStatus === 'disabled') throw new Error('ticket-disabled');

        transaction.set(markRef, {
          eventId: EVENT_ID,
          listId: list.id,
          listTitle: listData.title,
          sectionId: list.id,
          sectionName: listData.title,
          teamId: team.id,
          registrationId: teamData.registrationId || '',
          teamName: teamData.teamName,
          leaderName: teamData.leaderName,
          leaderEmail: teamData.leaderEmail || '',
          phoneNumber: teamData.phoneNumber || '',
          collegeName: teamData.collegeName || '',
          location: teamData.location || '',
          teamSize: teamData.teamSize || 1,
          members: teamData.members || [],
          markedByUid: user.uid,
          markedByEmail: user.email || '',
          markedByName: user.displayName || user.email || '',
          qrPayload: qrPayload.slice(0, 2048),
          scanSource,
          ticketId: parsedTicket?.validationStatus === 'verified-ticket' ? parsedTicket.ticketId || '' : '',
          ticketVersion: parsedTicket?.validationStatus === 'verified-ticket' ? parsedTicket.version || 0 : 0,
          ticketVerification: parsedTicket?.validationStatus === 'verified-ticket'
            ? 'verified-ticket'
            : parsedTicket?.validationStatus === 'legacy-qr'
              ? 'legacy-qr'
              : 'manual-lookup',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      setStatus(`${list.title} marked for ${team.teamName}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(
        message === 'duplicate'
          ? `${team.teamName} is already marked for ${list.title}.`
          : message === 'team-missing'
            ? 'This team no longer exists in registrations.'
            : message === 'section-closed'
              ? 'This attendance section is closed.'
              : message === 'ticket-disabled'
                ? 'This team ticket has been disabled by an administrator.'
              : message === 'unauthorized-section'
                ? 'You are not assigned to this attendance section.'
                : 'Could not mark attendance. Check network and permissions.',
      );
    } finally {
      setMarkingListId('');
    }
  };

  const markAttendance = async (list: AttendanceList) => {
    if (!selectedTeam) return;
    await markAttendanceForTeam(list, selectedTeam);
  };

  const handleLogout = async () => {
    stopCamera();
    await signOut(auth);
  };

  if (!user) {
    return (
      <VolunteerShell onBack={onBack}>
        <EmptyVolunteerState icon={<LogIn className="h-7 w-7" />} title="Volunteer login required" text="Login with the email assigned by the event admin." actionLabel="Login" onAction={onLogin} />
      </VolunteerShell>
    );
  }

  if (!isAdmin && (!isVolunteer || volunteer?.active === false)) {
    return (
      <VolunteerShell onBack={onBack} onLogout={handleLogout}>
        <EmptyVolunteerState icon={<Lock className="h-7 w-7" />} title="Volunteer panel locked" text="This login is not assigned as an active volunteer." />
      </VolunteerShell>
    );
  }

  return (
    <VolunteerShell onBack={onBack} onLogout={handleLogout}>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <VolunteerMetric label="Registered teams" value={teams.length} />
        <VolunteerMetric label="Teams arrived" value={arrivedTeamCount} />
        <VolunteerMetric label="Attendance marks" value={volunteerMarks.length} />
        <VolunteerMetric label="Assigned sections" value={allowedLists.length} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="min-w-0 rounded-[28px] bg-white p-4 shadow-[0_20px_50px_rgba(25,26,35,0.08)] ring-1 ring-[#191A23]/10 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-[#8F64C0]">Attendance desk</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Team QR check-in</h2>
            </div>
            <span className="rounded-full bg-[#B9EDC8] px-3 py-1 text-xs font-black">{allowedLists.length} sections</span>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="flex min-w-0 gap-2">
              <input
                value={scanValue}
                onChange={event => setScanValue(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') handleManualSearch();
                }}
                className="min-h-12 min-w-0 flex-1 rounded-2xl border border-[#191A23]/12 bg-[#FFFDF8] px-4 text-sm font-bold outline-none focus:border-[#8F64C0]"
                placeholder="Paste QR data, team ID, registration ID, or team name"
              />
              <button type="button" onClick={handleManualSearch} className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-[#191A23] text-white" aria-label="Search team">
                <Search className="h-5 w-5" />
              </button>
            </div>

            <button type="button" onClick={() => setScannerOpen(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#CDB0E7] px-4 text-sm font-black text-[#191A23]">
              <Camera className="h-4 w-4" />
              Scan with camera
            </button>

            <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-[#191A23] ring-1 ring-[#191A23]/10">
              <ImageUp className="h-4 w-4" />
              Upload QR image
              <input ref={uploadInputRef} type="file" accept="image/*" className="sr-only" onChange={event => scanImageFile(event.target.files?.[0])} />
            </label>
            {(status || error) && (
              <p className={`rounded-2xl px-4 py-3 text-sm font-bold ${error ? 'bg-[#FFE8E8] text-[#8A1F1F]' : 'bg-[#F3E8FF] text-[#5E3E78]'}`}>{error || status}</p>
            )}
            {lists.length > 0 && allowedLists.length === 0 && (
              <p className="rounded-2xl bg-[#FFF8E8] px-4 py-3 text-sm font-bold text-[#6E4E89]">
                This volunteer has no assigned open section. Ask admin to assign Workshop Attendance, Entry Check-in, Food, GMC, or another checkpoint for this email.
              </p>
            )}
          </div>
        </section>

        <TeamDetailsPanel
          selectedTeam={selectedTeam}
          allowedLists={allowedLists}
          marksByTeamAndList={marksByTeamAndList}
          lastScan={lastScan}
          lastScanSource={lastScanSource}
          markingListId={markingListId}
          onMarkAttendance={markAttendance}
        />
      </div>

      <section className="mt-5 min-w-0 rounded-[28px] bg-white p-4 shadow-[0_20px_50px_rgba(25,26,35,0.08)] ring-1 ring-[#191A23]/10 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-[#8F64C0]">Live attendance</p>
            <h2 className="text-2xl font-black tracking-tight">Marked teams</h2>
          </div>
          <span className="rounded-full bg-[#191A23] px-4 py-2 text-sm font-black text-white">{volunteerMarks.length} marks</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {volunteerMarks.slice(0, 18).map(mark => (
            <div key={mark.id} className="min-w-0 rounded-2xl bg-[#F7F2EA] p-4">
              <p className="text-xs font-black uppercase tracking-wide text-[#8F64C0]">{mark.listTitle}</p>
              <p className="mt-1 break-words font-black">{mark.teamName}</p>
              <p className="mt-1 break-words text-xs font-bold text-[#191A23]/55">{mark.registrationId || mark.teamId} • {mark.markedByName || mark.markedByEmail}</p>
              <p className="mt-1 text-xs font-bold text-[#191A23]/45">{formatDateTime(mark.createdAt) || 'Marked just now'}</p>
            </div>
          ))}
          {volunteerMarks.length === 0 && <p className="text-sm font-bold text-[#191A23]/60">No attendance marks yet.</p>}
        </div>
      </section>

      {scannerOpen && (
        <ScannerModal
          cameraOn={cameraOn}
          status={scannerStatus}
          error={scannerError}
          success={scannerSuccess}
          videoRef={videoRef}
          canvasRef={canvasRef}
          onClose={closeScanner}
          onRetry={() => {
            stopCamera();
            void startCamera();
          }}
        />
      )}
    </VolunteerShell>
  );
}

function TeamDetailsPanel({
  selectedTeam,
  allowedLists,
  marksByTeamAndList,
  lastScan,
  lastScanSource,
  markingListId,
  onMarkAttendance,
}: {
  selectedTeam: StoredRegistration | null;
  allowedLists: AttendanceList[];
  marksByTeamAndList: Record<string, AttendanceMark>;
  lastScan: ParsedEventTicket | null;
  lastScanSource: ScanSource;
  markingListId: string;
  onMarkAttendance: (list: AttendanceList) => void;
}) {
  if (!selectedTeam) {
    return (
      <section className="min-w-0 rounded-[28px] bg-[#FFF8E8] p-4 shadow-[0_20px_50px_rgba(25,26,35,0.08)] ring-1 ring-[#191A23]/10 sm:p-6">
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <ClipboardCheck className="h-12 w-12 text-[#8F64C0]" />
          <h2 className="mt-4 text-2xl font-black">Scan a team pass</h2>
          <p className="mt-2 max-w-sm text-sm font-bold leading-relaxed text-[#191A23]/60">
            Volunteers can mark Workshop Attendance, Entry Check-in, Food, GMC, or any admin-created attendance section after a registered team is loaded.
          </p>
        </div>
      </section>
    );
  }

  const scanStatus = lastScan?.validationStatus === 'verified-ticket'
    ? 'Verified ticket'
    : lastScan?.validationStatus === 'legacy-qr'
      ? 'Legacy QR matched'
      : 'Manual lookup';

  return (
    <section className="min-w-0 rounded-[28px] bg-[#FFF8E8] p-4 shadow-[0_20px_50px_rgba(25,26,35,0.08)] ring-1 ring-[#191A23]/10 sm:p-6">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-[#8F64C0]">{selectedTeam.registrationId || selectedTeam.id}</p>
            <h2 className="mt-1 break-words text-3xl font-black tracking-tight">{selectedTeam.teamName}</h2>
            <p className="mt-2 break-words text-sm font-bold text-[#191A23]/65">
              {selectedTeam.leaderName} • {selectedTeam.collegeName || 'College not set'} • {selectedTeam.location || 'District not set'}
            </p>
          </div>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-black shadow-sm">{selectedTeam.teamSize || 1} members</span>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <DetailPill label="Team ID" value={selectedTeam.id} />
          <DetailPill label="Contact" value={selectedTeam.phoneNumber || selectedTeam.leaderEmail || 'Not added'} />
          <DetailPill label="Track" value={selectedTeam.track || selectedTeam.fieldOfStudy || 'Not set'} />
          <DetailPill label="Registration status" value={selectedTeam.reviewStatus || selectedTeam.accessStatus || 'registered'} />
          <DetailPill label="QR status" value={`${scanStatus} via ${lastScanSource}`} />
          <DetailPill label="Event" value={EVENT_ID} />
        </div>

        <div className="mt-5 grid gap-2">
          <p className="text-xs font-black uppercase tracking-wide text-[#191A23]/45">Attendance sections</p>
          {allowedLists.map(list => {
            const marked = marksByTeamAndList[`${selectedTeam.id}:${list.id}`];
            const isMarking = markingListId === list.id;
            return (
              <div key={list.id} className={`rounded-2xl px-4 py-3 text-sm font-black ${marked ? 'bg-[#B9EDC8] text-[#191A23]' : 'bg-white text-[#191A23] shadow-sm ring-1 ring-[#191A23]/10'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block break-words">{list.title}</span>
                    <span className="mt-1 flex items-center gap-1 text-xs font-bold opacity-65">
                      {marked ? (
                        <>
                          <Clock className="h-3.5 w-3.5" /> Already marked {formatDateTime(marked.createdAt) || 'just now'}
                        </>
                      ) : 'Not marked'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onMarkAttendance(list)}
                    disabled={Boolean(marked) || isMarking}
                    className={`inline-flex min-h-10 flex-none items-center justify-center gap-2 rounded-full px-4 text-xs font-black ${
                      marked
                        ? 'cursor-not-allowed bg-white/60 text-[#191A23]/50'
                        : 'bg-[#191A23] text-white hover:-translate-y-0.5'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {marked ? 'Already marked' : isMarking ? 'Marking...' : 'Mark Attendance'}
                  </button>
                </div>
              </div>
            );
          })}
          {allowedLists.length === 0 && <p className="rounded-2xl bg-white p-4 text-sm font-bold text-[#191A23]/65">No active sections assigned to this volunteer.</p>}
        </div>

        <div className="mt-5 rounded-3xl bg-white p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-[#191A23]/45">Team members</p>
          <div className="grid gap-2">
            <MemberRow name={selectedTeam.leaderName} email={selectedTeam.leaderEmail} role="Leader" />
            {(selectedTeam.members || []).map((member, index) => {
              const rowKey = `${member.email || member.name}-${index}`;
              return (
                <div key={rowKey}>
                  <MemberRow name={member.name} email={member.email || ''} role={`Member ${index + 2}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ScannerModal({
  cameraOn,
  status,
  error,
  success,
  videoRef,
  canvasRef,
  onClose,
  onRetry,
}: {
  cameraOn: boolean;
  status: string;
  error: string;
  success: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onClose: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#191A23]/70 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-[#FFFDF8] shadow-[0_28px_80px_rgba(0,0,0,0.28)] ring-1 ring-[#191A23]/15">
        <div className="flex items-center justify-between gap-3 border-b border-[#191A23]/10 px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-[#8F64C0]">Camera check-in</p>
            <h2 className="text-2xl font-black tracking-tight">Scan Team QR Pass</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white text-[#191A23] ring-1 ring-[#191A23]/10" aria-label="Close scanner">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-5">
          <div className="relative overflow-hidden rounded-3xl bg-[#191A23]">
            <video ref={videoRef} autoPlay muted playsInline className="aspect-[4/3] w-full bg-[#191A23] object-cover sm:aspect-video" />
            <canvas ref={canvasRef} className="hidden" />
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#191A23] text-center text-white">
                <div>
                  <Camera className="mx-auto h-10 w-10 opacity-80" />
                  <p className="mt-3 text-sm font-black">{status || 'Waiting for camera...'}</p>
                </div>
              </div>
            )}
            {cameraOn && (
              <div className="pointer-events-none absolute inset-8 rounded-3xl border-2 border-white/70 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]" />
            )}
          </div>

          {(status || error || success) && (
            <p className={`rounded-2xl px-4 py-3 text-sm font-bold ${
              error ? 'bg-[#FFE8E8] text-[#8A1F1F]' : success ? 'bg-[#E8FFE9] text-[#226030]' : 'bg-[#F3E8FF] text-[#5E3E78]'
            }`}>
              {error || success || status}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-[#191A23] ring-1 ring-[#191A23]/10">
              <RotateCcw className="h-4 w-4" /> Retry scan
            </button>
            <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#191A23] px-5 text-sm font-black text-white">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VolunteerShell({ onBack, onLogout, children }: { onBack: () => void; onLogout?: () => void; children: ReactNode }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F7F2EA] px-4 pb-16 pt-28 text-[#191A23] md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-black text-[#191A23]/65 hover:text-[#191A23]">
            <ArrowLeft className="h-4 w-4" /> Back to event
          </button>
          {onLogout && (
            <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-[#191A23] shadow-sm ring-1 ring-[#191A23]/10">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          )}
        </div>
        <header className="mb-6 rounded-[30px] bg-white p-5 shadow-[0_18px_40px_rgba(25,26,35,0.08)] ring-1 ring-[#191A23]/10 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-[#B9EDC8]">
              <Users className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#8F64C0]">Volunteer Panel</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">Volunteer dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm font-bold leading-relaxed text-[#191A23]/58">Scan team QR passes, confirm registered team details, and mark admin-assigned attendance checkpoints.</p>
            </div>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}

function EmptyVolunteerState({ icon, title, text, actionLabel, onAction }: { icon: ReactNode; title: string; text: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <section className="rounded-[28px] bg-white p-8 text-center shadow-[0_20px_50px_rgba(25,26,35,0.08)] ring-1 ring-[#191A23]/10">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F3E8FF] text-[#8F64C0]">{icon}</span>
      <h2 className="mt-5 text-3xl font-black tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-relaxed text-[#191A23]/60">{text}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="mt-5 rounded-full bg-[#191A23] px-6 py-3 text-sm font-black text-white">
          {actionLabel}
        </button>
      )}
    </section>
  );
}

function VolunteerMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[22px] bg-white p-4 shadow-[0_14px_34px_rgba(25,26,35,0.07)] ring-1 ring-[#191A23]/10">
      <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#8F64C0]">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-[#191A23]/40">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-[#191A23]">{value}</p>
    </div>
  );
}

function MemberRow({ name, email, role }: { name: string; email: string; role: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-[#FFF8E8] px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{name || 'Unnamed'}</p>
        <p className="truncate text-xs font-bold text-[#191A23]/50">{email || 'No email'}</p>
      </div>
      <span className="flex-none rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-[#8F64C0]">{role}</span>
    </div>
  );
}
