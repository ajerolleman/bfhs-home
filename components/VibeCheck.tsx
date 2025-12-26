import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getVibeCheck, submitVibeCheck } from '../services/firebase';

interface VibeCheckProps {
    userProfile: UserProfile | null;
}

const getLabelForValue = (val: number) => {
    if (val <= 20) return { label: '😰 Stressed', color: '#ef9a9a' };
    if (val <= 40) return { label: '😐 Okay', color: '#e0e0e0' };
    if (val <= 60) return { label: '😴 Sleepy', color: '#90caf9' };
    if (val <= 80) return { label: '😊 Happy', color: '#fff59d' };
    return { label: '🔥 Hype', color: '#ffcc80' };
};

const VibeCheck: React.FC<VibeCheckProps> = ({ userProfile }) => {
    const [average, setAverage] = useState(50);
    const [count, setCount] = useState(0);
    const [hasVoted, setHasVoted] = useState(false);
    
    // Local voting state
    const [myValue, setMyValue] = useState(100); // Default to Hype
    const [isDragging, setIsDragging] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadVibes();
    }, [userProfile]);

    const loadVibes = async () => {
        setIsLoading(true);
        const data = await getVibeCheck(userProfile?.uid);
        if (data) {
            setAverage(data.average);
            setCount(data.count);
            setHasVoted(data.userVoted);
            if (data.userVote !== null && data.userVote !== undefined) {
                setMyValue(data.userVote);
            }
        }
        setIsLoading(false);
    };

    const handleSubmit = async () => {
        if (!userProfile) {
            setError("Sign in to check in!");
            return;
        }
        setIsSubmitting(true);
        try {
            await submitVibeCheck(myValue, userProfile.uid);
            setHasVoted(true);
            await loadVibes();
        } catch (e: any) {
            setError(typeof e === 'string' ? e : "Failed to save vibe.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="h-40 bg-white/10 animate-pulse rounded-sm"></div>;

    const currentLabel = getLabelForValue(myValue);
    const averageLabel = getLabelForValue(average);

    return (
        <div className="relative transform rotate-1 transition-transform hover:rotate-0 duration-300">
            {/* Sticky Note Effect */}
            <div className="bg-[#ffeb3b] p-6 shadow-[5px_5px_10px_rgba(0,0,0,0.2)] font-sans relative w-full max-w-sm mx-auto">
                {/* Pin */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-sm border border-black/10 z-20"></div>
                
                <h3 className="text-center font-black uppercase tracking-wider text-[#5d4037] mb-6 text-sm border-b-2 border-[#5d4037]/20 pb-2">
                    How are you feeling?
                </h3>

                {error && (
                    <div className="text-[10px] text-red-600 font-bold text-center mb-2 bg-red-100 p-1 rounded">
                        {error}
                    </div>
                )}

                {!hasVoted ? (
                    <div className="space-y-6">
                        {/* Dynamic Label Display */}
                        <div 
                            className="text-center transition-all duration-300 transform scale-100"
                            style={{ color: '#5d4037' }}
                        >
                            <div className="text-4xl mb-1 transition-all duration-200">{currentLabel.label.split(' ')[0]}</div>
                            <div className="text-lg font-bold uppercase tracking-widest">{currentLabel.label.split(' ')[1]}</div>
                        </div>

                        {/* Slider */}
                        <div className="relative h-8 flex items-center">
                            {/* Track */}
                            <div className="absolute w-full h-3 bg-white/50 rounded-full border border-[#5d4037]/20 overflow-hidden">
                                <div className="w-full h-full bg-gradient-to-r from-blue-300 via-yellow-200 to-orange-400 opacity-50"></div>
                            </div>
                            
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={myValue}
                                onChange={(e) => {
                                    setMyValue(parseInt(e.target.value));
                                    setIsDragging(true);
                                }}
                                onMouseUp={() => setIsDragging(false)}
                                onTouchEnd={() => setIsDragging(false)}
                                className="w-full h-8 opacity-0 z-20 cursor-pointer relative"
                            />

                            {/* Custom Thumb (Visual Only) */}
                            <div 
                                className="absolute h-6 w-6 bg-white border-2 border-[#5d4037] rounded-full shadow-md z-10 pointer-events-none transition-all duration-75 flex items-center justify-center"
                                style={{ left: `calc(${myValue}% - 12px)` }}
                            >
                                <div className="w-1.5 h-1.5 bg-[#5d4037] rounded-full"></div>
                            </div>
                        </div>

                        <button 
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full py-2 bg-[#5d4037] text-[#ffeb3b] font-black uppercase tracking-widest rounded-sm hover:bg-[#3e2b25] transition-colors shadow-sm disabled:opacity-50"
                        >
                            {isSubmitting ? "Saving..." : "Check In"}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        <div className="text-center">
                            <div className="text-xs font-bold text-[#5d4037]/60 uppercase tracking-widest mb-1">School Average</div>
                            <div className="text-3xl">{averageLabel.label.split(' ')[0]}</div>
                            <div className="text-sm font-bold text-[#5d4037]">{averageLabel.label.split(' ')[1]}</div>
                        </div>

                        {/* Result Line */}
                        <div className="relative h-12 flex items-center justify-center">
                             {/* Line */}
                             <div className="w-full h-1 bg-[#5d4037]/20 rounded-full relative">
                                 {/* Labels on ends */}
                                 <span className="absolute -left-1 top-3 text-[10px] text-[#5d4037]/50 font-bold">😰</span>
                                 <span className="absolute -right-1 top-3 text-[10px] text-[#5d4037]/50 font-bold">🔥</span>
                             </div>

                             {/* Average Dot */}
                             <div 
                                 className="absolute w-4 h-4 bg-[#5d4037] rounded-full shadow-lg border-2 border-white transition-all duration-1000 ease-out flex items-center justify-center group"
                                 style={{ left: `calc(${average}% - 8px)` }}
                             >
                                 {/* Tooltip */}
                                 <div className="absolute -top-8 bg-[#5d4037] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                     Avg: {Math.round(average)}
                                 </div>
                             </div>

                             {/* User Dot (Ghost) */}
                             {/* <div 
                                 className="absolute w-3 h-3 bg-white border-2 border-[#5d4037] rounded-full opacity-50"
                                 style={{ left: `calc(${myValue}% - 6px)` }}
                             ></div> */}
                        </div>

                        <div className="text-center">
                            <button 
                                onClick={() => setHasVoted(false)}
                                className="text-[10px] font-bold text-[#5d4037]/60 hover:text-[#5d4037] uppercase tracking-widest border-b border-transparent hover:border-[#5d4037]/40 transition-all"
                            >
                                Update my Check-in
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VibeCheck;