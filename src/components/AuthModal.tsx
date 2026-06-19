import { FormEvent, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { confirmPasswordReset, createUserWithEmailAndPassword, GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, updateProfile, User as FirebaseUser, verifyPasswordResetCode } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, ClipboardCheck, Lock, Mail, Sparkles, User, X } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import FullScreenVideoLoader from './FullScreenVideoLoader';
import { waitForLoaderCycle } from '../loaderConfig';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'signin' | 'signup';
  onClose: () => void;
}

const friendlyError = (message: string) => {
  if (message.includes('auth/invalid-credential')) return 'Email or password is incorrect.';
  if (message.includes('auth/email-already-in-use')) return 'This email already has an account. Try signing in.';
  if (message.includes('auth/user-not-found')) return 'No account was found with this email.';
  if (message.includes('auth/weak-password')) return 'Use a password with at least 6 characters.';
  if (message.includes('auth/operation-not-allowed')) return 'Enable Email/Password sign-in in Firebase Authentication.';
  if (message.includes('auth/unauthorized-domain')) return 'Add this website domain to Firebase Authentication authorized domains.';
  if (message.includes('auth/popup-closed-by-user')) return 'Google sign-in was closed before finishing.';
  if (message.includes('auth/too-many-requests')) return 'Too many attempts. Please wait a little and try again.';
  return 'Authentication failed. Please try again.';
};

const saveUserProfile = async (user: FirebaseUser) => {
  await setDoc(doc(db, 'userProfiles', user.uid), {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    providerIds: user.providerData.map(provider => provider.providerId),
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  }, { merge: true });
};

