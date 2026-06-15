import { useEffect, useState } from 'react';
import { updateProfile, signOut, User as FirebaseUser } from 'firebase/auth';
import { LogOut, Save, User, X } from 'lucide-react';
import { auth } from '../lib/firebase';

interface ProfilePanelProps {
  isOpen: boolean;
  user: FirebaseUser | null;
  onClose: () => void;
}

export default function ProfilePanel({ isOpen, user, onClose }: ProfilePanelProps) {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDisplayName(user?.displayName || '');
      setStatus('');
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close profile settings"
        onClick={onClose}
        className="absolute inset-0 bg-[#191A23]/90 backdrop-blur-md"
      />
      <div className="relative z-10 w-full max-w-md bg-white text-[#191A23] border-4 border-[#191A23] rounded-[28px] shadow-[8px_8px_0px_#B9FF66] p-6">
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
      </div>
    </div>
  );
}
