import { Quote } from 'lucide-react';
import image0 from '../../0.png';
import image1 from '../../1.png';
import image2 from '../../2.png';
import image3 from '../../3.png';
import image4 from '../../4.png';
import image5 from '../../5.png';

const IMAGE_QUOTES = [
  {
    src: image0,
    title: 'Think With Purpose',
    quote: 'The strongest ideas begin with a real problem and a student brave enough to ask why.',
  },
  {
    src: image1,
    title: 'Build For People',
    quote: 'Innovation becomes meaningful when it listens first, builds carefully, and improves lives.',
  },
  {
    src: image2,
    title: 'Shape The Future',
    quote: 'A sustainable future is not imagined in one moment. It is built by teams that keep showing up.',
  },
  {
    src: image3,
    title: 'Learn By Doing',
    quote: 'Every refined pitch, tested idea, and honest feedback session moves impact one step closer.',
  },
  {
    src: image4,
    title: 'Lead With Impact',
    quote: 'When young innovators work together, small ideas can become solutions that serve many.',
  },
  {
    src: image5,
    title: 'Create With Courage',
    quote: 'The future belongs to students who turn concern into action and action into change.',
  },
];

export default function ImageQuotes() {
  return (
    <section className="bg-[#191A23] px-4 py-20 text-white md:px-8 md:py-28 border-b-3 border-[#191A23]">
      <div className="mx-auto max-w-7xl space-y-12">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <span className="inline-block rounded-md border-2 border-white bg-white px-3.5 py-1.5 font-mono text-xs font-black uppercase tracking-wider text-[#191A23] shadow-[2px_2px_0px_#B9FF66]">
            Innovation Frames
          </span>
          <h2 className="text-3xl font-black tracking-tight leading-tight sm:text-4xl md:text-5xl">
            Moments That <span className="text-[#B9FF66]">Inspire Impact</span>
          </h2>
          <p className="text-sm font-semibold leading-relaxed text-white/70 sm:text-base">
            A black-and-white visual wall for the spirit of Shifa SDG Innovation Challenge Kerala 2026.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {IMAGE_QUOTES.map((item, index) => (
            <article
              key={item.title}
              className={`group overflow-hidden rounded-[28px] border-2 border-white bg-white text-[#191A23] shadow-[6px_6px_0px_#B9FF66] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[9px_9px_0px_#B9FF66] ${
                index % 2 === 1 ? 'lg:mt-10' : ''
              }`}
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-[#0F1016]">
                <img
                  src={item.src}
                  alt={`${item.title} visual`}
                  className="h-full w-full object-cover grayscale contrast-125 drop-shadow-[10px_10px_0px_#B9FF66] transition duration-500 group-hover:scale-[1.04] group-hover:contrast-150 group-hover:drop-shadow-[14px_14px_0px_#B9FF66]"
                />
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
                    "{item.quote}"
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
