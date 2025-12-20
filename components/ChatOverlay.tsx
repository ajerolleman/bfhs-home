
import React, { useState, useEffect } from 'react';
import { ChatSession } from '../types';
import { getSessions, deleteSession } from '../services/chatHistoryService';

interface ChatOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    currentSession: ChatSession | null;
    onSwitchSession: (session: ChatSession) => void;
    onNewChat: () => void;
    topOffset: number;
    children: React.ReactNode; // Expects ChatPanel
    composer: React.ReactNode; // Expects AIQuickBar
}

const ChatOverlay: React.FC<ChatOverlayProps> = ({ 
    isOpen, 
    onClose, 
    currentSession, 
    onSwitchSession, 
    onNewChat,
    topOffset,
    children,
    composer
}) => {
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<ChatSession[]>([]);

    useEffect(() => {
        if (showHistory || isOpen) {
            setHistory(getSessions());
        }
    }, [showHistory, isOpen, currentSession]); 

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteSession(id);
        setHistory(prev => prev.filter(s => s.id !== id));
        if (currentSession?.id === id) {
            onNewChat();
        }
    };

    return (
        <div 
            style={{ top: topOffset, height: `calc(100vh - ${topOffset}px)` }}
            className={`fixed left-0 right-0 z-[100] flex flex-col ${
                isOpen 
                ? 'pointer-events-auto' 
                : 'pointer-events-none'
            }`}
        >
            {/* 1. Background Layer (Fades Independent of Content) */}
            <div className={`absolute inset-0 bg-[#F3F4F6] dark:bg-gray-900 transition-opacity duration-1000 ease-[cubic-bezier(0.2,0.9,0.2,1)] ${isOpen ? 'opacity-100' : 'opacity-0'}`} />

            {/* 2. Top Bar (Toolbar) */}
            {/* Added opacity transition to ensure it disappears completely when not active */}
            <div className={`shrink-0 h-14 bg-[#1B3B2F] text-white shadow-sm z-30 flex items-center justify-between px-4 md:px-6 relative transition-all duration-700 ease-[cubic-bezier(0.2,0.9,0.2,1)] ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
                <div className="flex items-center gap-3 flex-1">
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 group"
                        title="Back to Dashboard"
                    >
                        <svg className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        <span className="text-sm font-bold text-white/90 group-hover:text-white">Back to Dashboard</span>
                    </button>
                </div>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <h2 className="font-header text-lg tracking-wide">BFHS Chat</h2>
                </div>
                
                <div className="flex-1 flex justify-end">
                    <button 
                        onClick={() => setShowHistory(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="hidden sm:inline">History</span>
                    </button>
                </div>
            </div>

            {/* 3. Thread Area (Scrollable) */}
            {/* Added overflow-y-auto here so only this section scrolls */}
            <div className={`flex-1 relative min-h-0 flex flex-col z-10 overflow-y-auto transition-opacity duration-500 delay-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                {children}
            </div>

            {/* 4. Composer Area (Floats Up/Down) */}
            <div className={`shrink-0 z-40 relative transition-all duration-1000 ease-[cubic-bezier(0.2,0.9,0.2,1)] ${isOpen ? 'translate-y-0 opacity-100' : '-translate-y-[calc(100vh-350px)] opacity-0'}`}>
                {/* Gradient Fade only visible when open */}
                <div className={`absolute bottom-full left-0 right-0 h-12 bg-gradient-to-t from-[#F3F4F6] to-transparent dark:from-gray-900 pointer-events-none transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`}></div>
                <div className="bg-[#F3F4F6] dark:bg-gray-900 pb-6 pt-2 w-full flex justify-center">
                    {composer}
                </div>
            </div>

            {/* History Drawer */}
            <div className={`fixed inset-0 z-[110] transition-opacity duration-300 ${showHistory ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                 <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
                 <div 
                    className={`absolute top-0 right-0 bottom-0 w-80 bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col border-l border-gray-100 dark:border-white/5 ${
                        showHistory ? 'translate-x-0' : 'translate-x-full'
                    }`}
                 >
                    <div className="p-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-black/20 shrink-0">
                        <h3 className="font-bold text-gray-800 dark:text-white">Recent Chats</h3>
                        <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    
                    <div className="p-4 shrink-0">
                        <button 
                            onClick={() => {
                                onNewChat();
                                setShowHistory(false);
                            }}
                            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl text-gray-500 dark:text-gray-400 font-bold hover:border-falcon-green hover:text-falcon-green transition-all flex items-center justify-center gap-2"
                        >
                            <span>+</span> New Chat
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {history.length === 0 && (
                            <p className="text-center text-gray-400 text-sm py-10">No history yet.</p>
                        )}
                        {history.map(session => (
                            <div 
                                key={session.id}
                                onClick={() => {
                                    onSwitchSession(session);
                                    setShowHistory(false);
                                }}
                                className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                    currentSession?.id === session.id 
                                    ? 'bg-falcon-green/5 border-falcon-green/30' 
                                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-white/5 hover:border-gray-300'
                                }`}
                            >
                                <div className="min-w-0 flex-1">
                                    <h4 className={`text-sm font-bold truncate ${currentSession?.id === session.id ? 'text-falcon-green' : 'text-gray-700 dark:text-gray-200'}`}>
                                        {session.title || "Untitled Chat"}
                                    </h4>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        {new Date(session.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <button 
                                    onClick={(e) => handleDelete(e, session.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                    title="Delete Chat"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                 </div>
            </div>
        </div>
    );
};

export default ChatOverlay;
