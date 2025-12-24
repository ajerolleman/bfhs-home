
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { ChatSession, UserProfile, UserGamification } from '../types';
import ChatPanel from './ChatPanel';
import AIQuickBar from './AIQuickBar';
import DayTicker from './DayTicker';
import RankModal from './RankModal';
import SchoolLogo from './SchoolLogo';
import { saveUserProfile, getLeaderboard } from '../services/firebase';
import { 
    getRankTitle, 
    calculateLevel, 
    calculateProgressToNextLevel, 
    calculateSessionXP, 
    checkStreak,
    calculateXPForNextLevel
} from '../utils/gamification';

interface FocusOverlayProps {
  isActive: boolean;
  onExit: () => void;
  onSearch: (query: string, image?: string | null) => void;
  currentSession: ChatSession | null;
  isSending: boolean;
  userProfile: UserProfile | null;
  onSignIn: () => void;
  onNewChat: () => void;
  spotifyArtworkUrl?: string | null;
  isMixesOpen?: boolean;
  spotifySlotRef?: React.Ref<HTMLDivElement>;
}

type TimerState = 'setup' | 'running' | 'paused' | 'completed';
type SoundType = 'enable' | 'disable' | 'levelup';

// --- Sound Helper ---
const playSound = (type: SoundType, ctx: AudioContext, volumeScale = 1) => {
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    
    // Default duration
    let stopAt = now + 0.12;

    if (type === 'enable') {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.06);
        gain.gain.setValueAtTime(0.24 * volumeScale, now);
        gain.gain.exponentialRampToValueAtTime(0.0006, now + 0.14);
        stopAt = now + 0.14;
        
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(170, now);
        osc2.frequency.exponentialRampToValueAtTime(120, now + 0.06);
        gain2.gain.setValueAtTime(0.12 * volumeScale, now);
        gain2.gain.exponentialRampToValueAtTime(0.0006, now + 0.14);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(now + 0.14);

        osc.connect(gain);
        osc.start();
        osc.stop(stopAt);
    } else if (type === 'disable') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(210, now + 0.08);
        gain.gain.setValueAtTime(0.22 * volumeScale, now);
        gain.gain.exponentialRampToValueAtTime(0.0006, now + 0.13);
        stopAt = now + 0.13;

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(140, now);
        osc2.frequency.exponentialRampToValueAtTime(100, now + 0.08);
        gain2.gain.setValueAtTime(0.11 * volumeScale, now);
        gain2.gain.exponentialRampToValueAtTime(0.0006, now + 0.13);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(now + 0.13);

        osc.connect(gain);
        osc.start();
        osc.stop(stopAt);
    } else if (type === 'levelup') {
        // Magical Level Up Chord
        const frequencies = [440, 554.37, 659.25, 880]; // A Major
        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.01, now + 1.5);
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.15 * volumeScale, now + i * 0.05 + 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start();
            osc.stop(now + 2.0);
        });
    } else {
        gain.connect(ctx.destination);
    }
};

