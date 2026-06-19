import { useEffect, useState } from 'react';
import { updateProfile, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowLeft, Check, Download, GraduationCap, Home, LayoutDashboard, Loader2, LogOut, Mail, MapPin, Phone, QrCode, Save, User, VenusAndMars, X } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { getAvatarById, getAvatarByUrl, getFallbackAvatar, profileAvatars } from '../lib/profileAvatars';
import { AccountRegistration, Registration } from '../types';
import {
  createRegistrationQrUrl,
  downloadRegistrationBadge,
  teamNameDocId,
} from '../lib/registrationBadge';
import AppleStyleAvatar from './AppleStyleAvatar';
import RegistrationPassCard from './RegistrationPassCard';

interface ProfilePanelProps {
  isOpen: boolean;
  user: FirebaseUser | null;
  onClose: () => void;
  onProfileUpdated?: () => void;
  presentation?: 'modal' | 'page';
  onLogin?: () => void;
  onDashboardClick?: () => void;
}

interface StoredUserProfile {
  displayName?: string;
  photoURL?: string;
  avatarId?: string;
  address?: string;
  pinCode?: string;
  gender?: 'male' | 'female' | '';
}

export default function ProfilePanel({ isOpen, user, onClose, onProfileUpdated, presentation = 'modal', onLogin, onDashboardClick }: ProfilePanelProps) {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [address, setAddress] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [selectedAvatarId, setSelectedAvatarId] = useState('');
  const [status, setStatus] = useState('');
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerStatus, setBannerStatus] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'manage' | 'pass'>('manage');
  const [profileLevel, setProfileLevel] = useState<'overview' | 'avatars'>('overview');

  useEffect(() => {
    let active = true;

    if (isOpen) {
      setDisplayName(user?.displayName || '');
      setAddress('');
      setPinCode('');
      setGender('');
      setSelectedAvatarId(getAvatarByUrl(user?.photoURL)?.id || getFallbackAvatar(user?.uid || '')?.id || '');
      setStatus('');
      setActiveProfileTab('manage');
      setProfileLevel('overview');

      const loadProfile = async () => {
        if (!user) return;

        setProfileLoading(true);
        try {
          const profileSnapshot = await getDoc(doc(db, 'userProfiles', user.uid));
          const profile = profileSnapshot.exists() ? profileSnapshot.data() as StoredUserProfile : null;
          const profileAvatar = getAvatarById(profile?.avatarId) || getAvatarByUrl(profile?.photoURL);
          const userAvatar = getAvatarByUrl(user.photoURL);
          const fallbackAvatar = getFallbackAvatar(user.uid);

          if (!active) return;

          setDisplayName(profile?.displayName || user.displayName || '');
          setAddress(profile?.address || '');
          setPinCode(profile?.pinCode || '');
          setGender(profile?.gender || '');
          setSelectedAvatarId((profileAvatar || userAvatar || fallbackAvatar)?.id || '');
        } catch {
          if (active) setStatus('Could not load saved profile details.');
        } finally {
          if (active) setProfileLoading(false);
        }
      };

      loadProfile();
    }

    return () => {
      active = false;
    };
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

  if (!isOpen) return null;

  if (!user) {
    const loginCard = (
      <div className="mx-auto max-w-xl rounded-[24px] border-3 border-[#191A23] bg-white p-6 text-center shadow-[6px_6px_0px_#CDB0E7]">
        <QrCode className="mx-auto h-10 w-10 text-[#9B6AC8]" />
        <h1 className="mt-4 text-3xl font-black tracking-tight">Open your profile</h1>
        <p className="mt-2 text-sm font-bold text-[#191A23]/65">Login first to manage avatar, address, pin code, and team QR pass.</p>
        <button type="button" onClick={onLogin} className="neo-btn mt-5 px-5 py-3 text-sm uppercase">
          Login
        </button>
      </div>
    );

    if (presentation === 'page') {
      return <main className="min-h-screen bg-[#FFF8E8] px-4 pb-16 pt-28">{loginCard}</main>;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" aria-label="Close profile settings" onClick={onClose} className="absolute inset-0 bg-[#191A23]/90 backdrop-blur-md" />
        <div className="relative z-10">{loginCard}</div>
      </div>
    );
  }

  const handleSave = async () => {
    setStatus('');
    const selectedAvatar = getAvatarById(selectedAvatarId) || getFallbackAvatar(user.uid);
    const nextDisplayName = displayName.trim();
    const nextAddress = address.trim();
    const nextPinCode = pinCode.trim();

    await updateProfile(user, {
      displayName: nextDisplayName || null,
      photoURL: selectedAvatar?.url || null,
    });

    await setDoc(doc(db, 'userProfiles', user.uid), {
      uid: user.uid,
      email: user.email || '',
      displayName: nextDisplayName,
      photoURL: selectedAvatar?.url || '',
      avatarId: selectedAvatar?.id || '',
      address: nextAddress,
      pinCode: nextPinCode,
      gender,
      providerIds: user.providerData.map(provider => provider.providerId),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });

    setStatus('Profile saved.');
    onProfileUpdated?.();
  };

  const handleLogout = async () => {
    await signOut(auth);
    onClose();
  };

  const handleDownloadBanner = async () => {
    if (!registration) return;
    setBannerStatus('');
    await downloadRegistrationBadge(registration, qrUrl, selectedAvatar?.url, profileTitle, address.trim());
  };

  const selectedAvatar = getAvatarById(selectedAvatarId) || getFallbackAvatar(user.uid);
  const profileTitle = displayName.trim() || user.displayName || user.email?.split('@')[0] || 'Your profile';
  const frameClass = presentation === 'modal'
    ? 'bg-[#FFFDF8] shadow-[0_24px_90px_rgba(0,0,0,0.24)] ring-1 ring-white/20'
    : 'bg-white/90 shadow-[0_28px_90px_rgba(25,26,35,0.12)] ring-1 ring-[#191A23]/10';
  const closeButtonClass = presentation === 'modal'
    ? 'shadow-[0_10px_24px_rgba(25,26,35,0.16)] ring-1 ring-[#191A23]/10'
    : 'shadow-[0_10px_24px_rgba(25,26,35,0.10)] ring-1 ring-[#191A23]/10';

  const content = (
      <div className={`${presentation === 'modal' ? 'relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-y-auto' : 'mx-auto w-full max-w-7xl'} ${frameClass} rounded-[22px] p-3 text-[#191A23] sm:rounded-[28px] sm:p-5 md:p-6`}>
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#191A23]/10 pb-4 sm:mb-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <AppleStyleAvatar size="lg" variant="purple" imageUrl={selectedAvatar?.url || user.photoURL} className="memoji-avatar" />
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-[#B9EDC8] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-[#191A23] ring-1 ring-[#191A23]/10 sm:text-xs">
                Profile
              </span>
              <h2 className="mt-1 truncate text-xl font-black tracking-tight sm:mt-2 sm:text-2xl">Account Settings</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg bg-white p-1.5 transition-all hover:bg-[#F3F3F3] ${closeButtonClass}`}
            aria-label={presentation === 'page' ? 'Back' : 'Close profile'}
          >
            {presentation === 'page' ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>

        {profileLevel === 'avatars' ? (
          <section className="mx-auto max-w-5xl space-y-4 sm:space-y-5">
            <div className="flex flex-col gap-4 rounded-[24px] bg-[#F8F3FC] p-3 shadow-[0_18px_50px_rgba(25,26,35,0.08)] ring-1 ring-[#191A23]/10 sm:flex-row sm:items-center sm:justify-between sm:rounded-[28px] sm:p-4 md:p-5">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setProfileLevel('overview')}
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white shadow-[0_10px_24px_rgba(25,26,35,0.10)] ring-1 ring-[#191A23]/10 sm:h-11 sm:w-11"
                  aria-label="Back to profile"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-[#9B6AC8]">Avatar Library</p>
                  <h3 className="truncate text-xl font-black tracking-tight sm:text-2xl">Choose avatar</h3>
                </div>
              </div>
              <div className="flex w-full items-center gap-3 rounded-full bg-white px-3 py-2 shadow-[0_10px_24px_rgba(25,26,35,0.08)] ring-1 ring-[#191A23]/10 sm:w-auto">
                <AppleStyleAvatar size="md" variant="purple" imageUrl={selectedAvatar?.url} />
                <span className="min-w-0 truncate pr-2 text-sm font-black">{profileTitle}</span>
              </div>
            </div>

            <div className="rounded-[24px] bg-white p-3 shadow-[0_24px_70px_rgba(25,26,35,0.10)] ring-1 ring-[#191A23]/10 sm:rounded-[30px] md:p-5">
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-6 lg:grid-cols-8">
                {profileAvatars.map(avatar => {
                  const isSelected = selectedAvatarId === avatar.id;

                  return (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatarId(avatar.id)}
                      className={`group relative aspect-square rounded-2xl bg-[#FFF8E8] p-1.5 transition-all duration-200 sm:rounded-[22px] sm:p-2 ${
                        isSelected
                          ? 'shadow-[0_16px_34px_rgba(155,106,200,0.22)] ring-2 ring-[#9B6AC8]'
                          : 'shadow-[0_8px_20px_rgba(25,26,35,0.06)] ring-1 ring-[#191A23]/10 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(25,26,35,0.10)]'
                      }`}
                      title={avatar.label}
                      aria-pressed={isSelected}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.label}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full rounded-xl object-cover sm:rounded-[18px]"
                      />
                      {isSelected && (
                        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#B9EDC8] shadow-[0_8px_18px_rgba(25,26,35,0.15)] ring-1 ring-[#191A23]/10">
                          <Check className="h-3.5 w-3.5 stroke-[4]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex sm:mt-5 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setProfileLevel('overview')}
                  className="w-full rounded-full bg-[#B9EDC8] px-5 py-3 text-sm font-black uppercase shadow-[0_12px_26px_rgba(25,26,35,0.10)] ring-1 ring-[#191A23]/10 sm:w-auto"
                >
                  Use selected avatar
                </button>
              </div>
            </div>
          </section>
        ) : (
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-2 rounded-[18px] bg-[#F4ECFA] p-1 ring-1 ring-[#191A23]/10 sm:rounded-[22px] sm:p-1.5">
            {[
              { id: 'manage' as const, label: 'Manage Profile' },
              { id: 'pass' as const, label: 'Registration Pass' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveProfileTab(tab.id)}
                className={`rounded-2xl px-2 py-2.5 text-xs font-black transition-all sm:rounded-[18px] sm:px-4 sm:py-3 sm:text-sm ${
                  activeProfileTab === tab.id
                    ? 'bg-white text-[#191A23] shadow-[0_12px_28px_rgba(25,26,35,0.10)]'
                    : 'text-[#191A23]/62 hover:text-[#191A23]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={`${activeProfileTab === 'manage' ? 'mx-auto grid max-w-5xl gap-4 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]' : 'hidden'}`}>
          <div>
            <section className="rounded-[24px] bg-[#F8F3FC] p-3 shadow-[0_18px_50px_rgba(25,26,35,0.08)] ring-1 ring-[#191A23]/10 sm:rounded-[28px] sm:p-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="rounded-[22px] bg-white p-2 shadow-[0_12px_28px_rgba(25,26,35,0.10)] ring-1 ring-[#191A23]/10 sm:rounded-[24px]">
                  <AppleStyleAvatar size="lg" variant="purple" imageUrl={selectedAvatar?.url} className="memoji-avatar" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#9B6AC8]">Profile Avatar</p>
                  <h3 className="truncate text-xl font-black sm:text-2xl">{profileTitle}</h3>
                  <p className="text-xs font-bold text-[#191A23]/58">{profileAvatars.length} avatars available</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileLevel('avatars')}
                className="mt-4 w-full rounded-full bg-white px-4 py-3 text-sm font-black uppercase shadow-[0_10px_22px_rgba(25,26,35,0.08)] ring-1 ring-[#191A23]/10 transition hover:bg-[#FFF8E8]"
              >
                Change avatar
              </button>
            </section>
          </div>

          <div className="space-y-4 rounded-[24px] bg-white/80 p-3 shadow-[0_18px_50px_rgba(25,26,35,0.08)] ring-1 ring-[#191A23]/10 sm:rounded-[28px] sm:p-4 md:p-5">
            <div className="space-y-1">
              <label htmlFor="profileName" className="font-bold text-sm block">Display Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                <input
                  id="profileName"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full rounded-2xl bg-[#FFFDF8] py-3 pl-11 pr-4 text-base font-medium shadow-[0_8px_22px_rgba(25,26,35,0.06)] ring-1 ring-[#191A23]/10 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CDB0E7] sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="profileAddress" className="font-bold text-sm block">Address</label>
              <div className="relative">
                <Home className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-[#191A23]/50" />
                <textarea
                  id="profileAddress"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-2xl bg-[#FFFDF8] py-3 pl-11 pr-4 text-base font-medium shadow-[0_8px_22px_rgba(25,26,35,0.06)] ring-1 ring-[#191A23]/10 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CDB0E7] sm:text-sm"
                  placeholder="House name, street, place"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="profilePinCode" className="font-bold text-sm block">Pin Code</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                  <input
                    id="profilePinCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinCode}
                    onChange={(event) => setPinCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full rounded-2xl bg-[#FFFDF8] py-3 pl-11 pr-4 text-base font-medium shadow-[0_8px_22px_rgba(25,26,35,0.06)] ring-1 ring-[#191A23]/10 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CDB0E7] sm:text-sm"
                    placeholder="686001"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-sm block">Gender</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['male', 'female'] as const).map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setGender(option)}
                      className={`flex min-h-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-black capitalize shadow-[0_8px_22px_rgba(25,26,35,0.06)] ring-1 transition-all ${
                        gender === option
                          ? 'bg-[#B9EDC8] ring-[#191A23]/10'
                          : 'bg-white ring-[#191A23]/10 hover:bg-[#FFF8E8]'
                      }`}
                    >
                      <VenusAndMars className="h-4 w-4" />
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-sm block">Email Address</span>
              <div className="flex items-center gap-3 rounded-2xl bg-[#FFFDF8] px-4 py-3 text-sm font-mono shadow-[0_8px_22px_rgba(25,26,35,0.06)] ring-1 ring-[#191A23]/10">
                <Mail className="h-4 w-4 flex-none text-[#191A23]/50" />
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

            <div className="grid gap-3 pt-2 sm:grid-cols-3">
              {onDashboardClick && (
                <button type="button" onClick={onDashboardClick} className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#CDB0E7] py-3 text-sm font-black uppercase shadow-[0_12px_26px_rgba(25,26,35,0.10)] ring-1 ring-[#191A23]/10">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </button>
              )}
              <button type="button" onClick={handleSave} disabled={profileLoading} className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#B9EDC8] py-3 text-sm font-black uppercase shadow-[0_12px_26px_rgba(25,26,35,0.10)] ring-1 ring-[#191A23]/10 disabled:cursor-not-allowed disabled:opacity-60">
                {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
              <button type="button" onClick={handleLogout} className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-black uppercase shadow-[0_12px_26px_rgba(25,26,35,0.08)] ring-1 ring-[#191A23]/10">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>

          </div>

          <section className={`${activeProfileTab === 'pass' ? 'block' : 'hidden'} mx-auto min-w-0 max-w-6xl rounded-[24px] bg-[#FFF8E8] p-3 text-[#191A23] shadow-[0_18px_60px_rgba(25,26,35,0.10)] ring-1 ring-[#191A23]/10 sm:rounded-[30px] md:p-5`}>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#9B6AC8]">Team QR Profile</p>
                <h3 className="text-xl font-black tracking-tight">Registration Pass</h3>
              </div>
              <button
                type="button"
                onClick={handleDownloadBanner}
                disabled={!registration || bannerLoading}
                className="flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#B9EDC8] px-4 py-2 text-xs font-black uppercase text-[#10131D] shadow-[0_10px_24px_rgba(25,26,35,0.10)] ring-1 ring-[#191A23]/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <Download className="h-4 w-4" /> Download
              </button>
            </div>

            {bannerLoading ? (
              <div className="flex min-h-64 items-center justify-center rounded-xl border-2 border-dashed border-[#191A23]/25 bg-white text-sm font-bold text-[#191A23]/70">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading banner
              </div>
            ) : registration ? (
              <RegistrationPassCard
                registration={registration}
                qrUrl={qrUrl}
                avatarUrl={selectedAvatar?.url}
                displayName={profileTitle}
                locationLabel={address.trim()}
              />
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#191A23]/25 bg-white p-6 text-center">
                <QrCode className="h-10 w-10 text-[#9B6AC8]" />
                <p className="mt-3 text-sm font-bold text-[#191A23]/70">{bannerStatus || 'No team pass available yet.'}</p>
              </div>
            )}

            {bannerStatus && registration && (
              <p className="mt-3 text-xs font-bold text-[#191A23]/70">{bannerStatus}</p>
            )}
          </section>
        </div>
        )}
      </div>
  );

  if (presentation === 'page') {
    return (
      <main className="min-h-screen bg-[#FFF8E8] px-3 pb-14 pt-24 sm:px-4 sm:pt-28 md:px-8">
        {content}
      </main>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close profile settings"
        onClick={onClose}
        className="absolute inset-0 bg-transparent"
      />
      {content}
    </div>
  );
}
