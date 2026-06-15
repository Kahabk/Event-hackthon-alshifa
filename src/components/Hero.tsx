import { motion } from 'motion/react';
import { Sparkles, Calendar, MapPin, Play, Clock } from 'lucide-react';
import festImageUrl from '../../fest_image.png';

interface HeroProps {
  onRegisterClick: () => void;
}

export default function Hero({ onRegisterClick }: HeroProps) {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-4 md:px-8 overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#B9FF66]/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Texts Column (Left) */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 bg-[#191A23] border-2 border-[#191A23] px-3.5 py-1.5 rounded-full"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B9FF66] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B9FF66]" />
            </span>
            <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
              Registration Opens Soon • Grand Finale 15 July 2026
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] text-[#191A23]"
          >
            Shifa SDG Innovation <br /> Challenge Kerala 2026
            <div className="mt-2 text-2xl sm:text-3xl md:text-4xl block font-sans">
              Innovating for a <span className="neo-highlight text-[#191A23]">Sustainable Future.</span>
            </div>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[#191A23]/85 text-sm sm:text-md md:text-lg leading-relaxed max-w-2xl font-bold font-sans"
          >
            A Kerala-wide student innovation challenge transforming SDG-focused ideas into impactful solutions through mentoring, validation, entrepreneurship training, and showcase opportunities.
          </motion.p>

          {/* Quick specs pill tags */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex flex-wrap gap-3 pt-2"
          >
            <div className="flex items-center gap-1.5 bg-white border-2 border-[#191A23] px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#191A23] font-mono shadow-[2.5px_2.5px_0px_#191A23]">
              <Calendar className="w-3.5 h-3.5 text-[#B9FF66] fill-[#191A23]" /> 15 July 2026
            </div>
            <div className="flex items-center gap-1.5 bg-white border-2 border-[#191A23] px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#191A23] font-mono shadow-[2.5px_2.5px_0px_#191A23]">
              <MapPin className="w-3.5 h-3.5 text-[#B9FF66] fill-[#191A23]" /> Kerala
            </div>
            <div className="flex items-center gap-1.5 bg-white border-2 border-[#191A23] px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#191A23] font-mono shadow-[2.5px_2.5px_0px_#191A23]">
              <Clock className="w-3.5 h-3.5 text-[#B9FF66] fill-[#191A23]" /> 7-Stage Journey
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4"
          >
            <button
              id="hero-register-btn"
              type="button"
              onClick={onRegisterClick}
              className="neo-btn px-8 py-4 text-center text-sm md:text-base uppercase flex items-center justify-center gap-2 cursor-pointer animate-bounce"
            >
              Register Now <Sparkles className="w-4.5 h-4.5 fill-black/10" />
            </button>
            <a
              id="hero-schedule-link"
              href="#schedule"
              className="neo-btn-black px-8 py-4 text-center text-sm md:text-base uppercase flex items-center justify-center gap-2 cursor-pointer"
            >
              View Programme Stages <Play className="w-4 h-4 fill-[#B9FF66] text-[#B9FF66]" />
            </a>
          </motion.div>

          {/* Miniature live stats ticker */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-3 gap-4 pt-10 max-w-xl border-t-2 border-[#191A23]/10"
          >
            <div>
              <div className="text-xl sm:text-2xl font-black text-[#191A23] font-mono bg-[#B9FF66] px-2 py-0.5 rounded-md border border-[#191A23] inline-block shadow-[1.5px_1.5px_0px_#191A23]">150-250</div>
              <div className="text-[10px] text-[#191A23]/80 font-mono font-black uppercase tracking-widest mt-2">Teams Expected</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-[#191A23] font-mono bg-[#191A23]/5 px-2 py-0.5 rounded-md border border-[#191A23] inline-block shadow-[1.5px_1.5px_0px_#191A23]">30+</div>
              <div className="text-[10px] text-[#191A23]/80 font-mono font-black uppercase tracking-widest mt-2">Mentors & Experts</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black text-[#191A23] font-mono bg-[#191A23]/5 px-2 py-0.5 rounded-md border border-[#191A23] inline-block shadow-[1.5px_1.5px_0px_#191A23]">₹1.5L</div>
              <div className="text-[10px] text-[#191A23]/80 font-mono font-black uppercase tracking-widest mt-2">Prize Pool</div>
            </div>
          </motion.div>
        </div>

        {/* Event visual Column (Right) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1.5 }}
          transition={{ duration: 1.0, delay: 0.2, ease: 'easeInOut' }}
          className="lg:col-span-5 flex justify-center items-center relative"
        >
          {/* Subtle floating dot grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(#191A23_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.07] pointer-events-none" />

          <img
            src={festImageUrl}
            alt="Shifa SDG Innovation Challenge Kerala 2026 visual"
            className="relative z-10 w-full max-w-[1000px] object-contain grayscale contrast-135 drop-shadow-[15px_15px_0px_#B9FF66]"
          />
        </motion.div>
      </div>
    </section>
  );
}
