
import React, { useEffect, useState } from 'react';
import { BLOCK_SCHEDULE } from '../constants';
import { UserProfile } from '../types';

interface DayTickerProps {
  userProfile?: UserProfile | null;
}

function toTodayDate(timeHHMM: string) {
  const [h, m] = timeHHMM.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function getCurrentBlock(now = new Date()) {
  // Check periods in order
  for (const block of BLOCK_SCHEDULE) {
    const start = toTodayDate(block.start);
    const end = toTodayDate(block.end);
    if (now >= start && now < end) return { ...block, start, end, type: 'active' };
  }
  
  // Before/School is out! checks
  const firstStart = toTodayDate(BLOCK_SCHEDULE[0].start);
  const lastEnd = toTodayDate(BLOCK_SCHEDULE[BLOCK_SCHEDULE.length - 1].end);
  
  if (now < firstStart) return { name: "Before school", start: now, end: firstStart, type: 'idle' };
  if (now >= lastEnd) return { name: "School is out!", start: lastEnd, end: lastEnd, type: 'idle' };
  
  return { name: "Schedule", start: now, end: null, type: 'idle' };
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  if (h > 0) {
    return `${h}h ${mm}m ${ss}s`;
  }
  return `${m}m ${ss}s`;
}

// Helper to get ISO week number to determine Friday A/B alternation
function getWeekNumber(d: Date) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    var weekNo = Math.ceil(( ( (date.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return weekNo;
}

function getDayType(date: Date): "A" | "B" | "Weekend" {
    const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    if (day === 0 || day === 6) return "Weekend";

    // Mon (1) = A, Tue (2) = B, Wed (3) = A, Thu (4) = B
    if (day === 1) return "A";
    if (day === 2) return "B";
    if (day === 3) return "A";
    if (day === 4) return "B";

    // Friday (5) Varies
    if (day === 5) {
        const weekNum = getWeekNumber(date);
        return (weekNum % 2 !== 0) ? "B" : "A";
    }

    return "A"; // Default fallback
}

const DayTicker: React.FC<DayTickerProps> = ({ userProfile }) => {
  const [text, setText] = useState("");
  const [dayLabel, setDayLabel] = useState("A Day");
  const [progress, setProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [dayType, setDayType] = useState<"A"|"B"|"Weekend">("A");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const type = getDayType(now);
      
      if (type !== dayType) {
          setDayType(type);
      }
      
      if (type === "Weekend") {
          setDayLabel("Weekend");
          setText("Enjoy your weekend!");
          setIsActive(false);
          setProgress(0);
          return;
      } else {
          setDayLabel(`${type} Day`);
      }

      const block = getCurrentBlock(now);
      const remaining = block.end ? (block.end.getTime() - now.getTime()) : 0;
      
      setIsActive(block.type === 'active');

      if (block.type === 'active' && block.end && block.start) {
        const total = block.end.getTime() - block.start.getTime();
        const elapsed = now.getTime() - block.start.getTime();
        const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
        setProgress(pct);
      } else {
        setProgress(0);
      }

      let displayName = block.name;

      // Personalized Class Name Logic
      if (userProfile && userProfile.schedule && block.name.startsWith("Period")) {
         // Extract period number (1, 2, 3, 4)
         const parts = block.name.split(' ');
         const num = parseInt(parts[1]);
         if (!isNaN(num) && num >= 1 && num <= 4) {
             // Type is narrowed to "A" | "B" due to early return for "Weekend" above
             const customClass = userProfile.schedule[type][num - 1];
             if (customClass && customClass.trim() !== "") {
                 displayName = customClass;
             }
         }
      }

      if (block.name === "School is out!") {
        setText("School is out!");
      } else if (block.name === "Before school") {
         const startsIn = block.end ? (block.end.getTime() - now.getTime()) : 0;
         setText(`Classes start in ${formatCountdown(startsIn)}`);
      } else {
        setText(`${displayName} · ${formatCountdown(remaining)} left`);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [userProfile, dayType]);

  return (
    <div className="flex items-center space-x-3 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5 shadow-inner backdrop-blur-sm">
         <div className="flex items-center space-x-2 shrink-0">
            <span className="text-[10px] text-falcon-gold font-bold uppercase tracking-wider">{dayLabel}</span>
            <span className="text-[10px] text-white/20">|</span>
         </div>
         
         <div className="flex flex-col justify-center min-w-[150px]">
             <div className="flex items-center space-x-1.5 mb-0.5">
                 {isActive ? (
                     <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                 ) : (
                     <div className="w-1.5 h-1.5 bg-gray-400 rounded-full opacity-50"></div>
                 )}
                 <span className="text-[11px] text-white font-mono tabular-nums tracking-wide leading-none">{text}</span>
             </div>
             
             {/* Thin Futuristic Progress Bar */}
             {isActive && (
                 <div className="h-[2px] w-full bg-white/10 rounded-full overflow-hidden mt-1">
                     <div 
                        className="h-full bg-falcon-gold/80 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(234,179,8,0.3)]" 
                        style={{ width: `${progress}%` }}
                     ></div>
                 </div>
             )}
         </div>
    </div>
  );
};

export default DayTicker;
