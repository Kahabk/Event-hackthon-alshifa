import { BadgeCheck, Building2, MapPin, Phone, QrCode } from 'lucide-react';
import { Registration } from '../types';

interface RegistrationPassCardProps {
  registration: Registration;
  qrUrl: string;
  className?: string;
  avatarUrl?: string | null;
  displayName?: string;
  locationLabel?: string;
}

export default function RegistrationPassCard({
  registration,
  qrUrl,
  avatarUrl,
  displayName,
  locationLabel,
  className = '',
}: RegistrationPassCardProps) {
  const leaderName = displayName?.trim() || registration.leaderName || 'Team leader';
  const teamName = registration.teamName || 'Registered team';
  const locationText = locationLabel?.trim() || registration.location || 'Kerala';
  const collegeText = registration.collegeName || 'Campus not added';
  const phoneText = registration.phoneNumber || 'Phone not added';
  const rawTrackText = registration.track || registration.fieldOfStudy || '';
  const trackText = rawTrackText && !/^not selected$/i.test(rawTrackText.trim()) ? rawTrackText : '';
  const memberLabel = `${String(registration.teamSize || 0).padStart(2, '0')} ${registration.teamSize === 1 ? 'member' : 'members'}`;
  const nameLength = leaderName.length;
  const nameSize = nameLength > 40
    ? 'clamp(1.7rem, 3vw, 2.25rem)'
    : nameLength > 28
      ? 'clamp(1.9rem, 3.6vw, 2.65rem)'
      : 'clamp(2.1rem, 4.2vw, 3.25rem)';
  const teamSize = teamName.length > 34 ? 'clamp(1.05rem, 2vw, 1.45rem)' : 'clamp(1.15rem, 2.35vw, 1.65rem)';

  return (
    <article
      className={`overflow-hidden rounded-[24px] bg-[#FFFDF8] text-[#191A23] shadow-[0_24px_80px_rgba(25,26,35,0.14)] ring-1 ring-[#191A23]/10 sm:rounded-[30px] ${className}`}
    >
      <div className="grid lg:min-h-[520px] lg:grid-cols-[minmax(0,1fr)_290px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative flex min-h-[460px] min-w-0 flex-col bg-[linear-gradient(135deg,#CDB0E7_0%,#EFE2F7_56%,#FFF8E8_100%)] p-4 sm:p-7 md:p-8 lg:min-h-[520px] lg:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex rounded-full bg-white/85 px-4 py-2 font-mono text-[10px] font-black uppercase text-[#6E4E89] ring-1 ring-[#191A23]/10">
              Shifa SDG Registration
            </span>
            <span className="rounded-full bg-[#B9EDC8] px-4 py-2 text-xs font-black text-[#191A23] ring-1 ring-[#191A23]/10">
              {memberLabel}
            </span>
          </div>

          <div className="mt-7 sm:mt-9">
            <p className="font-mono text-[11px] font-black uppercase text-[#6E4E89]">Team ID</p>
            <p className="mt-2 break-all font-mono text-base font-black text-[#191A23] sm:text-xl">
              {registration.registrationId || 'Pending ID'}
            </p>
          </div>

          <div className="mt-6 grid flex-1 gap-6 sm:mt-7 sm:gap-7 md:grid-cols-[minmax(0,1fr)_188px] md:items-center xl:grid-cols-[minmax(0,1fr)_210px]">
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-black uppercase text-[#6E4E89]">Registered Leader</p>
              <h3
                className="mt-2 max-w-2xl font-black leading-[1.08]"
                style={{ fontSize: nameSize, overflowWrap: 'anywhere' }}
              >
                {leaderName}
              </h3>
              <p
                className="mt-3 font-black leading-[1.12] text-[#191A23]/90 sm:mt-4"
                style={{ fontSize: teamSize, overflowWrap: 'anywhere' }}
              >
                {teamName}
              </p>
              {trackText && (
                <p className="mt-1 max-w-xl text-sm font-bold leading-snug text-[#191A23]/62" style={{ overflowWrap: 'anywhere' }}>
                  {trackText}
                </p>
              )}
            </div>

            <div className="mx-auto w-full max-w-[188px] self-center rounded-[24px] bg-white/82 p-4 shadow-[0_16px_40px_rgba(25,26,35,0.10)] ring-1 ring-[#191A23]/10 xl:max-w-[210px]">
              {qrUrl ? (
                <img src={qrUrl} alt={`QR code for ${registration.registrationId || teamName}`} className="block aspect-square w-full rounded-2xl" />
              ) : (
                <QrCode className="aspect-square w-full rounded-2xl bg-white text-[#191A23]" />
              )}
              <p className="mt-3 text-center font-mono text-[10px] font-black uppercase text-[#6E4E89]">Scan pass</p>
            </div>
          </div>

          <div className="mt-auto grid gap-3 pt-6 text-sm font-bold md:grid-cols-3">
            <p className="flex min-h-[52px] min-w-0 items-center gap-2 rounded-2xl bg-white/72 px-4 py-3 leading-snug ring-1 ring-[#191A23]/10">
              <Building2 className="mt-0.5 h-4 w-4 flex-none text-[#6E4E89]" />
              <span className="min-w-0 break-words">{collegeText}</span>
            </p>
            <p className="flex min-h-[52px] min-w-0 items-center gap-2 rounded-2xl bg-white/72 px-4 py-3 leading-snug ring-1 ring-[#191A23]/10">
              <MapPin className="mt-0.5 h-4 w-4 flex-none text-[#6E4E89]" />
              <span className="min-w-0 break-words">{locationText}</span>
            </p>
            <p className="flex min-h-[52px] min-w-0 items-center gap-2 rounded-2xl bg-white/72 px-4 py-3 leading-snug ring-1 ring-[#191A23]/10">
              <Phone className="mt-0.5 h-4 w-4 flex-none text-[#6E4E89]" />
              <span className="min-w-0 break-words">{phoneText}</span>
            </p>
          </div>
        </div>

        <aside className="relative flex min-h-[300px] flex-col items-center justify-end overflow-hidden bg-[#B9EDC8] p-5 text-center sm:min-h-[420px] sm:p-8">
          <div className="absolute inset-x-5 top-5 rounded-full bg-white/62 px-4 py-2 text-xs font-black uppercase text-[#3D6149] sm:inset-x-8 sm:top-8">
            Verified entry
          </div>
          <div className="absolute bottom-16 h-44 w-44 rounded-full bg-[#CDB0E7]/55 blur-2xl sm:bottom-24 sm:h-56 sm:w-56" />
          <div className="relative">
            <div className="mx-auto flex h-40 w-40 items-end justify-center overflow-hidden rounded-full bg-[#FFF8E8] shadow-[0_22px_50px_rgba(25,26,35,0.15)] ring-1 ring-[#191A23]/10 sm:h-52 sm:w-52">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-5xl font-black text-[#6E4E89] sm:text-6xl">{leaderName.trim().charAt(0).toUpperCase() || 'S'}</span>
              )}
            </div>
            <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm font-black shadow-[0_12px_30px_rgba(25,26,35,0.1)] ring-1 ring-[#191A23]/10">
              <BadgeCheck className="h-4 w-4 text-[#6E4E89]" />
              Entry pass
            </div>
          </div>
          <p className="relative mt-6 max-w-[220px] text-sm font-bold leading-relaxed text-[#191A23]/65">
            Present the QR during event check-in.
          </p>
        </aside>
      </div>
    </article>
  );
}
