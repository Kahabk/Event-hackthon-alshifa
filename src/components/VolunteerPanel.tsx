import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, Camera, CheckCircle2, ClipboardCheck, Lock, LogIn, LogOut, Search, Trash2, Users, X } from 'lucide-react';
import { signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import jsQR from 'jsqr';
import { AttendanceList, AttendanceMark, StoredRegistration, Volunteer } from '../types';
import { auth, db } from '../lib/firebase';

interface VolunteerPanelProps {
  user: FirebaseUser | null;
  isAdmin: boolean;
  isVolunteer: boolean;
  onBack: () => void;
  onLogin: () => void;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
const markDocId = (listId: string, teamId: string) => `${listId}_${teamId}`;

const parseScanValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return { registrationId: '', teamName: '', raw: '' };

  try {
    const data = JSON.parse(trimmed) as { registrationId?: string; teamName?: string };
    return {
      registrationId: String(data.registrationId || '').trim(),
      teamName: String(data.teamName || '').trim(),
      raw: trimmed,
    };
  } catch {
    const registrationMatch = trimmed.match(/SDG-[A-Z0-9-]+/i);
    return {
      registrationId: registrationMatch?.[0]?.toUpperCase() || trimmed,
      teamName: '',
      raw: trimmed,
    };
  }
};

export default function VolunteerPanel({ user, isAdmin, isVolunteer, onBack, onLogin }: VolunteerPanelProps) {
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [lists, setLists] = useState<AttendanceList[]>([]);
  const [marks, setMarks] = useState<AttendanceMark[]>([]);
  const [teams, setTeams] = useState<StoredRegistration[]>([]);
  const [scanValue, setScanValue] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<StoredRegistration | null>(null);
  const [status, setStatus] = useState('');
  const [cameraStatus, setCameraStatus] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

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
      () => setStatus('Could not load attendance checkpoints.'),
    );
    const unsubscribeMarks = onSnapshot(
      query(collection(db, 'attendanceMarks'), orderBy('createdAt', 'desc')),
      snapshot => setMarks(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AttendanceMark))),
      () => setStatus('Could not load attendance records.'),
    );

    void getDocs(query(collection(db, 'registrations'), orderBy('createdAt', 'desc'))).then(snapshot => {
      setTeams(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as StoredRegistration)));
    }).catch(() => setStatus('Could not load registered teams.'));

    return () => {
      unsubscribeLists();
      unsubscribeMarks();
    };
  }, [isAdmin, isVolunteer, user]);

  useEffect(() => {
    return () => stopCamera();
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
    return marks.filter(mark => allowedIds.has(mark.listId));
  }, [allowedLists, marks]);
  const arrivedTeamCount = useMemo(() => new Set(volunteerMarks.map(mark => mark.teamId)).size, [volunteerMarks]);

  const findTeam = (value: string) => {
    const parsed = parseScanValue(value);
    const registrationId = parsed.registrationId.toLowerCase();
    const teamName = normalizeText(parsed.teamName || parsed.raw);
    return teams.find(team => (
      team.registrationId?.toLowerCase() === registrationId
      || normalizeText(team.teamName) === teamName
      || team.id.toLowerCase() === registrationId
    )) || null;
  };

  const handleScan = (value = scanValue) => {
    const team = findTeam(value);
    setSelectedTeam(team);
    setScanValue(value);
    setStatus(team ? `Loaded ${team.teamName}.` : 'No registered team found for this QR or team ID.');
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('Camera access is not available in this browser. Use manual team ID search or upload a QR image.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraOn(true);
      setCameraStatus('Point camera at the team QR pass.');
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 0);

      scanTimerRef.current = window.setInterval(scanCameraFrame, 350);
    } catch {
      setCameraStatus('Camera permission was blocked. Use manual team ID search or upload a QR image.');
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
    if (code?.data) {
      handleScan(code.data);
      setCameraStatus('QR scanned.');
      stopCamera();
    }
  };

  const scanImageFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return;
        context.drawImage(image, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
        if (code?.data) {
          handleScan(code.data);
          setCameraStatus('QR image scanned.');
        } else {
          setCameraStatus('Could not read a QR code from that image.');
        }
      };
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const stopCamera = () => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const toggleMark = async (list: AttendanceList) => {
    if (!user || !selectedTeam) return;
    const existing = marksByTeamAndList[`${selectedTeam.id}:${list.id}`];
    const id = markDocId(list.id, selectedTeam.id);

    if (existing) {
      await deleteDoc(doc(db, 'attendanceMarks', id));
      setStatus(`${list.title} removed for ${selectedTeam.teamName}.`);
      return;
    }

    await setDoc(doc(db, 'attendanceMarks', id), {
      listId: list.id,
      listTitle: list.title,
      teamId: selectedTeam.id,
      registrationId: selectedTeam.registrationId || '',
      teamName: selectedTeam.teamName,
      leaderName: selectedTeam.leaderName,
      collegeName: selectedTeam.collegeName || '',
      location: selectedTeam.location || '',
      teamSize: selectedTeam.teamSize || 1,
      members: selectedTeam.members || [],
      markedByUid: user.uid,
      markedByEmail: user.email || '',
      markedByName: user.displayName || user.email || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    setStatus(`${list.title} marked for ${selectedTeam.teamName}.`);
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
        <section className="rounded-[28px] bg-white p-4 shadow-[0_20px_50px_rgba(25,26,35,0.08)] ring-1 ring-[#191A23]/10 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-[#8F64C0]">Scan desk</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Team QR check-in</h2>
            </div>
            <span className="rounded-full bg-[#B9EDC8] px-3 py-1 text-xs font-black">{allowedLists.length} sections</span>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="flex gap-2">
              <input
                value={scanValue}
                onChange={event => setScanValue(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') handleScan();
                }}
                className="min-h-12 flex-1 rounded-2xl border border-[#191A23]/12 bg-[#FFFDF8] px-4 text-sm font-bold outline-none focus:border-[#8F64C0]"
                placeholder="Paste QR data, team ID, or team name"
              />
              <button type="button" onClick={() => handleScan()} className="rounded-2xl bg-[#191A23] px-4 text-white">
                <Search className="h-5 w-5" />
              </button>
            </div>

            <button type="button" onClick={cameraOn ? stopCamera : startCamera} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#CDB0E7] px-4 text-sm font-black text-[#191A23]">
              {cameraOn ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              {cameraOn ? 'Stop camera' : 'Scan with camera'}
            </button>

            {cameraOn && (
              <>
                <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full rounded-3xl bg-[#191A23] object-cover" />
                <canvas ref={canvasRef} className="hidden" />
              </>
            )}
            {!cameraOn && <canvas ref={canvasRef} className="hidden" />}
            <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-[#191A23] ring-1 ring-[#191A23]/10">
              Upload QR image
              <input type="file" accept="image/*" className="sr-only" onChange={event => scanImageFile(event.target.files?.[0])} />
            </label>
            {(cameraStatus || status) && (
              <p className="rounded-2xl bg-[#F3E8FF] px-4 py-3 text-sm font-bold text-[#5E3E78]">{status || cameraStatus}</p>
            )}
            {lists.length > 0 && allowedLists.length === 0 && (
              <p className="rounded-2xl bg-[#FFF8E8] px-4 py-3 text-sm font-bold text-[#6E4E89]">
                This volunteer has no assigned open section. Ask admin to tick Food, Entry, GMC, or another checkpoint for this email.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-[28px] bg-[#FFF8E8] p-4 shadow-[0_20px_50px_rgba(25,26,35,0.08)] ring-1 ring-[#191A23]/10 sm:p-6">
          {selectedTeam ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-[#8F64C0]">{selectedTeam.registrationId || 'Registered team'}</p>
                  <h2 className="mt-1 break-words text-3xl font-black tracking-tight">{selectedTeam.teamName}</h2>
                  <p className="mt-2 text-sm font-bold text-[#191A23]/65">{selectedTeam.leaderName} • {selectedTeam.collegeName || 'College not set'} • {selectedTeam.location || 'District not set'}</p>
                </div>
                <span className="rounded-full bg-white px-4 py-2 text-sm font-black shadow-sm">{selectedTeam.teamSize || 1} members</span>
              </div>

              <div className="mt-5 grid gap-2">
                <p className="text-xs font-black uppercase tracking-wide text-[#191A23]/45">Attendance sections</p>
                {allowedLists.map(list => {
                  const marked = marksByTeamAndList[`${selectedTeam.id}:${list.id}`];
                  return (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => toggleMark(list)}
                      className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl px-4 text-left text-sm font-black transition ${
                        marked ? 'bg-[#B9EDC8] text-[#191A23]' : 'bg-white text-[#191A23] shadow-sm ring-1 ring-[#191A23]/10'
                      }`}
                    >
                      <span>
                        {list.title}
                        {marked && <span className="ml-2 text-xs font-bold opacity-65">already marked</span>}
                      </span>
                      {marked ? <Trash2 className="h-4 w-4" /> : <CheckCircle2 className="h-5 w-5" />}
                    </button>
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
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <ClipboardCheck className="h-12 w-12 text-[#8F64C0]" />
              <h2 className="mt-4 text-2xl font-black">Scan a team pass</h2>
              <p className="mt-2 max-w-sm text-sm font-bold leading-relaxed text-[#191A23]/60">
                Volunteers can mark food, entry, GMC, or any admin-created attendance section after the QR loads a registered team.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="mt-5 rounded-[28px] bg-white p-4 shadow-[0_20px_50px_rgba(25,26,35,0.08)] ring-1 ring-[#191A23]/10 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-[#8F64C0]">Live attendance</p>
            <h2 className="text-2xl font-black tracking-tight">Marked teams</h2>
          </div>
          <span className="rounded-full bg-[#191A23] px-4 py-2 text-sm font-black text-white">{volunteerMarks.length} marks</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {volunteerMarks.slice(0, 18).map(mark => (
            <div key={mark.id} className="rounded-2xl bg-[#F7F2EA] p-4">
              <p className="text-xs font-black uppercase tracking-wide text-[#8F64C0]">{mark.listTitle}</p>
              <p className="mt-1 break-words font-black">{mark.teamName}</p>
              <p className="mt-1 text-xs font-bold text-[#191A23]/55">{mark.registrationId || mark.teamId} • {mark.markedByName || mark.markedByEmail}</p>
            </div>
          ))}
          {volunteerMarks.length === 0 && <p className="text-sm font-bold text-[#191A23]/60">No attendance marks yet.</p>}
        </div>
      </section>
    </VolunteerShell>
  );
}

function VolunteerShell({ onBack, onLogout, children }: { onBack: () => void; onLogout?: () => void; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F7F2EA] px-4 pb-16 pt-28 text-[#191A23] md:px-8">
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
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B9EDC8]">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-[#8F64C0]">Volunteer Panel</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">Attendance scanner</h1>
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

function MemberRow({ name, email, role }: { name: string; email: string; role: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#FFF8E8] px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{name || 'Unnamed'}</p>
        <p className="truncate text-xs font-bold text-[#191A23]/50">{email || 'No email'}</p>
      </div>
      <span className="flex-none rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-[#8F64C0]">{role}</span>
    </div>
  );
}
