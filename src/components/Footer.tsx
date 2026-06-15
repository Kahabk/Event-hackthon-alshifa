import { Globe, Twitter, Linkedin, MapPin, Mail, Sparkles } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#191A23] text-white border-t-3 border-[#191A23] py-12 md:py-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Top sector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start border-b-2 border-white/5 pb-10">
          {/* Logo brand and metadata info */}
          <div className="md:col-span-5 space-y-4">
            <a href="#" className="flex items-center gap-2 cursor-pointer inline-block">
              <div className="bg-[#B9FF66] text-[#191A23] font-mono font-black text-lg px-2.5 py-1 border-2 border-[#191A23] rounded-lg">
                SDG
              </div>
              <span className="font-sans font-black text-xl tracking-tight text-white">
                Shifa SDG Innovation Challenge Kerala 2026
              </span>
            </a>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans max-w-sm">
              A state-level student innovation platform by Shifa Group of Institutions focused on sustainability, entrepreneurship, and social impact.
            </p>
          </div>

          {/* Quick linkages lists */}
          <div className="md:col-span-3 space-y-4 text-left">
            <h4 className="text-[10px] font-mono font-black tracking-widest text-[#B9FF66] uppercase">
              Footer Links
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm font-semibold">
              <li>
                <a href="#about" className="text-neutral-400 hover:text-[#B9FF66] transition-colors">About</a>
              </li>
              <li>
                <a href="#tracks" className="text-neutral-400 hover:text-[#B9FF66] transition-colors">Programme Domains</a>
              </li>
              <li>
                <a href="#schedule" className="text-neutral-400 hover:text-[#B9FF66] transition-colors">Programme Stages</a>
              </li>
              <li>
                <a href="#prizes" className="text-neutral-400 hover:text-[#B9FF66] transition-colors">Prizes</a>
              </li>
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
              {[
                { label: 'Website', icon: <Globe className="w-4 h-4" />, href: '#' },
                { label: 'X', icon: <Twitter className="w-4 h-4" />, href: 'https://twitter.com' },
                { label: 'Linkedin', icon: <Linkedin className="w-4 h-4" />, href: 'https://linkedin.com' }
              ].map((sub, i) => (
                <a
                  key={i}
                  href={sub.href}
                  target="_blank"
                  rel="noreferrer"
                  title={sub.label}
                  className="p-1.5 bg-neutral-900 border border-white/10 hover:bg-[#B9FF66] hover:text-[#191A23] hover:border-[#191A23] rounded-lg transition-all cursor-pointer"
                >
                  {sub.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Lower sector block copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] sm:text-xs text-neutral-500 font-mono">
          <div className="flex items-center gap-1 flex-wrap">
            <span>© {currentYear} Shifa SDG Innovation Challenge Kerala 2026. All rights reserved.</span>
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
