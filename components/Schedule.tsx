import React, { useState, useEffect } from 'react';
import { BLOCK_SCHEDULE } from '../constants';

const Schedule: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCurrentPeriodIndex = () => {
    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return BLOCK_SCHEDULE.findIndex(period => {
      const [startH, startM] = period.start.split(':').map(Number);
      const [endH, endM] = period.end.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;
      return currentMinutes >= startTotal && currentMinutes < endTotal;
    });
  };

  const currentPeriodIndex = getCurrentPeriodIndex();
  
  // Filter out passing periods for the visual cards, but we used the full schedule to calculate current index correctly first
  // Actually, to make the visual display simple, let's just show classes and lunch
  const displayPeriods = BLOCK_SCHEDULE.filter(p => !p.name.includes('Passing'));

  return (
    <div className="w-full animate-fade-in-up" style={{ animationDelay: '100ms' }}>
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center space-x-3">
             <div className="h-8 w-1 bg-falcon-orange rounded-full shadow-[0_0_10px_rgba(251,146,60,0.5)]"></div>
             <h2 className="text-xl font-bold text-gray-800 dark:text-white tracking-wide transition-colors">Bell Schedule</h2>
        </div>
        <div className="px-4 py-1 rounded-lg bg-falcon-surfaceStrong dark:bg-white/5 border border-falcon-border dark:border-white/10 text-falcon-gold font-mono font-bold text-sm shadow-inner transition-colors tabular-nums">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      <div className="oled-card rounded-2xl p-6 overflow-x-auto scrollbar-hide transition-colors duration-300">
        <div className="flex space-x-4 min-w-max">
            {displayPeriods.map((period) => {
                // Determine if this specific visual card is current, past, or future
                // We do this by checking time directly since indices don't align after filtering
                const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
                const [startH, startM] = period.start.split(':').map(Number);
                const [endH, endM] = period.end.split(':').map(Number);
                const startTotal = startH * 60 + startM;
                const endTotal = endH * 60 + endM;
                
                const isCurrent = nowMinutes >= startTotal && nowMinutes < endTotal;
                const isPast = nowMinutes >= endTotal;
                
                return (
                    <div 
                        key={period.name}
                        className={`relative flex flex-col justify-center items-center px-6 py-4 rounded-xl border transition-all duration-500 min-w-[130px] ${
                            isCurrent 
                            ? 'bg-falcon-gold border-falcon-gold shadow-[0_0_25px_rgba(251,191,36,0.4)] scale-105 z-10' 
                            : isPast 
                                ? 'bg-falcon-bg/30 dark:bg-gray-800/30 border-falcon-border/20 dark:border-white/5 opacity-40 grayscale blur-[0.5px]'
                                : 'bg-white/50 dark:bg-gray-800/50 border-falcon-border dark:border-white/10 hover:border-falcon-muted dark:hover:border-white/20 hover:bg-white dark:hover:bg-gray-700'
                        }`}
                    >
                        {isCurrent && (
                            <div className="absolute -top-3 px-3 py-1 bg-falcon-orange text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg animate-pulse-slow">
                                Now
                            </div>
                        )}
                        <span className={`text-[11px] font-black uppercase tracking-wider mb-2 font-mono ${isCurrent ? 'text-falcon-bg' : 'text-falcon-muted dark:text-gray-400'}`}>
                            {period.name}
                        </span>
                        <div className={`text-sm font-bold tabular-nums ${isCurrent ? 'text-falcon-bg' : 'text-gray-800 dark:text-white'}`}>
                            {period.start} - {period.end}
                        </div>
                    </div>
                )
            })}
        </div>
      </div>
    </div>
  );
};

export default Schedule;