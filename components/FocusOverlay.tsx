
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatSession, UserProfile } from '../types';
import ChatPanel from './ChatPanel';
import AIQuickBar from './AIQuickBar';
import SpotifyPlayer from './SpotifyPlayer';
import { BLOCK_SCHEDULE } from '../constants';

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

// --- Helper: Schedule Logic for Next Period ---
function getNextPeriodCountdown() {
    const now = new Date();
    const day = now.getDay();
    // School hours logic (approximate 8am - 3:30pm M-F)
    if (day === 0 || day === 6) return null; // Weekend
    
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startOfDay = 8 * 60 + 5; // 8:05 AM
    const endOfDay = 15 * 60 + 30; // 3:30 PM

    if (nowMinutes < startOfDay || nowMinutes > endOfDay) return null;

    // Find next period start
    for (const block of BLOCK_SCHEDULE) {
        const [startH, startM] = block.start.split(':').map(Number);
        const startTotal = startH * 60 + startM;
        
        if (startTotal > nowMinutes) {
            const diffMinutes = startTotal - nowMinutes;
            return { name: block.name, minutes: diffMinutes };
        }
    }
    return null;
}

// --- Sound Helper ---
const playSound = (type: 'tick' | 'press' | 'chime' | 'soft-tick', ctx: AudioContext) => {
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    const now = ctx.currentTime;

    let stopAt = now + 0.12;

    if (type === 'tick') {
        // Crisp mechanical tick
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.04);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0006, now + 0.04);
        stopAt = now + 0.08;
    } else if (type === 'soft-tick') {
        // Very subtle tick for rotation
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.05);
        stopAt = now + 0.08;
    } else if (type === 'press') {
        // Satisfying button press
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0006, now + 0.12);
        stopAt = now + 0.16;
    } else if (type === 'chime') {
        // Calm completion chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.exponentialRampToValueAtTime(880, now + 1.1);
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0006, now + 1.4);
        
        // Harmonic
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(554.37, now); // C#5
        gain2.gain.setValueAtTime(0.0, now);
        gain2.gain.linearRampToValueAtTime(0.045, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.0006, now + 1.4);
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(now + 1.5);
        stopAt = now + 1.5;
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
  const [minutes, setMinutes] = useState(25);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [sessionTotalSeconds, setSessionTotalSeconds] = useState(25 * 60);
  
  // Settings & Data
  const [taskName, setTaskName] = useState('');
  const [parkingLotItems, setParkingLotItems] = useState<{text: string, time: Date}[]>([]);
  const [isCalmMode, setIsCalmMode] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isAmbienceEnabled, setIsAmbienceEnabled] = useState(false);
  const [ambienceLevel, setAmbienceLevel] = useState(0.14);
  const [backgroundMode, setBackgroundMode] = useState<'calm' | 'forest' | 'dusk'>('calm');
  const [isBreathingCueEnabled, setIsBreathingCueEnabled] = useState(false);
  const [nextPeriod, setNextPeriod] = useState<{ name: string, minutes: number } | null>(null);
  
  // UI State
  const [isParkingLotOpen, setIsParkingLotOpen] = useState(false);
  const [parkingInput, setParkingInput] = useState('');
  const [isAIExpanded, setIsAIExpanded] = useState(false);
  
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

  const handleCollapseAI = () => {
      setIsAIExpanded(false);
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const triggerSound = (type: 'tick' | 'press' | 'chime' | 'soft-tick') => {
      if (isSoundEnabled && audioCtxRef.current) {
          playSound(type, audioCtxRef.current);
      }
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

  // --- Check Next Period ---
  useEffect(() => {
      if (!isActive) return;
      const checkNext = () => setNextPeriod(getNextPeriodCountdown());
      checkNext();
      const interval = setInterval(checkNext, 60000); // Check every min
      return () => clearInterval(interval);
  }, [isActive]);

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
                      triggerSound('chime');
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

  // --- Keyboard Shortcuts ---
  useEffect(() => {
      if (!isActive) return;
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
              if (isParkingLotOpen) setIsParkingLotOpen(false);
              else onExit();
          }
          
          // Toggle Parking Lot
          if (e.key.toLowerCase() === 'd' && state === 'running' && !isParkingLotOpen) {
              e.preventDefault();
              setIsParkingLotOpen(true);
          }

          // Space to toggle pause
          const activeTag = document.activeElement?.tagName;
          if (e.key === ' ' && !isParkingLotOpen && activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
              e.preventDefault();
              if (state === 'running') {
                  setState('paused');
                  triggerSound('press');
              } else if (state === 'paused') {
                  setState('running');
                  triggerSound('press');
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, state, isParkingLotOpen, onExit]);

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
      triggerSound('press');
  };

  const addParkingItem = () => {
      if (!parkingInput.trim()) return;
      setParkingLotItems(prev => [...prev, { text: parkingInput, time: new Date() }]);
      setParkingInput('');
      setIsParkingLotOpen(false);
      triggerSound('press');
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
  const setupProgress = setupTotalSeconds / maxTotalSeconds;
  const runningProgress = sessionTotalSeconds
      ? Math.max(0, Math.min(1, 1 - secondsRemaining / sessionTotalSeconds))
      : 0;

  if (!isActive) return null;

  return (
    <div className={`fixed inset-0 z-[150] text-white overflow-hidden select-none font-sans ${backgroundMode === 'dusk' ? 'bg-[#0C101B]' : 'bg-[#0B1310]'}`}>
      {/* Background */}
      <div className={`absolute inset-0 ${
          backgroundMode === 'forest'
              ? 'bg-gradient-to-br from-[#07140F] via-[#0E231A] to-[#091611]'
              : backgroundMode === 'dusk'
              ? 'bg-gradient-to-br from-[#0B1120] via-[#0F182A] to-[#0C111D]'
              : 'bg-gradient-to-br from-[#0B1310] via-[#0F1C18] to-[#0B1310]'
      }`} />
      <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none mix-blend-overlay"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_55%)] pointer-events-none"></div>
      <div className="absolute -top-32 -left-16 w-[520px] h-[520px] bg-falcon-green/20 rounded-full blur-[160px] animate-focus-orb-slow"></div>
      <div className="absolute bottom-[-25%] right-[-10%] w-[620px] h-[620px] bg-falcon-gold/10 rounded-full blur-[180px] animate-focus-orb"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.45)_100%)] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col h-full animate-fade-in">
          {/* Focus Header */}
          <div className="w-full px-6 py-4 flex items-center justify-between bg-[linear-gradient(135deg,#12261E,#0F2019)] border-b border-white/10">
              <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                      <img 
                          src="https://static.wixstatic.com/media/e6bdc9_9e876e6d3ee44a9e860f83e8afc9774a~mv2.png/v1/fill/w_208,h_200,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Primary%20Logo%20in%20white%20no%20TEXT.png"
                          alt="BFHS Internal"
                          className="w-5 h-5 object-contain"
                      />
                  </div>
                  <div>
                      <div className="text-[10px] uppercase font-bold tracking-widest text-falcon-gold">BFHS Internal</div>
                      <div className="text-sm font-bold">Focus Studio</div>
                  </div>
              </div>

              {nextPeriod && (state === 'running' || state === 'setup') && (
                  <div className="hidden md:flex flex-col items-center text-xs text-white/70">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-falcon-gold">Next Period</span>
                      <span className="font-mono">{nextPeriod.name} in {nextPeriod.minutes}m</span>
                  </div>
              )}

              <div className="flex items-center gap-3">
                  <button 
                     onClick={onExit} 
                     className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
                  >
                      Exit (ESC)
                  </button>
              </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth pb-56">
              <div ref={topRef} className="h-0 w-full" />
              {/* Main Content */}
              <div className="flex flex-col items-center px-4 md:px-8 pt-6 pb-10">
                  <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 items-center lg:items-start">
                      {/* Timer Card */}
                      <div className="w-full lg:w-[55%] rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.7)]">
                      <div className="flex items-center justify-between mb-6">
                          <span className="text-xs font-bold uppercase tracking-widest text-falcon-gold">Focus Timer</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                              {state === 'running' ? 'In Session' : state === 'paused' ? 'Paused' : state === 'completed' ? 'Complete' : 'Ready'}
                          </span>
                      </div>

                      {(state === 'setup' || state === 'running' || state === 'paused') && (
                          <div className="flex flex-col items-center">
                              {state !== 'setup' && (
                                  <div className="mb-6 text-center">
                                      <h3 className="text-xl font-bold text-white/90">{taskName || 'Focus Session'}</h3>
                                      <p className="text-xs text-falcon-gold font-bold uppercase tracking-widest mt-1">
                                          {state === 'paused' ? 'Session Paused' : 'Focusing'}
                                      </p>
                                  </div>
                              )}

                              <div className="w-full max-w-xl">
                                  <div className="text-center">
                                      <div className={`font-mono font-bold text-white tracking-tighter drop-shadow-md transition-all duration-300 ${state === 'setup' ? 'text-6xl' : 'text-5xl'}`}>
                                          {formatTime(state === 'setup' ? setupTotalSeconds : secondsRemaining)}
                                      </div>
                                      <div className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mt-2">
                                          {state === 'setup' ? 'Set your focus duration' : 'Stay steady'}
                                      </div>
                                  </div>

                                  <div className="mt-6">
                                      <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
                                          <div
                                              className={`absolute inset-y-0 left-0 ${state === 'setup' ? 'bg-falcon-gold/90' : 'bg-emerald-400/90'} transition-[width] duration-500 ease-out`}
                                              style={{ width: `${(state === 'setup' ? setupProgress : runningProgress) * 100}%` }}
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none"></div>
                                      </div>

                                      {state === 'setup' && (
                                          <div className="mt-4">
                                              <input
                                                  type="range"
                                                  min="60"
                                                  max="3599"
                                                  step="5"
                                                  value={setupTotalSeconds}
                                                  onChange={(e) => setMinutes(Number(e.target.value) / 60)}
                                                  className="w-full accent-falcon-gold"
                                              />
                                              <div className="mt-2 flex justify-between text-[10px] text-white/50 uppercase tracking-[0.2em]">
                                                  <span>1:00</span>
                                                  <span>59:59</span>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              </div>

                              {isBreathingCueEnabled && state === 'running' && (
                                  <div className="mt-4 text-[11px] uppercase tracking-[0.3em] text-white/70 animate-breathe">
                                      Breathe In · Breathe Out
                                  </div>
                              )}

                              <div className="mt-8 h-14 flex items-center justify-center">
                                  {state === 'setup' && (
                                      <button 
                                         onClick={startSession}
                                         className="magnetic-btn px-10 py-3 bg-white text-black font-bold rounded-full hover:scale-105 hover:bg-falcon-gold transition-all shadow-lg"
                                      >
                                          Start Focus
                                      </button>
                                  )}

                                  {(state === 'running' || state === 'paused') && (
                                      <div className="flex gap-4">
                                          <button 
                                             onClick={() => {
                                                 setState(state === 'running' ? 'paused' : 'running');
                                                 triggerSound('press');
                                             }}
                                             className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white border border-white/10 transition-all"
                                          >
                                              {state === 'running' ? (
                                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                                              ) : (
                                                  <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                              )}
                                          </button>
                                          
                                          <button 
                                              onClick={() => { setIsParkingLotOpen(true); triggerSound('press'); }}
                                              className="h-12 px-5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center gap-2 text-xs font-bold transition-all"
                                              title="Press 'D'"
                                          >
                                              <span>🧠</span> Capture Distraction
                                          </button>

                                          {state === 'paused' && (
                                              <button 
                                                 onClick={() => { setState('setup'); triggerSound('press'); }}
                                                 className="h-12 px-5 rounded-full bg-red-500/20 text-red-200 hover:bg-red-500/30 border border-red-500/30 text-xs font-bold transition-all"
                                              >
                                                  End
                                              </button>
                                          )}
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}

                      {state === 'completed' && (
                          <div className="max-w-md w-full mx-auto animate-fade-in-up">
                              <div className="text-center mb-8">
                                  <div className="text-5xl mb-4">🎉</div>
                                  <h2 className="text-2xl font-bold text-white mb-2">Session Complete</h2>
                                  <p className="text-gray-400">You focused on "{taskName}" for {formatTime(sessionTotalSeconds)}.</p>
                              </div>

                              {parkingLotItems.length > 0 && (
                                  <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-8">
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
                                          triggerSound('press');
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
                      )}
                      </div>

                      {/* Session Controls */}
                      <div className="w-full lg:w-[45%]">
                          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-5 space-y-4">
                              <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold uppercase tracking-widest text-falcon-gold">Session</span>
                                  <span className="text-[10px] text-white/60">{formatTime(setupTotalSeconds)}</span>
                              </div>
                              <input 
                                  ref={taskInputRef}
                                  type="text" 
                                  value={taskName}
                                  onChange={(e) => setTaskName(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && state === 'setup' && startSession()}
                                  placeholder="What are you working on?"
                                  disabled={state !== 'setup'}
                                  className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:border-falcon-gold outline-none text-sm disabled:opacity-60"
                              />

                              <div className="grid grid-cols-2 gap-2">
                                  <button
                                      onClick={() => { setIsCalmMode(!isCalmMode); triggerSound('press'); }}
                                      className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border ${isCalmMode ? 'bg-white/10 border-white/20 text-white' : 'border-gray-700 text-gray-400'}`}
                                  >
                                      Calm Mode
                                  </button>
                                  <button
                                      onClick={() => { setIsBreathingCueEnabled(!isBreathingCueEnabled); triggerSound('press'); }}
                                      className={`px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border ${isBreathingCueEnabled ? 'bg-white/10 border-white/20 text-white' : 'border-gray-700 text-gray-400'}`}
                                  >
                                      Breathing Cue
                                  </button>
                              </div>

                              <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                      <span className="text-xs text-white/70">Sound Effects</span>
                                      <button
                                          onClick={() => { 
                                              if (!isSoundEnabled && audioCtxRef.current) playSound('press', audioCtxRef.current);
                                              setIsSoundEnabled(!isSoundEnabled);
                                          }}
                                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${isSoundEnabled ? 'border-falcon-gold/40 text-falcon-gold bg-white/5' : 'border-white/10 text-gray-400'}`}
                                      >
                                          {isSoundEnabled ? 'On' : 'Off'}
                                      </button>
                                  </div>
                                  <div className="flex items-center justify-between">
                                      <span className="text-xs text-white/70">Cafe Ambience</span>
                                      <button
                                          onClick={() => { setIsAmbienceEnabled(!isAmbienceEnabled); triggerSound('press'); }}
                                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${isAmbienceEnabled ? 'border-falcon-gold/40 text-falcon-gold bg-white/5' : 'border-white/10 text-gray-400'}`}
                                      >
                                          {isAmbienceEnabled ? 'On' : 'Off'}
                                      </button>
                                  </div>
                                  <input 
                                      type="range" 
                                      min="0" 
                                      max="0.3" 
                                      step="0.01"
                                      value={ambienceLevel}
                                      onChange={(e) => setAmbienceLevel(Number(e.target.value))}
                                      className="w-full accent-falcon-gold"
                                  />
                              </div>

                              <div>
                                  <span className="text-xs text-white/70">Background</span>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                      {(['calm', 'forest', 'dusk'] as const).map((mode) => (
                                          <button
                                              key={mode}
                                              onClick={() => { setBackgroundMode(mode); triggerSound('press'); }}
                                              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                                                  backgroundMode === mode ? 'border-falcon-gold/40 text-falcon-gold bg-white/5' : 'border-white/10 text-gray-400'
                                              }`}
                                          >
                                              {mode}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                              <p className="text-[11px] text-white/60">Timebox + single-tasking keeps focus steady.</p>
                          </div>
                      </div>
                  </div>
              </div>

          </div>

          {/* AI Dock */}
          <div ref={aiDockRef} className="fixed bottom-0 left-0 right-0 pb-6 pt-3 z-30">
              <div className="bg-gradient-to-t from-[#0B1310]/95 via-[#0B1310]/80 to-transparent backdrop-blur-xl">
                  <div className="mx-auto w-full max-w-5xl px-4 md:px-8">
                      <div className={`overflow-hidden transition-[max-height,opacity,transform] duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)] ${isAIExpanded ? 'max-h-[45vh] opacity-100 translate-y-0 pointer-events-auto' : 'max-h-0 opacity-0 translate-y-4 pointer-events-none'}`}>
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

                  <div className="mt-4 flex justify-center px-4 md:px-8">
                      <div className="w-full max-w-2xl">
                          <SpotifyPlayer className="w-full" />
                      </div>
                  </div>

                  <div className="mt-4 px-4 md:px-8">
                      <AIQuickBar 
                          onSearch={onSearch}
                          onOpenChat={() => {}}
                          onExpandChange={(expanded) => {
                              if (expanded) setIsAIExpanded(true);
                          }}
                          hideChips={true}
                      />
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
