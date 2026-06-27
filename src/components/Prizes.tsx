import { Trophy, Medal, Award, Check } from 'lucide-react';
import { PRIZES } from '../data';
import { Prize } from '../types';

export default function Prizes() {
  const getIcon = (iconName: string, color: Prize['color']) => {
    const iconClass = `w-14 h-14 ${
      color === 'black' ? 'text-[#B9FF66]' : 'text-[#191A23]'
    }`;
    switch (iconName) {
      case 'Trophy': return <Trophy className={iconClass} />;
      case 'Medal': return <Medal className={iconClass} />;
      case 'Award': return <Award className={iconClass} />;
      default: return <Trophy className={iconClass} />;
    }
  };

  const getStyleClasses = (color: Prize['color']) => {
    switch (color) {
      case 'black':
        return {
          box: 'neo-card-black text-white hover:border-[#B9FF66]',
          title: 'text-[#B9FF66] font-mono',
          amount: 'text-white border-b-2 border-white/10 pb-4',
          rewardItem: 'text-neutral-300 font-sans',
          checkIcon: 'text-[#B9FF66]',
          badge: 'bg-[#B9FF66] text-[#191A23]'
        };
      case 'green':
        return {
          box: 'neo-card-green text-[#191A23]',
          title: 'text-[#191A23]',
          amount: 'text-[#191A23] border-b-2 border-[#191A23]/10 pb-4',
          rewardItem: 'text-[#191A23]/90 font-sans',
          checkIcon: 'text-[#191A23]',
          badge: 'bg-white text-[#191A23]'
        };
      case 'white':
      default:
        return {
          box: 'neo-card text-[#191A23]',
          title: 'text-[#191A23]/60 font-mono',
          amount: 'text-[#191A23] border-b-2 border-[#191A23]/10 pb-4',
          rewardItem: 'text-[#191A23]/80 font-sans',
          checkIcon: 'text-[#191A23]',
          badge: 'bg-[#B9FF66] text-[#191A23]'
        };
    }
  };

  return (
    <section id="prizes" className="py-20 md:py-28 px-4 md:px-8 bg-[#F3F3F3] text-[#191A23] border-b-3 border-[#191A23]">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-xl mx-auto">
          <span className="bg-[#B9FF66] text-[#191A23] font-mono font-bold text-xs px-3.5 py-1.5 border-2 border-[#191A23] rounded-md shadow-[2px_2px_0px_#191A23] uppercase tracking-wider inline-block">
            Prize Structure
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-[#191A23]">
            Prizes & <span className="neo-highlight">Rewards</span>
          </h2>
          <p className="text-[#191A23]/70 font-semibold text-sm sm:text-base leading-relaxed">
            Compete for main awards, finalist support, and special recognition for SDG, social, and sustainable innovation.
          </p>
        </div>

        {/* Prizes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start pt-2">
          {PRIZES.map((prize) => {
            const styles = getStyleClasses(prize.color);
            return (
              <div
                key={prize.place}
                className={`flex flex-col justify-between p-6 md:p-8 relative ${styles.box}`}
              >
                {/* Visual badge top */}
                {prize.color === 'black' && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#B9FF66] text-[#191A23] border-2 border-[#191A23] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#191A23]">
                    TOP AWARD
                  </span>
                )}

                <div className="space-y-6">
                  {/* Icon Wrapper centered */}
                  <div className="flex justify-center py-4 bg-[#F3F3F3]/5 border-2 border-dashed border-[#191A23]/10 rounded-2xl">
                    {getIcon(prize.iconName, prize.color)}
                  </div>

                  {/* Place & Reward Title */}
                  <div className="text-center space-y-1">
                    <p className={`text-xs font-mono font-bold uppercase tracking-widest ${styles.title}`}>
                      {prize.place}
                    </p>
                    <h3 className={`text-3xl md:text-4xl font-black tracking-tight font-sans ${styles.amount}`}>
                      {prize.amount}
                    </h3>
                  </div>

                  {/* Bullet listings */}
                  <div className="space-y-3.5 text-left">
                    <p className="text-[10px] font-mono font-black uppercase tracking-widest opacity-60">
                      Award Inclusions
                    </p>
                    <ul className="space-y-2.5 text-xs sm:text-sm font-semibold">
                      {prize.rewards.map((reward, i) => (
                        <li key={i} className="flex gap-2.5 items-start">
                          <Check className={`w-4 h-4 flex-none mt-0.5 ${styles.checkIcon}`} />
                          <span className={styles.rewardItem}>{reward}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Simulated Register/Apply CTA inside */}
                <div className="pt-6 border-t-2 border-dashed border-[#191A23]/10 mt-8 text-center">
                  <span className={`inline-block py-1.5 px-4 rounded-xl border-2 border-[#191A23] text-[10px] font-black uppercase tracking-wide shadow-[1.5px_1.5px_0px_#191A23] ${styles.badge}`}>
                    Ready to compete
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
