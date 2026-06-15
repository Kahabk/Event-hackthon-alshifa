/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Bell, CheckCircle2, Ticket, X } from 'lucide-react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Sponsors from './components/Sponsors';
import Highlights from './components/Highlights';
import Tracks from './components/Tracks';
import Schedule from './components/Schedule';
import Prizes from './components/Prizes';
import ProductVideos from './components/ProductVideos';
import ImageQuotes from './components/ImageQuotes';
import Mentors from './components/Mentors';
import Testimonials from './components/Testimonials';
import FAQ from './components/FAQ';
import CTA from './components/CTA';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import ProfilePanel from './components/ProfilePanel';
import AdminPanel from './components/AdminPanel';
import RegistrationPage from './components/RegistrationPage';
import BadgePreviewPage from './components/BadgePreviewPage';
import TeamDashboard from './components/TeamDashboard';
import JudgeReviewPanel from './components/JudgeReviewPanel';
import FullScreenVideoLoader from './components/FullScreenVideoLoader';
import PasswordResetPage from './components/PasswordResetPage';
import { Registration } from './types';
import { adminEmail, auth, db } from './lib/firebase';
import { LOADER_CYCLE_MS } from './loaderConfig';

type Page = 'home' | 'register' | 'admin' | 'badge' | 'dashboard' | 'judge' | 'reset-password';

interface WebAnnouncement {
  id: string;
  title: string;
  description: string;
  priority?: 'low' | 'normal' | 'high';
  target?: 'all-users' | 'all-teams' | 'specific-teams' | 'judges' | 'finalists';
  targetTeamIds?: string[];
  publishDate?: string;
  createdAt?: unknown;
}

const pageFromPath = (): Page => {
  const params = new URLSearchParams(window.location.search);
  if (window.location.pathname === '/reset-password' || (params.get('mode') === 'resetPassword' && params.get('oobCode'))) return 'reset-password';
  if (window.location.pathname === '/register') return 'register';
  if (window.location.pathname === '/admin') return 'admin';
  if (window.location.pathname === '/badge') return 'badge';
  if (window.location.pathname === '/dashboard') return 'dashboard';
  if (window.location.pathname === '/judge') return 'judge';
  return 'home';
};

const pathForPage = (page: Page) => {
  if (page === 'register') return '/register';
  if (page === 'admin') return '/admin';
  if (page === 'badge') return '/badge';
  if (page === 'dashboard') return '/dashboard';
  if (page === 'judge') return '/judge';
  if (page === 'reset-password') return '/reset-password';
  return '/';
};

