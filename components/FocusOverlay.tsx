
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { ChatSession, UserProfile } from '../types';
import ChatPanel from './ChatPanel';
import AIQuickBar from './AIQuickBar';
import SpotifyPlayer from './SpotifyPlayer';
import DayTicker from './DayTicker';

interface FocusOverlayProps {
  isActive: boolean;
  onExit: () => void;
  onSearch: (query: string, image?: string | null) => void;
  currentSession: ChatSession | null;
  isSending: boolean;
  userProfile: UserProfile | null;
  onSignIn: () => void;
  onNewChat: () => void;
}

type TimerState = 'setup' | 'running' | 'paused' | 'completed';
type SoundType = 'enable' | 'disable';

// --- Sound Helper ---
const playSound = (type: SoundType, ctx: AudioContext, volumeScale = 1) => {
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    const now = ctx.currentTime;

    let stopAt = now + 0.12;

    if (type === 'enable') {
        // Higher-pitch, louder premium enable click
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
    } else {
        // Higher-pitch, loud premium disable click
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
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(stopAt);
};

const FocusOverlay: React.FC<FocusOverlayProps> = ({ 
    isActive, 
    onExit,
    onSearch,
    currentSession,
    isSending,
    userProfile,
    onSignIn,
    onNewChat
}) => {
  // State
  const [state, setState] = useState<TimerState>('setup');
  const [minutes, setMinutes] = useState(30);
  const [secondsRemaining, setSecondsRemaining] = useState(30 * 60);
  const [sessionTotalSeconds, setSessionTotalSeconds] = useState(30 * 60);
  
  // Settings & Data
  const [taskName, setTaskName] = useState('');
  const [parkingLotItems, setParkingLotItems] = useState<{text: string, time: Date}[]>([]);
  const [isCalmMode, setIsCalmMode] = useState(true);
  const [isSoundEnabled] = useState(true);
  const [isAmbienceEnabled, setIsAmbienceEnabled] = useState(false);
  const [ambienceLevel, setAmbienceLevel] = useState(0.14);
  const [backgroundMode] = useState<'calm' | 'forest' | 'dusk'>('forest');
  const [isBreathingCueEnabled, setIsBreathingCueEnabled] = useState(false);
  
  // UI State
  const [isParkingLotOpen, setIsParkingLotOpen] = useState(false);
  const [parkingInput, setParkingInput] = useState('');
  const [isAIExpanded, setIsAIExpanded] = useState(false);
  const [isMixesOpen, setIsMixesOpen] = useState(false);
  const [spotifyArtworkUrl, setSpotifyArtworkUrl] = useState<string | null>(null);
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

  const handleSpotifyArtworkChange = useCallback((url: string | null) => {
      setSpotifyArtworkUrl(url);
  }, []);

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

  // --- Timer Loop ---
  useEffect(() => {
      if (state === 'running') {
          lastTimeRef.current = performance.now();
          const tick = (time: number) => {
              const delta = (time - lastTimeRef.current) / 1000;
              lastTimeRef.current = time;
              
              setSecondsRemaining(prev => {
                  const next = Math.max(0, prev - delta);
                  if (next <= 0) {
                      setState('completed');
                      triggerSound('enable', 0.8);
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
  }, [state]);

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
      const totalSeconds = Math.max(60, Math.min(3599, Math.round(minutes * 60)));
      const normalizedMinutes = totalSeconds / 60;
      if (normalizedMinutes !== minutes) setMinutes(normalizedMinutes);
      if (!taskName.trim()) setTaskName('Focus Session');
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

  return (
    <div className={`fixed inset-0 z-[150] text-white overflow-hidden overscroll-none select-none font-sans ${activeBackgroundMode === 'dusk' ? 'bg-[#0C101B]' : 'bg-[#0B1310]'}`}>
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
          <div className={`fixed left-0 right-0 px-6 flex items-center justify-between bg-[linear-gradient(135deg,#12261E,#0F2019)] border-b border-white/10 z-[130] relative overflow-hidden ${
              showHeaderTimer ? 'top-0 py-7 md:py-8' : 'top-0 py-4'
          }`}>
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
              <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">
                      <img 
                          src="https://static.wixstatic.com/media/e6bdc9_9e876e6d3ee44a9e860f83e8afc9774a~mv2.png/v1/fill/w_208,h_200,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Primary%20Logo%20in%20white%20no%20TEXT.png"
                          alt="BFHS Internal"
                          className={`w-full h-full object-cover scale-110 ${hasArtwork ? 'brightness-150 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : ''}`}
                      />
                  </div>
                  <div>
                      <div className={`text-[10px] uppercase font-bold tracking-widest ${hasArtwork ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]' : 'text-falcon-gold'}`}>BFHS Internal</div>
                      <div className={`text-sm font-bold ${hasArtwork ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]' : ''}`}>Focus</div>
                  </div>
                  <div className="hidden sm:block">
                      <div className={hasArtwork ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]' : ''}>
                          <DayTicker userProfile={userProfile} />
                      </div>
                  </div>
                  <div className="sm:hidden">
                      <div className={hasArtwork ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]' : ''}>
                          <DayTicker userProfile={userProfile} />
                      </div>
                  </div>
              </div>

              {showHeaderTimer && (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <div className="font-mono font-bold text-white tracking-tight text-2xl md:text-3xl">
                          {formatTime(secondsRemaining)}
                      </div>
                          <div className="mt-2 w-[200px] md:w-[260px] mx-auto">
                              <div className="relative rounded-full bg-white/15 overflow-hidden h-2.5">
                                  <div
                                      className="absolute inset-0 bg-emerald-400/90 origin-left transition-transform duration-300 ease-out"
                                      style={{ transform: `scaleX(${remainingRatio})` }}
                                  />
                              </div>
                          </div>
                  </div>
              )}

              <div className="flex items-center gap-3">
                  <button 
                     onClick={onExit} 
                     className={`text-xs font-bold uppercase tracking-wider transition-colors ${hasArtwork ? 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]' : 'text-gray-400 hover:text-white'}`}
                  >
                      Exit (ESC)
                  </button>
              </div>
          </div>

          {/* Scrollable Body */}
          <div className={`flex-1 min-h-0 overflow-hidden flex flex-col ${
              showHeaderTimer
                  ? 'pt-[120px] md:pt-[136px]'
                  : isAIExpanded
                  ? 'pt-[72px] md:pt-[80px]'
                  : 'pt-16 md:pt-[72px]'
          }`}>
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
                          className={`absolute inset-x-0 ${isMixesOpen ? 'top-[38%]' : 'top-[42%]'} -translate-y-1/2 z-[110] pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)] flex items-center justify-center`}
                      >
                          <div className="text-center">
                              <div className={`font-mono font-bold text-white tracking-tight ${
                                  'text-7xl sm:text-8xl md:text-9xl lg:text-[10rem]'
                              }`}>
                                  {formatTime(secondsRemaining)}
                              </div>
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
                          </div>
                      </div>
                  )}
                  <div className="w-full max-w-6xl flex flex-col flex-1">
                      <div className={`flex-1 flex ${isFocusMode ? 'items-start' : 'items-center'} justify-center transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)]`}>
                          <div className={`w-full max-w-3xl mx-auto ${isFocusMode ? 'pt-2' : ''}`}>
                              <div className={`flex flex-col items-center text-center ${isAIExpanded ? 'gap-3' : 'gap-4'}`}>
                                  {isFocusMode && (
                                      <div className={`font-extrabold text-white tracking-tight leading-none transition-transform duration-500 ${
                                          isAIExpanded
                                              ? 'text-4xl md:text-5xl lg:text-6xl -translate-y-12 md:-translate-y-16'
                                              : isFocusMode
                                              ? 'text-6xl md:text-7xl lg:text-8xl translate-y-0'
                                              : 'text-5xl md:text-6xl lg:text-7xl'
                                      }`}>
                                          {taskName || 'Focus Session'}
                                      </div>
                                  )}

                                  {(state === 'running' || state === 'paused') && !isAIExpanded && (
                                      <div className="flex flex-wrap items-center justify-center gap-3">
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
                                  )}

                                  {state === 'setup' ? (
                                      <div className="flex-1 w-full flex flex-col items-center justify-center">
                                          <div className="w-full max-w-2xl">
                                              <input 
                                                  ref={taskInputRef}
                                                  type="text" 
                                                  value={taskName}
                                                  onChange={(e) => setTaskName(e.target.value)}
                                                  onKeyDown={(e) => e.key === 'Enter' && state === 'setup' && startSession()}
                                                  placeholder="What are you working on?"
                                                  disabled={state !== 'setup'}
                                                  className="w-full bg-black/30 border border-white/10 rounded-full px-5 py-3 text-white placeholder-gray-500 focus:border-falcon-gold outline-none text-sm disabled:opacity-60"
                                              />
                                          </div>
                                          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                              <button
                                                  onClick={() => {
                                                      const next = !isCalmMode;
                                                      setIsCalmMode(next);
                                                      triggerSound(next ? 'enable' : 'disable');
                                                  }}
                                                  className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-transform active:scale-95 ${isCalmMode ? 'bg-white/10 border-white/20 text-white' : 'border-gray-700 text-gray-400'}`}
                                              >
                                                  Calm Mode
                                              </button>
                                              <button
                                                  onClick={() => {
                                                      const next = !isBreathingCueEnabled;
                                                      setIsBreathingCueEnabled(next);
                                                      triggerSound(next ? 'enable' : 'disable');
                                                  }}
                                                  className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-transform active:scale-95 ${isBreathingCueEnabled ? 'bg-white/10 border-white/20 text-white' : 'border-gray-700 text-gray-400'}`}
                                              >
                                                  Breathing Cue
                                              </button>
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
                                  ) : state === 'completed' ? null : isAIExpanded ? null : (
                                      <>
                                          <div className="flex flex-wrap items-center justify-center gap-2">
                                              <button
                                                  onClick={() => {
                                                      const next = !isCalmMode;
                                                      setIsCalmMode(next);
                                                      triggerSound(next ? 'enable' : 'disable');
                                                  }}
                                                  className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-transform active:scale-95 ${isCalmMode ? 'bg-white/10 border-white/20 text-white' : 'border-gray-700 text-gray-400'}`}
                                              >
                                                  Calm Mode
                                              </button>
                                              <button
                                                  onClick={() => {
                                                      const next = !isBreathingCueEnabled;
                                                      setIsBreathingCueEnabled(next);
                                                      triggerSound(next ? 'enable' : 'disable');
                                                  }}
                                                  className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-transform active:scale-95 ${isBreathingCueEnabled ? 'bg-white/10 border-white/20 text-white' : 'border-gray-700 text-gray-400'}`}
                                              >
                                                  Breathing Cue
                                              </button>
                                          </div>

                                          {isBreathingCueEnabled && state === 'running' && (
                                              <div className="text-[11px] uppercase tracking-[0.3em] text-white/70 animate-breathe">
                                                  Breathe In · Breathe Out
                                              </div>
                                          )}
                                          
                                      </>
                                  )}
                              </div>
                          </div>
                      </div>

                      {state === 'completed' ? (
                          <div className="absolute inset-0 z-[115] flex items-center justify-center px-4">
                              <div className="max-w-md w-full mx-auto animate-fade-in-up text-center">
                                  <div className="mb-8">
                                      <div className="text-6xl mb-4">🎉</div>
                                      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Session Complete</h2>
                                      <p className="text-gray-400">You focused for {formatTime(sessionTotalSeconds)}.</p>
                                  </div>

                                  {parkingLotItems.length > 0 && (
                                      <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-8 text-left">
                                          <h3 className="text-xs font-bold text-falcon-gold uppercase tracking-wider mb-4 flex items-center gap-2">
                                              <span>🧠</span> Parking Lot Items
                                          </h3>
                                          <ul className="space-y-3">
                                              {parkingLotItems.map((item, idx) => (
                                                  <li key={idx} className="flex justify-between items-start text-sm border-b border-white/5 pb-2 last:border-0">
                                                      <span className="text-gray-200">{item.text}</span>
                                                      <span className="text-gray-500 text-xs ml-4">{item.time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                  </li>
                                              ))}
                                          </ul>
                                      </div>
                                  )}

                                  <div className="flex justify-center gap-4">
                                      <button 
                                          onClick={() => { 
                                              setState('setup'); 
                                              setParkingLotItems([]); 
                                              triggerSound('enable');
                                          }}
                                          className="px-8 py-3 bg-falcon-green text-white font-bold rounded-lg hover:bg-[#1a382e] transition-colors"
                                      >
                                          New Session
                                      </button>
                                      <button 
                                          onClick={onExit}
                                          className="px-8 py-3 border border-white/10 text-gray-300 font-bold rounded-lg hover:bg-white/5 transition-colors"
                                      >
                                          Exit
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
                  <div className="mx-auto w-full max-w-5xl px-4 md:px-8 pointer-events-auto">
                      <div className={`overflow-hidden transition-[max-height,opacity,transform] duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)] ${isAIExpanded ? 'max-h-[45vh] opacity-100 translate-y-0' : 'max-h-0 opacity-0 translate-y-4'}`}>
                          <div ref={chatPanelRef} className="h-[40vh] min-h-[220px] rounded-3xl border border-white/10 bg-white/5 backdrop-blur-lg overflow-hidden shadow-[0_18px_40px_-30px_rgba(0,0,0,0.6)]">
                              <div className="relative h-full dark">
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
                          <SpotifyPlayer className="w-full" onArtworkChange={handleSpotifyArtworkChange} onMenuToggle={setIsMixesOpen} />
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
          .animate-focus-orb {
              animation: focusOrb 18s ease-in-out infinite;
          }
          .animate-focus-orb-slow {
              animation: focusOrbSlow 24s ease-in-out infinite;
          }
          .animate-breathe {
              animation: breathe 6s ease-in-out infinite;
          }
      `}</style>

    </div>
  );
};

export default FocusOverlay;
