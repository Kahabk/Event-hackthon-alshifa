import { Globe, Twitter, Linkedin, MapPin, Mail, Sparkles } from 'lucide-react';
import type { LandingFooterConfig } from '../lib/landingContent';

export default function Footer({ content }: { content?: LandingFooterConfig }) {
  const currentYear = new Date().getFullYear();
  const footerLinks = content?.links?.length ? content.links : [
    { id: 'about', label: 'About', url: '#about' },
    { id: 'tracks', label: 'Programme Domains', url: '#tracks' },
    { id: 'schedule', label: 'Programme Stages', url: '#schedule' },
    { id: 'prizes', label: 'Prizes', url: '#prizes' },
  ];
  const socialLinks = content?.socialLinks?.length ? content.socialLinks : [
    { id: 'website', label: 'Website', url: '#' },
    { id: 'x', label: 'X', url: 'https://twitter.com' },
    { id: 'linkedin', label: 'Linkedin', url: 'https://linkedin.com' },
  ];
  const socialIcon = (label: string) => {
    const normalized = label.toLowerCase();
    if (normalized.includes('linkedin')) return <Linkedin className="w-4 h-4" />;
    if (normalized === 'x' || normalized.includes('twitter')) return <Twitter className="w-4 h-4" />;
    return <Globe className="w-4 h-4" />;
  };

  return (
    <footer className="bg-[#191A23] text-white border-t-3 border-[#191A23] py-12 md:py-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Top sector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start border-b-2 border-white/5 pb-10">
          {/* Logo brand and metadata info */}
          <div className="md:col-span-5 space-y-4">
            <a href="#" className="inline-flex items-center gap-2 cursor-pointer min-w-0 max-w-full">
              <div className="bg-[#B9FF66] text-[#191A23] font-mono font-black text-lg px-2.5 py-1 border-2 border-[#191A23] rounded-lg flex-none">
                SDG
              </div>
              <span className="font-sans font-black text-base sm:text-xl tracking-tight text-white truncate">
                {content?.logoText || 'Shifa SDG Innovation Challenge Kerala 2026'}
              </span>
            </a>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans max-w-sm">
              {content?.description || 'A state-level student innovation platform by Shifa Group of Institutions focused on sustainability, entrepreneurship, and social impact.'}
            </p>
          </div>

          {/* Quick linkages lists */}
          <div className="md:col-span-3 space-y-4 text-left">
            <h4 className="text-[10px] font-mono font-black tracking-widest text-[#B9FF66] uppercase">
              Footer Links
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm font-semibold">
              {footerLinks.map(link => (
                <li key={link.id}>
                  <a href={link.url} className="text-neutral-400 hover:text-[#B9FF66] transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact coordinates */}
          <div className="md:col-span-4 space-y-4 text-left">
            <h4 className="text-[10px] font-mono font-black tracking-widest text-[#B9FF66] uppercase">
              Contact Section
            </h4>
            <ul className="space-y-3.5 text-xs sm:text-sm font-semibold text-neutral-400">
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#B9FF66] flex-none" />
                <a href="mailto:info@shifasdg.in" className="hover:text-white transition-colors">info@shifasdg.in</a>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[#B9FF66] flex-none" />
                <span>Kerala, India</span>
              </li>
            </ul>

            {/* Micro media indicators */}
            <div className="flex gap-2.5 pt-2">
              {socialLinks.map((sub) => (
                <a
                  key={sub.id}
                  href={sub.url}
                  target="_blank"
                  rel="noreferrer"
                  title={sub.label}
                  className="p-1.5 bg-neutral-900 border border-white/10 hover:bg-[#B9FF66] hover:text-[#191A23] hover:border-[#191A23] rounded-lg transition-all cursor-pointer"
                >
                  {socialIcon(sub.label)}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Lower sector block copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] sm:text-xs text-neutral-500 font-mono">
          <div className="flex items-center gap-1 flex-wrap">
            <span>{content?.copyrightText || `© ${currentYear} Shifa SDG Innovation Challenge Kerala 2026. All rights reserved.`}</span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-0.5">
              Built for student innovation, sustainability, and social impact
            </span>
          </div>

          <div className="flex items-center gap-1.5 uppercase font-bold tracking-widest text-neutral-400">
            <Sparkles className="w-3.5 h-3.5 text-[#B9FF66] fill-[#B9FF66]" />
            <span>GRAND FINALE 15 JULY 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
