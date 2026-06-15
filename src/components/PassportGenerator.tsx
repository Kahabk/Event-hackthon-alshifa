import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download, RefreshCw, Check, ShieldCheck, Ticket, Terminal } from 'lucide-react';

const AVATAR_STYLERS = [
  // 1. Robot AI Bot
  <svg key="av-1" viewBox="0 0 100 100" className="w-full h-full fill-none stroke-[#191A23] stroke-[4]" strokeLinecap="round" strokeLinejoin="round">
    <rect x="25" y="30" width="50" height="40" rx="10" fill="#B9FF66" />
    <rect x="35" y="15" width="30" height="15" rx="5" />
    <line x1="50" y1="15" x2="50" y2="5" />
    <circle cx="50" cy="5" r="3" fill="#191A23" />
    <circle cx="40" cy="50" r="5" fill="#191A23" />
    <circle cx="60" cy="50" r="5" fill="#191A23" />
    <path d="M42 60 Q50 64 58 60" />
  </svg>,
  // 2. Innovation participant
  <svg key="av-2" viewBox="0 0 100 100" className="w-full h-full fill-none stroke-[#191A23] stroke-[4]" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="50" cy="50" r="35" fill="#F3F3F3" />
    <rect x="25" y="40" width="50" height="18" rx="4" fill="#191A23" />
    <line x1="25" y1="49" x2="75" y2="49" stroke="#B9FF66" strokeWidth={2} />
    <circle cx="37" cy="49" r="3" fill="#B9FF66" />
    <circle cx="63" cy="49" r="3" fill="#B9FF66" />
    <path d="M40 70 Q50 76 60 70" />
    <path d="M22 25 L32 32 M78 25 L68 32" strokeWidth={3} />
  </svg>,
  // 3. Rocket Space Explorer
  <svg key="av-3" viewBox="0 0 100 100" className="w-full h-full fill-none stroke-[#191A23] stroke-[4]" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="50" cy="50" r="35" fill="#B9FF66" />
    <path d="M50 20 C60 35 60 65 60 70 L40 70 C40 65 40 35 50 20 Z" fill="#FFFFFF" />
    <circle cx="50" cy="42" r="5" fill="#191A23" />
    <path d="M35 70 Q25 75 30 80 Q50 75 70 80 Q75 75 65 70" fill="#191A23" />
  </svg>,
  // 4. Cool Tech Kitty / Neko
  <svg key="av-4" viewBox="0 0 100 100" className="w-full h-full fill-none stroke-[#191A23] stroke-[4]" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 30 L35 45 L65 45 L80 30 L75 75 L25 75 Z" fill="#F3F3F3" />
    <polygon points="20,30 32,38 25,48" fill="#191A23" />
    <polygon points="80,30 68,38 75,48" fill="#191A23" />
    <circle cx="38" cy="58" r="4.5" fill="#191A23" />
    <circle cx="62" cy="58" r="4.5" fill="#191A23" />
    <path d="M46 66 Q50 68 54 66" />
    <path d="M12 55 L25 58 M12 65 L25 62 M88 55 L75 58 M88 65 L75 62" strokeWidth={2} />
  </svg>,
  // 5. Code Brackets Guru
  <svg key="av-5" viewBox="0 0 100 100" className="w-full h-full fill-none stroke-[#191A23] stroke-[4]" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="50" cy="50" r="35" fill="#191A23" />
    <path d="M33 42 L25 50 L33 58" stroke="#B9FF66" strokeWidth={5} />
    <path d="M67 42 L75 50 L67 58" stroke="#B9FF66" strokeWidth={5} />
    <path d="M54 35 L46 65" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="square" />
  </svg>
];

const ROLES = [
  'Healthcare Innovator',
  'Education Technology Builder',
  'Sustainability Problem Solver',
  'AI and Digital Technology Creator',
  'Agriculture Systems Thinker',
  'Social Innovation Catalyst'
];

interface PassportGeneratorProps {
  initialName?: string;
  initialTrack?: string;
}

