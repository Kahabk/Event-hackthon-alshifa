import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, Terminal, Bot, TrendingUp, Leaf, Lightbulb, Plus, Minus, ArrowRight } from 'lucide-react';
import { TRACKS } from '../data';

export default function Tracks() {
  const [activeTrackId, setActiveTrackId] = useState<string>('track-healthcare');

  const getIcon = (iconName: string, isActive: boolean) => {
    const iconClass = `w-6 h-6 transition-all ${isActive ? 'text-[#191A23]' : 'text-[#191A23]'}`;
    switch (iconName) {
      case 'BrainCircuit': return <BrainCircuit className={iconClass} />;
      case 'Terminal': return <Terminal className={iconClass} />;
      case 'Bot': return <Bot className={iconClass} />;
      case 'TrendingUp': return <TrendingUp className={iconClass} />;
      case 'Leaf': return <Leaf className={iconClass} />;
      case 'Lightbulb': return <Lightbulb className={iconClass} />;
      default: return <Lightbulb className={iconClass} />;
    }
  };

  return (
    <section id="tracks" className="py-20 md:py-28 px-4 md:px-8 bg-white text-[#191A23] border-b-3 border-[#191A23]">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <span className="bg-[#B9FF66] text-[#191A23] font-mono font-bold text-xs px-3.5 py-1.5 border-2 border-[#191A23] rounded-md shadow-[2px_2px_0px_#191A23] uppercase tracking-wider inline-block">
            Event Domains
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-[#191A23]">
            Choose Your <span className="neo-highlight">Domain</span>
          </h2>
          <p className="text-[#191A23]/70 font-semibold text-sm sm:text-base leading-relaxed">
            Explore the idea domains where student teams can submit SDG-focused solutions for real-world impact.
          </p>
        </div>

        {/* Domains Accordion Stack */}
        <div className="space-y-4 text-[#191A23]">
          {TRACKS.map((track) => {
            const isActive = activeTrackId === track.id;
            return (
              <motion.div
                key={track.id}
                layout="position"
                onClick={() => {
                  if (activeTrackId !== track.id) {
                    setActiveTrackId(track.id);
                  }
                }}
                className={`border-3 border-[#191A23] rounded-[24px] cursor-pointer overflow-hidden transition-all duration-300 ${
                  isActive
                    ? 'bg-[#B9FF66] shadow-[6px_6px_0px_#191A23]'
                    : 'bg-white hover:bg-[#F3F3F3] shadow-[4px_4px_0px_#191A23]'
                }`}
              >
                {/* Accordion Header row */}
                <div className="p-5 md:p-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Circle wrapper for icon */}
                    <div className={`p-3 rounded-xl border-2 border-[#191A23] shadow-[2px_2px_0px_#191A23] ${
                      isActive ? 'bg-white text-[#191A23]' : 'bg-[#B9FF66] text-[#191A23]'
                    }`}>
                      {getIcon(track.iconName, isActive)}
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg md:text-xl font-black tracking-tight font-sans">
                        {track.title}
                      </h3>
                      {isActive && (
                        <p className="text-xs font-bold text-[#191A23]/70 font-sans mt-0.5 max-w-md hidden sm:block">
                          {track.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right hand state indicator (Plus / Minus) */}
                  <div className={`w-8 h-8 rounded-full border-2 border-[#191A23] flex items-center justify-center shadow-[1.5px_1.5px_0px_#191A23] ${
                    isActive ? 'bg-white' : 'bg-[#F3F3F3]'
                  }`}>
                    {isActive ? (
                      <Minus className="w-4 h-4 text-[#191A23] stroke-[3]" />
                    ) : (
                      <Plus className="w-4 h-4 text-[#191A23] stroke-[3]" />
                    )}
                  </div>
                </div>

                {/* Expanded Accordion Challenges List */}
                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="border-t-2 border-[#191A23]/15 overflow-hidden"
                    >
                      <div className="p-6 bg-white/40 text-left space-y-4">
                        {/* Mobile block desc */}
                        <p className="text-xs font-bold text-[#191A23]/80 leading-normal sm:hidden">
                          {track.description}
                        </p>
                        
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono font-black tracking-widest uppercase text-[#191A23]/60">
                            Pitch Deck Focus
                          </h4>
                          <ul className="space-y-2.5">
                            {track.challenges.map((challenge, index) => (
                              <li key={index} className="flex gap-2.5 items-start text-xs sm:text-sm font-bold text-[#191A23]">
                                <ArrowRight className="w-4 h-4 text-[#191A23] flex-none mt-0.5" />
                                <span>{challenge}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
