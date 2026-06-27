import { useEffect } from 'react';
import FlickerSpinner from './FlickerSpinner';
import { acquireScrollLock } from '../lib/scrollLock';

interface FullScreenVideoLoaderProps {
  label?: string;
}

export default function FullScreenVideoLoader({ label = 'Loading' }: FullScreenVideoLoaderProps) {
  useEffect(() => {
    return acquireScrollLock();
  }, []);

  return (
    <div className="fixed inset-0 z-[120] flex min-h-screen items-center justify-center bg-white px-4" role="status" aria-live="polite" aria-label={label}>
      <div className="flex w-full flex-col items-center justify-center text-center">
        <span className="flex items-center justify-center"><FlickerSpinner size={56} /></span>
        <p className="mt-4 w-full text-center text-sm font-medium text-neutral-600">{label}</p>
      </div>
    </div>
  );
}
