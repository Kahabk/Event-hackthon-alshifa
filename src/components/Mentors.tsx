import { Linkedin, Cpu, ShieldAlert, Sparkles, Terminal } from 'lucide-react';
import { MENTORS } from '../data';
import kahabGraphic from '../../kahab.svg';

export default function Mentors() {
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
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Section Title */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <span className="bg-[#B9FF66] text-[#191A23] font-mono font-bold text-xs px-3.5 py-1.5 border-2 border-[#191A23] rounded-md shadow-[2px_2px_0px_#191A23] uppercase tracking-wider inline-block">
            Mentors and Experts
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Meet the <span className="neo-highlight">Expert Clinics</span>
          </h2>
          <p className="text-[#191A23]/70 font-medium text-sm sm:text-base leading-relaxed">
            Experts from academia, industry, startups, and social innovation sectors support teams with idea refinement, validation, and pitch preparation.
          </p>
        </div>

        {/* Expert Clinics visual */}
        <img
          src={kahabGraphic}
          alt="Expert clinics programme graphic"
          className="mx-auto block w-full max-w-5xl h-auto object-contain"
          loading="lazy"
        />

        {/* Mentors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {MENTORS.map((mentor) => (
            <div
              key={mentor.name}
              className="neo-card p-6 flex flex-col justify-between text-left space-y-5"
            >
              <div className="space-y-4">
                {/* Custom graphic abstract avatar shapes */}
                <div className={`w-full aspect-square border-3 border-[#191A23] rounded-2xl relative shadow-[3px_3px_0px_#191A23] overflow-hidden flex items-center justify-center p-3 ${mentor.colorClass}`}>
                  {getDoodleAvatar(mentor.role)}
                  <span className="absolute bottom-2.5 left-2.5 bg-[#191A23] text-white text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded border border-white/20">
                    {mentor.role.split(' ')[0]}
                  </span>
                </div>

                {/* Info titles */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-sans font-black text-xl tracking-tight">
                      {mentor.name}
                    </h3>
                    <a
                      href={mentor.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 hover:bg-[#B9FF66]/20 border-2 border-[#191A23] rounded-lg shadow-[1.5px_1.5px_0px_#191A23] active:translate-y-0.2 cursor-pointer transition-all bg-white"
                      aria-label={`${mentor.name} Linkedin Link`}
                    >
                      <Linkedin className="w-4 h-4 text-[#191A23]" />
                    </a>
                  </div>
                  <p className="bg-[#B9FF66] text-[#191A23] text-[10px] uppercase font-mono font-black tracking-widest px-2 py-0.5 border border-[#191A23] rounded-md inline-block">
                    {mentor.role}
                  </p>
                </div>

                {/* Description */}
                <p className="text-xs font-semibold text-[#191A23]/80 leading-relaxed font-sans">
                  {mentor.description}
                </p>
              </div>

              {/* Technologies Tag list footer */}
              <div className="pt-4 border-t-2 border-dashed border-[#191A23]/10 flex flex-wrap gap-1.5">
                {mentor.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="text-[9px] font-mono font-black text-[#191A23] bg-white border border-[#191A23] px-2 py-0.5 rounded shadow-[1px_1px_0px_#191A23]"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
