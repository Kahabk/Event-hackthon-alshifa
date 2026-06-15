import { SPONSORS } from '../data';

export default function Sponsors() {
  return (
    <section className="bg-white border-t-3 border-b-3 border-[#191A23] py-8 overflow-hidden select-none">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Strip Header */}
        <p className="text-[#191A23] text-center text-[10px] font-mono font-black tracking-widest uppercase mb-6 opacity-85">
          PARTNERSHIP OPPORTUNITIES FOR INNOVATION, STARTUPS, MEDIA, AND ECOSYSTEM LEADERS
        </p>

        {/* Scrolling Grid block (Responsive & Interactive) */}
        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 lg:gap-14">
          {SPONSORS.map((sponsor) => (
            <div
              key={sponsor.name}
              className="px-4.5 py-2.5 border-2 border-[#191A23] bg-white rounded-xl shadow-[3px_3px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4.5px_4.5px_0px_#191A23] transition-all cursor-pointer text-[#191A23] flex items-center gap-1.5"
            >
              <span className="font-mono font-black text-xs bg-[#B9FF66] border border-[#191A23] px-1.5 rounded uppercase">
                {sponsor.logoText}
              </span>
              <span className="font-sans font-black text-sm tracking-tight">
                {sponsor.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
