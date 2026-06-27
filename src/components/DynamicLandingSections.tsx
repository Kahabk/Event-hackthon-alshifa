import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Award,
  Bot,
  BrainCircuit,
  Calendar,
  Globe2,
  GraduationCap,
  HelpCircle,
  HandHeart,
  HeartPulse,
  Image as ImageIcon,
  Leaf,
  Lightbulb,
  Linkedin,
  Medal,
  Presentation,
  Quote,
  Rocket,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trophy,
  Users,
  Video,
  Wheat,
  Plus,
  Minus,
} from 'lucide-react';
import type { CSSProperties, MouseEvent } from 'react';
import { LandingButtonConfig, LandingEditorContent, LandingItem, LandingMedia, LandingSectionConfig } from '../lib/landingContent';
import Sponsors from './Sponsors';
import Highlights from './Highlights';
import Testimonials from './Testimonials';
import CTA from './CTA';

const LandingActionContext = createContext<((config: LandingButtonConfig, sourceSection: string) => void) | undefined>(undefined);

interface DynamicLandingSectionsProps {
  content: LandingEditorContent;
  selectedSectionId?: string;
  onSelectSection?: (sectionId: string) => void;
  preview?: boolean;
  onButtonAction?: (config: LandingButtonConfig, sourceSection: string) => void;
}

const iconMap = {
  Award,
  Bot,
  BrainCircuit,
  Calendar,
  Globe2,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Leaf,
  Lightbulb,
  Medal,
  Presentation,
  Rocket,
  ShieldCheck,
  Video,
  Sparkles,
  Terminal,
  Trophy,
  Users,
  Wheat,
};

const iconFor = (name?: string, className = 'h-5 w-5') => {
  const Icon = iconMap[(name || 'Lightbulb') as keyof typeof iconMap] || Lightbulb;
  return <Icon className={className} />;
};

export default function DynamicLandingSections({ content, selectedSectionId, onSelectSection, preview = false, onButtonAction }: DynamicLandingSectionsProps) {
  const sections = content.sections
    .filter(section => section.visible)
    .sort((a, b) => a.order - b.order);

  if (!sections.length) return null;

  return (
    <LandingActionContext.Provider value={onButtonAction}>
    <div className={preview ? 'landing-preview-sections' : ''}>
      {sections.map(section => (
        <div key={section.id} className={preview ? '' : 'landing-section-boundary'}>
          <LandingSection
            section={section}
            selected={selectedSectionId === section.id}
            onSelect={() => onSelectSection?.(section.id)}
            preview={preview}
            globalTheme={content.globalTheme}
          />
        </div>
      ))}
    </div>
    </LandingActionContext.Provider>
  );
}

const getMaxWidthClass = (maxWidth?: string) => {
  switch (maxWidth) {
    case 'sm': return 'max-w-3xl';
    case 'md': return 'max-w-4xl';
    case 'lg': return 'max-w-5xl';
    case 'xl': return 'max-w-6xl';
    case 'full': return 'max-w-full';
    default: return 'max-w-5xl';
  }
};

