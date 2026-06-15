import { Quote, MessageSquare } from 'lucide-react';
import { TESTIMONIALS } from '../data';

export default function Testimonials() {
  return (
    <section className="py-20 md:py-28 px-4 md:px-8 bg-[#F3F3F3] text-[#191A23] border-b-3 border-[#191A23] relative overflow-hidden">
      {/* Background visual detail */}
      <div className="absolute bottom-1/4 right-3.5 w-64 h-64 bg-[#191A23]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-12 relative z-10">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <span className="bg-[#B9FF66] text-[#191A23] font-mono font-bold text-xs px-3.5 py-1.5 border-2 border-[#191A23] rounded-md shadow-[2px_2px_0px_#191A23] uppercase tracking-wider inline-block">
            Expected Outcomes
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-[#191A23]">
            What the Challenge <span className="neo-highlight">Creates</span>
          </h2>
          <p className="text-[#191A23]/70 font-semibold text-sm sm:text-base leading-relaxed">
            The challenge is designed to build student capacity, generate ideas, engage colleges, and strengthen Shifa's long-term innovation ecosystem.
          </p>
        </div>

        {/* Testimonials Stack */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className="neo-card p-6 md:p-8 flex flex-col justify-between text-left relative group min-h-[220px]"
            >
              {/* Decorative quotation shape */}
              <div className="absolute top-4 right-4 text-[#191A23]/5 group-hover:text-[#B9FF66]/30 transition-all">
                <Quote className="w-12 h-12 stroke-[4]" />
              </div>

              {/* Speech bubble paragraph */}
              <div className="space-y-4">
                <div className="bg-[#B9FF66]/20 inline-flex p-2.5 rounded-lg border border-[#191A23]/10">
                  <MessageSquare className="w-5 h-5 text-[#191A23]" />
                </div>
                <blockquote className="text-[#191A23] text-sm md:text-base font-bold leading-relaxed font-sans">
                  "{t.text}"
                </blockquote>
              </div>

              {/* Author Info footer */}
              <div className="pt-6 border-t border-[#191A23]/10 mt-6 flex flex-col items-start gap-1">
                <cite className="not-italic text-[#191A23] bg-[#B9FF66] border border-[#191A23] shadow-[1.5px_1.5px_0px_#191A23] text-xs px-2 py-0.5 rounded-md font-black tracking-tight font-sans">
                  {t.author}
                </cite>
                <span className="text-[10px] text-[#191A23]/60 font-mono mt-1 font-bold uppercase">
                  {t.role} • <span className="text-[#191A23]/50">{t.team}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