const normalizeTeamName = (teamName: string) => teamName.trim().replace(/\s+/g, ' ').toLowerCase();
const teamNameDocId = (teamName: string) => encodeURIComponent(normalizeTeamName(teamName));
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const emailDocId = (email: string) => encodeURIComponent(normalizeEmail(email));
const judgeDocId = (email: string) => normalizeEmail(email);
const hiddenAnnouncementKey = (uid: string) => `shifa-sdg-hidden-announcements-${uid}`;
const saveSessionUserProfile = async (user: FirebaseUser) => {
  await setDoc(doc(db, 'userProfiles', user.uid), {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    providerIds: user.providerData.map(provider => provider.providerId),
    lastSeenAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });
};
const createRegistrationId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SDG-${timestamp}-${random}`;
};

export default function App() {
  const [page, setPage] = useState<Page>(pageFromPath);
  const loaderTimerRef = useRef<number | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [bootLoaderDone, setBootLoaderDone] = useState(false);
  const [handoffLoaderLabel, setHandoffLoaderLabel] = useState('');
  const [openRegistrationAfterAuth, setOpenRegistrationAfterAuth] = useState(false);
  const [openDashboardAfterAuth, setOpenDashboardAfterAuth] = useState(false);
  const [registrationDetail, setRegistrationDetail] = useState<Registration | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isFirestoreAdmin, setIsFirestoreAdmin] = useState(false);
  const [isJudge, setIsJudge] = useState(false);
  const [webAnnouncements, setWebAnnouncements] = useState<WebAnnouncement[]>([]);
  const [hiddenAnnouncementIds, setHiddenAnnouncementIds] = useState<string[]>([]);

  const isAdmin = Boolean(
    currentUser?.email && adminEmail && currentUser.email.toLowerCase() === adminEmail
  ) || isFirestoreAdmin;

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (user) {
        void saveSessionUserProfile(user);
      }
    });
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setHiddenAnnouncementIds([]);
      setWebAnnouncements([]);
      return;
    }

    try {
      const raw = window.localStorage.getItem(hiddenAnnouncementKey(currentUser.uid));
      setHiddenAnnouncementIds(raw ? JSON.parse(raw) as string[] : []);
    } catch {
      setHiddenAnnouncementIds([]);
    }
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;

    const checkAdminRole = async () => {
      if (!currentUser) {
        setIsFirestoreAdmin(false);
        return;
      }

      if (currentUser.email && adminEmail && currentUser.email.toLowerCase() === adminEmail) {
        setIsFirestoreAdmin(true);
        return;
      }

      try {
        const adminSnapshot = await getDoc(doc(db, 'admins', currentUser.uid));
        const adminData = adminSnapshot.data() as { active?: boolean } | undefined;
        if (!cancelled) setIsFirestoreAdmin(adminSnapshot.exists() && adminData?.active !== false);
      } catch {
        if (!cancelled) setIsFirestoreAdmin(false);
      }
    };

    void checkAdminRole();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;

    const checkJudgeRole = async () => {
      if (!currentUser?.email) {
        setIsJudge(false);
        return;
      }

      try {
        const judgeSnapshot = await getDoc(doc(db, 'judges', judgeDocId(currentUser.email)));
        const judgeData = judgeSnapshot.data() as { active?: boolean } | undefined;
        if (!cancelled) setIsJudge(judgeSnapshot.exists() && judgeData?.active !== false);
      } catch {
        if (!cancelled) setIsJudge(false);
      }
    };

    void checkJudgeRole();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    const timer = window.setTimeout(() => setBootLoaderDone(true), LOADER_CYCLE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (loaderTimerRef.current) {
        window.clearTimeout(loaderTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => setPage(pageFromPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (currentUser && openRegistrationAfterAuth) {
      setIsAuthModalOpen(false);
      navigateTo('register');
      setOpenRegistrationAfterAuth(false);
    }
  }, [currentUser, openRegistrationAfterAuth]);

  useEffect(() => {
    if (currentUser && openDashboardAfterAuth && !openRegistrationAfterAuth) {
      setIsAuthModalOpen(false);
      playHandoffLoader('Opening team dashboard');
      navigateTo('dashboard');
      setOpenDashboardAfterAuth(false);
    }
  }, [currentUser, openDashboardAfterAuth, openRegistrationAfterAuth]);

  useEffect(() => {
    if (currentUser && isJudge && !isAdmin && page !== 'judge') {
      navigateTo('judge');
    }
  }, [currentUser, isAdmin, isJudge, page]);

  useEffect(() => {
    let cancelled = false;

    const loadWebAnnouncements = async () => {
      if (!currentUser) return;

      try {
        const accountSnapshot = await getDoc(doc(db, 'accountRegistrations', currentUser.uid));
        const accountData = accountSnapshot.data() as { teamName?: string; registrationId?: string } | undefined;
        const teamId = accountData?.teamName ? teamNameDocId(accountData.teamName) : '';
        const finalistSnapshot = teamId ? await getDoc(doc(db, 'finalists', teamId)) : null;
        const isFinalist = Boolean(finalistSnapshot?.exists());
        const snapshot = await getDocs(query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(8)));
        const visibleAnnouncements = snapshot.docs
          .map(item => ({ id: item.id, ...item.data() } as WebAnnouncement))
          .filter(item => {
            if (item.target === 'judges') return isAdmin || isJudge;
            if (!item.target || item.target === 'all-users') return true;
            if (item.target === 'all-teams') return Boolean(teamId);
            if (item.target === 'finalists') return isFinalist;
            if (item.target === 'specific-teams') {
              const targetIds = item.targetTeamIds || [];
              return targetIds.includes(teamId)
                || targetIds.includes(accountData?.registrationId || '')
                || targetIds.includes(currentUser.uid);
            }
            return false;
          });

        if (!cancelled) setWebAnnouncements(visibleAnnouncements);
      } catch {
        if (!cancelled) setWebAnnouncements([]);
      }
    };

    void loadWebAnnouncements();

    return () => {
      cancelled = true;
    };
  }, [currentUser, isAdmin, isJudge]);

  const navigateTo = (nextPage: Page) => {
    setPage(nextPage);
    window.history.pushState({}, '', pathForPage(nextPage));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const playHandoffLoader = (label = 'Opening team dashboard') => {
    setHandoffLoaderLabel(label);
    if (loaderTimerRef.current) {
      window.clearTimeout(loaderTimerRef.current);
    }
    loaderTimerRef.current = window.setTimeout(() => {
      setHandoffLoaderLabel('');
      loaderTimerRef.current = null;
    }, LOADER_CYCLE_MS);
  };

  const openAuth = (mode: 'signin' | 'signup' = 'signin', redirectToDashboard = true) => {
    setAuthMode(mode);
    setOpenDashboardAfterAuth(redirectToDashboard);
    setIsAuthModalOpen(true);
  };

  const openDashboard = () => {
    if (!currentUser) {
      openAuth('signin');
      return;
    }
    if (isJudge && !isAdmin) {
      navigateTo('judge');
      return;
    }
    playHandoffLoader('Opening team dashboard');
    navigateTo('dashboard');
  };

  const openRegistration = () => {
    if (isJudge && !isAdmin) {
      navigateTo('judge');
      return;
    }
    if (!currentUser) {
      setOpenRegistrationAfterAuth(true);
      openAuth('signup', false);
      return;
    }
    navigateTo('register');
  };

  const hideAnnouncement = (id: string) => {
    if (!currentUser) return;
    const nextIds = Array.from(new Set([...hiddenAnnouncementIds, id]));
    setHiddenAnnouncementIds(nextIds);
    try {
      window.localStorage.setItem(hiddenAnnouncementKey(currentUser.uid), JSON.stringify(nextIds));
    } catch {
      // Dismissal persistence is optional.
    }
  };

  const handleRegisterSuccess = async (registration: Registration) => {
    if (!currentUser) {
      throw new Error('Please login before registering.');
    }

    const normalizedTeamName = normalizeTeamName(registration.teamName);
    const teamDocId = teamNameDocId(registration.teamName);
    const registrationId = createRegistrationId();
    const registrationWithId = {
      ...registration,
      registrationId,
      teamNameKey: normalizedTeamName,
      leaderEmail: registration.leaderEmail || currentUser.email || '',
    };
    const registrationRef = doc(db, 'registrations', teamDocId);
    const teamNameRef = doc(db, 'teamNames', teamDocId);
    const accountRegistrationRef = doc(db, 'accountRegistrations', currentUser.uid);
    const participantEmails = Array.from(new Set([
      normalizeEmail(registration.leaderEmail || currentUser.email || ''),
      ...registration.members.map(member => normalizeEmail(member.email || '')),
      normalizeEmail(currentUser.email || ''),
    ].filter(Boolean)));
    const emailReservationRefs = participantEmails.map(email => ({
      email,
      ref: doc(db, 'participantEmails', emailDocId(email)),
    }));

    await runTransaction(db, async (transaction) => {
      const existingTeam = await transaction.get(teamNameRef);
      const existingAccountRegistration = await transaction.get(accountRegistrationRef);
      const existingEmailDocs = await Promise.all(emailReservationRefs.map(({ ref }) => transaction.get(ref)));
      if (existingTeam.exists()) {
        throw new Error('Team name already was taken.');
      }
      if (existingAccountRegistration.exists()) {
        throw new Error('This login account is already registered with another team.');
      }
      const existingEmailIndex = existingEmailDocs.findIndex(snapshot => snapshot.exists());
      if (existingEmailIndex >= 0) {
        const blockedEmail = emailReservationRefs[existingEmailIndex].email;
        const currentEmail = normalizeEmail(currentUser.email || '');
        if (blockedEmail === currentEmail) {
          throw new Error('This login email is already attached to another team. Open the dashboard for that team, or login with a different account to register a new team.');
        }
        throw new Error(`${blockedEmail} is already registered with another team.`);
      }

      transaction.set(teamNameRef, {
        teamName: registration.teamName,
        teamNameKey: normalizedTeamName,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      transaction.set(accountRegistrationRef, {
        userId: currentUser.uid,
        accountEmail: currentUser.email || '',
        teamName: registration.teamName,
        registrationId,
        registrationSummary: registrationWithId,
        createdAt: serverTimestamp(),
      });

      emailReservationRefs.forEach(({ email, ref }) => {
        transaction.set(ref, {
          email,
          teamName: registration.teamName,
          registrationId,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
      });

      transaction.set(registrationRef, {
        ...registrationWithId,
        teamNameKey: normalizedTeamName,
        leaderEmail: registration.leaderEmail || currentUser.email,
        userId: currentUser.uid,
        accountEmail: currentUser.email,
        accountName: currentUser.displayName || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    setRegistrationDetail(registrationWithId);
    playHandoffLoader('Preparing team dashboard');
    navigateTo('dashboard');
    setShowSuccessToast(true);

    // Dismiss overlay success toast after 6 seconds
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 6000);
  };

  const activeWebAnnouncement = page !== 'dashboard' && page !== 'admin' && page !== 'judge'
    ? webAnnouncements.find(item => !hiddenAnnouncementIds.includes(item.id))
    : undefined;

  return (
    <div className="min-h-screen bg-white text-[#191A23] overflow-x-hidden font-sans antialiased custom-scrollbar selection:bg-[#B9FF66] selection:text-[#191A23]">
      {/* Dynamic Success notifications once booking completes */}
      <AnimatePresence>
        {(!authReady || !bootLoaderDone) && (
          <FullScreenVideoLoader label="Starting Shifa SDG" />
        )}
        {handoffLoaderLabel && authReady && bootLoaderDone && (
          <FullScreenVideoLoader label={handoffLoaderLabel} />
        )}
        {showSuccessToast && registrationDetail && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
          >
            <div className="bg-[#B9FF66] border-4 border-[#191A23] p-5 rounded-[24px] shadow-[6px_6px_0px_white] text-[#191A23] space-y-3.5 relative">
              <div className="flex gap-3 items-start text-left">
                <CheckCircle2 className="w-6.5 h-6.5 text-[#191A23] fill-white flex-none" />
                <div className="space-y-1 min-w-0">
                  <h4 className="font-sans font-black text-lg tracking-tight">Team Registration Confirmed!</h4>
                  <p className="text-xs font-semibold leading-relaxed">
                    Team <strong className="font-black">{registrationDetail.teamName}</strong> is registered. Your dashboard is ready.
                  </p>
                </div>
              </div>

              {/* Action guide indicator */}
              <div className="bg-[#191A23] text-white text-[10px] p-2 rounded-xl flex items-center justify-between font-mono font-bold">
                <span className="flex items-center gap-1">
                  <Ticket className="w-3.5 h-3.5 text-[#B9FF66] fill-[#B9FF66]" /> TEAM DASHBOARD READY
                </span>
                <span className="animate-pulse text-[#B9FF66] flex items-center gap-1.5 cursor-pointer" onClick={() => setShowSuccessToast(false)}>
                  Close <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary headers */}
      <Navbar
        onRegisterClick={openRegistration}
        onAdminClick={() => navigateTo('admin')}
        onJudgeClick={() => navigateTo('judge')}
        onDashboardClick={openDashboard}
        onHomeClick={() => navigateTo('home')}
        isLoggedIn={Boolean(currentUser)}
        isAdmin={isAdmin}
        isJudge={isJudge && !isAdmin}
        userEmail={currentUser?.email}
        onAuthClick={() => openAuth('signin')}
        onProfileClick={() => setIsProfileOpen(true)}
      />

      <AnimatePresence>
        {activeWebAnnouncement && (
          <motion.div
            key={activeWebAnnouncement.id}
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            className="fixed left-1/2 top-24 z-40 w-full max-w-3xl -translate-x-1/2 px-4"
          >
            <div className={`rounded-2xl border-2 border-[#191A23] p-4 shadow-[5px_5px_0px_#191A23] ${
              activeWebAnnouncement.priority === 'high' ? 'bg-[#B9FF66]' : 'bg-white'
            }`}>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border-2 border-[#191A23] bg-white shadow-[2px_2px_0px_#191A23]">
                  <Bell className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#191A23]/55">Announcement</p>
                  <h3 className="mt-1 break-words text-lg font-black tracking-tight">{activeWebAnnouncement.title}</h3>
                  <p className="mt-1 line-clamp-3 text-sm font-bold leading-relaxed text-[#191A23]/75">{activeWebAnnouncement.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => hideAnnouncement(activeWebAnnouncement.id)}
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-full border-2 border-[#191A23] bg-white text-[#191A23] shadow-[2px_2px_0px_#191A23]"
                  aria-label="Dismiss announcement"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {page === 'register' ? (
        <RegistrationPage
          user={currentUser}
          onAuthClick={() => openAuth('signin', false)}
          onBack={() => navigateTo('home')}
          onRegisterSuccess={handleRegisterSuccess}
        />
      ) : page === 'admin' ? (
        <AdminPanel
          user={currentUser}
          isAdmin={isAdmin}
          onBack={() => navigateTo('home')}
          onLogin={() => openAuth('signin', false)}
        />
      ) : page === 'dashboard' ? (
        <TeamDashboard
          user={currentUser}
          onBack={() => navigateTo('home')}
          onLogin={() => openAuth('signin')}
          onRegisterClick={openRegistration}
        />
      ) : page === 'judge' ? (
        <JudgeReviewPanel
          user={currentUser}
          onBack={() => isJudge && !isAdmin ? navigateTo('judge') : navigateTo('home')}
          onLogin={() => openAuth('signin', false)}
        />
      ) : page === 'reset-password' ? (
        <PasswordResetPage
          onBack={() => navigateTo('home')}
          onLogin={() => openAuth('signin')}
        />
      ) : page === 'badge' ? (
        <BadgePreviewPage
          registration={registrationDetail}
          onBack={() => navigateTo('home')}
          onRegisterAgain={() => navigateTo('register')}
        />
      ) : (
      <main>
        {/* Hero Banner Section */}
        <Hero onRegisterClick={openRegistration} />

        {/* Dynamic Video Showcase Section */}
        <ProductVideos />

        {/* Black and white image quote gallery */}
        <ImageQuotes />

        {/* Gray Global Sponsor Strip Section */}
        <Sponsors />

        {/* Why Join Highlight System Section */}
        <Highlights />

        {/* Interactive Tracks Accordion Section */}
        <Tracks />

        {/* Dynamic Schedule Calendar Tabs Section */}
        <Schedule />

        {/* Rewards grid Block Section */}
        <Prizes />

        {/* Expert advisers bios System Section */}
        <Mentors />

        {/* Quotes Testimonials Grid Section */}
        <Testimonials />

        {/* FAQ System Block Section */}
        <FAQ />

        {/* Visual Call To Action Section */}
        <CTA onRegisterClick={openRegistration} />
      </main>
      )}

      {/* Global standard Footer */}
      <Footer />

      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authMode}
        onClose={() => {
          setIsAuthModalOpen(false);
          setOpenRegistrationAfterAuth(false);
          setOpenDashboardAfterAuth(false);
        }}
      />

      <ProfilePanel
        isOpen={isProfileOpen}
        user={currentUser}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}