function LandingSection({ section, selected, onSelect, preview, globalTheme }: { section: LandingSectionConfig; selected: boolean; onSelect: () => void; preview: boolean; globalTheme?: any }) {
  const onButtonAction = useContext(LandingActionContext);
  const commonClass = `${preview ? 'scroll-mt-3 px-4 md:px-8' : 'px-4 md:px-8'} border-b-3 border-[#191A23] transition ${selected ? 'landing-preview-selected' : ''
    }`;

  const style: CSSProperties = {
    fontFamily: section.fontFamily || globalTheme?.primaryFont || 'var(--font-sans)',
  };

  style.paddingTop = `${section.paddingTop ?? (preview ? 40 : 112)}px`;
  style.paddingBottom = `${section.paddingBottom ?? (preview ? 40 : 112)}px`;

  if (section.textColor) {
    style.color = section.textColor;
  }
  if (section.gradient && section.gradientFrom && section.gradientTo) {
    style.background = `linear-gradient(${section.gradientAngle || '180deg'}, ${section.gradientFrom}, ${section.gradientTo})`;
  } else if (section.backgroundColor) {
    style.backgroundColor = section.backgroundColor;
  }

  const props = {
    id: section.type === 'domains' ? 'tracks' : section.type === 'stages' ? 'schedule' : section.type,
    style,
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (preview) {
        event.stopPropagation();
        onSelect();
      }
    },
  };

  const defaultBg = (!section.backgroundColor && !section.gradient)
    ? (section.type === 'gallery' ? 'bg-[#191A23] text-white' : ['about', 'mentors', 'custom'].includes(section.type) ? 'bg-[#F8F5EF]' : 'bg-white')
    : '';

  if (section.type === 'about') return <AboutSection section={section} className={`${commonClass} ${defaultBg}`} {...props} preview={preview} />;
  if (section.type === 'domains') return <DomainsSection section={section} className={`${commonClass} ${defaultBg}`} {...props} preview={preview} />;
  if (section.type === 'stages') return <StagesSection section={section} className={`${commonClass} ${defaultBg}`} {...props} preview={preview} />;
  if (section.type === 'prizes') return <PrizesSection section={section} className={`${commonClass} ${defaultBg}`} {...props} preview={preview} />;
  if (section.type === 'glimpses') return <GlimpsesSection section={section} className={`${commonClass} ${defaultBg}`} {...props} preview={preview} />;
  if (section.type === 'gallery') return <GallerySection section={section} className={`${commonClass} ${defaultBg}`} {...props} preview={preview} />;
  if (section.type === 'mentors') return <MentorsSection section={section} className={`${commonClass} ${defaultBg}`} {...props} preview={preview} />;
  if (section.type === 'faq') return <FaqSection section={section} className={`${commonClass} ${defaultBg}`} {...props} preview={preview} />;
  if (section.type === 'sponsors') return <div id={props.id} onClick={props.onClick} className={selected ? 'landing-preview-selected' : ''}><Sponsors content={section} /></div>;
  if (section.type === 'highlights') return <div id={props.id} onClick={props.onClick} className={selected ? 'landing-preview-selected' : ''}><Highlights content={section} /></div>;
  if (section.type === 'testimonials') return <div id={props.id} onClick={props.onClick} className={selected ? 'landing-preview-selected' : ''}><Testimonials content={section} /></div>;
  if (section.type === 'cta') return <div id={props.id} onClick={props.onClick} className={selected ? 'landing-preview-selected' : ''}><CTA content={section} onRegisterClick={() => {}} onButtonAction={onButtonAction} /></div>;
  return <CustomSection section={section} className={`${commonClass} ${defaultBg}`} {...props} preview={preview} />;
}

function SectionHeader({ section, preview }: { section: LandingSectionConfig; preview: boolean }) {
  const onButtonAction = useContext(LandingActionContext);
  const isCentered = section.sectionAlignment === 'center';
  const headingColor = section.textColor || 'inherit';
  const descColor = section.textColor ? `${section.textColor}cc` : 'inherit';

  return (
    <div className={`mx-auto mb-10 max-w-2xl space-y-3 ${isCentered ? 'text-center' : 'text-left'} ${preview ? 'mb-7' : ''}`}>
      <span className="inline-flex rounded-md border-2 border-[#191A23] bg-[#B9FF66] px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#191A23] shadow-[2px_2px_0px_#191A23]">
        {section.type}
      </span>
      <h2
        className={`${preview ? 'text-3xl' : 'text-3xl sm:text-4xl md:text-5xl'} font-black tracking-tight`}
        style={{ color: headingColor }}
      >
        {section.title}
      </h2>
      {section.description && (
        <p className="text-sm font-semibold leading-relaxed sm:text-base opacity-90" style={{ color: descColor }}>
          {section.description}
        </p>
      )}
      {section.buttonConfig?.visible && (
        <button type="button" onClick={event => { event.stopPropagation(); onButtonAction?.(section.buttonConfig!, section.id); }} className={section.buttonConfig.style === 'dark' ? 'neo-btn-black mt-4 px-6 py-3 text-sm' : section.buttonConfig.style === 'outline' ? 'mt-4 rounded-xl border-2 border-current px-6 py-3 text-sm font-black' : 'neo-btn mt-4 px-6 py-3 text-sm'}>
          {section.buttonConfig.text}
        </button>
      )}
    </div>
  );
}

