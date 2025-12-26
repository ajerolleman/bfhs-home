import React from 'react';
import { UserProfile } from '../types';
import DailyPoll from './DailyPoll';
import VibeCheck from './VibeCheck';

interface CommunityOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile: UserProfile | null;
}

const CommunityOverlay: React.FC<CommunityOverlayProps> = ({ isOpen, onClose, userProfile }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed -inset-4 z-[200] flex flex-col bg-[#2c241b] animate-slide-down-homemade overflow-hidden font-sans">
            {/* Corkboard Texture Effect */}
            <div className="absolute inset-0 opacity-40 pointer-events-none" 
                 style={{ 
                     backgroundImage: `url("https://www.transparenttextures.com/patterns/cork-board.png")`,
                     filter: 'contrast(1.2)'
                 }} 
            />
            
            {/* Header - Tape Style */}
            <div className="relative z-10 pt-6 pb-2 px-6 flex justify-between items-start">
                <div className="transform -rotate-1 bg-[#f0e6d2] text-[#2c241b] px-6 py-3 shadow-lg border-2 border-[#d4c5a9] rounded-sm max-w-md relative">
                    {/* Tape Effect */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-[#e8dcc5] opacity-80 rotate-1 shadow-sm"></div>
                    
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter flex items-center gap-3 relative z-10">
                        <span className="text-3xl">📌</span>
                        The Falcon Board
                    </h2>
                </div>

                <button 
                    onClick={onClose}
                    className="w-12 h-12 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white flex items-center justify-center transition-all text-xl backdrop-blur-sm border-2 border-white/10"
                >
                    ✕
                </button>
            </div>

            {/* Content - Bulletin Layout */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 custom-scrollbar">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column (Welcome & Vibe) */}
                    <div className="lg:col-span-4 space-y-8 flex flex-col">
                        {/* Welcome Note - Sticky Note Style */}
                        <div className="bg-[#ffeb3b] p-6 shadow-[4px_4px_0px_rgba(0,0,0,0.2)] transform rotate-1 w-full relative">
                            {/* Pin */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-sm border border-black/10 z-20"></div>
                            <div className="font-medium font-handwriting text-lg leading-relaxed text-center font-bold text-[#5d4037]">
                                "Welcome to the Falcon Board! 🦅 Check here daily for updates, polls, and what's happening around campus."
                            </div>
                        </div>

                        {/* Vibe Check Widget */}
                        <div className="transform -rotate-2 hover:rotate-0 transition-transform duration-300">
                             <VibeCheck userProfile={userProfile} />
                        </div>
                    </div>

                    {/* Right Column (Poll - Main Feature) */}
                    <div className="lg:col-span-8">
                        <div className="bg-white p-2 shadow-xl transform rotate-1 relative transition-transform hover:rotate-0 duration-300">
                            {/* Tape corners */}
                            <div className="absolute -top-3 -left-3 w-16 h-6 bg-[#e8dcc5] opacity-90 rotate-[-45deg] shadow-sm z-20"></div>
                            <div className="absolute -top-3 -right-3 w-16 h-6 bg-[#e8dcc5] opacity-90 rotate-[45deg] shadow-sm z-20"></div>
                            
                            <div className="border-4 border-dashed border-gray-300 p-4 bg-[#fdfbf7]">
                                <DailyPoll userProfile={userProfile} />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CommunityOverlay;