export default function PassportGenerator({ initialName = 'Student Innovator', initialTrack = 'SDG Innovation Domain' }: PassportGeneratorProps) {
  const [userName, setUserName] = useState(initialName);
  const [userRole, setUserRole] = useState(ROLES[0]);
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [ticketTheme, setTicketTheme] = useState<'green' | 'black' | 'white'>('green');
  
  const [isMinting, setIsMinting] = useState(false);
  const [isMinted, setIsMinted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('SDG-2026-X97B');
  const [mintLogs, setMintLogs] = useState<string[]>([]);
  const mintZoneRef = useRef<HTMLDivElement>(null);

  const randomizeTicketNum = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'SDG-2026-';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleRandomizeDetails = () => {
    setAvatarIndex(prev => (prev + 1) % AVATAR_STYLERS.length);
    setUserRole(ROLES[Math.floor(Math.random() * ROLES.length)]);
    setTicketNumber(randomizeTicketNum());
    setIsMinted(false);
  };

  const handleMintTicket = () => {
    setIsMinting(true);
    setMintLogs([]);
    setIsMinted(false);

    const logs = [
      'Initializing Shifa SDG badge allocation...',
      'Preparing registration badge layout...',
      'Signing with Shifa SDG registration authority keys...',
      'Generating unique participant badge code...',
      'Registration badge verified successfully!'
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setMintLogs(prev => [...prev, log]);
        if (index === logs.length - 1) {
          setIsMinting(false);
          setIsMinted(true);
        }
      }, (index + 1) * 450);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="passport-editor-section" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Configuration column (Left) */}
      <div className="lg:col-span-5 space-y-6 bg-white border-3 border-[#191A23] p-6 rounded-[24px] shadow-[4px_4px_0px_#191A23] text-[#191A23]">
        <div className="flex items-center gap-2 border-b-2 border-[#191A23]/10 pb-3">
          <Terminal className="w-5 h-5 text-[#191A23]" />
          <h3 className="font-sans font-black text-lg tracking-tight">Badge customizer</h3>
        </div>

        {/* Builder Name input */}
        <div className="space-y-1.5">
          <label htmlFor="passport-name-input" className="font-bold text-xs uppercase tracking-wider text-[#191A23]/70 block">
            Participant Name
          </label>
          <input
            id="passport-name-input"
            type="text"
            value={userName}
            onChange={(e) => {
              setUserName(e.target.value.slice(0, 24));
              setIsMinted(false);
            }}
            placeholder="Name your pass"
            className="w-full text-sm font-bold border-2 border-[#191A23] bg-[#F3F3F3] px-3.5 py-2.5 rounded-xl focus:outline-none focus:bg-white"
          />
        </div>

        {/* Builder Tech Role selection */}
        <div className="space-y-1.5">
          <label htmlFor="passport-role-select" className="font-bold text-xs uppercase tracking-wider text-[#191A23]/70 block">
            Innovation Domain
          </label>
          <select
            id="passport-role-select"
            value={userRole}
            onChange={(e) => {
              setUserRole(e.target.value);
              setIsMinted(false);
            }}
            className="w-full text-xs font-bold border-2 border-[#191A23] bg-[#F3F3F3] p-3 rounded-xl focus:outline-none cursor-pointer"
          >
            {ROLES.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        {/* Card hologram style */}
        <div className="space-y-1.5">
          <span className="font-bold text-xs uppercase tracking-wider text-[#191A23]/70 block">
            Badge Theme
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'green', label: 'Neon Green', color: 'bg-[#B9FF66]' },
              { id: 'black', label: 'Impact Black', color: 'bg-[#191A23] border border-white' },
              { id: 'white', label: 'Clean White', color: 'bg-white border-2 border-[#191A23]' }
            ].map(theme => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setTicketTheme(theme.id as 'green' | 'black' | 'white')}
                className={`py-2 px-1 rounded-xl text-[10px] font-black border-2 border-[#191A23] flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  ticketTheme === theme.id
                    ? 'ring-2 ring-emerald-500 shadow-[2px_2px_0px_#191A23] scale-[1.03] bg-[#F3F3F3]'
                    : 'bg-white hover:bg-[#F3F3F3]'
                }`}
              >
                <span className={`w-4 h-4 rounded-full ${theme.color}`} />
                <span>{theme.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Avatar customizer */}
        <div className="space-y-1.5">
          <span className="font-bold text-xs uppercase tracking-wider text-[#191A23]/70 block">
            Visual Badge Avatar
          </span>
          <div className="flex items-center gap-3 bg-[#F3F3F3] p-2.5 rounded-xl border-2 border-[#191A23]/15">
            <div className="w-14 h-14 bg-white border-2 border-[#191A23] rounded-lg p-1.5 flex-none overflow-hidden antialiased">
              {AVATAR_STYLERS[avatarIndex]}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold leading-tight">Choose badge avatar</p>
              <button
                type="button"
                onClick={() => {
                  setAvatarIndex(prev => (prev + 1) % AVATAR_STYLERS.length);
                  setIsMinted(false);
                }}
                className="text-[10px] bg-white border border-[#191A23] hover:bg-[#eaeaea] font-bold py-1 px-2.5 rounded-md flex items-center gap-1 shadow-[1px_1px_0px_#191A23] transition-all cursor-pointer"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Next Avatar
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 border-t border-[#191A23]/10 space-y-2.5">
          <div className="flex gap-2">
            <button
              id="rand-badge-btn"
              type="button"
              onClick={handleRandomizeDetails}
              className="flex-1 py-2.5 text-xs font-bold bg-[#F3F3F3] border-2 border-[#191A23] rounded-xl hover:bg-[#e4e4e4] active:translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Randomize
            </button>
            
            <button
              id="mint-badge-btn"
              type="button"
              onClick={handleMintTicket}
              disabled={isMinting}
              className="flex-1.5 py-2.5 text-xs font-black bg-[#B9FF66] border-2 border-[#191A23] shadow-[3px_3px_0px_#191A23] rounded-xl hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_#191A23] active:translate-x-0 active:translate-y-0 disabled:bg-opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isMinting ? 'Preparing Badge...' : 'Verify Registration Badge'}
            </button>
          </div>

          {/* Holographic Verification Logs */}
          <AnimatePresence>
            {(isMinting || mintLogs.length > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#191A23] border border-[#191A23] p-3 rounded-xl overflow-hidden font-mono text-[9px] text-green-400 leading-normal"
              >
                <div className="flex items-center justify-between mb-1.5 border-b border-green-900 pb-1">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold uppercase tracking-wider">
                    <span className="animate-ping inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Badge Verification Stream
                  </span>
                  <span className="text-white/40">v1.2.0</span>
                </div>
                {mintLogs.map((log, i) => (
                  <div key={i} className="flex gap-1 items-start">
                    <span className="text-neutral-500 font-bold">&gt;</span>
                    <span>{log}</span>
                  </div>
                ))}
                {isMinting && <div className="text-green-300 animate-pulse mt-0.5 px-3">... compilation in play ...</div>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Passport Preview (Right Column - larger layout span) */}
      <div className="lg:col-span-7 flex flex-col items-center">
        {/* Ticket Box Wrapper to hold the Ticket card strictly */}
        <div ref={mintZoneRef} className="w-full max-w-[420px] print:m-0 print:p-0">
          <div
            id="builder-passport-card"
            className={`relative w-full border-4 border-[#191A23] rounded-[32px] overflow-hidden shadow-[10px_10px_0px_#191A23] transition-all duration-300 ${
              ticketTheme === 'green' ? 'bg-[#B9FF66] text-[#191A23]' : ''
            } ${
              ticketTheme === 'black' ? 'bg-[#191A23] text-white border-[#B9FF66] shadow-[10px_10px_0px_#B9FF66]' : ''
            } ${
              ticketTheme === 'white' ? 'bg-white text-[#191A23]' : ''
            }`}
          >
            {/* Realtime scanning effect during verification */}
            {isMinting && (
              <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                <motion.div
                  initial={{ y: 0 }}
                  animate={{ y: '360px' }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  className="w-full h-1 bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0 shadow-[0_0_10px_#ef4444]"
                />
              </div>
            )}

            {/* Passport Header */}
            <div className={`p-5 flex items-start justify-between border-b-3 border-[#191A23] ${
              ticketTheme === 'black' ? 'border-[#B9FF66]/30' : 'bg-[#191A23]/5'
            }`}>
              <div>
                <h4 className="font-extrabold tracking-tight text-sm uppercase">SHIFA SDG // 2026</h4>
                <p className={`text-[10px] font-semibold opacity-70 ${ticketTheme === 'black' ? 'text-neutral-400' : 'text-[#191A23]'}`}>
                  Access ID: {ticketNumber}
                </p>
              </div>
              <span className={`px-2.5 py-1 text-[9px] font-black border-2 border-[#191A23] rounded-md uppercase tracking-wide shadow-[1.5px_1.5px_0px_#191A23] ${
                ticketTheme === 'black' ? 'bg-[#B9FF66] text-[#191A23] border-[#B9FF66]' : 'bg-white text-[#191A23]'
              }`}>
                {ticketTheme === 'black' ? 'Verified Team' : 'SDG PASS'}
              </span>
            </div>

            {/* Passport Main Details Body */}
            <div className="p-5 md:p-6 space-y-6">
              {/* Profile card block */}
              <div className="flex gap-4 items-center">
                <div className={`w-20 h-20 bg-white border-3 border-[#191A23] rounded-2xl flex-none p-2 relative shadow-[3px_3px_0px_#191A23] overflow-hidden antialiased ${
                  ticketTheme === 'black' ? 'border-[#B9FF66]' : ''
                }`}>
                  {AVATAR_STYLERS[avatarIndex]}
                  {/* Miniature decorative element */}
                  <span className="absolute bottom-0 right-0 bg-[#191A23] text-white text-[6px] font-black px-1 rounded-tl-sm uppercase">HFC</span>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <span className="text-[9px] font-bold font-mono tracking-widest block uppercase opacity-75">
                    Participant Identity
                  </span>
                  <p className="text-xl font-bold tracking-tight leading-none truncate font-sans">
                    {userName || 'Student Innovator'}
                  </p>
                  <span className={`inline-block text-xs font-extrabold px-2 py-0.5 rounded-md border border-[#191A23] truncate max-w-full ${
                    ticketTheme === 'black' ? 'bg-[#B9FF66]/10 border-[#B9FF66]/40 text-[#B9FF66]' : 'bg-black/10'
                  }`}>
                    {userRole}
                  </span>
                </div>
              </div>

              {/* Event dates & tracks details info blocks */}
              <div className={`grid grid-cols-2 gap-4 bg-white/40 border border-[#191A23]/10 p-3.5 rounded-2xl ${
                ticketTheme === 'black' ? 'bg-white/5 border-[#B9FF66]/10' : ''
              }`}>
                <div>
                  <span className="text-[8px] font-bold uppercase tracking-wider opacity-65 block">Event Location</span>
                  <p className="text-xs font-black tracking-tight mt-0.5">Kerala, India</p>
                </div>
                <div>
                  <span className="text-[8px] font-bold uppercase tracking-wider opacity-65 block">Grand Finale</span>
                  <p className="text-xs font-black tracking-tight mt-0.5">15 July 2026</p>
                </div>
              </div>

              {/* Verified badges stamp & Barcode */}
              <div className="flex items-center justify-between gap-4 pt-2 border-t-2 border-dashed border-[#191A23]/15">
                {/* Barcode representation */}
                <div className="flex-1">
                  <div className="flex flex-col">
                    <div className="flex items-end gap-[2px] h-7">
                      {[2,4,1,3,2,1,4,2,3,1,2,4,2,1,3,1,4,2,3,1,2,3].map((val, i) => (
                        <div
                          key={i}
                          className={`w-[2.5px] rounded-t-sm ${
                            ticketTheme === 'black' ? 'bg-[#B9FF66]' : 'bg-[#191A23]'
                          }`}
                          style={{ height: `${val * 24 + 10}%` }}
                        />
                      ))}
                    </div>
                    <span className="text-[7px] font-mono tracking-widest mt-1 opacity-70 text-center uppercase block">
                      *SDG2026-{ticketNumber.split('-')[2]}*
                    </span>
                  </div>
                </div>

                {/* Simulated Hologram Certified Stamp block */}
                <div className="flex-none">
                  {isMinted ? (
                    <motion.div
                      initial={{ scale: 0.1, rotate: -45 }}
                      animate={{ scale: 1, rotate: -10 }}
                      className="flex flex-col items-center justify-center border-3 border-emerald-500 rounded-full w-14 h-14 bg-emerald-50 text-emerald-600 shadow-[1.5px_1.5px_0px_#191A23] font-sans rotate-[-10deg] p-1 text-center select-none"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                      <span className="text-[7px] font-black tracking-tighter uppercase">VERIFIED SECURE</span>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col justify-center items-center opacity-45 border-3 border-[#191A23]/30 border-dashed rounded-full w-14 h-14 text-center p-1 font-mono text-[7px] leading-tight font-bold">
                      <Ticket className="w-3.5 h-3.5 mb-0.5" />
                      PENDING VERIFY
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card Footer ticket notches */}
            <div className="absolute left-0 bottom-1/3 -translate-y-1/2 w-4 h-8 bg-[#191A23] rounded-r-full border-r-[3px] border-[#191A23] z-10" />
            <div className="absolute right-0 bottom-1/3 -translate-y-1/2 w-4 h-8 bg-[#191A23] rounded-l-full border-l-[3px] border-[#191A23] z-10" />

            {/* Interactive footer details */}
            <div className={`p-4 text-center border-t-2 border-[#191A23] text-[9px] font-mono leading-none tracking-tight flex items-center justify-center gap-1 bg-[#191A23] text-white ${
              ticketTheme === 'black' ? 'border-[#B9FF66]/20' : ''
            }`}>
              <Sparkles className="w-3 h-3 text-[#B9FF66] fill-[#B9FF66]" />
              <span>VERIFIED SHIFA SDG REGISTRATION // SDG2026</span>
            </div>
          </div>
        </div>

        {/* Outer Actions (e.g., Simulated print badge or download pass receipt) */}
        <div className="mt-4 flex gap-3 print:hidden">
          <button
            id="print-pass-btn"
            type="button"
            onClick={handlePrint}
            className="text-xs font-bold bg-[#191A23] text-white border-2 border-white/25 rounded-xl px-4 py-2 hover:bg-neutral-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#191A23]"
          >
            <Download className="w-3.5 h-3.5" /> Print Registration Badge
          </button>
        </div>
      </div>
    </div>
  );
}
