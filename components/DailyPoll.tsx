import React, { useState, useEffect } from 'react';
import { Poll, UserProfile } from '../types';
import { getActivePoll, voteInPoll, createPoll, deactivateAllPolls } from '../services/firebase';

interface DailyPollProps {
    userProfile: UserProfile | null;
}

const DailyPoll: React.FC<DailyPollProps> = ({ userProfile }) => {
    const [poll, setPoll] = useState<Poll | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isVoting, setIsVoting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [justVotedId, setJustVotedId] = useState<string | null>(null);

    // Admin State
    const [showAdmin, setShowAdmin] = useState(false);
    const [newQuestion, setNewQuestion] = useState('');
    const [newOptions, setNewOptions] = useState(['', '', '', '']);

    const isAdmin = userProfile?.email === 'ajerolleman1@gmail.com';

    useEffect(() => {
        loadPoll();
    }, [userProfile]);

    const loadPoll = async () => {
        setIsLoading(true);
        try {
            const active = await getActivePoll(userProfile?.uid);
            setPoll(active);
        } catch (e) {
            console.error("Poll load error:", e);
            // Don't show error to user, just show empty state
        }
        setIsLoading(false);
    };

    const handleVote = async (optionId: string) => {
        if (!userProfile) {
            setError("Sign in to vote!");
            return;
        }
        if (!poll) return;

        setIsVoting(true);
        setError(null);
        try {
            await voteInPoll(poll.id, optionId, userProfile.uid);
            setJustVotedId(optionId);
            await loadPoll();
        } catch (e: any) {
            setError(typeof e === 'string' ? e : "Failed to submit vote.");
        } finally {
            setIsVoting(false);
        }
    };

    const handleCreatePoll = async () => {
        const validOptions = newOptions.filter(o => o.trim().length > 0);
        if (!newQuestion.trim() || validOptions.length < 2) {
            alert("Please enter a question and at least 2 options.");
            return;
        }
        
        setIsLoading(true);
        try {
            await createPoll(newQuestion, validOptions);
            setShowAdmin(false);
            setNewQuestion('');
            setNewOptions(['', '', '', '']);
            await loadPoll();
        } catch (e) {
            alert("Error creating poll.");
        }
    };

    const handleEndPoll = async () => {
        if (!confirm("Are you sure you want to end the current poll?")) return;
        setIsLoading(true);
        await deactivateAllPolls();
        await loadPoll();
    };

    const updateOption = (idx: number, val: string) => {
        const arr = [...newOptions];
        arr[idx] = val;
        setNewOptions(arr);
    };

    if (isLoading) {
        return (
            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 animate-pulse">
                <div className="h-4 w-32 bg-white/10 rounded mb-4"></div>
                <div className="h-8 w-3/4 bg-white/10 rounded mb-6"></div>
                <div className="space-y-3">
                    <div className="h-10 w-full bg-white/5 rounded-xl"></div>
                    <div className="h-10 w-full bg-white/5 rounded-xl"></div>
                </div>
            </div>
        );
    }

    if (isAdmin && showAdmin) {
        return (
             <div className="w-full bg-[#1A1F2E] border border-indigo-500/50 rounded-2xl p-6 relative">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-indigo-400 font-black uppercase tracking-widest text-xs">Admin: Create Poll</h3>
                    <button onClick={() => setShowAdmin(false)} className="text-gray-400 hover:text-white text-xs">Cancel</button>
                 </div>
                 
                 <div className="space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-gray-500 mb-1">Question</label>
                         <input 
                             type="text" 
                             value={newQuestion}
                             onChange={e => setNewQuestion(e.target.value)}
                             className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                             placeholder="e.g. Best Lunch?"
                         />
                     </div>
                     
                     <div className="space-y-2">
                        <label className="block text-xs font-bold text-gray-500">Options</label>
                        {newOptions.map((opt, idx) => (
                            <input 
                                key={idx}
                                type="text"
                                value={opt}
                                onChange={e => updateOption(idx, e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-indigo-500 outline-none"
                                placeholder={`Option ${idx + 1}`}
                            />
                        ))}
                     </div>

                     <button 
                        onClick={handleCreatePoll}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg uppercase tracking-wider text-sm transition-all shadow-lg shadow-indigo-500/20"
                     >
                         Launch Poll
                     </button>
                 </div>
             </div>
        );
    }

    if (!poll) {
        return (
            <div className="w-full bg-[#fdfbf7] border-2 border-[#e3d7bf] rounded-lg p-8 text-center flex flex-col items-center justify-center min-h-[200px] shadow-inner">
                <div className="w-12 h-12 bg-[#f0e6d2] rounded-full flex items-center justify-center mb-4 text-2xl border border-[#d4c5a9]">
                    📊
                </div>
                <h3 className="text-[#2c241b] font-bold text-lg mb-1 font-serif">The Daily Pulse</h3>
                <p className="text-[#5c4b37] text-sm mb-6 italic">No active poll right now. Check back later!</p>
                {isAdmin && (
                    <button 
                        onClick={() => setShowAdmin(true)}
                        className="px-6 py-2 bg-[#2c241b] hover:bg-black text-[#fdfbf7] rounded-sm text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all border border-black"
                    >
                        + Create New Poll
                    </button>
                )}
            </div>
        );
    }

    const hasVoted = Boolean(poll.userVotedOptionId || justVotedId);
    const totalVotes = poll.totalVotes || 0;

    return (
        <div className="w-full bg-[#fdfbf7] shadow-sm relative group font-sans">
            {/* Paper Texture Overlay */}
            <div className="absolute inset-0 opacity-50 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }}></div>
            
            <div className="p-6 md:p-8 relative z-10">
                <div className="flex justify-between items-start mb-6 border-b-2 border-[#2c241b] pb-4 border-dashed">
                    <div>
                        <h3 className="flex items-center gap-2 text-[#8b4513] font-black uppercase tracking-widest text-[10px]">
                            <span className="text-lg">📌</span>
                            The Daily Pulse
                        </h3>
                        <h2 className="text-xl md:text-3xl font-black text-[#2c241b] mt-2 leading-tight font-serif">
                            {poll.question}
                        </h2>
                    </div>
                    <div className="text-right">
                         {isAdmin && (
                            <div className="mb-2 flex gap-2 justify-end">
                                <button onClick={() => setShowAdmin(true)} className="text-[10px] bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-black border border-gray-400">New</button>
                                <button onClick={handleEndPoll} className="text-[10px] bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded border border-red-300">End</button>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-sm text-red-800 text-xs text-center font-bold">
                        {error}
                    </div>
                )}

                <div className="space-y-3">
                    {!hasVoted ? (
                        // Voting View
                        poll.options.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => handleVote(opt.id)}
                                disabled={isVoting}
                                className="w-full text-left p-4 md:p-5 rounded-sm bg-white hover:bg-[#f8f5f0] border-2 border-[#e3d7bf] hover:border-[#2c241b] transition-all duration-200 group/btn relative overflow-hidden flex items-center justify-between shadow-sm hover:shadow-md"
                            >
                                <span className="relative z-10 text-[#2c241b] font-bold group-hover/btn:text-black transition-colors text-sm md:text-base font-serif">
                                    <span className="w-4 h-4 inline-block border-2 border-[#2c241b] rounded-full mr-3 align-middle opacity-50 group-hover/btn:opacity-100 group-hover/btn:bg-[#2c241b]"></span>
                                    {opt.text}
                                </span>
                            </button>
                        ))
                    ) : (
                        // Results View
                        poll.options.map((opt) => {
                            const percent = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                            const isWinner = Math.max(...poll.options.map(o => o.votes)) === opt.votes && totalVotes > 0;
                            const isMyChoice = opt.id === justVotedId; 

                            return (
                                <div key={opt.id} className="relative w-full h-14 bg-white/50 rounded-sm overflow-hidden border-2 border-[#e3d7bf]">
                                    {/* Highlighter Effect */}
                                    <div 
                                        className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out border-r-2 ${
                                            isWinner ? 'bg-[#fff59d] border-[#fdd835]' : 'bg-[#e0e0e0] border-[#bdbdbd]'
                                        }`}
                                        style={{ width: `${percent}%`, opacity: 0.7 }}
                                    ></div>
                                    
                                    {/* Text Content */}
                                    <div className="absolute inset-0 flex justify-between items-center px-5">
                                        <span className={`font-bold text-sm md:text-base text-[#2c241b] flex items-center gap-3 relative z-10 font-serif`}>
                                            {opt.text}
                                            {isWinner && <span className="text-sm">👑</span>}
                                            {isMyChoice && <span className="text-[9px] bg-[#2c241b] text-white px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-black transform -rotate-2">You</span>}
                                        </span>
                                        <span className="font-mono text-sm font-bold text-[#2c241b] relative z-10">{percent}%</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            
            {/* Footer */}
            {hasVoted && (
                 <div className="px-6 py-3 bg-[#f0e6d2] border-t-2 border-[#e3d7bf] border-dashed flex justify-between items-center text-[10px] text-[#5c4b37] uppercase tracking-wider font-bold">
                    <span>Thanks for voting!</span>
                    <span className="opacity-50">Vote recorded</span>
                </div>
            )}
        </div>
    );
};

export default DailyPoll;