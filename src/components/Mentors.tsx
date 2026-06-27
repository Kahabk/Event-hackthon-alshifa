import { useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardCheck, Linkedin, MessagesSquare, Rocket, Sparkles } from 'lucide-react';
import { MENTORS } from '../data';

export default function Mentors() {
  const [activeMentorIndex, setActiveMentorIndex] = useState(0);
  const activeMentor = MENTORS[activeMentorIndex] || MENTORS[0];
  const clinicPlan = [
    'Problem clarity and SDG alignment',
    'User validation and evidence',
    'Prototype or workflow direction',
    'Final pitch deck feedback',
  ];

  const getDoodleAvatar = (role: string) => {
    switch (role) {
      case 'AI Engineer':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-[#191A23] stroke-[4] fill-none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="25" y="25" width="50" height="50" rx="12" fill="#B9FF66" />
            <circle cx="40" cy="45" r="4" fill="#191A23" />
            <circle cx="60" cy="45" r="4" fill="#191A23" />
            <path d="M40 60 Q50 64 60 60" />
            <line x1="50" y1="25" x2="50" y2="15" />
            <circle cx="50" cy="12" r="5" fill="#FFFFFF" />
          </svg>
        );
      case 'Startup Founder':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-[#191A23] stroke-[4] fill-none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="50" cy="50" r="35" fill="#F3F3F3" />
            <polygon points="50,25 35,45 65,45" fill="#B9FF66" />
            <rect x="35" y="55" width="30" height="15" rx="4" fill="#191A23" />
            <line x1="42" y1="62" x2="58" y2="62" stroke="#FFFFFF" strokeWidth={2} />
          </svg>
        );
      case 'Product Designer':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-[#191A23] stroke-[4] fill-none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="20" y="20" width="60" height="60" rx="30" fill="#B9FF66" />
            <ellipse cx="50" cy="50" r="15" fill="#FFFFFF" />
            <circle cx="45" cy="50" r="3" fill="#191A23" />
            <circle cx="55" cy="50" r="3" fill="#191A23" />
            <path d="M20 50 Q50 30 80 50" />
          </svg>
        );
      case 'Full Stack Developer':
      default:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full stroke-[#191A23] stroke-[4] fill-none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="20" y="30" width="60" height="40" rx="6" fill="#191A23" />
            <polyline points="28,45 35,50 28,55" stroke="#B9FF66" strokeWidth={4} />
            <polyline points="72,45 65,50 72,55" stroke="#B9FF66" strokeWidth={4} />
            <line x1="45" y1="60" x2="55" y2="40" stroke="#FFFFFF" strokeWidth={3} />
          </svg>
        );
    }
  };

  return (
    <section id="mentors" className="py-20 md:py-28 px-4 md:px-8 bg-white text-[#191A23] border-b-3 border-[#191A23]">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div className="space-y-3">
            <span className="bg-[#cdb0e7] text-[#191A23] font-mono font-bold text-xs px-3.5 py-1.5 border-2 border-[#191A23] rounded-md shadow-[2px_2px_0px_#191A23] uppercase tracking-wider inline-block">
            Mentors and Experts
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Expert Clinics for <span className="neo-highlight">Event-Ready Ideas</span>
            </h2>
            <p className="text-[#191A23]/70 font-bold text-sm sm:text-base leading-relaxed">
              Teams meet mentors by domain, improve problem clarity, validate assumptions, shape prototypes, and prepare a stronger SDG pitch deck for the finale.
            </p>
          </div>

          <div className="rounded-[28px] border-2 border-[#191A23] bg-[#191A23] p-5 text-white shadow-[7px_7px_0px_#cdb0e7]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#cdb0e7]">Selected clinic</p>
                <h3 className="mt-2 text-2xl font-black tracking-tight">{activeMentor.name}</h3>
                <p className="mt-1 text-sm font-bold text-white/62">{activeMentor.role}</p>
              </div>
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full border-2 border-white bg-[#cdb0e7] text-[#191A23]">
                <MessagesSquare className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-4 text-sm font-bold leading-relaxed text-white/72">{activeMentor.description}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {clinicPlan.map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-2 text-xs font-black text-white/82">
                  <CheckCircle2 className="h-4 w-4 text-[#cdb0e7]" /> {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4 items-stretch">
          {MENTORS.map((mentor, index) => {
            const active = activeMentorIndex === index;
            return (
              <article
                key={mentor.name}
                tabIndex={0}
                onFocus={() => setActiveMentorIndex(index)}
                onMouseEnter={() => setActiveMentorIndex(index)}
                onClick={() => setActiveMentorIndex(index)}
                className={`group h-full cursor-pointer flex flex-col rounded-[30px] border-2 border-[#191A23] p-5 text-left shadow-[0_8px_0_#191A23] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_0_#191A23] focus:outline-none focus:ring-4 focus:ring-[#cdb0e7]/60 ${
                  active ? 'bg-[#cdb0e7]' : 'bg-[#fffdf8]'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`relative flex h-24 w-24 flex-none items-center justify-center overflow-hidden rounded-3xl border-2 border-[#191A23] p-3 shadow-[3px_3px_0px_#191A23] ${mentor.colorClass}`}>
                    {getDoodleAvatar(mentor.role)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#191A23]/52">Clinic {String(index + 1).padStart(2, '0')}</p>
                    <h3 className="mt-1 text-xl font-black leading-tight tracking-tight">{mentor.name}</h3>
                    <p className="mt-2 inline-flex rounded-full border border-[#191A23] bg-[#cdb0e7] px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-widest">
                      {mentor.role}
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-sm font-bold leading-relaxed text-[#191A23]/72">
                  {mentor.description}
                </p>

                <div className="mt-5 rounded-3xl border-2 border-[#191A23] bg-[#191A23] p-4 text-white">
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#cdb0e7]">
                    <ClipboardCheck className="h-4 w-4" /> Clinic output
                  </p>
                  <p className="mt-2 text-sm font-black leading-relaxed">
                    {index === 0 && 'A clearer healthcare problem, user group, and measurable impact claim.'}
                    {index === 1 && 'A stronger business model, validation plan, and pitch narrative.'}
                    {index === 2 && 'A refined user journey, prototype direction, and presentation structure.'}
                    {index === 3 && 'A practical technical plan, demo path, and scaling checklist.'}
                  </p>
                </div>

                <div className="mt-auto pt-5">
                  <div className="mb-4 flex flex-wrap gap-1.5 border-t-2 border-dashed border-[#191A23]/22 pt-4">
                    {mentor.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-md border border-[#191A23] bg-white px-2 py-1 font-mono text-[9px] font-black text-[#191A23] shadow-[1px_1px_0px_#191A23]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-xs font-black">
                      View clinic focus <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                    <a
                      href={mentor.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="rounded-xl border-2 border-[#191A23] bg-white p-2 shadow-[2px_2px_0px_#191A23] transition hover:-translate-y-0.5"
                      aria-label={`${mentor.name} Linkedin Link`}
                    >
                      <Linkedin className="w-4 h-4 text-[#191A23]" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="grid gap-4 rounded-[30px] border-2 border-[#191A23] bg-[#f7efe3] p-5 shadow-[6px_6px_0px_#191A23] md:grid-cols-3">
          {[
            { icon: <Sparkles className="h-5 w-5" />, title: 'Before clinic', text: 'Teams submit a short idea deck and choose the closest SDG track.' },
            { icon: <MessagesSquare className="h-5 w-5" />, title: 'During clinic', text: 'Mentors review problem fit, users, feasibility, and presentation gaps.' },
            { icon: <Rocket className="h-5 w-5" />, title: 'After clinic', text: 'Teams update the dashboard draft and prepare for finalist review.' },
          ].map(item => (
            <div key={item.title} className="rounded-3xl border-2 border-[#191A23] bg-white p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#191A23] bg-[#cdb0e7]">
                {item.icon}
              </span>
              <h3 className="mt-4 text-lg font-black">{item.title}</h3>
              <p className="mt-2 text-sm font-bold leading-relaxed text-[#191A23]/66">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
