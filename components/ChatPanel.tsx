
import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, UserProfile } from '../types';
import ReactMarkdown from 'react-markdown';

interface ChatPanelProps {
    messages: ChatMessage[];
    isLoading: boolean;
    userProfile?: UserProfile | null;
    onSignInRequest?: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
    messages, 
    isLoading, 
    userProfile,
    onSignInRequest
}) => {
    // Map to hold refs for each message
    const messageRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    // Track the last message ID to detect when a NEW message arrives
    const lastMessageIdRef = useRef<string | null>(null);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior
            });
        }
    };

    const scrollToMessage = (msgId: string) => {
        const element = messageRefs.current[msgId];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Auto-scroll logic
    useEffect(() => {
        if (messages.length === 0) return;

        const lastMsg = messages[messages.length - 1];
        
        // If this is a distinct new message (new ID), scroll to its TOP
        if (lastMsg.id !== lastMessageIdRef.current) {
            lastMessageIdRef.current = lastMsg.id;
            // Short timeout to ensure render
            setTimeout(() => {
                scrollToMessage(lastMsg.id);
            }, 100);
        }
    }, [messages, isLoading]);

    // Track scroll for "Back to bottom" button
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // Show button if we are more than 300px from bottom
            setShowScrollButton(scrollHeight - scrollTop - clientHeight > 300);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    if (!userProfile && onSignInRequest && messages.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-3xl">
                    🔒
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Access Restricted</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-8 leading-relaxed max-w-md">
                    You must be signed in with your BFHS Google account to access BFHS Help and save your chat history.
                </p>
                <button 
                    onClick={onSignInRequest}
                    className="magnetic-btn px-8 py-3 bg-falcon-green dark:bg-falcon-gold dark:text-black text-white rounded-lg font-bold hover:bg-falcon-dark dark:hover:bg-yellow-400 transition-all shadow-md flex items-center justify-center gap-2 group"
                >
                    <span>Sign In with Google</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </button>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto w-full scroll-smooth">
            {/* Content Column: Max-width constraint for readability */}
            <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-8 min-h-full">
                
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[50vh] opacity-50">
                        <span className="text-6xl mb-4 grayscale opacity-20">🦅</span>
                        <p className="text-gray-500 font-medium text-lg">Start a new conversation</p>
                    </div>
                )}
                
                {messages.map((msg) => (
                    <div 
                        key={msg.id} 
                        ref={(el) => { messageRefs.current[msg.id] = el; }}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in-up`}
                    >
                        {/* Bubble */}
                        <div className={`
                            relative px-6 py-4 rounded-3xl shadow-sm text-base leading-relaxed max-w-[85%] md:max-w-[70%]
                            ${msg.role === 'user'
                                ? 'bg-[#1B3B2F] text-white rounded-tr-sm'
                                : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/5 text-gray-800 dark:text-gray-100 rounded-tl-sm'
                            }
                        `}>
                            {msg.role === 'model' ? (
                                <div className="flex flex-col gap-2">
                                    <div className="prose prose-sm prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 max-w-none text-gray-700 dark:text-gray-200">
                                        <ReactMarkdown 
                                            components={{
                                                strong: ({node, ...props}) => <span className="font-bold text-gray-900 dark:text-white" {...props} />,
                                                a: ({node, ...props}) => <a className="text-falcon-green dark:text-falcon-gold font-medium hover:underline" target="_blank" {...props} />,
                                                ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1" {...props} />,
                                                ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1" {...props} />,
                                                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-200 dark:border-gray-600 pl-3 italic text-gray-500 dark:text-gray-400 my-2" {...props} />
                                            }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {msg.image && (
                                        <div className="mb-3 rounded-xl overflow-hidden border border-white/20">
                                            <img src={msg.image} alt="User uploaded" className="max-h-64 object-cover w-full relative z-10" />
                                        </div>
                                    )}
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            )}
                        </div>

                        {/* Meta Info (Timestamp / Badge) */}
                        <div className={`flex items-center gap-2 mt-1.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} px-1`}>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            
                            {/* Verified Source Badge for Model */}
                            {msg.role === 'model' && !msg.isError && (
                                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-falcon-green dark:text-falcon-gold bg-green-50 dark:bg-falcon-green/10 px-2 py-0.5 rounded-full border border-green-100 dark:border-white/5">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Verified Source
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex flex-col items-start animate-fade-in">
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/5 px-5 py-4 rounded-3xl rounded-tl-sm shadow-sm flex items-center gap-2 h-[48px]">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                )}
                
                {/* Spacer to allow scrolling past the very bottom */}
                <div className="h-8" />
            </div>

            {/* Floating Scroll Button */}
            <button
                onClick={() => scrollToBottom()}
                className={`fixed bottom-32 right-8 z-50 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-100 dark:border-white/10 text-falcon-green dark:text-white transition-all duration-300 transform ${
                    showScrollButton ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
                }`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            </button>
        </div>
    );
};

export default ChatPanel;
