import { FormEvent, useEffect, useMemo, useState } from 'react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { ArrowLeft, CheckCircle2, KeyRound, Lock } from 'lucide-react';
import { auth } from '../lib/firebase';
import FullScreenVideoLoader from './FullScreenVideoLoader';
import { waitForLoaderCycle } from '../loaderConfig';

interface PasswordResetPageProps {
  onBack: () => void;
  onLogin: () => void;
}

const extractCode = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    return url.searchParams.get('oobCode') || trimmed;
  } catch {
    return trimmed;
  }
};

export default function PasswordResetPage({ onBack, onLogin }: PasswordResetPageProps) {
  const queryCode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('oobCode') || '';
  }, []);
  const [codeInput, setCodeInput] = useState(queryCode);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(Boolean(queryCode));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    const code = extractCode(queryCode);

    if (!code) {
      setLoading(false);
      return;
    }

    verifyPasswordResetCode(auth, code)
      .then((accountEmail) => {
        if (active) setEmail(accountEmail);
      })
      .catch(() => {
        if (active) setError('This reset link is invalid or expired. Request a new password reset email.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [queryCode]);

  const handleReset = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const code = extractCode(codeInput);
    if (!code) {
      setError('Paste the reset link or reset code from your email.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Use a new password with at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const accountEmail = await verifyPasswordResetCode(auth, code);
      await confirmPasswordReset(auth, code, newPassword);
      await waitForLoaderCycle();
      setEmail(accountEmail);
      setSuccess('Password changed successfully. You can login with the new password now.');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError('This reset code is invalid or expired. Request a new reset email and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || submitting) {
    return <FullScreenVideoLoader label={submitting ? 'Changing password' : 'Checking reset link'} />;
  }

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-4 pb-16 pt-28 md:px-8">
      <div className="mx-auto max-w-xl rounded-[28px] border-4 border-[#191A23] bg-white p-6 shadow-[8px_8px_0px_#B9FF66]">
        <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-black text-[#191A23] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to event
        </button>

        <div className="border-b-2 border-[#191A23]/10 pb-5">
          <span className="inline-flex rounded-md border-2 border-[#191A23] bg-[#B9FF66] px-3 py-1 font-mono text-xs font-black uppercase shadow-[2px_2px_0px_#191A23]">
            Password Reset
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#191A23]">Reset password in app</h1>
          <p className="mt-2 text-sm font-bold leading-relaxed text-[#191A23]/65">
            Enter the reset code from your email link and set a new password without leaving this website.
          </p>
        </div>

        <form onSubmit={handleReset} className="mt-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-black">Reset Link / Code</span>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#191A23]/45" />
              <input
                type="text"
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value)}
                className="w-full rounded-xl border-2 border-[#191A23] bg-[#F3F3F3] py-3 pl-11 pr-4 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
                placeholder="Paste reset link or oobCode"
              />
            </div>
          </label>

          {email && (
            <p className="rounded-xl border-2 border-[#191A23]/10 bg-[#F3F3F3] p-3 text-xs font-bold text-[#191A23]/65">
              Resetting password for <strong className="text-[#191A23]">{email}</strong>
            </p>
          )}

          <label className="block space-y-1.5">
            <span className="text-sm font-black">New Password</span>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#191A23]/45" />
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={6}
                className="w-full rounded-xl border-2 border-[#191A23] bg-[#F3F3F3] py-3 pl-11 pr-4 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
                placeholder="New password"
              />
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-black">Confirm Password</span>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#191A23]/45" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                className="w-full rounded-xl border-2 border-[#191A23] bg-[#F3F3F3] py-3 pl-11 pr-4 text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
                placeholder="Confirm password"
              />
            </div>
          </label>

          {error && <p className="rounded-xl border-2 border-red-200 bg-red-50 p-3 text-xs font-bold text-red-600">{error}</p>}
          {success && (
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" /> {success}
              </p>
              <button type="button" onClick={onLogin} className="mt-3 font-black uppercase underline underline-offset-4">
                Login Now
              </button>
            </div>
          )}

          <button type="submit" disabled={submitting} className="neo-btn w-full py-4 text-sm uppercase disabled:opacity-60">
            Reset Password
          </button>
        </form>
      </div>
    </main>
  );
}
