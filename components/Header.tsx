
import React from 'react';
import DayTicker from './DayTicker';
import { UserProfile } from '../types';

interface HeaderProps {
  onOpenChat: () => void;
  onOpenProfile?: () => void;
  userProfile?: UserProfile | null;
  currentUser?: any;
  compact?: boolean;
  isFocusMode?: boolean;
  onToggleFocus?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onOpenChat, 
    onOpenProfile, 
    userProfile, 
    currentUser, 
    compact,
    isFocusMode,
    onToggleFocus
}) => {
  return (
    <header className={`w-full bg-gradient-to-b from-[#1B3B2F] to-[#163127] text-white relative shadow-md z-10 transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${compact ? 'pb-1 pt-1' : 'pb-2 pt-2'}`}>
      {/* Top utility bar */}
      <div className={`container mx-auto px-4 mb-0 flex flex-col md:flex-row justify-between items-center text-xs md:text-sm text-white/90 font-medium tracking-wide gap-1 transition-all duration-700 ${compact ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
        
        {/* Left: Ticker & Status */}
        <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center space-x-2 opacity-80 hover:opacity-100 transition-opacity duration-150 cursor-default">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <span className="hidden sm:inline">BFHS Internal</span>
            </div>
            <div className="hidden sm:block">
               <DayTicker userProfile={userProfile} />
            </div>
             {/* Mobile Ticker */}
             <div className="sm:hidden">
               <DayTicker userProfile={userProfile} />
            </div>
        </div>
        
        {/* Right: Controls */}
        <div className="flex items-center space-x-2 shrink-0">
            {/* Focus Mode Pill Button */}
            {onToggleFocus && (
                <button
                    onClick={onToggleFocus}
                    className="group relative flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 overflow-hidden"
                    title="Enter Focus Mode"
                >
                    <div className="absolute inset-0 bg-falcon-gold/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <div className="w-2 h-2 rounded-full bg-falcon-gold shadow-[0_0_8px_rgba(234,179,8,0.8)] animate-pulse"></div>
                    <span className="relative text-xs font-bold uppercase tracking-wider text-white group-hover:text-falcon-gold transition-colors">Focus</span>
                </button>
            )}

            {/* Profile Button */}
            {onOpenProfile && (
                <button
                    onClick={onOpenProfile}
                    className="px-3 py-1.5 rounded-lg hover:bg-white/10 text-white/90 hover:text-falcon-gold transition-colors flex items-center gap-2 max-w-[200px]"
                    title={currentUser?.email || "User Settings"}
                >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    {currentUser?.email ? (
                        <span className="hidden lg:inline text-xs font-bold truncate">{currentUser.email}</span>
                    ) : (
                        <span className="hidden lg:inline text-xs font-bold uppercase">Sign In</span>
                    )}
                </button>
            )}
            
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSdqb4Qwep579plBAVDWiAH8MlqTiUgso1vjhoRPJEEfd-_DUA/viewform?authuser=0" target="_blank" rel="noreferrer" className="hidden lg:inline hover:text-falcon-gold transition-colors duration-150 text-xs ml-2">Defer Test?</a>
        </div>
      </div>

      {/* Main Logo Area */}
      <div className={`container mx-auto px-4 flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] overflow-hidden ${compact ? 'pb-0' : 'pb-1'} ${compact ? 'max-h-16' : 'max-h-60'}`}>
        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4">
            {/* Logo */}
            <div className={`shrink-0 flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${compact ? 'w-12 h-12 md:w-16 md:h-16' : 'w-40 h-40 md:w-85 md:h-85'}`}>
                <img 
                    src="https://static.wixstatic.com/media/e6bdc9_9e876e6d3ee44a9e860f83e8afc9774a~mv2.png/v1/fill/w_208,h_200,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Primary%20Logo%20in%20white%20no%20TEXT.png" 
                    alt="Benjamin Franklin High School Official Logo" 
                    className="w-full h-full object-contain drop-shadow-md"
                />
            </div>

            <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <h1 className={`font-header font-bold uppercase tracking-tighter leading-[0.9] transform scale-y-110 text-white transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${compact ? 'text-xl md:text-3xl' : 'text-3xl md:text-7xl'}`}>
                    Benjamin Franklin <br/> High School
                </h1>
                {/* Visible Divider Line (Falcon Gold) - Tighter Spacing */}
                <div className={`w-2/3 h-1 bg-falcon-gold rounded-full shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all duration-700 ${compact ? 'mt-0.5 mb-0.5' : 'mt-1 mb-1'}`}></div>
                <h2 className={`font-header font-medium uppercase tracking-[0.2em] text-white/90 transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${compact ? 'text-[0.6rem] md:text-xs' : 'text-sm md:text-2xl'}`}>
                    Katherine Johnson Campus
                </h2>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
