
import React, { useState, useEffect } from 'react';
import { BLOCK_SCHEDULE } from '../constants';
import { UserProfile } from '../types';

interface ScheduleProps {
  userProfile?: UserProfile | null;
}

const Schedule: React.FC<ScheduleProps> = ({ userProfile }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine if today is an A or B day
  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    return Math.ceil(( ( (date.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  };

  const getDayType = (date: Date): "A" | "B" | "Weekend" => {
    const day = date.getDay();
    if (day === 0 || day === 6) return "Weekend";
    if (day === 1) return "A";
    if (day === 2) return "B";
    if (day === 3) return "A";
    if (day === 4) return "B";
    if (day === 5) {
        const weekNum = getWeekNumber(date);
        return (weekNum % 2 !== 0) ? "B" : "A";
    }
    return "A";
  };

  const dayType = getDayType(currentTime);
  const displayPeriods = BLOCK_SCHEDULE.filter(p => !p.name.includes('Passing'));

  return (
    <div className="w-full animate-fade-in-up" style={{ animationDelay: '100ms' }}>
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center space-x-3">
             <div className="h-8 w-1 bg-falcon-gold rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
             <div className="flex flex-col">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white tracking-wide transition-colors">Daily Schedule</h2>
                <span className="text-[10px] font-bold uppercase tracking-widest text-falcon-green/60 dark:text-falcon-gold/60">
                    {dayType === "Weekend" ? "Weekend Mode" : `${dayType} Day Schedule`}
                </span>
             </div>
        </div>
        <div className="px-4 py-1 rounded-lg bg-white dark:bg-white/5 border border-falcon-border dark:border-white/10 text-falcon-green dark:text-falcon-gold font-mono font-bold text-sm shadow-sm transition-colors tabular-nums">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      <div className="oled-card rounded-2xl p-6 overflow-x-auto scrollbar-hide transition-colors duration-300">
        <div className="flex space-x-4 min-w-max p-1">
            {displayPeriods.map((period) => {
                const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
                const [startH, startM] = period.start.split(':').map(Number);
                const [endH, endM] = period.end.split(':').map(Number);
                const startTotal = startH * 60 + startM;
                const endTotal = endH * 60 + endM;
                
                const isCurrent = dayType !== "Weekend" && nowMinutes >= startTotal && nowMinutes < endTotal;
                const isPast = dayType !== "Weekend" && nowMinutes >= endTotal;

                // Personalized name logic
                let displayName = period.name;
                if (userProfile?.schedule && dayType !== "Weekend" && period.name.startsWith("Period")) {
                    const num = parseInt(period.name.split(' ')[1]);
                    const customClass = userProfile.schedule[dayType][num - 1];
                    if (customClass?.trim()) displayName = customClass;
                }
                
                return (
                    <div 
                        key={period.name}
                        className={`relative flex flex-col justify-center items-center px-6 py-5 rounded-xl border transition-all duration-500 min-w-[150px] ${
                            isCurrent 
                            ? 'bg-falcon-green text-white border-falcon-green shadow-[0_10px_30px_-5px_rgba(27,59,47,0.4)] scale-105 z-10' 
                            : isPast 
                                ? 'bg-gray-100 dark:bg-gray-800/20 border-gray-200 dark:border-white/5 opacity-50'
                                : 'bg-white/80 dark:bg-gray-800/50 border-gray-200 dark:border-white/10 hover:border-falcon-green/30 dark:hover:border-falcon-gold/30 hover:bg-white dark:hover:bg-gray-800'
                        }`}
                    >
                        {isCurrent && (
                            <div className="absolute -top-3 px-3 py-1 bg-falcon-gold text-falcon-green text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg animate-pulse-slow">
                                Current
                            </div>
                        )}
                        <span className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${isCurrent ? 'text-falcon-gold' : 'text-gray-400'}`}>
                            {period.name}
                        </span>
                        <div className={`text-sm font-bold truncate max-w-[130px] text-center ${isCurrent ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                            {displayName}
                        </div>
                        <div className={`text-[11px] font-mono mt-1 opacity-60 tabular-nums ${isCurrent ? 'text-white' : 'text-gray-500'}`}>
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
