import { useEffect, useState } from 'react';
import { updateProfile, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Download, GraduationCap, Loader2, LogOut, MapPin, Phone, QrCode, Save, User, X } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { AccountRegistration, Registration } from '../types';
import {
  badgeTemplateUrl,
  createRegistrationQrUrl,
  downloadRegistrationBadge,
  getPreviewNameSize,
  teamNameDocId,
} from '../lib/registrationBadge';

interface ProfilePanelProps {
  isOpen: boolean;
  user: FirebaseUser | null;
  onClose: () => void;
}

export default function ProfilePanel({ isOpen, user, onClose }: ProfilePanelProps) {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [status, setStatus] = useState('');
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerStatus, setBannerStatus] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDisplayName(user?.displayName || '');
      setStatus('');
    }
  }, [isOpen, user]);

  useEffect(() => {
    let active = true;

    const loadRegistrationBanner = async () => {
      if (!isOpen || !user) return;

      setBannerLoading(true);
      setBannerStatus('');
      setRegistration(null);
      setQrUrl('');

      try {
        const accountSnapshot = await getDoc(doc(db, 'accountRegistrations', user.uid));
        if (!accountSnapshot.exists()) {
          if (active) setBannerStatus('Register your team to generate the QR banner.');
          return;
        }

        const accountData = accountSnapshot.data() as AccountRegistration;
        const teamDocId = teamNameDocId(accountData.teamName || '');
        const registrationSnapshot = teamDocId
          ? await getDoc(doc(db, 'registrations', teamDocId))
          : null;
        const dbRegistration = registrationSnapshot?.exists()
          ? ({ ...registrationSnapshot.data(), teamNameKey: teamDocId } as Registration)
          : null;
        const summaryRegistration = accountData.registrationSummary
          ? ({ ...accountData.registrationSummary, teamNameKey: accountData.registrationSummary.teamNameKey || teamDocId } as Registration)
          : null;
        const nextRegistration = dbRegistration || summaryRegistration;

        if (!active) return;

        if (!nextRegistration) {
          setBannerStatus('Team registration was found, but the banner details are not available yet.');
          return;
        }

        setRegistration(nextRegistration);
        setQrUrl(await createRegistrationQrUrl(nextRegistration));
      } catch {
        if (active) setBannerStatus('Could not load your team banner right now.');
      } finally {
        if (active) setBannerLoading(false);
      }
    };

    loadRegistrationBanner();

    return () => {
      active = false;
    };
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleSave = async () => {
    setStatus('');
    await updateProfile(user, { displayName: displayName.trim() || null });
    setStatus('Profile saved.');
  };

  const handleLogout = async () => {
    await signOut(auth);
    onClose();
  };

  const handleDownloadBanner = async () => {
    if (!registration) return;
    setBannerStatus('');
    await downloadRegistrationBadge(registration, qrUrl);
  };

  const nameSize = registration ? getPreviewNameSize(registration.leaderName) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close profile settings"
        onClick={onClose}
        className="absolute inset-0 bg-[#191A23]/90 backdrop-blur-md"
      />
      <div className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto bg-white text-[#191A23] border-4 border-[#191A23] rounded-[28px] shadow-[8px_8px_0px_#B9FF66] p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 border-b-2 border-[#191A23]/10 pb-4 mb-5">
          <div>
            <span className="bg-[#B9FF66] text-[#191A23] font-mono font-bold text-xs px-2.5 py-1 border-2 border-[#191A23] rounded-md shadow-[2px_2px_0px_#191A23] tracking-wide uppercase">
              Profile
            </span>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Account Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-[#F3F3F3] border-2 border-[#191A23] rounded-lg shadow-[2px_2px_0px_#191A23] transition-all"
            aria-label="Close profile"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="profileName" className="font-bold text-sm block">Display Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                <input
                  id="profileName"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full text-sm font-medium border-2 border-[#191A23] bg-[#F3F3F3] pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B9FF66]/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-sm block">Email Address</span>
              <div className="text-sm font-mono border-2 border-[#191A23] bg-[#F3F3F3] px-4 py-2.5 rounded-xl">
                {user.email}
              </div>
            </div>

            {registration && (
              <div className="space-y-2 rounded-2xl border-2 border-[#191A23]/10 bg-[#F7F8FA] p-4">
                <p className="text-xs font-black uppercase text-[#191A23]/55">Registered Team</p>
                <h3 className="text-xl font-black tracking-tight">{registration.teamName}</h3>
                <div className="space-y-2 text-xs font-bold text-[#191A23]/75">
                  <p className="flex gap-2"><GraduationCap className="h-4 w-4 flex-none" /> {registration.collegeName}</p>
                  <p className="flex gap-2"><MapPin className="h-4 w-4 flex-none" /> {registration.location}</p>
                  <p className="flex gap-2"><Phone className="h-4 w-4 flex-none" /> {registration.phoneNumber}</p>
                </div>
              </div>
            )}

            {status && <p className="text-xs font-bold text-emerald-700">{status}</p>}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button type="button" onClick={handleSave} className="neo-btn py-3 text-sm uppercase flex items-center justify-center gap-2 cursor-pointer">
                <Save className="w-4 h-4" /> Save
              </button>
              <button type="button" onClick={handleLogout} className="neo-btn-white py-3 text-sm uppercase flex items-center justify-center gap-2 cursor-pointer">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>

          <section className="rounded-2xl border-2 border-[#191A23] bg-[#10131D] p-3 text-white shadow-[4px_4px_0px_#191A23] md:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#B9FF66]">Team QR Banner</p>
                <h3 className="text-xl font-black tracking-tight">Registration Pass</h3>
              </div>
              <button
                type="button"
                onClick={handleDownloadBanner}
                disabled={!registration || bannerLoading}
                className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#B9FF66] px-3 py-2 text-xs font-black uppercase text-[#10131D] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Download
              </button>
            </div>

            {bannerLoading ? (
              <div className="flex min-h-64 items-center justify-center rounded-xl bg-white/8 text-sm font-bold text-white/70">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading banner
              </div>
            ) : registration ? (
              <div
                className="relative aspect-video w-full overflow-hidden rounded-xl bg-cover bg-center shadow-2xl ring-1 ring-white/20"
                style={{ backgroundImage: `url(${badgeTemplateUrl})` }}
              >
                <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/28 via-black/6 to-black/14" />

                <div className="absolute left-[5%] top-[6%] z-10 rounded-md bg-black/45 px-2 py-1.5 backdrop-blur-sm">
                  <p className="text-[7px] font-black uppercase tracking-[0.22em] text-white/70 sm:text-[9px]">Shifa SDG ID</p>
                  <p className="font-mono text-[9px] font-black text-[#B9FF66] sm:text-xs">{registration.registrationId}</p>
                </div>

                <div className="absolute right-[5.5%] top-[7%] z-30 w-[18%] min-w-[58px] rounded-md bg-white p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
                  {qrUrl ? (
                    <img src={qrUrl} alt={`QR code for ${registration.registrationId}`} className="block h-full w-full" />
                  ) : (
                    <QrCode className="h-full w-full text-[#191A23]" />
                  )}
                </div>

                <div className="absolute left-[5%] top-[31%] z-10 w-[66%] text-left">
                  <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#B9FF66] drop-shadow sm:text-[10px]">
                    Registered Team Leader
                  </p>
                  <h2
                    className="mt-1 max-w-[780px] font-black leading-[0.96] text-white drop-shadow-[0_5px_14px_rgba(0,0,0,0.55)]"
                    style={{ fontSize: nameSize }}
                  >
                    {registration.leaderName}
                  </h2>
                  <div className="mt-2 space-y-0.5 text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.5)] sm:mt-3">
                    <p className="text-[11px] font-black leading-tight sm:text-base md:text-xl">{registration.fieldOfStudy}</p>
                    <p className="text-[10px] font-black leading-tight sm:text-sm md:text-lg">TID - {registration.teamName}</p>
                    <p className="max-w-[620px] text-[9px] font-semibold leading-tight text-white/90 sm:text-xs md:text-base">{registration.collegeName}</p>
                    <p className="max-w-[620px] text-[8px] font-semibold leading-tight text-white/85 sm:text-xs md:text-sm">{registration.location}</p>
                    <p className="text-[7px] font-mono font-bold text-white/80 sm:text-[10px] md:text-xs">{registration.track} | {registration.phoneNumber}</p>
                  </div>
                </div>

                <div className="absolute bottom-[5%] left-[5%] right-[5%] z-10 flex items-end justify-between border-t border-white/45 pt-2">
                  <p className="text-[7px] font-black uppercase tracking-[0.18em] text-white/75 sm:text-[9px]">
                    Verified Shifa SDG Registration
                  </p>
                  <p className="text-sm font-black text-white/90 sm:text-xl">{String(registration.teamSize).padStart(2, '0')}</p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-white/8 p-6 text-center">
                <QrCode className="h-10 w-10 text-[#B9FF66]" />
                <p className="mt-3 text-sm font-bold text-white/75">{bannerStatus || 'No team banner available yet.'}</p>
              </div>
            )}

            {bannerStatus && registration && (
              <p className="mt-3 text-xs font-bold text-white/70">{bannerStatus}</p>
            )}
          </section>
          </div>
      </div>
    </div>
  );
}