export default function AuthModal({ isOpen, initialMode, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
      setSuccess('');
      setResetCode('');
      setResetPassword('');
      setResetPasswordConfirm('');
    }
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email.trim(), {
          url: `${window.location.origin}/reset-password`,
        });
        await waitForLoaderCycle();
        setSuccess('Password reset email sent. Open the link from your inbox to set a new password.');
      } else if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          await updateProfile(credential.user, { displayName: displayName.trim() });
        }
        await saveUserProfile(credential.user);
        await waitForLoaderCycle();
        onClose();
      } else {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        await saveUserProfile(credential.user);
        await waitForLoaderCycle();
        onClose();
      }
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setSubmitting(true);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const credential = await signInWithPopup(auth, provider);
      await saveUserProfile(credential.user);
      await waitForLoaderCycle();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('auth/popup-blocked') || message.includes('auth/cancelled-popup-request')) {
        await signInWithRedirect(auth, provider);
        return;
      }
      setError(friendlyError(message));
    } finally {
      setSubmitting(false);
    }
  };

  const resetCodeFromInput = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';

    try {
      const url = new URL(trimmed);
      return url.searchParams.get('oobCode') || trimmed;
    } catch {
      return trimmed;
    }
  };

  const handleConfirmResetInApp = async () => {
    setError('');
    setSuccess('');

    const code = resetCodeFromInput(resetCode);
    if (!code) {
      setError('Paste the reset link or reset code from your email.');
      return;
    }
    if (resetPassword.length < 6) {
      setError('Use a new password with at least 6 characters.');
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      setError('New passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await verifyPasswordResetCode(auth, code);
      await confirmPasswordReset(auth, code, resetPassword);
      await waitForLoaderCycle();
      setSuccess('Password changed successfully. You can login with the new password now.');
      setResetCode('');
      setResetPassword('');
      setResetPasswordConfirm('');
      setMode('signin');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message.includes('auth/invalid-action-code') || message.includes('auth/expired-action-code')
        ? 'This reset code is invalid or expired. Send a new reset email.'
        : friendlyError(message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {submitting && <FullScreenVideoLoader label={mode === 'reset' ? 'Sending reset email' : mode === 'signup' ? 'Creating account' : 'Logging in'} />}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#191A23]/90 backdrop-blur-md"
        />

        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[30px] border-2 border-[#191A23] bg-[#cdb0e7] p-4 text-[#191A23] shadow-[8px_8px_0px_#191A23] md:p-6"
        >
          <div className="mb-5 flex items-start justify-between gap-4 rounded-[24px] border-2 border-[#191A23] bg-[#fffdf8] p-4 shadow-[4px_4px_0px_rgba(31,31,32,0.18)]">
            <div>
              <span className="bg-[#191A23] text-white font-mono font-bold text-xs px-2.5 py-1 border-2 border-[#191A23] rounded-md shadow-[2px_2px_0px_#cdb0e7] tracking-wide uppercase">
                Shifa SDG Account
              </span>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                {mode === 'reset' ? 'Reset your password' : mode === 'signup' ? 'Create your registration account' : 'Sign in'}
              </h2>
              <p className="mt-1 text-xs font-bold leading-relaxed text-[#191A23]/62">
                {mode === 'signup'
                  ? 'Create one protected login before registering your team and submitting the pitch deck.'
                  : mode === 'signin'
                    ? 'Open your team dashboard, registration banner, and idea submission workspace.'
                    : 'Recover your account and return to the team workspace.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-[#F3F3F3] border-2 border-[#191A23] rounded-full shadow-[2px_2px_0px_#191A23] transition-all"
              aria-label="Close sign in"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
            <aside className="rounded-[26px] border-2 border-[#191A23] bg-[#191A23] p-5 text-white shadow-[5px_5px_0px_rgba(31,31,32,0.22)]">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[#cdb0e7] text-[#191A23]">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-3xl font-black leading-tight">
                Account to finale journey
              </h3>
              <p className="mt-2 text-sm font-bold leading-relaxed text-white/68">
                Your login connects team registration, QR banner access, dashboard drafts, and SDG pitch submission.
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  ['Create account', 'Use email or Google sign-in.'],
                  ['Register team', 'Save leader, members, college, and track.'],
                  ['Submit idea', 'Build the pitch deck and update your dashboard.'],
                ].map(([title, text], index) => (
                  <div key={title} className="auth-journey-step rounded-2xl border border-white/12 bg-white p-3">
                    <p className="flex items-center gap-2 text-sm font-black">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#cdb0e7] text-xs text-[#191A23]">{index + 1}</span>
                      {title}
                    </p>
                    <p className="mt-1 pl-8 text-xs font-bold leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-[#cdb0e7]/60 bg-[#cdb0e7]/18 p-3 text-xs font-black leading-relaxed text-white">
                <ClipboardCheck className="mr-1 inline h-4 w-4 text-[#cdb0e7]" />
                One account can own one registered team for the challenge.
              </div>
            </aside>

            <div className="rounded-[26px] border-2 border-[#191A23] bg-[#fffdf8] p-4 shadow-[5px_5px_0px_rgba(31,31,32,0.18)] md:p-5">
          {mode === 'reset' ? (
            <div className="mb-5 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError('');
                  setSuccess('');
                }}
                className="inline-flex items-center gap-2 text-xs font-black uppercase text-[#191A23] hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Back to login
              </button>
              <p className="rounded-xl border-2 border-[#191A23]/10 bg-[#f7efe3] p-3 text-xs font-bold leading-relaxed text-[#191A23]/70">
                Firebase sends a secure reset link/code. Paste the link below to reset the password inside this app. A short numeric OTP needs a backend OTP service.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 mb-5 bg-[#191A23] border-2 border-[#191A23] rounded-full p-1">
              {(['signup', 'signin'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setMode(tab);
                    setError('');
                    setSuccess('');
                  }}
                  className={`py-2 text-xs font-black uppercase rounded-full transition-all ${
                    mode === tab ? 'bg-[#cdb0e7] border-2 border-[#cdb0e7] text-[#191A23]' : 'border-2 border-transparent text-white'
                  }`}
                >
                  {tab === 'signup' ? 'Create account' : 'Login'}
                </button>
              ))}
            </div>
          )}

          {mode !== 'reset' && (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-[#191A23] bg-[#f7efe3] px-4 py-3 text-sm font-black shadow-[3px_3px_0px_#191A23] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#cdb0e7] hover:shadow-[4px_4px_0px_#191A23] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#191A23] font-sans text-sm font-black">
                G
              </span>
              Continue with Google
            </button>
          )}

          {mode !== 'reset' && (
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#191A23]/15" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#191A23]/50">or email</span>
              <div className="h-px flex-1 bg-[#191A23]/15" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label htmlFor="authName" className="font-bold text-sm block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                  <input
                    id="authName"
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="w-full text-sm font-bold border-2 border-[#191A23] bg-[#f7efe3] pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#cdb0e7] transition-all"
                    placeholder="Your name"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="authEmail" className="font-bold text-sm block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                <input
                  id="authEmail"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full text-sm font-bold border-2 border-[#191A23] bg-[#f7efe3] pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#cdb0e7] transition-all font-mono"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="authPassword" className="font-bold text-sm block">Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('reset');
                        setError('');
                        setSuccess('');
                      }}
                      className="text-xs font-black text-[#191A23] underline decoration-[#cdb0e7] decoration-2 underline-offset-4"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#191A23]/50" />
                  <input
                    id="authPassword"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={6}
                    className="w-full text-sm font-bold border-2 border-[#191A23] bg-[#f7efe3] pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#cdb0e7] transition-all"
                    placeholder="Password"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-200 rounded-xl p-3">
                {error}
              </p>
            )}

            {success && (
              <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full border-2 border-[#191A23] bg-[#cdb0e7] py-3 text-sm font-black shadow-[3px_3px_0px_#191A23] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#191A23] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Working...' : mode === 'reset' ? 'Send Reset Email' : mode === 'signup' ? 'Create Account' : 'Login'}
            </button>
          </form>

          {mode === 'reset' && (
            <div className="mt-5 space-y-4 rounded-2xl border-2 border-[#191A23] bg-[#f7efe3] p-4">
              <div>
                <p className="text-sm font-black">Reset inside app</p>
                <p className="mt-1 text-xs font-bold leading-relaxed text-[#191A23]/60">
                  Paste the reset email link or the `oobCode` from that link, then set the new password here.
                </p>
              </div>

              <label className="block space-y-1.5">
                <span className="text-sm font-black">Reset Link / Code</span>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(event) => setResetCode(event.target.value)}
                  className="w-full rounded-xl border-2 border-[#191A23] bg-white px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#cdb0e7]"
                  placeholder="Paste email link or oobCode"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-black">New Password</span>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(event) => setResetPassword(event.target.value)}
                    className="w-full rounded-xl border-2 border-[#191A23] bg-white px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#cdb0e7]"
                    placeholder="New password"
                    minLength={6}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-black">Confirm</span>
                  <input
                    type="password"
                    value={resetPasswordConfirm}
                    onChange={(event) => setResetPasswordConfirm(event.target.value)}
                    className="w-full rounded-xl border-2 border-[#191A23] bg-white px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#cdb0e7]"
                    placeholder="Confirm password"
                    minLength={6}
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleConfirmResetInApp}
                disabled={submitting}
                className="w-full rounded-full border-2 border-[#191A23] bg-white py-3 text-sm font-black shadow-[3px_3px_0px_#191A23] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Reset Password In App
              </button>
            </div>
          )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