function AboutSection({ section, className, id, onClick, preview, style }: SectionProps) {
  const hasMedia = Boolean(section.media?.url || section.imageUrl);
  return (
    <section id={id} onClick={onClick} className={className} style={style}>
      <div className={`mx-auto grid gap-8 lg:gap-12 ${hasMedia ? 'lg:grid-cols-[0.9fr_1.1fr] lg:items-center' : ''} ${getMaxWidthClass(section.maxWidth)}`}>
        <div>
          <SectionHeader section={section} preview={preview} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map(item => (
              <div key={item.id}>
                <ItemCard item={item} compact={preview} />
              </div>
            ))}
          </div>
        </div>
        {hasMedia && (
          <MediaFrame media={section.media} imageUrl={section.imageUrl} title={section.title} />
        )}
      </div>
    </section>
  );
}

function DomainsSection({ section, className, id, onClick, preview, style }: SectionProps) {
  const [activeId, setActiveId] = useState(section.items[0]?.id || '');
  return (
    <section id={id} onClick={onClick} className={className} style={style}>
      <div className={`mx-auto ${getMaxWidthClass(section.maxWidth)}`}>
        <SectionHeader section={section} preview={preview} />
        <div className="space-y-4">
          {section.items.map(item => {
            const isActive = activeId === item.id;
            return (
              <motion.article
                key={item.id}
                layout
                onClick={() => setActiveId(item.id)}
                className={`overflow-hidden rounded-[24px] border-3 border-[#191A23] bg-white shadow-[4px_4px_0px_#191A23] transition-colors text-slate-900 ${isActive ? 'bg-[#B9FF66]' : 'hover:bg-[#F3F3F3]'}`}
              >
                <button type="button" className="flex w-full items-center justify-between gap-4 p-5 text-left">
                  <span className="flex items-center gap-4">
                    <span className={`rounded-xl border-2 border-[#191A23] p-3 shadow-[2px_2px_0px_#191A23] ${isActive ? 'bg-white' : ''}`} style={{ backgroundColor: isActive ? undefined : item.color || '#B9FF66' }}>
                      {iconFor(item.icon)}
                    </span>
                    <span>
                      <span className="block text-lg font-black tracking-tight">{item.title}</span>
                    </span>
                  </span>
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-full border-2 border-[#191A23] bg-white shadow-[1.5px_1.5px_0px_#191A23]">
                    {isActive ? <Minus className="h-4.5 w-4.5 text-[#191A23]" /> : <Plus className="h-4.5 w-4.5 text-[#191A23]" />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: 'easeInOut' }}
                      className="overflow-hidden border-t-2 border-[#191A23]/15 bg-white/45"
                    >
                      <div className="p-6 text-sm font-bold leading-relaxed text-[#191A23]/80">
                        {item.description}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StagesSection({ section, className, id, onClick, preview, style }: SectionProps) {
  return (
    <section id={id} onClick={onClick} className={className} style={style}>
      <div className={`mx-auto ${getMaxWidthClass(section.maxWidth)}`}>
        <SectionHeader section={section} preview={preview} />
        <div className="space-y-4">
          {section.items.map((item, index) => (
            <article key={item.id} className="grid gap-4 rounded-[24px] border-3 border-[#191A23] bg-white p-5 shadow-[4px_4px_0px_#191A23] md:grid-cols-[120px_1fr] text-slate-900">
              <div className="rounded-2xl bg-[#191A23] p-4 text-white">
                <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#B9FF66]">Stage {index + 1}</p>
                <p className="mt-2 text-sm font-black">{item.date || index + 1}</p>
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm font-bold leading-relaxed text-[#191A23]/72">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PrizesSection({ section, className, id, onClick, preview, style }: SectionProps) {
  return (
    <section id={id} onClick={onClick} className={className} style={style}>
      <div className={`mx-auto ${getMaxWidthClass(section.maxWidth)}`}>
        <SectionHeader section={section} preview={preview} />
        <div className={`grid gap-5 ${preview ? 'md:grid-cols-3' : 'md:grid-cols-3 md:gap-6'}`}>
          {section.items.map(item => (
            <article key={item.id} className="rounded-[28px] border-3 border-[#191A23] p-6 text-center shadow-[6px_6px_0px_#191A23]" style={{ backgroundColor: item.color || '#FFFFFF', color: item.color === '#191A23' ? '#FFFFFF' : '#191A23' }}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-current bg-white/20">
                {iconFor(item.icon, 'h-9 w-9')}
              </div>
              <p className="mt-5 font-mono text-xs font-black uppercase tracking-widest opacity-70">{item.title}</p>
              <h3 className="mt-2 text-4xl font-black tracking-tight">{item.amount}</h3>
              <p className="mt-4 text-sm font-bold leading-relaxed opacity-75">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function MentorsSection({ section, className, id, onClick, preview, style }: SectionProps) {
  return (
    <section id={id} onClick={onClick} className={className} style={style}>
      <div className={`mx-auto ${getMaxWidthClass(section.maxWidth)}`}>
        <SectionHeader section={section} preview={preview} />
        <div className={`grid gap-5 ${preview ? 'sm:grid-cols-2' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
          {section.items.map((item, index) => {
            const hasMedia = Boolean(item.media?.url || item.imageUrl);
            const placeholderBg = ['#B9FF66', '#CDB0E7', '#FFA66C', '#FFDA8A'][index % 4];
            return (
              <article
                key={item.id}
                className="min-w-0 rounded-[24px] border-3 border-[#191A23] bg-white p-5 shadow-[4px_4px_0px_#191A23] text-slate-900 flex flex-col justify-between text-center"
              >
                <div>
                  <div className="mx-auto w-full max-w-[11rem] aspect-[7/9] mb-4 overflow-hidden rounded-2xl">
                    {hasMedia ? (
                      <ResponsiveMedia
                        media={item.media}
                        fallbackUrl={item.imageUrl}
                        alt={item.media?.alt || item.title || 'Mentor'}
                        className="h-full w-full rounded-2xl"
                        mediaClassName="h-full w-full object-cover rounded-2xl"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center rounded-2xl" style={{ backgroundColor: placeholderBg }}>
                        <Users className="h-10 w-10 text-[#191A23]" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-black tracking-tight [overflow-wrap:anywhere]">{item.title}</h3>
                  <p className="text-xs font-black text-[#191A23]/60 mt-1 uppercase tracking-wider">{item.role}</p>
                  <p className="mt-3 text-xs font-bold leading-relaxed text-[#191A23]/80">{item.description}</p>
                </div>
                {item.socialLink && (
                  <div className="mt-4 pt-3 border-t border-[#191A23]/10 flex justify-center">
                    <a href={item.socialLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-black text-[#191A23] hover:underline">
                      <Linkedin className="h-3.5 w-3.5" /> Social
                    </a>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function GlimpsesSection({ section, className, id, onClick, preview, style }: SectionProps) {
  return (
    <section id={id || 'product-videos'} onClick={onClick} className={className} style={style}>
      <div className={`mx-auto space-y-10 ${getMaxWidthClass(section.maxWidth)}`}>
        <div className="space-y-2 text-left">
          <h2 className={`${preview ? 'text-3xl' : 'text-3xl sm:text-4xl'} font-black tracking-tight`}>
            {section.title}
          </h2>
          {section.description && <p className="text-sm font-semibold leading-relaxed opacity-75">{section.description}</p>}
        </div>
        <div className="flex flex-col gap-6">
          {section.items.filter(item => item.visible !== false).map(item => (
            <article key={item.id} className="space-y-3">
              <div className="w-full overflow-hidden rounded-[28px] bg-[#191A23] aspect-[16/9] sm:rounded-[36px]">
                <ResponsiveMedia media={item.media} fallbackUrl={item.imageUrl} alt={item.media?.alt || item.title || ''} className="h-full w-full" />
              </div>
              {(item.title || item.description) && (
                <div className="px-1">
                  <p className="text-sm font-black">{item.title}</p>
                  <p className="mt-1 text-xs font-bold leading-relaxed opacity-70">{item.description}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function GallerySection({ section, className, id, onClick, preview, style }: SectionProps) {
  const isDarkBg = !section.backgroundColor || section.backgroundColor === '#191A23';
  return (
    <section id={id || 'gallery'} onClick={onClick} className={className} style={style}>
      <div className={`mx-auto space-y-12 ${getMaxWidthClass(section.maxWidth)}`}>
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <span className={`inline-block rounded-md border-2 px-3.5 py-1.5 font-mono text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#B9FF66] ${isDarkBg ? 'border-white bg-white text-[#191A23]' : 'border-[#191A23] bg-[#191A23] text-white'}`}>
            Innovation Frames
          </span>
          <h2 className={`${preview ? 'text-3xl' : 'text-3xl sm:text-4xl md:text-5xl'} font-black leading-tight tracking-tight`}>
            {section.title}
          </h2>
          {section.description && <p className="text-sm font-semibold leading-relaxed opacity-80 sm:text-base">{section.description}</p>}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {section.items.filter(item => item.visible !== false).map((item, index) => (
            <article
              key={item.id}
              className={`group overflow-hidden rounded-[28px] border-2 border-white bg-white text-[#191A23] shadow-[6px_6px_0px_#B9FF66] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[9px_9px_0px_#B9FF66] ${index % 2 === 1 && !preview ? 'lg:mt-10' : ''
                }`}
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-[#0F1016]">
                <ResponsiveMedia media={item.media} fallbackUrl={item.imageUrl} alt={item.media?.alt || `${item.title} visual`} className="h-full w-full" mediaClassName="grayscale contrast-125 transition duration-500 group-hover:contrast-150" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
                  <span className="rounded-full border border-white/30 bg-black/70 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-white">
                    Frame {String(index + 1).padStart(2, '0')}
                  </span>
                  <Quote className="h-5 w-5 text-[#B9FF66]" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 space-y-3 p-5 text-white">
                  <h3 className="text-2xl font-black tracking-tight">{item.title}</h3>
                  <blockquote className="border-l-4 border-[#B9FF66] pl-3 text-sm font-bold leading-relaxed text-white/88">
                    "{item.description}"
                  </blockquote>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection({ section, className, id, onClick, preview, style }: SectionProps) {
  const [openId, setOpenId] = useState(section.items[0]?.id || '');
  return (
    <section id={id} onClick={onClick} className={className} style={style}>
      <div className={`mx-auto ${getMaxWidthClass(section.maxWidth)}`}>
        <SectionHeader section={section} preview={preview} />
        <div className="space-y-4">
          {section.items.map(item => {
            const isOpen = openId === item.id;
            return (
              <article key={item.id} className="overflow-hidden rounded-2xl border-3 border-[#191A23] bg-white shadow-[3px_3px_0px_#191A23] text-slate-900">
                <button type="button" onClick={() => setOpenId(isOpen ? '' : item.id)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
                  <span className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 flex-none text-[#191A23]/60" />
                    <div>
                      <h3 className="font-sans text-base font-black tracking-tight">{item.question}</h3>
                    </div>
                  </span>
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-full border-2 border-[#191A23] bg-white shadow-[1px_1px_0px_#191A23]">
                    {isOpen ? <Minus className="h-3.5 w-3.5 text-[#191A23]" /> : <Plus className="h-3.5 w-3.5 text-[#191A23]" />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      <div className="border-t border-[#191A23]/10 px-5 pb-5 pt-1 text-sm font-semibold leading-relaxed text-[#191A23]/75">{item.answer}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CustomSection({ section, className, id, onClick, preview, style }: SectionProps) {
  const isFormCta = section.type === 'form-cta';
  return (
    <section id={id} onClick={onClick} className={className} style={style}>
      <div className={`mx-auto ${getMaxWidthClass(section.maxWidth)} ${isFormCta && section.layoutStyle === 'card' ? 'rounded-[30px] border-3 border-[#191A23] bg-[#B9FF66] p-7 shadow-[7px_7px_0px_#191A23] md:p-12' : ''} ${isFormCta && section.layoutStyle === 'split' ? 'grid items-center gap-8 md:grid-cols-2' : ''}`}>
        <SectionHeader section={section} preview={preview} />
        {!isFormCta && <div className="grid gap-4 md:grid-cols-3">
          {section.items.length ? section.items.map(item => (
            <div key={item.id}>
              <ItemCard item={item} compact={preview} />
            </div>
          )) : <MediaFrame media={section.media} imageUrl={section.imageUrl} title={section.title} />}
        </div>}
        {isFormCta && section.media?.url && <MediaFrame media={section.media} imageUrl={section.imageUrl} title={section.title} />}
      </div>
    </section>
  );
}

function ItemCard({ item, compact }: { item: LandingItem; compact: boolean }) {
  return (
    <article className={`rounded-2xl border-2 border-[#191A23] bg-white ${compact ? 'p-4' : 'p-5'} shadow-[3px_3px_0px_#191A23] text-slate-900`}>
      <span className="inline-flex rounded-xl border-2 border-[#191A23] p-2" style={{ backgroundColor: item.color || '#B9FF66' }}>
        {iconFor(item.icon, 'h-4 w-4')}
      </span>
      <h3 className="mt-4 text-lg font-black tracking-tight">{item.title}</h3>
      <p className="mt-2 text-sm font-bold leading-relaxed text-[#191A23]/68">{item.description}</p>
    </article>
  );
}

function ResponsiveMedia({ media, fallbackUrl, alt, className, mediaClassName }: { media?: LandingMedia; fallbackUrl?: string; alt: string; className?: string; mediaClassName?: string }) {
  const url = media?.url || fallbackUrl || '';
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = media?.type === 'video' || /\.(mp4|webm|mov)(\?|#|$)/i.test(url);
  const focalX = media?.focalX ?? 50;
  const focalY = media?.focalY ?? 50;
  const zoom = media?.zoom ?? 1;
  const style = {
    objectFit: media?.fit || 'cover',
    objectPosition: media?.focalX !== undefined || media?.focalY !== undefined ? `${focalX}% ${focalY}%` : media?.position || `${focalX}% ${focalY}%`,
    transform: `scale(${zoom}) rotate(${media?.rotate || 0}deg)`,
    transformOrigin: `${focalX}% ${focalY}%`,
  };
  const frameClass = `media-frame ${className || ''}`;
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.15) {
        void video.play().catch((error: DOMException) => {
          if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') console.error('Video playback failed:', error);
        });
      } else {
        video.pause();
      }
    }, { threshold: [0, 0.15], rootMargin: '120px 0px' });
    observer.observe(video);
    return () => observer.disconnect();
  }, [isVideo, url]);
  if (!url) return null;
  if (isVideo) {
    return (
      <span className={frameClass}>
        <video
          ref={videoRef}
          src={url}
          poster={media?.posterUrl || media?.thumbnailUrl}
          className={mediaClassName}
          style={style}
          muted
          autoPlay
          loop
          playsInline
          controls={false}
          preload="metadata"
        />
      </span>
    );
  }
  return (
    <span className={frameClass}>
      <img src={url} alt={alt} className={mediaClassName} style={style} loading="lazy" decoding="async" />
    </span>
  );
}

function MediaFrame({ media, imageUrl, title }: { media?: LandingSectionConfig['media']; imageUrl?: string; title: string }) {
  const url = media?.url || imageUrl;
  if (!url) return null;
  const isVideo = media?.type === 'video' || /\.(mp4|webm|mov)(\?|#|$)/i.test(url);
  return (
    <div className={`w-full overflow-hidden rounded-[28px] bg-[#191A23] ${isVideo ? 'aspect-[16/9]' : 'aspect-[16/9] md:aspect-auto md:min-h-[22rem]'}`}>
      <ResponsiveMedia media={media} fallbackUrl={imageUrl} alt={media?.alt || title} className="h-full w-full rounded-[28px]" />
    </div>
  );
}

interface SectionProps {
  section: LandingSectionConfig;
  className: string;
  id: string;
  preview: boolean;
  style?: CSSProperties;
  onClick: (event: MouseEvent<HTMLElement>) => void;
}
