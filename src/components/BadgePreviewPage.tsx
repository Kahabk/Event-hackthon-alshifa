import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Download, Plus } from 'lucide-react';
import { Registration } from '../types';
import {
  createRegistrationQrUrl,
  downloadRegistrationBadge,
} from '../lib/registrationBadge';
import RegistrationPassCard from './RegistrationPassCard';

interface BadgePreviewPageProps {
  registration: Registration | null;
  onBack: () => void;
  onRegisterAgain: () => void;
}

export default function BadgePreviewPage({ registration, onBack, onRegisterAgain }: BadgePreviewPageProps) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (!registration?.registrationId) return;

    createRegistrationQrUrl(registration).then(setQrUrl);
  }, [registration?.registrationId]);

  if (!registration) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] pt-28 pb-16 px-4 md:px-8">
        <div className="max-w-3xl mx-auto rounded-2xl border-2 border-[#191A23] bg-white p-8 shadow-[5px_5px_0px_#191A23]">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-black hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to event
          </button>
          <h1 className="mt-6 text-3xl font-black">No badge to show yet</h1>
          <p className="mt-2 text-sm font-semibold text-[#191A23]/70">Complete registration first, then the badge template will be generated here.</p>
          <button type="button" onClick={onRegisterAgain} className="neo-btn mt-6 px-5 py-3 text-sm uppercase cursor-pointer">
            Register Team
          </button>
        </div>
      </main>
    );
  }

  const handleDownload = async () => {
    if (!registration?.registrationId || !qrUrl) return;
    await downloadRegistrationBadge(registration, qrUrl);
  };

  return (
    <main className="min-h-screen bg-[#FFF8E8] pt-24 pb-16 px-4 md:px-8 text-[#191A23]">
      <div className="max-w-6xl mx-auto space-y-7">
        <div className="no-print flex items-center justify-between">
          <button type="button" onClick={onBack} className="inline-flex h-14 w-14 items-center justify-center rounded-xl border-2 border-[#191A23] bg-white text-[#191A23] shadow-[3px_3px_0px_#191A23] hover:bg-[#F3F3F3]" aria-label="Back to event">
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
            <button type="button" onClick={handleDownload} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black uppercase text-[#10131D] shadow-[0_12px_30px_rgba(25,26,35,0.12)] ring-1 ring-[#191A23]/10 hover:bg-[#F3F3F3]">
              <Download className="w-4 h-4" /> Download
            </button>
            <button type="button" onClick={onRegisterAgain} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#B9EDC8] px-5 py-3 text-sm font-black uppercase text-[#10131D] shadow-[0_12px_30px_rgba(25,26,35,0.12)] ring-1 ring-[#191A23]/10 hover:bg-[#A7E4B9]">
              <Plus className="w-4 h-4" /> Register Another
            </button>
          </div>
        </div>

        <section className="no-print flex flex-col items-center justify-center gap-4 py-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#CDB0E7] text-[#191A23] shadow-[0_18px_40px_rgba(25,26,35,0.12)] ring-1 ring-[#191A23]/10">
            <Check className="w-12 h-12 stroke-[4]" />
          </div>
          <div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">Successfully Registered Team</h1>
            <p className="mt-3 text-sm md:text-base font-semibold text-[#191A23]/65">Your Shifa SDG team QR pass is ready. Download the PNG or print it for entry verification.</p>
          </div>
        </section>

        <section className="badge-print-wrapper rounded-[32px] bg-white/70 p-3 shadow-[0_24px_80px_rgba(25,26,35,0.10)] ring-1 ring-[#191A23]/10 md:p-5">
          <RegistrationPassCard registration={registration} qrUrl={qrUrl} className="mx-auto max-w-5xl" />
        </section>
      </div>
    </main>
  );
}
