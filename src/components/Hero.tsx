import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Calendar, Check, ClipboardCheck, Lightbulb, MapPin, Play, Plus, Presentation, Rocket, Sparkles, Trophy, Users } from 'lucide-react';
import { profileAvatars } from '../lib/profileAvatars';
import festImage from '../../fest_image.png';

interface HeroProps {
  onRegisterClick: () => void;
}

export default function Hero({ onRegisterClick }: HeroProps) {
  const chips = ['All', 'Healthcare', 'Education', 'Software', 'Climate', 'Social'];
  const heroAvatars = profileAvatars.slice(0, 5);
  const eventPhases = [
    {
      id: 'register',
      label: 'Register',
      date: 'Now open',
      title: 'Create your team profile',
      description: 'Reserve your team name, add 3-5 members, and generate the verified team banner for event entry.',
      metric: '3-5',
      metricLabel: 'members per team',
      points: ['Team name lock', 'Leader details', 'QR banner'],
    },
    {
      id: 'clinics',
      label: 'Clinics',
      date: 'Mentor window',
      title: 'Sharpen the problem',
      description: 'Use expert clinics to validate the problem, SDG relevance, user need, feasibility, and impact path.',
      metric: '30+',
      metricLabel: 'expert mentors',
      points: ['Problem validation', 'SDG alignment', 'Feasibility review'],
    },
    {
      id: 'sprint',
      label: 'Sprint',
      date: 'Build week',
      title: 'Turn the idea into a pitch',
      description: 'Prepare the solution workflow, technology plan, prototype/demo story, and pitch deck for review.',
      metric: 'PPT',
      metricLabel: 'submission format',
      points: ['Solution workflow', 'Prototype story', 'Pitch deck'],
    },
    {
      id: 'finale',
      label: 'Finale',
      date: '15 July 2026',
      title: 'Present to the jury',
      description: 'Finalist teams showcase their SDG solution, receive jury feedback, and compete for awards.',
      metric: 'Top 10',
      metricLabel: 'finalist showcase',
      points: ['Jury review', 'Live presentation', 'Winner awards'],
    },
  ];
  const domainFocus = [
    {
      id: 'healthcare',
      label: 'Healthcare',
      title: 'Community Health Access',
      description: 'Ideas for screening, awareness, affordable care access, assistive tools, and public-health workflows.',
    },
    {
      id: 'education',
      label: 'Education',
      title: 'Inclusive Learning',
      description: 'Student tools for skill building, digital learning, campus systems, accessibility, and mentoring support.',
    },
    {
      id: 'software',
      label: 'Software',
      title: 'Digital Public Good',
      description: 'Apps, dashboards, AI helpers, automation, and data tools that solve real student or community problems.',
    },
    {
      id: 'climate',
      label: 'Climate',
      title: 'Sustainable Campus',
      description: 'Solutions for waste, water, energy, carbon awareness, climate resilience, and responsible consumption.',
    },
  ];
  const submissionKit = [
    { label: 'Problem', value: 'SDG', icon: <Lightbulb className="h-4 w-4" /> },
    { label: 'Validation', value: 'User', icon: <ClipboardCheck className="h-4 w-4" /> },
    { label: 'Pitch deck', value: 'PPT', icon: <Presentation className="h-4 w-4" /> },
  ];
  const [selectedPhaseId, setSelectedPhaseId] = useState(eventPhases[1].id);
  const [selectedDomainId, setSelectedDomainId] = useState(domainFocus[2].id);
  const selectedPhase = eventPhases.find(phase => phase.id === selectedPhaseId) || eventPhases[1];
  const selectedDomain = domainFocus.find(domain => domain.id === selectedDomainId) || domainFocus[2];

  return (
    <section className="relative overflow-hidden px-4 pb-14 pt-24 md:px-8 md:pb-20 md:pt-32">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:items-end">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-5"
          >
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#191A23] bg-[#191A23] px-4 py-2 text-xs font-black text-white">
              <span className="h-2.5 w-2.5 rounded-full bg-[#B9FF66] shadow-[0_0_0_5px_rgba(185,237,200,0.18)]" />
              Grand Finale • 15 July 2026
            </div>

            <h1 className="max-w-xl text-[clamp(3.45rem,15vw,5rem)] font-black leading-[0.93] tracking-tight text-[#191A23] sm:text-6xl md:text-7xl">
              Shifa SDG Innovation
            </h1>

            <p className="max-w-xl text-sm font-bold leading-relaxed text-[#191A23]/72 sm:text-base">
              A Kerala-wide student innovation platform for SDG-focused ideas, expert clinics, pitch refinement, and finale-ready project showcases.
            </p>

            <div className="theme-hero-mobile-visual lg:hidden">
              <img
                src={festImage}
                alt="Students representing the Shifa SDG innovation challenge"
                className="theme-hero-mobile-image"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="grid grid-cols-3 gap-2 sm:gap-4"
          >
            {[
              { label: 'Teams expected', value: '250', icon: <Users className="h-5 w-5" /> },
              { label: 'Expert clinics', value: '30+', icon: <Sparkles className="h-5 w-5" /> },
              { label: 'Prize pool', value: '1.5L', icon: <Trophy className="h-5 w-5" /> },
            ].map((item) => (
              <div key={item.label} className="theme-stat-card theme-stat-card-hero">
                <span className="theme-stat-icon">{item.icon}</span>
                <p className="text-xs font-bold text-[#191A23]/60">{item.label}</p>
                <p className="mt-1 text-3xl font-black tracking-tight text-[#191A23] sm:text-4xl">{item.value}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="flex flex-wrap items-center gap-2"
        >
          {chips.map((chip) => (
            <a
              key={chip}
              href={chip === 'All' ? '#about' : '#tracks'}
              className={`theme-chip ${chip === 'Software' ? 'theme-chip-active' : ''}`}
            >
              {chip}
            </a>
          ))}
          <button type="button" onClick={onRegisterClick} className="theme-circle-action" aria-label="Register">
            <Plus className="h-5 w-5" />
          </button>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="theme-command-panel"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <span className="theme-app-icon">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black tracking-tight">Challenge Control Room</h2>
                  <p className="text-xs font-bold text-[#191A23]/60">Plan registration, mentor clinics, pitch deck, and finale flow</p>
                </div>
              </div>
              <div className="flex -space-x-3">
                {heroAvatars.map((avatar) => (
                  <span key={avatar.id} className="theme-mini-avatar">
                    <img src={avatar.url} alt="" loading="lazy" decoding="async" />
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_1fr_1.1fr]">
              <div className="theme-dark-module theme-control-module">
                <p className="font-mono text-[10px] font-black uppercase tracking-widest text-white/58">Event journey</p>
                <div className="theme-phase-list mt-4" role="tablist" aria-label="Event journey phases">
                  {eventPhases.map(phase => (
                    <button
                      key={phase.id}
                      type="button"
                      onClick={() => setSelectedPhaseId(phase.id)}
                      className={`theme-phase-button ${selectedPhase.id === phase.id ? 'theme-phase-button-active' : ''}`}
                    >
                      {phase.label}
                    </button>
                  ))}
                </div>
                <div className="mt-5">
                  <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#B9FF66]">{selectedPhase.date}</p>
                  <h3 className="mt-2 text-2xl font-black leading-tight text-white">{selectedPhase.title}</h3>
                  <p className="mt-2 text-sm font-bold leading-relaxed text-white/70">{selectedPhase.description}</p>
                  <div className="mt-4 grid gap-2">
                    {selectedPhase.points.map(point => (
                      <span key={point} className="theme-control-check">
                        <Check className="h-3.5 w-3.5" /> {point}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="theme-dark-module theme-control-module">
                <p className="font-mono text-[10px] font-black uppercase tracking-widest text-white/58">Domain focus</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {domainFocus.map(domain => (
                    <button
                      key={domain.id}
                      type="button"
                      onClick={() => setSelectedDomainId(domain.id)}
                      className={`theme-domain-button ${selectedDomain.id === domain.id ? 'theme-domain-button-active' : ''}`}
                    >
                      {domain.label}
                    </button>
                  ))}
                </div>
                <div className="theme-domain-detail-card mt-5 rounded-3xl border border-white/12 bg-white p-4">
                  <p className="theme-domain-metric text-5xl font-black">{selectedPhase.metric}</p>
                  <p className="theme-domain-metric-label mt-1 text-xs font-black uppercase tracking-wide">{selectedPhase.metricLabel}</p>
                  <h3 className="mt-5 text-xl font-black leading-tight">{selectedDomain.title}</h3>
                  <p className="mt-2 text-sm font-bold leading-relaxed">{selectedDomain.description}</p>
                </div>
              </div>

              <div className="theme-yellow-module theme-control-module">
                <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#191A23]/55">Submission kit</p>
                <h3 className="mt-2 text-2xl font-black leading-tight">Build a review-ready idea</h3>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {submissionKit.map((item) => (
                    <div key={item.label} className="theme-build-tile">
                      <span className="theme-build-icon">{item.icon}</span>
                      <p>{item.value}</p>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2 text-xs font-black text-[#191A23]/72">
                  <p><Check className="mr-1 inline h-3.5 w-3.5" /> Problem statement and SDG fit</p>
                  <p><Check className="mr-1 inline h-3.5 w-3.5" /> Solution workflow and impact path</p>
                  <p><Check className="mr-1 inline h-3.5 w-3.5" /> Demo, prototype, or pitch link</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={onRegisterClick} className="theme-module-btn">Register</button>
                  <a href="#schedule" className="theme-module-btn theme-module-btn-dark">Stages</a>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-4">
              {[
                ['Tracks', '6'],
                ['Team size', '3-5'],
                ['Mentor clinics', '30+'],
                ['Finale', '15 Jul'],
              ].map(([label, value]) => (
                <div key={label} className="theme-control-stat">
                  <p className="text-xs font-bold text-[#191A23]/58">{label}</p>
                  <p className="mt-1 text-3xl font-black tracking-tight">{value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.26 }}
            className="space-y-5"
          >
            <div className="theme-side-card">
              <div className="flex items-start justify-between gap-4">
                <span className="theme-app-icon bg-white">
                  <Calendar className="h-5 w-5" />
                </span>
                <span className="theme-status-pill"><Rocket className="h-4 w-4" /> Finale</span>
              </div>
              <p className="mt-10 text-xs font-bold text-[#191A23]/55">Finale day</p>
              <p className="text-5xl font-black tracking-tight">15</p>
              <p className="text-sm font-bold text-[#191A23]/72">July 2026</p>
              <p className="mt-4 text-xs font-bold leading-relaxed text-[#191A23]/65">Finalist teams present SDG ideas to mentors, jury, and campus community.</p>
            </div>

            <div className="theme-side-card">
              <div className="flex items-start justify-between gap-4">
                <span className="theme-app-icon bg-white">
                  <MapPin className="h-5 w-5" />
                </span>
                <span className="theme-status-pill"><Check className="h-4 w-4" /> Kerala</span>
              </div>
              <p className="mt-10 text-xs font-bold text-[#191A23]/55">Live challenge</p>
              <p className="text-3xl font-black tracking-tight">SDG Showcase</p>
              <p className="mt-3 text-xs font-bold leading-relaxed text-[#191A23]/65">Open to student teams building useful, practical ideas for Kerala communities.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href="#schedule" className="inline-flex items-center gap-2 text-sm font-black">
                  View journey <ArrowRight className="h-4 w-4" />
                </a>
                <button type="button" onClick={onRegisterClick} className="text-sm font-black text-[#191A23]/70">
                  Register
                </button>
              </div>
            </div>
          </motion.aside>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            id="hero-register-btn"
            type="button"
            onClick={onRegisterClick}
            className="neo-btn px-8 py-4 text-center text-sm md:text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            Register Now <Sparkles className="w-4.5 h-4.5 fill-black/10" />
          </button>
          <a
            id="hero-schedule-link"
            href="#schedule"
            className="neo-btn-black px-8 py-4 text-center text-sm md:text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            View Programme Stages <Play className="w-4 h-4 fill-[#B9FF66] text-[#B9FF66]" />
          </a>
        </div>
      </div>
    </section>
  );
}
