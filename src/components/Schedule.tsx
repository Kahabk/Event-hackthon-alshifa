import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, AlertCircle, Laptop, GraduationCap, PartyPopper } from 'lucide-react';
import { SCHEDULE } from '../data';

export default function Schedule() {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ceremony':
        return <PartyPopper className="w-4 h-4 text-emerald-600" />;
      case 'sprint':
        return <Laptop className="w-4 h-4 text-amber-600" />;
      case 'mentoring':
        return <GraduationCap className="w-4 h-4 text-blue-600" />;
      case 'event':
      default:
        return <AlertCircle className="w-4 h-4 text-neutral-600" />;
    }
  };

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'ceremony': return 'bg-emerald-100 border-emerald-300 text-emerald-800';
      case 'sprint': return 'bg-amber-100 border-amber-300 text-amber-800';
      case 'mentoring': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'event':
      default:
        return 'bg-neutral-100 border-neutral-300 text-neutral-800';
    }
  };

  return (
    <section id="schedule" className="py-20 md:py-28 px-4 md:px-8 bg-white text-[#191A23] border-b-3 border-[#191A23]">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <span className="bg-[#B9FF66] text-[#191A23] font-mono font-bold text-xs px-3.5 py-1.5 border-2 border-[#191A23] rounded-md shadow-[2px_2px_0px_#191A23] uppercase tracking-wider inline-block">
            Programme Stages
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            7 Stages. <span className="neo-highlight">One Impact Journey.</span>
          </h2>
          <p className="text-[#191A23]/70 font-medium text-sm sm:text-base leading-relaxed">
            Follow the challenge from ideation and bootcamp to expert clinics, innovation sprint, finalist selection, spotlight, and Grand Finale.
          </p>
        </div>

        {/* Day selection tabs */}
        <div className="flex flex-wrap gap-2 justify-center">
          {SCHEDULE.map((dayObj, idx) => (
            <button
              key={dayObj.day}
              type="button"
              onClick={() => setSelectedDayIndex(idx)}
              className={`py-2.5 px-4 sm:px-6 font-mono font-black text-xs sm:text-sm border-2 border-[#191A23] rounded-xl flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
                selectedDayIndex === idx
                  ? 'bg-[#B9FF66] text-[#191A23] shadow-[4px_4px_0px_#191A23] scale-[1.03]'
                  : 'bg-white text-[#191A23]/80 hover:bg-[#eaeaea]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="block">{dayObj.day}</span>
              <span className="hidden sm:inline opacity-60">({dayObj.date.includes(',') ? dayObj.date.split(',')[1].trim() : dayObj.date})</span>
            </button>
          ))}
        </div>

        {/* Selected Day Timeline List card block */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDayIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {SCHEDULE[selectedDayIndex].items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border-3 border-[#191A23] p-5 rounded-[24px] shadow-[4px_4px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#191A23] transition-all text-left flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-mono font-black text-[#191A23] bg-[#B9FF66]/20 border border-[#191A23]/10 px-2.5 py-0.5 rounded-md">
                        {item.time}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryTheme(item.category)}`}>
                        {getCategoryIcon(item.category)}
                        {item.category}
                      </span>
                    </div>

                    <h3 className="text-lg md:text-xl font-black tracking-tight">
                      {item.title}
                    </h3>
                    <p className="text-[#191A23]/75 font-semibold text-xs sm:text-sm leading-relaxed font-sans">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
