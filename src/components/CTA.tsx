import { Sparkles, Star } from 'lucide-react';

interface CTAProps {
  onRegisterClick: () => void;
}

export default function CTA({ onRegisterClick }: CTAProps) {
  return (
    <section className="py-20 md:py-28 px-4 md:px-8 bg-[#F3F3F3] text-[#191A23] border-b-3 border-[#191A23] relative overflow-hidden">
      {/* Decorative stars */}
      <div className="absolute top-10 left-10 md:left-24 text-[#B9FF66]/20 animate-pulse">
        <Star className="w-10 h-10 fill-current text-[#191A23]/10" />
      </div>
      <div className="absolute bottom-10 right-10 md:right-24 text-[#B9FF66]/20 animate-pulse delay-1000">
        <Star className="w-8 h-8 fill-current text-[#191A23]/10" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="bg-[#B9FF66] border-4 border-[#191A23] p-8 md:p-14 rounded-[32px] md:rounded-[40px] shadow-[10px_10px_0px_#191A23] text-center space-y-6 md:space-y-8 relative overflow-hidden">
          {/* Subtle background graphic dot matrix */}
          <div className="absolute inset-0 bg-[radial-gradient(#191a23_1.5px,transparent_1.5px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

          {/* Icon Badge */}
          <div className="bg-white text-[#191A23] inline-flex p-3 rounded-2xl border-2 border-[#191A23] shadow-[3px_3px_0px_#191A23] text-sm font-mono font-black uppercase tracking-wider">
            REGISTRATION CTA
          </div>

          <div className="space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Have an idea that can create impact?
            </h2>
            <p className="text-[#191A23]/80 font-bold text-sm sm:text-base leading-relaxed font-sans">
              Form your team, submit your pitch deck, and take the first step toward creating sustainable impact through Shifa SDG Innovation Challenge Kerala 2026.
            </p>
          </div>

          {/* Action Trigger button */}
          <div className="pt-2">
            <button
              id="cta-register-btn"
              type="button"
              onClick={onRegisterClick}
              className="neo-btn-black px-10 py-5 text-sm md:text-base uppercase flex items-center justify-center gap-2.5 mx-auto cursor-pointer"
            >
              Register Now <Sparkles className="w-5 h-5 fill-[#B9FF66] text-[#B9FF66]" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
