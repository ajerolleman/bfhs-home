
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChatSession, UserProfile } from '../types';
import ChatPanel from './ChatPanel';
import AIQuickBar from './AIQuickBar';
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

type TimerState = 'setup' | 'commitment' | 'running' | 'paused' | 'completed';

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

    if (type === 'tick') {
        // Crisp mechanical tick
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.03);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    } else if (type === 'soft-tick') {
        // Very subtle tick for rotation
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    } else if (type === 'press') {
        // Satisfying button press
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    } else if (type === 'chime') {
        // Calm completion chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.exponentialRampToValueAtTime(880, now + 2);
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 4);
        
        // Harmonic
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(554.37, now); // C#5
        gain2.gain.setValueAtTime(0.0, now);
        gain2.gain.linearRampToValueAtTime(0.05, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 4);
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(now + 4);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(now + 4);
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
  
  // Settings & Data
  const [taskName, setTaskName] = useState('');
  const [distractionRule, setDistractionRule] = useState('write it in the Parking Lot and continue');
  const [parkingLotItems, setParkingLotItems] = useState<{text: string, time: Date}[]>([]);
  const [isCalmMode, setIsCalmMode] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [nextPeriod, setNextPeriod] = useState<{ name: string, minutes: number } | null>(null);
  
  // UI State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isParkingLotOpen, setIsParkingLotOpen] = useState(false);
  const [parkingInput, setParkingInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const dialRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef<number>(0);
  const lastMouseAngleRef = useRef<number>(0);
  const taskInputRef = useRef<HTMLInputElement>(null);
  const parkingInputRef = useRef<HTMLInputElement>(null);

  // --- Audio Init ---
  useEffect(() => {
      if (isActive && !audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      return () => {
          if (!isActive && audioCtxRef.current) {
              audioCtxRef.current.close();
              audioCtxRef.current = null;
          }
      };
  }, [isActive]);

  const triggerSound = (type: 'tick' | 'press' | 'chime' | 'soft-tick') => {
      if (isSoundEnabled && audioCtxRef.current) {
          playSound(type, audioCtxRef.current);
      }
  };

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
              if (isDrawerOpen) setIsDrawerOpen(false);
              else if (isParkingLotOpen) setIsParkingLotOpen(false);
              else onExit();
          }
          
          // Toggle Parking Lot
          if (e.key.toLowerCase() === 'd' && state === 'running' && !isDrawerOpen && !isParkingLotOpen) {
              e.preventDefault();
              setIsParkingLotOpen(true);
          }

          // Space to toggle pause
          if (e.key === ' ' && !isDrawerOpen && !isParkingLotOpen && document.activeElement?.tagName !== 'INPUT') {
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
  }, [isActive, state, isDrawerOpen, isParkingLotOpen, onExit]);

  // Focus input on state change
  useEffect(() => {
      if (state === 'commitment' && taskInputRef.current) {
          setTimeout(() => taskInputRef.current?.focus(), 100);
      }
      if (isParkingLotOpen && parkingInputRef.current) {
          setTimeout(() => parkingInputRef.current?.focus(), 100);
      }
  }, [state, isParkingLotOpen]);

  // --- Dial Physics ---
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (state !== 'setup') return;
      setIsDragging(true);
      
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      
      if (dialRef.current) {
          const rect = dialRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          lastMouseAngleRef.current = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
      }
  };

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
      if (!isDragging || state !== 'setup') return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      if (dialRef.current) {
          const rect = dialRef.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          
          const currentMouseAngle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
          let delta = currentMouseAngle - lastMouseAngleRef.current;
          
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;
          
          lastMouseAngleRef.current = currentMouseAngle;
          
          const sensitivity = 0.4;
          const minChange = delta * sensitivity;
          
          setMinutes(prev => {
              const next = Math.max(1, Math.min(180, prev + minChange));
              // Soft tick only on integer change
              if (Math.floor(next) !== Math.floor(prev)) triggerSound('soft-tick');
              return next;
          });
      }
  }, [isDragging, state]);

  const handleEnd = () => {
      setIsDragging(false);
      setMinutes(m => Math.round(m));
  };

  useEffect(() => {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
      return () => {
          window.removeEventListener('mousemove', handleMove);
          window.removeEventListener('mouseup', handleEnd);
          window.removeEventListener('touchmove', handleMove);
          window.removeEventListener('touchend', handleEnd);
      };
  }, [handleMove]);


  // --- Helper Functions ---
  const handleCommit = () => {
      if (!taskName.trim()) return;
      setSecondsRemaining(minutes * 60);
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

  // Generate SVG Arc for Time Timer effect
  const calculateArc = (percentage: number) => {
      // percentage 0 to 1
      const radius = 180; 
      const center = 200;
      // Start at top ( -90 deg)
      const startAngle = -90 * (Math.PI / 180);
      // End angle based on percentage (clockwise)
      const endAngle = startAngle + (percentage * 360) * (Math.PI / 180);

      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);

      // Flag for large arc (if > 180 deg)
      const largeArcFlag = percentage > 0.5 ? 1 : 0;

      // Move to center, Line to start, Arc to end, Close
      return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const dialPercentage = state === 'setup' 
      ? minutes / 60 // Visual: 60 mins = full circle
      : secondsRemaining / (minutes * 60);

  // Allow multi-turn visual in setup? Simplified: cap at 100% visual for setup > 60m
  const visualPercentage = state === 'setup' 
      ? Math.min(1, minutes / 60)
      : Math.max(0, secondsRemaining / (minutes * 60));

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-[#0B1220] text-white overflow-hidden select-none font-sans">
      
      {/* 1. Background (Calm Gradient + Vignette) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B1220] via-[#121c2e] to-[#0f1724] animate-pulse-slow opacity-60 pointer-events-none"></div>
      <div className="absolute inset-0 bg-noise opacity-[0.04] pointer-events-none mix-blend-overlay"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none"></div>

      {/* 2. Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
          <div className="flex items-center gap-4">
               {/* Sound Toggle */}
               <button 
                  onClick={() => setIsSoundEnabled(!isSoundEnabled)} 
                  className={`p-2 rounded-full transition-colors ${isSoundEnabled ? 'text-falcon-gold bg-white/5' : 'text-gray-500'}`}
                  title="Toggle Sounds"
               >
                  {isSoundEnabled ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                  ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                  )}
               </button>
               {/* Calm Mode Toggle */}
               {state === 'running' && (
                  <button 
                      onClick={() => setIsCalmMode(!isCalmMode)}
                      className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border ${isCalmMode ? 'bg-white/10 border-white/20 text-white' : 'border-gray-700 text-gray-500'}`}
                  >
                      {isCalmMode ? 'Calm Mode' : 'Detail Mode'}
                  </button>
               )}
          </div>

          {/* School Day Next Period Countdown (Only if valid) */}
          {nextPeriod && (state === 'running' || state === 'setup') && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center opacity-50 hover:opacity-100 transition-opacity">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-falcon-gold">Next Period</span>
                  <span className="text-sm font-mono text-white">{nextPeriod.name} in {nextPeriod.minutes}m</span>
              </div>
          )}

          <button 
             onClick={onExit} 
             className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
          >
              Exit (ESC)
          </button>
      </div>

      {/* 3. Main Center Stage */}
      <div className={`relative z-10 w-full h-full flex flex-col items-center justify-center transition-all duration-700 ${isDrawerOpen ? 'md:pr-96' : ''}`}>
          
          {/* COMMITMENT PHASE */}
          {state === 'commitment' && (
              <div className="w-full max-w-md space-y-8 animate-fade-in-up px-6 text-center">
                  <div>
                      <h2 className="text-3xl font-bold text-white mb-2 font-header tracking-wide">Ready to Focus?</h2>
                      <p className="text-gray-400">Set an intention for this {minutes} minute session.</p>
                  </div>
                  
                  <div className="space-y-4">
                      <div className="text-left">
                          <label className="block text-xs font-bold text-falcon-gold uppercase tracking-wider mb-2">I am working on...</label>
                          <input 
                              ref={taskInputRef}
                              type="text" 
                              value={taskName}
                              onChange={(e) => setTaskName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
                              placeholder="e.g., Biology Lab Report"
                              className="w-full bg-white/5 border-b-2 border-white/20 focus:border-falcon-gold text-2xl py-2 text-white placeholder-gray-600 outline-none transition-colors text-center"
                          />
                      </div>
                      <div className="text-left opacity-60 hover:opacity-100 transition-opacity">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">If I get distracted I will...</label>
                          <input 
                              type="text" 
                              value={distractionRule}
                              onChange={(e) => setDistractionRule(e.target.value)}
                              className="w-full bg-transparent border-b border-white/10 text-sm py-1 text-gray-300 focus:border-white/40 outline-none transition-colors"
                          />
                      </div>
                  </div>

                  <button 
                      onClick={handleCommit}
                      disabled={!taskName.trim()}
                      className="magnetic-btn mt-8 px-12 py-4 bg-falcon-green text-white font-bold rounded-full shadow-[0_0_20px_rgba(27,59,47,0.4)] hover:bg-[#234a3b] hover:scale-105 disabled:opacity-50 disabled:scale-100 transition-all"
                  >
                      Start Session
                  </button>
              </div>
          )}

          {/* TIMER / SETUP / RUNNING PHASE */}
          {(state === 'setup' || state === 'running' || state === 'paused') && (
              <div className="flex flex-col items-center">
                  
                  {/* Task Label (Running) */}
                  {state !== 'setup' && (
                      <div className="mb-8 text-center animate-fade-in">
                          <h3 className="text-xl font-bold text-white/90">{taskName}</h3>
                          <p className="text-xs text-falcon-gold font-bold uppercase tracking-widest mt-1">
                              {state === 'paused' ? 'SESSION PAUSED' : 'FOCUSING'}
                          </p>
                      </div>
                  )}

                  {/* 3D DIAL */}
                  <div 
                      ref={dialRef}
                      className={`relative w-[340px] h-[340px] md:w-[420px] md:h-[420px] rounded-full shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] select-none ${state === 'setup' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      onMouseDown={handleStart}
                      onTouchStart={handleStart}
                  >
                      {/* Outer Rim (Brushed Metal) */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 p-[2px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                          <div className="w-full h-full rounded-full bg-[#151b26] relative overflow-hidden">
                              
                              {/* Markers (Calmer: 12 hour marks only) */}
                              {Array.from({ length: 12 }).map((_, i) => (
                                  <div 
                                      key={i} 
                                      className="absolute top-0 left-1/2 w-[2px] h-[12px] bg-white/20 -ml-[1px] origin-[50%_210px]"
                                      style={{ transform: `rotate(${i * 30}deg) translateY(10px)` }}
                                  />
                              ))}

                              {/* Time Timer Wedge (SVG) */}
                              <svg className="absolute inset-0 w-full h-full rotate-0 pointer-events-none transform transition-all duration-500 ease-linear" viewBox="0 0 400 400">
                                  {/* Background Track */}
                                  <circle cx="200" cy="200" r="180" fill="#1a2230" />
                                  
                                  {/* Dynamic Wedge */}
                                  <path 
                                      d={calculateArc(visualPercentage)} 
                                      fill={state === 'setup' ? '#EAB308' : '#10B981'} 
                                      fillOpacity="0.8"
                                      style={{ filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.2))' }}
                                  />
                              </svg>

                              {/* Glass Cover */}
                              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                              
                              {/* Center Readout */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="text-center">
                                      <div className={`font-mono font-bold text-white tracking-tighter drop-shadow-md transition-all duration-300 ${state === 'setup' ? 'text-7xl' : 'text-6xl'}`}>
                                          {formatTime(state === 'setup' ? minutes * 60 : secondsRemaining)}
                                      </div>
                                      {state === 'setup' && (
                                          <div className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mt-2">Drag Dial</div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Controls */}
                  <div className="mt-12 h-16 flex items-center justify-center">
                      {state === 'setup' && (
                          <button 
                             onClick={() => setState('commitment')}
                             className="magnetic-btn px-10 py-3 bg-white text-black font-bold rounded-full hover:scale-105 hover:bg-falcon-gold transition-all shadow-lg"
                          >
                              Next
                          </button>
                      )}

                      {(state === 'running' || state === 'paused') && (
                          <div className="flex gap-4">
                              <button 
                                 onClick={() => {
                                     setState(state === 'running' ? 'paused' : 'running');
                                     triggerSound('press');
                                 }}
                                 className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white border border-white/10 transition-all"
                              >
                                  {state === 'running' ? (
                                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                                  ) : (
                                      <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                  )}
                              </button>
                              
                              <button 
                                  onClick={() => { setIsParkingLotOpen(true); triggerSound('press'); }}
                                  className="h-14 px-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center gap-2 text-sm font-bold transition-all"
                                  title="Press 'D'"
                              >
                                  <span>🧠</span> Parking Lot
                              </button>

                              {state === 'paused' && (
                                  <button 
                                     onClick={() => { setState('setup'); triggerSound('press'); }}
                                     className="h-14 px-6 rounded-full bg-red-500/20 text-red-200 hover:bg-red-500/30 border border-red-500/30 text-sm font-bold transition-all"
                                  >
                                      End
                                  </button>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* COMPLETED PHASE */}
          {state === 'completed' && (
              <div className="max-w-md w-full px-6 animate-fade-in-up">
                  <div className="text-center mb-8">
                      <div className="text-6xl mb-4">🎉</div>
                      <h2 className="text-3xl font-bold text-white mb-2">Session Complete</h2>
                      <p className="text-gray-400">You focused on "{taskName}" for {minutes} minutes.</p>
                  </div>

                  {/* Parking Lot Review */}
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

      {/* 5. PORTALED AI: Launcher & Drawer */}
      {/* This ensures AI UI is NEVER clipped by the Focus Overlay's overflow:hidden */}
      {createPortal(
          <div className="font-sans text-gray-900 dark:text-gray-100">
              {/* Launcher - Only show if drawer closed */}
              {!isDrawerOpen && isActive && (
                  <button 
                      onClick={() => { setIsDrawerOpen(true); triggerSound('press'); }}
                      className="fixed z-[99999] group flex items-center gap-2 bg-[#1B3B2F] hover:bg-[#152e24] text-white border border-white/10 shadow-2xl rounded-full pl-3 pr-5 py-3 transition-all transform hover:scale-105 active:scale-95"
                      style={{ 
                          right: 'max(24px, env(safe-area-inset-right) + 24px)', 
                          bottom: 'max(24px, env(safe-area-inset-bottom) + 24px)' 
                      }}
                  >
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">🦅</div>
                      <div className="text-left">
                          <div className="text-[10px] text-falcon-gold font-bold uppercase leading-none">Need Help?</div>
                          <div className="text-sm font-bold leading-none mt-0.5">Ask AI</div>
                      </div>
                  </button>
              )}

              {/* Drawer */}
              {isDrawerOpen && isActive && (
                  <>
                      {/* Backdrop */}
                      <div 
                          className="fixed inset-0 z-[99998] bg-black/20 backdrop-blur-[1px]" 
                          onClick={() => setIsDrawerOpen(false)}
                      />
                      
                      {/* Panel */}
                      <div className="fixed top-0 right-0 bottom-0 z-[99999] w-full md:w-[450px] bg-white dark:bg-gray-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-white/10 animate-slide-in-right">
                          <div className="p-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-black/20">
                              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                  <span>🦅</span> BFHS Help
                              </h3>
                              <button onClick={() => setIsDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2">✕</button>
                          </div>
                          
                          <div className="flex-1 overflow-hidden relative flex flex-col">
                              <ChatPanel 
                                  messages={currentSession?.messages || []}
                                  isLoading={isSending}
                                  userProfile={userProfile}
                                  onSignInRequest={onSignIn}
                              />
                          </div>

                          <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-black/20">
                              <AIQuickBar 
                                  onSearch={onSearch} 
                                  docked={true}
                                  onOpenChat={() => {}} // No-op
                              />
                          </div>
                      </div>
                  </>
              )}
          </div>,
          document.body
      )}

      {/* Keyframe Styles for Portal Animation (inline for simplicity in this context) */}
      <style>{`
          @keyframes slideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
          }
          .animate-slide-in-right {
              animation: slideInRight 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
          }
      `}</style>

    </div>
  );
};

export default FocusOverlay;