const FocusOverlay: React.FC<FocusOverlayProps> = ({ 
    isActive, 
    onExit,
    onSearch,
    currentSession,
    isSending,
    userProfile,
    onSignIn,
    onNewChat,
    spotifyArtworkUrl = null,
    isMixesOpen = false,
    spotifySlotRef
}) => {
  // State
  const [state, setState] = useState<TimerState>('setup');
  const [minutes, setMinutes] = useState(30);
  const [secondsRemaining, setSecondsRemaining] = useState(30 * 60);
  const [sessionTotalSeconds, setSessionTotalSeconds] = useState(30 * 60);
  const [zoomScale, setZoomScale] = useState(1);
  
  // Settings & Data
  const [taskName, setTaskName] = useState('');
  const [parkingLotItems, setParkingLotItems] = useState<{text: string, time: Date}[]>([]);
  const [isCalmMode, setIsCalmMode] = useState(true);
  const [isSoundEnabled] = useState(true);
  const [isAmbienceEnabled, setIsAmbienceEnabled] = useState(false);
  const [ambienceLevel, setAmbienceLevel] = useState(0.14);
  const [backgroundMode] = useState<'calm' | 'forest' | 'dusk'>('forest');
  const [isBreathingCueEnabled, setIsBreathingCueEnabled] = useState(true);
  
  // Gamification State
  const [stats, setStats] = useState<UserGamification>({
      xp: 0,
      level: 1,
      currentStreak: 0,
      lastFocusDate: null,
      totalFocusMinutes: 0
  });
  const [sessionXP, setSessionXP] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [showLevelUpAnim, setShowLevelUpAnim] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [showTaskError, setShowTaskError] = useState(false);
  
  // UI State
  const [isParkingLotOpen, setIsParkingLotOpen] = useState(false);
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [parkingInput, setParkingInput] = useState('');
  const [isAIExpanded, setIsAIExpanded] = useState(false);
  const [aiDockHeight, setAiDockHeight] = useState(240);
  const hasConversation = (currentSession?.messages?.length ?? 0) > 0;
  
  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambienceRef = useRef<{ source: AudioBufferSourceNode; gain: GainNode; filters: BiquadFilterNode[] } | null>(null);
  const ambienceLevelRef = useRef(ambienceLevel);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const taskInputRef = useRef<HTMLInputElement>(null);
  const parkingInputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const aiDockRef = useRef<HTMLDivElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const lastSliderTickRef = useRef(0);
  const baseDprRef = useRef<number | null>(null);
  const hadFullscreenRef = useRef(false);

  // --- Effects ---

  // Load Gamification Stats
  useEffect(() => {
      if (userProfile?.gamification) {
          setStats(userProfile.gamification);
      }
  }, [userProfile]);

  // Load Leaderboard
  useEffect(() => {
      if (isActive) {
          getLeaderboard(20).then(setLeaderboard);
      }
  }, [isActive]);

  // Clock Tick
  useEffect(() => {
      if (!isActive) return;
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
  }, [isActive]);

  const updateAiDockHeight = useCallback(() => {
      if (!aiDockRef.current) return;
      const nextHeight = Math.ceil(aiDockRef.current.getBoundingClientRect().height);
      setAiDockHeight(nextHeight);
  }, []);

  const stopAmbience = useCallback(() => {
      const nodes = ambienceRef.current;
      if (!nodes) return;
      ambienceRef.current = null;
      const now = nodes.gain.context.currentTime;
      nodes.gain.gain.cancelScheduledValues(now);
      nodes.gain.gain.setTargetAtTime(0.0001, now, 0.15);
      try {
          nodes.source.stop(now + 0.4);
      } catch (e) {
          // Ignore stop errors if already stopped.
      }
      window.setTimeout(() => {
          nodes.source.disconnect();
          nodes.filters.forEach((filter) => filter.disconnect());
          nodes.gain.disconnect();
      }, 450);
  }, []);

  const startAmbience = useCallback(() => {
      const ctx = audioCtxRef.current;
      if (!ctx || ambienceRef.current) return;
      if (ctx.state === 'suspended') ctx.resume();
      const level = ambienceLevelRef.current;

      const buffer = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
          const rand = Math.random() * 2 - 1;
          last = (last + rand * 0.02) * 0.98;
          data[i] = Math.max(-1, Math.min(1, last)) * 0.6;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(160, ctx.currentTime);
      highpass.Q.setValueAtTime(0.5, ctx.currentTime);

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(1400, ctx.currentTime);
      lowpass.Q.setValueAtTime(0.7, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(level, ctx.currentTime + 1);

      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      ambienceRef.current = { source, gain, filters: [highpass, lowpass] };
  }, []);

  // --- Audio Init ---
  useEffect(() => {
      if (isActive && !audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      return () => {
          if (!isActive && audioCtxRef.current) {
              stopAmbience();
              audioCtxRef.current.close();
              audioCtxRef.current = null;
          }
      };
  }, [isActive, stopAmbience]);

  useEffect(() => {
      if (!isActive) setIsAIExpanded(false);
  }, [isActive]);

  useEffect(() => {
      if (!isActive) return;
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalBodyHeight = document.body.style.height;
      const originalHtmlHeight = document.documentElement.style.height;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.height = '100%';
      document.documentElement.style.height = '100%';
      return () => {
          document.body.style.overflow = originalBodyOverflow;
          document.documentElement.style.overflow = originalHtmlOverflow;
          document.body.style.height = originalBodyHeight;
          document.documentElement.style.height = originalHtmlHeight;
      };
  }, [isActive]);

  useEffect(() => {
      if (!isActive) return;
      const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
              event.preventDefault();
              onExit();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onExit]);

  useEffect(() => {
      if (!isActive) return;
      hadFullscreenRef.current = Boolean(document.fullscreenElement);
      const handleFullscreenChange = () => {
          if (document.fullscreenElement) {
              hadFullscreenRef.current = true;
              return;
          }
          if (hadFullscreenRef.current) {
              onExit();
          }
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isActive, onExit]);

  useEffect(() => {
      if (!isActive) {
          setZoomScale(1);
          return;
      }
      const getViewportScale = () => window.visualViewport?.scale || 1;
      const updateScale = () => {
          const current = (window.devicePixelRatio || 1) / getViewportScale();
          const base = baseDprRef.current || current;
          const nextScale = current / base;
          setZoomScale(nextScale || 1);
      };
      updateScale();
      window.addEventListener('resize', updateScale);
      window.visualViewport?.addEventListener('resize', updateScale);
      return () => {
          window.removeEventListener('resize', updateScale);
          window.visualViewport?.removeEventListener('resize', updateScale);
      };
  }, [isActive]);

  useEffect(() => {
      if (baseDprRef.current !== null) return;
      const baseViewport = window.visualViewport?.scale || 1;
      baseDprRef.current = (window.devicePixelRatio || 1) / baseViewport;
  }, []);

  const handleCollapseAI = () => {
      setIsAIExpanded(false);
  };

  useEffect(() => {
      if (!isAIExpanded) return;
      const handleOutside = (event: MouseEvent) => {
          const target = event.target as Node;
          if (!chatPanelRef.current || !chatPanelRef.current.contains(target)) {
              handleCollapseAI();
          }
      };
      document.addEventListener('mousedown', handleOutside);
      return () => document.removeEventListener('mousedown', handleOutside);
  }, [isAIExpanded, handleCollapseAI]);

  useLayoutEffect(() => {
      updateAiDockHeight();
  }, [updateAiDockHeight, isAIExpanded, isMixesOpen]);

  useEffect(() => {
      if (!aiDockRef.current) return;
      if (typeof ResizeObserver === 'undefined') {
          window.addEventListener('resize', updateAiDockHeight);
          return () => window.removeEventListener('resize', updateAiDockHeight);
      }
      const observer = new ResizeObserver(() => updateAiDockHeight());
      observer.observe(aiDockRef.current);
      return () => observer.disconnect();
  }, [updateAiDockHeight]);

  const triggerSound = (type: SoundType, volumeScale = 1) => {
      if (isSoundEnabled && audioCtxRef.current) {
          window.setTimeout(() => {
              if (audioCtxRef.current) {
                  playSound(type, audioCtxRef.current, volumeScale);
              }
          }, 30);
      }
  };
  
  const handleSliderTick = () => {
      const now = performance.now();
      if (now - lastSliderTickRef.current > 120) {
          triggerSound('enable', 1.25);
          lastSliderTickRef.current = now;
      }
  };

  const handleAIBarFocus = () => {
      if (state === 'setup') return;
      if (hasConversation) setIsAIExpanded(true);
  };

  const handleAISearch = (query: string, image?: string | null) => {
      if (state === 'setup') return;
      onSearch(query, image);
      setIsAIExpanded(true);
  };

  useEffect(() => {
      if (!isActive) return;
      if (isAmbienceEnabled) {
          startAmbience();
      } else {
          stopAmbience();
      }
      return () => stopAmbience();
  }, [isActive, isAmbienceEnabled, startAmbience, stopAmbience]);

  useEffect(() => {
      const ctx = audioCtxRef.current;
      ambienceLevelRef.current = ambienceLevel;
      if (!ctx || !ambienceRef.current) return;
      ambienceRef.current.gain.gain.setTargetAtTime(ambienceLevel, ctx.currentTime, 0.35);
  }, [ambienceLevel]);

  // --- Timer Loop & Completion ---
  useEffect(() => {
      if (state === 'running') {
          lastTimeRef.current = performance.now();
          const tick = (time: number) => {
              const delta = (time - lastTimeRef.current) / 1000;
              lastTimeRef.current = time;
              
              setSecondsRemaining(prev => {
                  const next = Math.max(0, prev - delta);
                  if (next <= 0) {
                      // Timer Completed Logic
                      const sessionMins = Math.round(sessionTotalSeconds / 60);
                      const earnedXP = calculateSessionXP(sessionMins);
                      setSessionXP(earnedXP);

                      // Update Stats
                      const newTotalMinutes = (stats.totalFocusMinutes || 0) + sessionMins;
                      const { streak, isStreakContinues } = checkStreak(stats.lastFocusDate);
                      const newStreak = isStreakContinues ? stats.currentStreak + streak : 1;
                      const newXP = (stats.xp || 0) + earnedXP;
                      const newLevel = calculateLevel(newXP);
                      const isLevelUp = newLevel > stats.level;

                      setLeveledUp(isLevelUp);
                      if (isLevelUp) {
                          setShowLevelUpAnim(true);
                          triggerSound('levelup', 1.0);
                      } else {
                          triggerSound('enable', 0.8);
                      }

                      const newStats: UserGamification = {
                          xp: newXP,
                          level: newLevel,
                          currentStreak: newStreak,
                          lastFocusDate: new Date().toISOString(),
                          totalFocusMinutes: newTotalMinutes
                      };
                      
                      setStats(newStats);
                      setState('completed');

                      if (userProfile) {
                          saveUserProfile(userProfile.uid, { gamification: newStats });
                      }
                      
                      return 0;
                  }
                  return next;
              });
              
              rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
      } else {
          cancelAnimationFrame(rafRef.current);
      }
      return () => cancelAnimationFrame(rafRef.current);
  }, [state, sessionTotalSeconds, stats, userProfile]);

  // Focus input on state change
  useEffect(() => {
      if (state === 'setup' && taskInputRef.current) {
          setTimeout(() => taskInputRef.current?.focus(), 100);
      }
      if (isParkingLotOpen && parkingInputRef.current) {
          setTimeout(() => parkingInputRef.current?.focus(), 100);
      }
  }, [state, isParkingLotOpen]);

  // --- Helper Functions ---
  const startSession = () => {
      if (!taskName.trim()) {
          setShowTaskError(true);
          setTimeout(() => setShowTaskError(false), 1000);
          return;
      }
      const totalSeconds = Math.max(60, Math.min(3599, Math.round(minutes * 60)));
      const normalizedMinutes = totalSeconds / 60;
      if (normalizedMinutes !== minutes) setMinutes(normalizedMinutes);
      setSessionTotalSeconds(totalSeconds);
      setSecondsRemaining(totalSeconds);
      setState('running');
      triggerSound('enable');
  };

  const addParkingItem = () => {
      if (!parkingInput.trim()) return;
      setParkingLotItems(prev => [...prev, { text: parkingInput, time: new Date() }]);
      setParkingInput('');
      setIsParkingLotOpen(false);
      triggerSound('enable');
  };

  // --- Visuals ---
  const formatTime = (totalSeconds: number) => {
      const m = Math.floor(totalSeconds / 60);
      const s = Math.floor(totalSeconds % 60);
      // Calm Mode: Show only minutes if > 1 minute left
      if (isCalmMode && totalSeconds > 60 && state === 'running') {
          return `${m}m`;
      }
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const maxTotalSeconds = 59 * 60 + 59;
  const setupTotalSeconds = Math.max(60, Math.min(maxTotalSeconds, Math.round(minutes * 60)));
  const remainingRatio = sessionTotalSeconds
      ? Math.max(0, Math.min(1, secondsRemaining / sessionTotalSeconds))
      : 0;
  const isFocusMode = state === 'running' || state === 'paused';
  const showHeaderTimer = isAIExpanded && isFocusMode;
  const showCenteredTimer = isFocusMode && !isAIExpanded;
  const hasArtwork = Boolean(spotifyArtworkUrl);
  const activeBackgroundMode = hasArtwork ? 'dusk' : backgroundMode;
  const aiDockClearance = aiDockHeight ? aiDockHeight + 16 : 0;
  const snapToMinute = (rawSeconds: number) => {
      if (rawSeconds >= maxTotalSeconds - 59) return maxTotalSeconds;
      const snapped = Math.round(rawSeconds / 60) * 60;
      return Math.max(60, Math.min(maxTotalSeconds, snapped));
  };

  if (!isActive) return null;

  const scaleFactor = 1.05; // 5% larger (zoomed out a bit from 15%)

  const zoomStyle: React.CSSProperties = {
      transform: `scale(${scaleFactor / zoomScale})`,
      transformOrigin: 'top left',
      width: `${(100 * zoomScale) / scaleFactor}vw`,
      height: `${(100 * zoomScale) / scaleFactor}vh`,
      right: 'auto',
      bottom: 'auto'
  };

  // Gamification Visuals
  const rankTitle = getRankTitle(stats.level);
  const progressToNext = calculateProgressToNextLevel(stats.xp, stats.level);

  return (
    <div
      className={`fixed inset-0 z-[150] text-white overflow-hidden overscroll-none select-none font-sans ${activeBackgroundMode === 'dusk' ? 'bg-[#0C101B]' : 'bg-[#0B1310]'}`}
      style={zoomStyle}
    >
      {/* Background */}
      <div className={`fixed inset-0 ${
          activeBackgroundMode === 'forest'
              ? 'bg-gradient-to-br from-[#07140F] via-[#0E231A] to-[#091611]'
              : activeBackgroundMode === 'dusk'
              ? 'bg-gradient-to-br from-[#0B1120] via-[#0F182A] to-[#0C111D]'
              : 'bg-gradient-to-br from-[#0B1310] via-[#0F1C18] to-[#0B1310]'
      }`} />
      <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-700"
          style={{
              backgroundImage: spotifyArtworkUrl ? `url(${spotifyArtworkUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: spotifyArtworkUrl ? 0.92 : 0,
              filter: 'blur(28px) brightness(0.92) saturate(1.2)',
              transform: 'scale(1.14)'
          }}
      />
      {spotifyArtworkUrl && (
          <>
              <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(120deg,rgba(8,26,18,0.5),rgba(12,30,22,0.44),rgba(6,18,14,0.52))]" />
              <div className="fixed inset-0 pointer-events-none bg-black/20" />
          </>
      )}
      <div className="fixed inset-0 bg-noise opacity-[0.05] pointer-events-none mix-blend-overlay"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_55%)] pointer-events-none"></div>
      <div className="fixed -top-32 -left-16 w-[520px] h-[520px] bg-falcon-green/20 rounded-full blur-[160px] animate-focus-orb-slow"></div>
      <div className="fixed bottom-[-25%] right-[-10%] w-[620px] h-[620px] bg-falcon-gold/10 rounded-full blur-[180px] animate-focus-orb"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.45)_100%)] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col h-full animate-fade-in">
          {/* Focus Header */}
          <div className={`fixed left-0 top-0 right-0 px-8 flex items-center justify-between bg-[linear-gradient(135deg,#12261E,#0F2019)] border-b border-white/10 z-[130] overflow-hidden shadow-2xl py-5 md:py-6`}>
              {spotifyArtworkUrl && (
                  <>
                      <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                              backgroundImage: `url(${spotifyArtworkUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              filter: 'blur(80px)',
                              transform: 'scale(1.18)',
                              opacity: 0.4
                          }}
                      />
                  </>
              )}
              <div className="flex items-center gap-8 transform scale-110 origin-left relative z-10">
                  {/* Gamification Badge (Visible in Setup) */}
                  {!isFocusMode && (
                      <button 
                          onClick={() => setIsRankModalOpen(true)}
                          className="hidden md:flex items-center gap-4 animate-fade-in hover:scale-105 transition-transform cursor-pointer text-left"
                      >
                          <div className="relative w-12 h-12 flex items-center justify-center">
                              <svg className="w-full h-full text-falcon-gold/20" viewBox="0 0 36 36">
                                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="url(#goldGradientHeader)" strokeWidth="4" strokeDasharray={`${progressToNext}, 100`} className="drop-shadow-[0_0_4px_rgba(234,179,8,0.5)] transition-all duration-1000 ease-out" />
                                  <defs>
                                      <linearGradient id="goldGradientHeader" x1="0%" y1="0%" x2="100%" y2="0%">
                                          <stop offset="0%" stopColor="#EAB308" />
                                          <stop offset="100%" stopColor="#FDE047" />
                                      </linearGradient>
                                  </defs>
                              </svg>
                              <span className="absolute text-sm font-bold text-falcon-gold">{stats.level}</span>
                          </div>
                          <div className="flex flex-col">
                              <span className="text-[11px] text-gray-400 uppercase tracking-widest font-bold">{rankTitle}</span>
                              <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-bold text-white">{stats.currentStreak} Day Streak</span>
                                  {stats.currentStreak > 0 && <span className="text-sm animate-pulse">🔥</span>}
                              </div>
                          </div>
                      </button>
                  )}

                  {/* Standard Logo */}
                  <div className={`flex items-center gap-6 ${!isFocusMode ? 'md:hidden' : ''}`}>
                    <div className="w-16 h-16 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">
                        <SchoolLogo className={`w-full h-full scale-110 ${hasArtwork ? 'brightness-150 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : ''}`} />
                    </div>
                    <div>
                        <div className={`text-xs uppercase font-bold tracking-widest ${hasArtwork ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]' : 'text-falcon-gold'}`}>BFHS Internal</div>
                        <div className={`text-base font-bold ${hasArtwork ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]' : ''}`}>Focus</div>
                    </div>
                  </div>
              </div>

              {/* Centered Clock & Period Countdown in Top Bar */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none transform scale-110 z-20">
                  <div className="text-sm font-bold text-white tracking-widest uppercase mb-1 drop-shadow-md">
                      {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <DayTicker userProfile={userProfile} />
              </div>

              <div className="flex items-center gap-4 transform scale-110 origin-right relative z-10">
                  <button 
                     onClick={onExit} 
                     className={`text-sm font-bold uppercase tracking-wider transition-colors ${hasArtwork ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]' : 'text-gray-400 hover:text-white'}`}
                  >
                      Exit (ESC)
                  </button>
              </div>
          </div>

          {/* Scrollable Body */}
          <div className={`flex-1 min-h-0 overflow-hidden flex flex-col pt-12 md:pt-14`}>
              <div ref={topRef} className="h-0 w-full" />
              
              {/* Main Content */}
              <div
                  className={`relative w-full flex flex-col items-center px-4 md:px-8 flex-1 min-h-0 transform-gpu transition-[padding-bottom,transform] duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)] justify-start ${
                      isFocusMode ? 'pt-2 md:pt-3' : 'pt-4 md:pt-6'
                  } ${
                      isAIExpanded ? 'scale-[0.985]' : 'scale-100'
                  }`}
                  style={{ paddingBottom: aiDockClearance ? aiDockClearance : undefined }}
              >
                  {showCenteredTimer && (
                      <div
                          className={`absolute inset-x-0 top-[35%] -translate-y-1/2 z-[110] transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center ${
                              isAIExpanded ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100 animate-pop-in'
                          }`}
                      >
                          <div className="text-center">
                              {/* Task Name Grouped with Timer */}
                              <div className="mb-6 font-extrabold text-white tracking-tight leading-none text-4xl md:text-5xl lg:text-6xl drop-shadow-lg opacity-90">
                                  {taskName}
                              </div>

                              <button 
                                  onClick={() => setIsCalmMode(!isCalmMode)}
                                  className="font-mono font-bold text-white tracking-tight text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] pointer-events-auto cursor-pointer select-none active:scale-95 transition-transform"
                              >
                                  {formatTime(secondsRemaining)}
                              </button>
                              
                              <div className={`mt-4 ${
                                  'w-[320px] md:w-[520px]'
                              } mx-auto`}>
                                  <div className="relative rounded-full bg-white/15 overflow-hidden h-5 md:h-6">
                                      <div
                                          className="absolute inset-0 bg-emerald-400/90 origin-left transition-transform duration-300 ease-out"
                                          style={{ transform: `scaleX(${remainingRatio})` }}
                                      />
                                  </div>
                              </div>

                              {/* Controls Integrated into Centered Group */}
                              <div className="flex flex-wrap items-center justify-center gap-4 mt-8 pointer-events-auto">
                                  <button 
                                     onClick={() => {
                                         setState(state === 'running' ? 'paused' : 'running');
                                         triggerSound(state === 'running' ? 'disable' : 'enable');
                                     }}
                                     className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white border border-white/10 transition-all active:scale-95"
                                  >
                                      {state === 'running' ? (
                                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                                      ) : (
                                          <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                      )}
                                  </button>
                                  
                                  <button 
                                      onClick={() => { setIsParkingLotOpen(true); triggerSound('enable'); }}
                                      className="h-14 px-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center gap-2 text-sm font-bold transition-all active:scale-95"
                                      title="Press 'D'"
                                  >
                                      <span>🧠</span> Capture Distraction
                                  </button>

                                  {state === 'paused' && (
                                      <button 
                                         onClick={() => { setState('setup'); triggerSound('disable'); }}
                                         className="h-12 px-5 rounded-full bg-red-500/20 text-red-200 hover:bg-red-500/30 border border-red-500/30 text-xs font-bold transition-all active:scale-95"
                                      >
                                          End
                                      </button>
                                  )}
                              </div>

                              {/* XP Status - Clean but Informative UI */}
                              <div className="mt-24 w-full flex flex-col items-center gap-6 pointer-events-auto">
                                  {/* Top Row: Rank & Level */}
                                  <div className="flex items-center gap-6 text-white text-sm font-black uppercase tracking-[0.4em]">
                                      <span className="text-falcon-gold drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">{rankTitle}</span>
                                      <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                                      <span className="opacity-90">Tier {stats.level}</span>
                                  </div>

                                  {/* Progress Bar: Larger & Gradient */}
                                  <div className="relative w-full max-w-md h-3 bg-black/40 rounded-full overflow-hidden border border-white/10 shadow-2xl">
                                      <div 
                                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-falcon-green via-falcon-gold to-yellow-200 transition-all duration-1000 ease-out"
                                          style={{ width: `${progressToNext}%` }}
                                      >
                                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                      </div>
                                  </div>

                                  {/* Stats Row: Streak, To Next, Total */}
                                  <div className="grid grid-cols-3 gap-12 text-white/60">
                                      <div className="flex flex-col items-center gap-1">
                                          <span className="text-xl font-black text-white">{stats.currentStreak}d 🔥</span>
                                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Streak</span>
                                      </div>
                                      <div className="flex flex-col items-center gap-1">
                                          <span className="text-xl font-black text-white">{Math.round(calculateXPForNextLevel(stats.level) - stats.xp)}</span>
                                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">XP Needed</span>
                                      </div>
                                      <div className="flex flex-col items-center gap-1">
                                          <span className="text-xl font-black text-white">
                                              {Math.ceil((calculateXPForNextLevel(stats.level) - stats.xp) / 10)}m
                                          </span>
                                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Study Time</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
                  <div className="w-full max-w-6xl flex flex-col flex-1">
                      <div className={`flex-1 flex ${isFocusMode ? 'items-start' : 'items-center'} justify-center transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)]`}>
                          <div className={`w-full max-w-3xl mx-auto ${isFocusMode ? 'pt-2' : ''}`}>
                              <div className={`flex flex-col items-center text-center ${isAIExpanded ? 'gap-3' : 'gap-4'}`}>
                                  {isFocusMode && !isAIExpanded && null}

                                  {state === 'setup' ? (
                                      <div className="flex-1 w-full flex flex-col items-center justify-center">
                                          <div className={`w-full max-w-2xl mb-8 -translate-y-4 md:-translate-y-6 transition-all duration-300 ${showTaskError ? 'animate-error-pop' : ''}`}>
                                              <input 
                                                  ref={taskInputRef}
                                                  type="text" 
                                                  value={taskName}
                                                  onChange={(e) => setTaskName(e.target.value)}
                                                  onKeyDown={(e) => e.key === 'Enter' && state === 'setup' && startSession()}
                                                  placeholder="What are you working on?"
                                                  disabled={state !== 'setup'}
                                                  className={`w-full bg-white/10 border ${showTaskError ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'border-white/20'} backdrop-blur-md rounded-full px-5 py-3 text-white text-center placeholder-white/40 focus:border-falcon-gold focus:bg-white/15 focus:shadow-lg outline-none text-sm disabled:opacity-60 transition-all duration-300`}
                                              />
                                          </div>

                                          {(state === 'setup' || state === 'running' || state === 'paused') && (
                                              <div className={`w-full max-w-3xl transform-gpu transition-all duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)] origin-top ${
                                                  isAIExpanded
                                                      ? 'mt-1 scale-[0.78] translate-y-0 opacity-95'
                                                      : state === 'setup'
                                                      ? 'mt-4 scale-100 translate-y-0'
                                                      : 'mt-6 scale-100 translate-y-0'
                                              }`}>
                                                  <div className="text-center">
                                                      <div className={`font-mono font-bold text-white tracking-tighter drop-shadow-md transition-all duration-300 ${
                                                          isAIExpanded
                                                              ? 'text-5xl md:text-6xl'
                                                              : state === 'setup'
                                                              ? 'text-8xl md:text-9xl'
                                                              : 'text-7xl md:text-8xl'
                                                      }`}>
                                                          {formatTime(state === 'setup' ? setupTotalSeconds : secondsRemaining)}
                                                      </div>
                                                      {state === 'setup' && (
                                                          <div className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mt-2">
                                                              Set your focus duration
                                                          </div>
                                                      )}
                                                  </div>

                                                  <div className={`w-full ${isAIExpanded ? 'mt-3' : 'mt-4'}`}>
                                                      {state === 'setup' ? (
                                                          <div>
                                                              <input
                                                                  type="range"
                                                                  min="60"
                                                                  max={maxTotalSeconds}
                                                                  step="60"
                                                                  value={setupTotalSeconds}
                                                                  onChange={(e) => {
                                                                      const snapped = snapToMinute(Number(e.target.value));
                                                                      setMinutes(snapped / 60);
                                                                      handleSliderTick();
                                                                  }}
                                                                  className={`w-full accent-falcon-gold ${isAIExpanded ? 'h-3 md:h-4' : 'h-6 md:h-7'}`}
                                                              />
                                                              <div className="mt-2 flex justify-between text-[10px] text-white/50 uppercase tracking-[0.2em]">
                                                                  <span>1:00</span>
                                                                  <span>59:59</span>
                                                              </div>
                                                          </div>
                                                      ) : (
                                                          <div className={`relative rounded-full bg-white/15 overflow-hidden ${isAIExpanded ? 'h-3 md:h-4' : 'h-8 md:h-10'}`}>
                                                              <div
                                                                  className="absolute inset-0 bg-emerald-400/90 origin-left transition-transform duration-300 ease-out"
                                                                  style={{ transform: `scaleX(${remainingRatio})` }}
                                                              />
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                          )}
                                          <button 
                                             onClick={startSession}
                                             className="magnetic-btn mt-5 px-10 py-3 bg-white text-black font-bold rounded-full hover:scale-105 hover:bg-falcon-gold active:scale-95 active:translate-y-[1px] transition-all shadow-lg"
                                          >
                                              Start Focus
                                          </button>
                                      </div>
                                  ) : state === 'completed' ? null : isAIExpanded ? null : null}
                              </div>
                          </div>
                      </div>

                      {state === 'completed' ? (
                          <div className="absolute inset-0 z-[115] flex items-center justify-center px-4">
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                              <div className="max-w-2xl w-full mx-auto animate-fade-in-up text-center relative z-10">
                                  {/* Level Up Confetti (Simplified CSS placeholder) */}
                                  {leveledUp && (
                                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                          <div className="absolute top-0 left-1/4 w-4 h-4 bg-falcon-gold rounded-full animate-ping"></div>
                                          <div className="absolute top-10 right-1/4 w-6 h-6 bg-white rounded-full animate-ping delay-100"></div>
                                          <div className="absolute bottom-20 left-1/2 w-4 h-4 bg-emerald-400 rounded-full animate-ping delay-200"></div>
                                      </div>
                                  )}

                                  <div className="mb-10">
                                      <div className="text-9xl mb-6 animate-bounce drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                                          {leveledUp ? '🌟' : getRankTitle(stats.level) === "Falcon Fledgling" ? '🥚' : '🎉'}
                                      </div>
                                      <h2 className="text-5xl md:text-6xl font-black text-white mb-4 uppercase tracking-tighter drop-shadow-2xl">
                                          {leveledUp ? 'Level Up!' : 'Focus Complete'}
                                      </h2>
                                      <p className="text-gray-400 text-xl font-medium tracking-wide">You focused for {formatTime(sessionTotalSeconds)}</p>
                                  </div>

                                  {/* XP & Progress Card - Much Larger */}
                                  <div className="bg-[#0B1210]/80 rounded-[40px] p-10 border border-white/10 backdrop-blur-2xl mb-10 transform hover:scale-[1.02] transition-all duration-500 shadow-2xl">
                                      <div className="flex justify-between items-end mb-6">
                                          <div className="text-left">
                                              <span className="text-2xl font-black uppercase tracking-widest text-falcon-gold block mb-1">
                                                  +{sessionXP} XP
                                              </span>
                                              <div className="text-2xl font-black text-white uppercase tracking-tight">{rankTitle}</div>
                                          </div>
                                          <div className="text-right">
                                              <span className="text-gray-400 text-sm font-black uppercase tracking-widest block mb-1">Current Level</span>
                                              <span className="text-4xl font-black text-white">{stats.level}</span>
                                          </div>
                                      </div>
                                      
                                      {/* Level Progress Bar - Bigger */}
                                      <div className="relative h-4 bg-black/60 rounded-full overflow-hidden mb-8 border border-white/5">
                                          <div 
                                              className="absolute top-0 left-0 h-full bg-gradient-to-r from-falcon-green via-falcon-gold to-yellow-200 transition-all duration-1000 ease-out"
                                              style={{ width: `${progressToNext}%` }}
                                          >
                                              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                          </div>
                                      </div>
                                      
                                      <div className="flex justify-between items-center bg-white/5 rounded-2xl p-4 border border-white/5">
                                          <div className="text-left flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl">🔥</div>
                                              <div>
                                                  <div className="text-sm font-bold text-white">{stats.currentStreak} Day Streak</div>
                                                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Consistency is Key</div>
                                              </div>
                                          </div>
                                          <div className="text-right">
                                              <div className="text-xs font-black text-falcon-gold uppercase tracking-widest">Next Rank</div>
                                              <div className="text-sm font-bold text-white opacity-60">{getRankTitle(stats.level + 1)}</div>
                                          </div>
                                      </div>
                                  </div>

                                  {parkingLotItems.length > 0 && (
                                      <div className="bg-white/5 rounded-[32px] border border-white/10 p-8 mb-10 text-left backdrop-blur-md max-h-48 overflow-y-auto custom-scrollbar">
                                          <h3 className="text-xs font-black text-falcon-gold uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                                              <span>🧠</span> Parking Lot Summary
                                          </h3>
                                          <ul className="space-y-4">
                                              {parkingLotItems.map((item, idx) => (
                                                  <li key={idx} className="flex justify-between items-start text-base font-medium border-b border-white/5 pb-3 last:border-0">
                                                      <span className="text-gray-200">{item.text}</span>
                                                      <span className="text-gray-500 text-xs font-mono ml-4">{item.time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                  </li>
                                              ))}
                                          </ul>
                                      </div>
                                  )}

                                  <div className="flex justify-center gap-6">
                                      <button 
                                          onClick={() => { 
                                              setState('setup'); 
                                              setParkingLotItems([]); 
                                              triggerSound('enable');
                                              setLeveledUp(false);
                                          }}
                                          className="px-12 py-5 bg-falcon-gold text-black font-black uppercase tracking-widest rounded-full hover:scale-105 hover:bg-yellow-400 active:scale-95 transition-all shadow-[0_20px_50px_rgba(234,179,8,0.3)]"
                                      >
                                          Start New Session
                                      </button>
                                      <button 
                                          onClick={onExit}
                                          className="px-12 py-5 border-2 border-white/10 text-white font-black uppercase tracking-widest rounded-full hover:bg-white/5 transition-all"
                                      >
                                          Return Home
                                      </button>
                                  </div>
                              </div>
                          </div>
                      ) : null}
                  </div>
              </div>
          </div>

          {/* AI Dock */}
          <div ref={aiDockRef} className="fixed bottom-0 left-0 right-0 pb-6 pt-3 z-30 pointer-events-none">
              <div className="flex flex-col items-center gap-4">
                  {/* Secondary Small Timer (Visible when AI is expanded) */}
                  <div className={`transition-all duration-500 ease-spring pointer-events-auto ${isAIExpanded && isFocusMode ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'} mb-6`}>
                      <div className="flex flex-col items-center">
                          <div className="font-mono font-bold text-white tracking-tighter text-8xl drop-shadow-2xl">
                              {formatTime(secondsRemaining)}
                          </div>
                          <div className="mt-4 w-[500px] mx-auto opacity-90">
                              <div className="relative rounded-full bg-white/10 overflow-hidden h-4 border border-white/5 shadow-inner">
                                  <div
                                      className="absolute inset-0 bg-gradient-to-r from-falcon-green to-falcon-gold origin-left transition-transform duration-300 ease-out"
                                      style={{ transform: `scaleX(${remainingRatio})` }}
                                  >
                                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="mx-auto w-full max-w-5xl px-4 md:px-8 pointer-events-auto">
                      <div className={`overflow-hidden transition-[max-height,opacity,transform] duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)] ${isAIExpanded ? 'max-h-[45vh] opacity-100 translate-y-0' : 'max-h-0 opacity-0 translate-y-4'}`}>
                          <div ref={chatPanelRef} className={`h-[55vh] min-h-[320px] rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg overflow-hidden shadow-[0_18px_40px_-30px_rgba(0,0,0,0.6)] transition-all duration-300 ${isAIExpanded ? 'opacity-100 delay-300' : 'opacity-0 delay-0'}`}>
                              <div className="relative h-full dark flex flex-col min-h-0">
                                  <button
                                      onClick={handleCollapseAI}
                                      className="absolute right-3 top-3 z-10 text-[10px] uppercase tracking-widest font-bold text-white/60 hover:text-white bg-black/30 border border-white/10 px-3 py-1 rounded-full"
                                  >
                                      Push Down
                                  </button>
                                  <ChatPanel 
                                      messages={currentSession?.messages || []}
                                      isLoading={isSending}
                                      userProfile={userProfile}
                                      onSignInRequest={onSignIn}
                                  />
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="w-full px-4 md:px-8 pointer-events-auto">
                      <div className="mx-auto w-full max-w-2xl">
                          <div ref={spotifySlotRef} className="w-full" />
                      </div>
                  </div>

                  <div className={`w-full px-4 md:px-8 ${state === 'setup' ? 'pointer-events-none opacity-60' : 'pointer-events-auto'}`}>
                      <div className="mx-auto w-full max-w-3xl flex flex-col items-center gap-3">
                          <div className="h-1.5 w-12 rounded-full bg-white/25 shadow-[0_0_12px_rgba(255,255,255,0.15)]"></div>
                          <AIQuickBar 
                              onSearch={handleAISearch}
                              onOpenChat={() => {}}
                              onBarFocus={handleAIBarFocus}
                              searchMode="bfhs-only"
                              hideChips={true}
                          />
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* 4. Parking Lot Modal (Overlay) */}
      {isParkingLotOpen && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="w-full max-w-md bg-[#1B2433] rounded-2xl p-6 border border-white/10 shadow-2xl transform scale-100 transition-all">
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                      <span>🧠</span> Parking Lot
                  </h3>
                  <p className="text-sm text-gray-400 mb-6">Capture the thought to get it out of your head, then get back to focus.</p>
                  
                  <input 
                      ref={parkingInputRef}
                      type="text" 
                      value={parkingInput}
                      onChange={(e) => setParkingInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addParkingItem()}
                      placeholder="e.g., Email mom about dinner..."
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-4 text-white placeholder-gray-600 focus:border-falcon-gold outline-none mb-4"
                  />
                  
                  <div className="flex justify-end gap-3">
                      <button 
                          onClick={() => setIsParkingLotOpen(false)}
                          className="px-4 py-2 text-gray-400 hover:text-white text-sm font-bold"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={addParkingItem}
                          disabled={!parkingInput.trim()}
                          className="px-6 py-2 bg-falcon-gold text-black rounded-lg text-sm font-bold hover:bg-yellow-400 disabled:opacity-50"
                      >
                          Add & Continue
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* 5. Rank Details Modal */}
      <RankModal 
          isOpen={isRankModalOpen} 
          onClose={() => setIsRankModalOpen(false)} 
          stats={stats} 
          userEmail={userProfile?.email}
          leaderboard={leaderboard}
      />

      <style>{`
          @keyframes focusOrb {
              0% { transform: translate3d(0, 0, 0) scale(1); }
              50% { transform: translate3d(-20px, -30px, 0) scale(1.05); }
              100% { transform: translate3d(0, 0, 0) scale(1); }
          }
          @keyframes focusOrbSlow {
              0% { transform: translate3d(0, 0, 0) scale(1); }
              50% { transform: translate3d(30px, 20px, 0) scale(1.08); }
              100% { transform: translate3d(0, 0, 0) scale(1); }
          }
          @keyframes breathe {
              0%, 100% { opacity: 0.6; transform: scale(0.98); }
              50% { opacity: 1; transform: scale(1.02); }
          }
          @keyframes errorPop {
              0%, 100% { transform: translateY(-1rem) scale(1); }
              50% { transform: translateY(-1rem) scale(1.08); }
          }
          @keyframes popIn {
              0% { opacity: 0; transform: scale(0.9); }
              100% { opacity: 1; transform: scale(1); }
          }
          @media (min-width: 768px) {
              @keyframes errorPop {
                  0%, 100% { transform: translateY(-1.5rem) scale(1); }
                  50% { transform: translateY(-1.5rem) scale(1.08); }
              }
          }
          .animate-focus-orb {
              animation: focusOrb 18s ease-in-out infinite;
          }
          .animate-focus-orb-slow {
              animation: focusOrbSlow 24s ease-in-out infinite;
          }
          .animate-breathe {
              animation: breathe 6s ease-in-out infinite;
          }
          .animate-error-pop {
              animation: errorPop 0.4s ease-in-out;
          }
          .animate-pop-in {
              animation: popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
      `}</style>

    </div>
  );
};

export default FocusOverlay;
