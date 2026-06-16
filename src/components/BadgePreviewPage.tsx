import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Download, Plus } from 'lucide-react';
import { Registration } from '../types';
import {
  badgeTemplateUrl,
  createRegistrationQrUrl,
  downloadRegistrationBadge,
  getPreviewNameSize,
} from '../lib/registrationBadge';

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

  const nameSize = getPreviewNameSize(registration.leaderName);

  return (
    <main className="min-h-screen bg-[#0D1712] pt-24 pb-16 px-4 md:px-8 text-white">
      <div className="max-w-6xl mx-auto space-y-7">
        <div className="no-print flex items-center justify-between">
          <button type="button" onClick={onBack} className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/8 text-white ring-1 ring-white/10 hover:bg-white/12" aria-label="Back to event">
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
            <button type="button" onClick={handleDownload} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black uppercase text-[#10131D] shadow-lg hover:bg-white/90">
              <Download className="w-4 h-4" /> Download
            </button>
            <button type="button" onClick={onRegisterAgain} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#B9FF66] px-5 py-3 text-sm font-black uppercase text-[#10131D] shadow-lg hover:bg-[#B9FF66]/90">
              <Plus className="w-4 h-4" /> Register Another
            </button>
          </div>
        </div>

        <section className="no-print flex flex-col items-center justify-center gap-4 py-6 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#38E979] text-[#07130D] shadow-[0_20px_60px_rgba(56,233,121,0.25)]">
            <Check className="w-12 h-12 stroke-[4]" />
          </div>
          <div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">Successfully Registered Team</h1>
            <p className="mt-3 text-sm md:text-base font-semibold text-white/65">Your Shifa SDG badge is ready. Download the PNG or print it for entry verification.</p>
          </div>
        </section>

        <section className="badge-print-wrapper rounded-3xl bg-white/6 p-3 md:p-5 ring-1 ring-white/12 shadow-[0_30px_90px_rgba(0,0,0,0.25)]">
          <div
            id="registration-badge-template"
            className="registration-badge relative mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-xl bg-cover bg-center shadow-2xl ring-1 ring-white/20"
            style={{ backgroundImage: `url(${badgeTemplateUrl})` }}
          >
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/24 via-black/4 to-black/10" />

            <div className="absolute left-[5%] top-[6%] z-10 rounded-lg bg-black/42 px-3 py-2 backdrop-blur-sm">
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.22em] text-white/70">Shifa SDG ID</p>
              <p className="font-mono text-xs md:text-base font-black text-[#B9FF66]">{registration.registrationId}</p>
            </div>

            <div className="absolute right-[6.5%] top-[7%] z-30 w-[17%] min-w-[88px] max-w-[148px] rounded-md bg-white p-2 shadow-[0_14px_34px_rgba(0,0,0,0.45)]">
              {qrUrl && <img src={qrUrl} alt={`QR code for ${registration.registrationId}`} className="block h-full w-full" />}
            </div>

            <div className="absolute left-[5%] top-[31%] z-10 w-[66%] text-left">
              <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.28em] text-[#B9FF66] drop-shadow">
                Registered Team Leader
              </p>
              <h2
                className="mt-2 max-w-[780px] font-black leading-[0.96] text-white drop-shadow-[0_5px_14px_rgba(0,0,0,0.55)]"
                style={{ fontSize: nameSize }}
              >
                {registration.leaderName}
              </h2>
              <div className="mt-4 space-y-1 text-white drop-shadow-[0_3px_10px_rgba(0,0,0,0.5)]">
                <p className="text-2xl md:text-3xl font-black leading-tight">{registration.fieldOfStudy}</p>
                <p className="text-xl md:text-2xl font-black leading-tight">TID - {registration.teamName}</p>
                <p className="max-w-[620px] text-base md:text-xl font-semibold leading-tight text-white/90">{registration.collegeName}</p>
                <p className="max-w-[620px] text-sm md:text-lg font-semibold leading-tight text-white/85">{registration.location}</p>
                <p className="text-xs md:text-base font-mono font-bold text-white/80">{registration.track} | {registration.phoneNumber}</p>
              </div>
            </div>

            <div className="absolute bottom-[5%] left-[5%] right-[5%] z-10 flex items-end justify-between border-t border-white/45 pt-3">
              <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.24em] text-white/75">
                Verified Shifa SDG Registration
              </p>
              <p className="text-xl md:text-3xl font-black text-white/90">{String(registration.teamSize).padStart(2, '0')}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
