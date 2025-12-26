
import React, { useMemo } from 'react';
import { UserGamification, UserProfile } from '../types';
import { RANKS, getRankTitle, calculateProgressToNextLevel, calculateXPForNextLevel } from '../utils/gamification';

interface RankModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserGamification;
  userEmail?: string | null;
  leaderboard?: UserProfile[];
}

const RankModal: React.FC<RankModalProps> = ({ isOpen, onClose, stats, userEmail, leaderboard = [] }) => {
  const currentRankObj = useMemo(() => {
      return [...RANKS].reverse().find(r => stats.level >= r.level) || RANKS[0];
  }, [stats.level]);

  const gradeInfo = useMemo(() => {
      if (!userEmail) return "Student";
      const prefix = userEmail.split('@')[0];
      const yearMatch = prefix.match(/^(\d{2})/);
      if (yearMatch) {
          const year = yearMatch[1];
          const classYear = 2000 + parseInt(year);
          return `Class of ${classYear}`;
      }
      return "Faculty / Staff";
  }, [userEmail]);

  // Accurate catch-up logic
  const catchUpElement = useMemo(() => {
      if (!leaderboard.length) return null;
      
      // Find where I am
      const myXP = stats.xp;
      // Filter for students in the same grade (conceptual - using grad year)
      const gradYear = userEmail?.split('@')[0].match(/^(\d{2})/)?.[1];
      
      const studentsAbove = leaderboard
          .filter(u => u.gamification && u.gamification.xp > myXP)
          .sort((a, b) => (a.gamification?.xp || 0) - (b.gamification?.xp || 0));

      if (studentsAbove.length === 0) {
          return (
              <div className="bg-gradient-to-r from-falcon-gold/20 to-yellow-500/20 p-6 rounded-3xl border border-falcon-gold/30 flex items-center gap-4">
                  <div className="text-3xl">👑</div>
                  <div>
                      <div className="text-white font-black text-sm uppercase tracking-widest">Ben Franklin Legend</div>
                      <p className="text-xs text-falcon-gold font-bold">Congrats! You are the highest rank in your class!</p>
                  </div>
              </div>
          );
      }

      const nextStudent = studentsAbove[0];
      const diff = (nextStudent.gamification?.xp || 0) - myXP;
      const firstName = nextStudent.name?.split(' ')[0] || "Another Student";

      return (
          <div className="bg-gradient-to-r from-blue-600/20 to-falcon-green/20 p-6 rounded-3xl border border-blue-500/30 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                  <div className="text-3xl animate-bounce">🚀</div>
                  <div>
                      <div className="text-white font-bold text-sm">Catching up to <span className="text-blue-400">{firstName}</span></div>
                      <p className="text-xs text-gray-400">Just {Math.round(diff)} XP more to pass them in the rankings!</p>
                  </div>
              </div>
              <div className="text-xs font-black text-blue-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Pushing Hard →</div>
          </div>
      );
  }, [leaderboard, stats.xp, userEmail]);

  if (!isOpen) return null;

  const xpForNextLevel = calculateXPForNextLevel(stats.level);
  const progressPercent = calculateProgressToNextLevel(stats.xp, stats.level);
  // Formula from gamification.ts is 120 * level^2
  const currentLevelXPStart = 120 * Math.pow(stats.level, 2);
  const xpInLevel = Math.max(0, stats.xp - currentLevelXPStart);
  const xpNeededInLevel = xpForNextLevel - currentLevelXPStart;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="bg-[#0B1210] rounded-[40px] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] w-full max-w-xl overflow-hidden relative z-10 animate-fade-in-up">
        
        {/* Grain Texture */}
        <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none mix-blend-overlay"></div>

        {/* Header */}
        <div className="px-8 py-8 border-b border-white/5 bg-gradient-to-b from-[#1B3B2F] to-[#0B1210] relative">
            <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-5xl shadow-2xl">
                    {currentRankObj.icon}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="px-3 py-1 rounded-full bg-falcon-gold/20 text-falcon-gold text-[10px] font-black uppercase tracking-widest border border-falcon-gold/30">
                            {gradeInfo}
                        </span>
                    </div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-2">
                        {currentRankObj.title}
                    </h2>
                    <p className="text-gray-400 text-xs font-medium leading-relaxed max-w-xs">
                        {currentRankObj.description}
                    </p>
                </div>
            </div>
            <button onClick={onClose} className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
            
            {/* Main Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5 text-center group hover:bg-white/10 transition-all">
                    <div className="text-3xl font-black text-white mb-1">{stats.level}</div>
                    <div className="text-[9px] text-falcon-gold uppercase tracking-widest font-black">Level</div>
                </div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5 text-center group hover:bg-white/10 transition-all">
                    <div className="text-3xl font-black text-white mb-1 flex items-center justify-center gap-2">
                        {stats.currentStreak}
                        <span className="text-xl">🔥</span>
                    </div>
                    <div className="text-[9px] text-gray-400 uppercase tracking-widest font-black">Streak</div>
                </div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5 text-center group hover:bg-white/10 transition-all">
                    <div className="text-3xl font-black text-white mb-1">{Math.round(stats.totalFocusMinutes / 60)}h</div>
                    <div className="text-[9px] text-gray-400 uppercase tracking-widest font-black">Hours</div>
                </div>
            </div>

            {/* Catch Up Section */}
            {catchUpElement}

            {/* Progress Section */}
            <div>
                <div className="flex justify-between items-end text-[10px] font-black text-gray-400 mb-3 uppercase tracking-widest">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-white text-base">Next Rank Progress</span>
                        <span className="opacity-60">{Math.round(xpInLevel)} / {Math.round(xpNeededInLevel)} XP</span>
                    </div>
                    <span className="text-falcon-gold text-lg">{Math.round(progressPercent)}%</span>
                </div>
                <div className="h-4 bg-black/60 rounded-full overflow-hidden border border-white/5 p-0.5">
                    <div 
                        className="h-full bg-gradient-to-r from-falcon-green via-falcon-gold to-yellow-200 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Ranks Hierarchy */}
            <div>
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">Rank Hierarchy</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {RANKS.map((rank) => {
                        const isUnlocked = stats.xp >= rank.minXP;
                        const isCurrent = currentRankObj.title === rank.title;
                        
                        return (
                            <div 
                                key={rank.title} 
                                className={`flex items-center justify-between p-4 rounded-[20px] border transition-all ${
                                    isCurrent 
                                        ? 'bg-white/10 border-falcon-gold/50 shadow-lg' 
                                        : isUnlocked 
                                        ? 'bg-white/5 border-white/10 opacity-80'
                                        : 'bg-transparent border-white/5 opacity-30 grayscale'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="text-2xl">{rank.icon}</div>
                                    <div>
                                        <div className={`text-sm font-black uppercase tracking-tight ${isCurrent ? 'text-falcon-gold' : 'text-white'}`}>
                                            {rank.title}
                                        </div>
                                        <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">LVL {rank.level}</div>
                                    </div>
                                </div>
                                {isCurrent && <span className="text-[9px] font-black bg-falcon-gold text-black px-2 py-0.5 rounded-full uppercase">Current</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default RankModal;


