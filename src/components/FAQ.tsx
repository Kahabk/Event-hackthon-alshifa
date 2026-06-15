import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, HelpCircle } from 'lucide-react';
import { FAQS } from '../data';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 md:py-28 px-4 md:px-8 bg-white text-[#191A23] border-b-3 border-[#191A23]">
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <span className="bg-[#B9FF66] text-[#191A23] font-mono font-bold text-xs px-3.5 py-1.5 border-2 border-[#191A23] rounded-md shadow-[2px_2px_0px_#191A23] uppercase tracking-wider inline-block">
            Registration Questions
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Frequently Asked <span className="neo-highlight">Questions</span>
          </h2>
          <p className="text-[#191A23]/70 font-medium text-sm sm:text-base leading-relaxed">
            Key details about eligibility, team size, fees, pitch deck submission, evaluation, and the Grand Finale.
          </p>
        </div>

        {/* FAQs Accordions */}
        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className={`border-3 border-[#191A23] rounded-2xl cursor-pointer overflow-hidden transition-all duration-200 ${
                  isOpen
                    ? 'bg-white shadow-[4px_4px_0px_#191A23]'
                    : 'bg-white hover:bg-[#eaeaea] shadow-[2.5px_2.5px_0px_#191A23]'
                }`}
              >
                {/* Accordion Row Header */}
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-[#191A23]/60 flex-none" />
                    <h3 className="font-sans font-black text-sm sm:text-base text-left tracking-tight">
                      {faq.question}
                    </h3>
                  </div>

                  {/* Icon Indicator */}
                  <div className={`w-7 h-7 rounded-full border-2 border-[#191A23] flex items-center justify-center flex-none shadow-[1px_1px_0px_#191A23] ${
                    isOpen ? 'bg-[#B9FF66]' : 'bg-white'
                  }`}>
                    {isOpen ? (
                      <Minus className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </div>
                </div>

                {/* Animated Inner Description Wrapper */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      <div className="px-5 pb-5 pt-1 text-left text-xs sm:text-sm font-semibold text-[#191A23]/80 leading-relaxed font-sans border-t border-[#191A23]/10">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
