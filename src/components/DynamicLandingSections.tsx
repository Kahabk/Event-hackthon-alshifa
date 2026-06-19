import { ArrowRight, Image as ImageIcon, LayoutTemplate } from 'lucide-react';
import { LandingEditorContent } from '../lib/landingContent';

interface DynamicLandingSectionsProps {
  content: LandingEditorContent;
}

export default function DynamicLandingSections({ content }: DynamicLandingSectionsProps) {
  const sections = content.sections
    .filter(section => section.visible)
    .sort((a, b) => a.order - b.order);

  if (!sections.length) return null;

  return (
    <section className="px-4 py-16 md:px-8 md:py-20">
      <div className="mx-auto max-w-7xl space-y-5">
        {sections.map(section => (
          <article
            key={section.id}
            className={`grid overflow-hidden rounded-[30px] border-2 border-[#191A23] bg-[#fffdf8] shadow-[7px_7px_0px_#cdb0e7] ${
              section.layout === 'banner'
                ? 'gap-0'
                : section.layout === 'split'
                  ? 'lg:grid-cols-[0.9fr_1.1fr]'
                  : 'lg:grid-cols-[1.1fr_0.9fr]'
            }`}
          >
            <div className="p-6 md:p-8">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#191A23] bg-[#cdb0e7] px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-widest">
                <LayoutTemplate className="h-3.5 w-3.5" /> {section.eyebrow || 'Event Update'}
              </span>
              <h2 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-tight md:text-5xl">
                {section.title}
              </h2>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed text-[#191A23]/68 md:text-base">
                {section.body}
              </p>
              {section.ctaLabel && (
                <a
                  href={section.ctaHref || '#'}
                  className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-[#191A23] bg-[#191A23] px-5 py-3 text-sm font-black text-white shadow-[3px_3px_0px_#cdb0e7] transition hover:-translate-y-0.5"
                >
                  {section.ctaLabel} <ArrowRight className="h-4 w-4" />
                </a>
              )}
            </div>

            {section.layout !== 'banner' && (
              <div className="min-h-[18rem] border-t-2 border-[#191A23] bg-[#191A23] p-4 lg:border-l-2 lg:border-t-0">
                {section.imageUrl ? (
                  <img
                    src={section.imageUrl}
                    alt={section.title}
                    className="h-full min-h-[18rem] w-full rounded-[22px] object-cover grayscale"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full min-h-[18rem] items-center justify-center rounded-[22px] border border-white/15 bg-white/[0.06] text-center text-white">
                    <div>
                      <ImageIcon className="mx-auto h-8 w-8 text-[#cdb0e7]" />
                      <p className="mt-3 text-xs font-black uppercase tracking-widest text-white/64">Add image URL in admin</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
