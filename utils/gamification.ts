
// Falcon Focus Gamification Logic
// Based on non-linear RPG progression curves to maintain motivation (Flow State).

export const RANKS = [
  { 
    level: 1, 
    title: "Falcon Fledgling", 
    minXP: 0, 
    icon: "🥚", 
    description: "Just starting your journey at BFHS. Every great scholar begins with a single focused minute." 
  },
  { 
    level: 5, 
    title: "Focus Apprentice", 
    minXP: 2500, 
    icon: "🐣", 
    description: "You're finding your wings. Your concentration is becoming a habit." 
  },
  { 
    level: 10, 
    title: "Scholar", 
    minXP: 10000, 
    icon: "📖", 
    description: "A respected mind in the library. You handle complex tasks with steady focus." 
  },
  { 
    level: 15, 
    title: "Deep Worker", 
    minXP: 22500, 
    icon: "🦅", 
    description: "You've mastered the art of concentration. Distractions no longer stand a chance." 
  },
  { 
    level: 20, 
    title: "Academic Weapon", 
    minXP: 40000, 
    icon: "⚔️", 
    description: "The ultimate force in the classroom. You dominate your finals and your schedule." 
  },
  { 
    level: 30, 
    title: "Grandmaster", 
    minXP: 90000, 
    icon: "👑", 
    description: "A legend of the Katherine Johnson campus. Your focus is an inspiration to others." 
  },
  { 
    level: 50, 
    title: "Time Lord", 
    minXP: 250000, 
    icon: "⏳", 
    description: "You have transcended the bell schedule. Time bends to your will." 
  }
];

export const getRankTitle = (level: number): string => {
  // Find the highest rank that matches the current level
  const rank = [...RANKS].reverse().find(r => level >= r.level);
  return rank ? rank.title : RANKS[0].title;
};

// XP Formula: XP = 100 * (Level^2)
// Level = Sqrt(XP / 100)
export const calculateLevel = (xp: number): number => {
  const level = Math.floor(Math.sqrt(xp / 100));
  return Math.max(1, level);
};

export const calculateXPForNextLevel = (level: number): number => {
  return 100 * Math.pow(level + 1, 2);
};

export const calculateProgressToNextLevel = (xp: number, currentLevel: number): number => {
  const currentLevelXP = 100 * Math.pow(currentLevel, 2);
  const nextLevelXP = 100 * Math.pow(currentLevel + 1, 2);
  
  const xpInLevel = xp - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  
  return Math.min(100, Math.max(0, (xpInLevel / xpNeeded) * 100));
};

export const calculateSessionXP = (minutes: number): number => {
  // Base: 10 XP per minute
  // Bonus: +50 XP for sessions > 25 mins (Pomodoro)
  // Bonus: +100 XP for sessions > 50 mins (Deep Work)
  let xp = minutes * 10;
  if (minutes >= 25) xp += 50;
  if (minutes >= 50) xp += 100;
  return Math.round(xp);
};

export const checkStreak = (lastDateStr: string | null): { streak: number, isStreakContinues: boolean } => {
  if (!lastDateStr) return { streak: 1, isStreakContinues: true };

  const lastDate = new Date(lastDateStr);
  const today = new Date();
  
  // Reset hours to compare calendar days
  lastDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(today.getTime() - lastDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
      // Same day, streak doesn't increase but continues
      return { streak: 0, isStreakContinues: true }; 
  } else if (diffDays === 1) {
      // Consecutive day
      return { streak: 1, isStreakContinues: true };
  } else {
      // Streak broken
      return { streak: 1, isStreakContinues: false };
  }
};
