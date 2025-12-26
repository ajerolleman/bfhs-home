
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // Base64 string for user uploaded images
  timestamp: Date;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface SchedulePeriod {
  name: string;
  start: string; // "08:05"
  end: string;   // "09:35"
}

export interface QuickLink {
  title: string;
  url: string;
  icon: string; // Emoji or SVG path identifier
  category: 'Academic' | 'Admin' | 'Resources';
}

export interface NewsItem {
  id: string;
  title: string;
  date: string;
  content: string;
  link?: string;
}

export interface UserSchedule {
  A: string[]; // Array of 4 strings for periods 1-4
  B: string[]; // Array of 4 strings for periods 1-4
}

export interface UserGamification {
  xp: number;
  level: number;
  currentStreak: number;
  lastFocusDate: string | null; // ISO Date string YYYY-MM-DD
  dailyFocusMinutes: number; // Track daily progress for streak
  totalFocusMinutes: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  grade: string; // "9th", "10th", "11th", "12th"
  allowMemory: boolean;
  schedule?: UserSchedule;
  gamification: UserGamification;
  cardUrl?: string;
  lastCardGenTime?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface MemoryNote {
  id: string;
  note: string; // max 140 chars
  source: 'user' | 'tutor' | 'system';
  createdAt: any;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdAt: any;
  isActive: boolean;
  totalVotes: number;
  userVotedOptionId?: string | null; // For UI state
}
