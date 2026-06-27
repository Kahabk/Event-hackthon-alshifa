import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Cpu, MessagesSquare, Network, Tv, Coins, ArrowUpRight, HelpCircle, BrainCircuit } from 'lucide-react';
import { HIGHLIGHTS } from '../data';
import { Highlight } from '../types';
import type { LandingSectionConfig } from '../lib/landingContent';

interface HighlightsProps {
  content?: LandingSectionConfig;
}

const ICON_MAP: Record<string, ReactNode> = {
  Timer: <Timer className="w-6 h-6" />,
  Cpu: <Cpu className="w-6 h-6" />,
  BrainCircuit: <BrainCircuit className="w-6 h-6" />,
  MessagesSquare: <MessagesSquare className="w-6 h-6" />,
  Network: <Network className="w-6 h-6" />,
  Tv: <Tv className="w-6 h-6" />,
  Coins: <Coins className="w-6 h-6" />,
};

const COLOR_MAP: Record<string, 'green' | 'black' | 'white'> = {
  green: 'green',
  black: 'black',
  white: 'white',
  '#B9FF66': 'green',
  '#191A23': 'black',
  '#ffffff': 'white',
  '#FFFFFF': 'white',
};

export default function Highlights({ content }: HighlightsProps) {
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);

  if (content?.visible === false) return null;

  const getIcon = (iconName: string) => {
    return ICON_MAP[iconName] || <HelpCircle className="w-6 h-6" />;
  };

  const getStyleClasses = (color: Highlight['color'] | string) => {
    const resolved = COLOR_MAP[color] || 'white';
    switch (resolved) {
      case 'green':
        return {
          box: 'neo-card-green text-[#191A23]',
          iconBg: 'bg-white text-[#191A23]',
          highlightText: 'bg-white px-2 py-0.5 rounded-md border border-[#191A23] shadow-[1px_1px_0px_#191A23]',
          btn: 'bg-white text-[#191A23] border border-[#191A23]',
        };
      case 'black':
        return {
          box: 'neo-card-black text-white hover:text-[#B9FF66]',
          iconBg: 'bg-[#B9FF66] text-[#191A23]',
          highlightText: 'bg-[#B9FF66] text-[#191A23] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_white]',
          btn: 'bg-[#B9FF66] text-[#191A23] border border-white',
        };
      default:
        return {
          box: 'neo-card text-[#191A23]',
          iconBg: 'bg-[#B9FF66] text-[#191A23]',
          highlightText: 'bg-[#B9FF66] px-2 py-0.5 rounded-md border border-[#191A23] shadow-[1.5px_1.5px_0px_#191A23]',
          btn: 'bg-[#191A23] text-white',
        };
    }
  };

  // Use editor content items if available, else fall back to static HIGHLIGHTS data
  const items = content?.items && content.items.length > 0
    ? content.items.map((item, i) => ({
        id: item.id || `hl-${i}`,
        title: item.title || '',
        description: item.description || '',
        iconName: item.icon || 'HelpCircle',
        color: (item.color || 'white') as Highlight['color'],
        link: '',
      }))
    : HIGHLIGHTS;

  const sectionTitle = content?.title || 'Why Join Shifa SDG?';
  const eyebrow = content?.eyebrow || 'Why Participate';
  const description = content?.description || 'Present, refine, and showcase ideas aligned with the Sustainable Development Goals through mentoring, feedback, and innovation exposure.';

  return (
    <section id="about" className="py-20 md:py-28 px-4 md:px-8 bg-[#F3F3F3] text-[#191A23] border-b-3 border-[#191A23]">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Section Title Header */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <span className="bg-[#B9FF66] text-[#191A23] font-mono font-bold text-xs px-3.5 py-1.5 border-2 border-[#191A23] rounded-md shadow-[2px_2px_0px_#191A23] uppercase tracking-wider inline-block">
            {eyebrow}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            {sectionTitle.includes('Shifa SDG') ? (
              <>Why Join <span className="neo-highlight">Shifa SDG?</span></>
            ) : sectionTitle}
          </h2>
          <p className="text-[#191A23]/70 font-medium text-sm sm:text-base leading-relaxed">
            {description}
          </p>
        </div>

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => {
            const styles = getStyleClasses(item.color);
            return (
              <div
                key={item.id}
                className={`relative p-6 md:p-8 flex flex-col justify-between overflow-hidden cursor-pointer ${styles.box}`}
                onClick={() => setActiveHighlightId(activeHighlightId === item.id ? null : item.id)}
              >
                <div className="space-y-6">
                  {/* Top row: Icon and label */}
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl border-2 border-[#191A23] shadow-[2px_2px_0px_#191A23] font-black ${styles.iconBg}`}>
                      {getIcon(item.iconName)}
                    </div>
                    <button
                      type="button"
                      aria-label="Toggle highlight detail"
                      className={`w-8 h-8 rounded-full border-2 border-[#191A23] flex items-center justify-center transition-all shadow-[1.5px_1.5px_0px_#191A23] cursor-pointer ${styles.btn}`}
                    >
                      <ArrowUpRight className={`w-4 h-4 transition-transform duration-200 ${activeHighlightId === item.id ? 'rotate-45' : ''}`} />
                    </button>
                  </div>

                  {/* Title & Descs */}
                  <div className="space-y-3 text-left">
                    <h3 className="text-xl md:text-2xl font-black tracking-tight">
                      <span className={styles.highlightText}>{item.title}</span>
                    </h3>
                    <p className="text-sm font-semibold opacity-85 leading-relaxed min-h-[3.5rem]">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Micro-interaction expansion container */}
                <AnimatePresence>
                  {activeHighlightId === item.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`mt-4 pt-4 border-t-2 border-[#191A23]/15 text-xs text-left font-mono font-black uppercase flex items-center gap-1.5 ${item.color === 'black' ? 'text-[#B9FF66]' : 'text-[#191A23]'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full animate-ping ${item.color === 'black' ? 'bg-[#B9FF66]' : 'bg-[#191A23]'}`} />
                      Programme benefit highlighted • Click card to hide
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
