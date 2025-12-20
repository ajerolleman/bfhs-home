
import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToGemini } from '../services/geminiService';
import { ChatMessage, UserProfile, MemoryNote } from '../types';
import { addMemoryNote, getRecentMemoryNotes } from '../services/firebase';
import ReactMarkdown from 'react-markdown';

interface ChatWidgetProps {
    forceOpen?: boolean;
    onCloseFullPage?: () => void;
    initialPrompt?: string;
    initialImage?: string | null;
    showTrigger?: boolean;
    triggerLabel?: string;
    userProfile?: UserProfile | null;
    onSignInRequest?: () => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ 
    forceOpen, 
    onCloseFullPage, 
    initialPrompt, 
    initialImage,
    showTrigger = true, 
    triggerLabel = "BFHS Help",
    userProfile,
    onSignInRequest 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I'm **BFHS Help**. \n\nMy main focus is providing **Homework Help** and **Tutoring** to help you succeed in your classes. I can also help you find information in the **Student Handbook** or clarify school policies.\n\n_To get started, what grade are you in and what subject do you need help with?_",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeMemoryInput, setActiveMemoryInput] = useState<string | null>(null); // ID of message being saved
  const [memoryText, setMemoryText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasSentInitialPrompt = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suggestion Chips
  const suggestionChips = [
    "Dress Code Policy",
    "Explain Newton's Laws",
    "Late Work Rules",
    "Writing Feedback"
  ];

  // Handle external force open
  useEffect(() => {
    if (forceOpen) {
        setIsOpen(true);
        setIsExpanded(true);
    }
  }, [forceOpen]);

  // Handle initial prompt and image
  useEffect(() => {
    if ((initialPrompt || initialImage) && !hasSentInitialPrompt.current && isOpen && userProfile) {
        hasSentInitialPrompt.current = true;
        handleSend(initialPrompt, initialImage);
    }
  }, [initialPrompt, initialImage, isOpen, userProfile]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isExpanded, selectedImage, activeMemoryInput]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setSelectedImage(reader.result as string);
                };
                reader.readAsDataURL(file);
                e.preventDefault();
                return;
            }
        }
    }
  };

  const handleSend = async (textOverride?: string, imageOverride?: string | null) => {
    const textToSend = textOverride !== undefined ? textOverride : inputText;
    const imageToSend = imageOverride !== undefined ? imageOverride : selectedImage;

    if ((!textToSend.trim() && !imageToSend) || isLoading) return;

    // Reset inputs
    if (textOverride === undefined) setInputText('');
    if (imageOverride === undefined) setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      image: imageToSend || undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
        // Fetch context if allowed
        let notes: MemoryNote[] = [];
        if (userProfile?.uid && userProfile.allowMemory) {
            notes = await getRecentMemoryNotes(userProfile.uid, 5);
        }

        const responseText = await sendMessageToGemini(
            userMsg.text, 
            userMsg.image, 
            { profile: userProfile || null, notes }
        );

        const botMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
    } catch (error) {
        const errorMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: "I'm having trouble connecting to the school network right now. Please try again later.",
            timestamp: new Date(),
            isError: true
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }
  };

  const saveMemory = async (msgId: string) => {
    if (!userProfile?.uid || !memoryText.trim()) return;
    await addMemoryNote(userProfile.uid, memoryText);
    setActiveMemoryInput(null);
    setMemoryText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => {
      setIsOpen(false);
      setIsExpanded(false);
      if (onCloseFullPage) onCloseFullPage();
      hasSentInitialPrompt.current = false;
  };

  const containerClasses = (isExpanded || forceOpen)
    ? "fixed top-0 left-0 md:top-1/2 md:left-1/2 md:transform md:-translate-x-1/2 md:-translate-y-1/2 w-full h-full md:w-[600px] md:h-[700px] bg-white dark:bg-gray-900 md:rounded-xl shadow-2xl z-[60] flex flex-col overflow-hidden animate-fade-in ring-1 ring-black/5 dark:ring-white/10"
    : "fixed bottom-4 right-4 w-[calc(100vw-32px)] md:w-[400px] h-[600px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in ring-1 ring-black/5 dark:ring-white/10";

  return (
    <>
      {(isExpanded || forceOpen) && isOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[55]" onClick={handleClose} />
      )}

      {!isExpanded && !forceOpen && !isOpen && showTrigger && (
        <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-falcon-green dark:text-falcon-gold border border-gray-200 dark:border-white/10 shadow-lg hover:shadow-xl rounded-full px-5 py-3 flex items-center space-x-3 transition-all duration-200 ease-spring transform hover:-translate-y-1 group animate-fade-in"
            aria-label="Open BFHS Help"
        >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-bold text-sm tracking-wide">{triggerLabel}</span>
            <div className="w-8 h-8 bg-falcon-green dark:bg-falcon-gold dark:text-black text-white rounded-full flex items-center justify-center text-lg shadow-sm">
                🦅
            </div>
        </button>
      )}

      {isOpen && (
        <div className={containerClasses}>
          <div className="bg-white dark:bg-gray-900 px-5 py-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0 transition-colors duration-300">
            <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-falcon-green dark:bg-falcon-gold dark:text-black text-white flex items-center justify-center text-sm shadow-sm">
                    🦅
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-white text-sm tracking-wide flex items-center gap-2">
                        {triggerLabel}
                        {userProfile && <span className="text-[10px] bg-gray-100 dark:bg-white/10 px-1.5 rounded text-gray-500 font-normal">{userProfile.name}</span>}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">BFHS Resource & AI Tutor</p>
                </div>
            </div>
            <div className="flex items-center space-x-1">
                <button 
                    onClick={() => {
                        if (forceOpen && onCloseFullPage) {
                            handleClose();
                        } else {
                            setIsExpanded(!isExpanded);
                        }
                    }}
                    className="p-2 text-gray-400 hover:text-falcon-green dark:hover:text-falcon-gold hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors"
                >
                    {isExpanded ? (
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    ) : (
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    )}
                </button>
                <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
          </div>

          {/* Gate: Only show chat if userProfile exists */}
          {!userProfile ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-black/20 text-center animate-fade-in">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-3xl">
                      🔒
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Access Restricted</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-8 leading-relaxed">
                      You must be signed in with your BFHS Google account to access BFHS Help and save your chat history.
                  </p>
                  <button 
                      onClick={onSignInRequest}
                      className="magnetic-btn w-full py-3 bg-falcon-green dark:bg-falcon-gold dark:text-black text-white rounded-lg font-bold hover:bg-falcon-dark dark:hover:bg-yellow-400 transition-all shadow-md flex items-center justify-center gap-2 group"
                  >
                      <span>Sign In with Google</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </button>
              </div>
          ) : (
            <>
                <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gray-50 dark:bg-black/40 scroll-smooth">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-full`}>
                            <div className={`relative max-w-[90%] md:max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm text-sm md:text-base leading-relaxed ${
                                msg.role === 'user'
                                ? 'bg-falcon-green dark:bg-falcon-gold dark:text-black text-white rounded-tr-sm'
                                : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/5 text-gray-800 dark:text-gray-100 rounded-tl-sm'
                            }`}>
                                {msg.role === 'model' ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="prose prose-sm prose-p:my-1 prose-ul:my-1 prose-li:my-0 max-w-none text-gray-700 dark:text-gray-200">
                                            <ReactMarkdown 
                                                components={{
                                                    strong: ({node, ...props}) => <span className="font-bold text-gray-900 dark:text-white" {...props} />,
                                                    a: ({node, ...props}) => <a className="text-falcon-green dark:text-falcon-gold font-medium hover:underline" target="_blank" {...props} />,
                                                    ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1" {...props} />,
                                                    ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1" {...props} />,
                                                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-200 dark:border-gray-600 pl-3 italic text-gray-500 dark:text-gray-400" {...props} />
                                                }}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                        
                                        {/* Memory & Source Footer */}
                                        {!msg.isError && (
                                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                                <div className="flex items-center text-falcon-green dark:text-falcon-gold text-[10px] font-bold uppercase tracking-wider bg-green-50 dark:bg-falcon-green/20 px-2 py-0.5 rounded">
                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    Verified BFHS Source
                                                </div>
                                                {/* Remember Button */}
                                                {userProfile?.allowMemory && (
                                                    <button 
                                                        onClick={() => {
                                                            setActiveMemoryInput(activeMemoryInput === msg.id ? null : msg.id);
                                                            setMemoryText('');
                                                        }}
                                                        className="text-[10px] text-gray-400 hover:text-falcon-green dark:hover:text-falcon-gold flex items-center gap-1 transition-colors"
                                                    >
                                                        <span>🧠 Remember</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Memory Input Field */}
                                        {activeMemoryInput === msg.id && (
                                            <div className="mt-2 animate-fade-in">
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        maxLength={140}
                                                        value={memoryText}
                                                        onChange={(e) => setMemoryText(e.target.value)}
                                                        placeholder="Save a short note (max 140)..."
                                                        className="flex-1 text-xs p-2 rounded bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 focus:outline-none focus:border-falcon-green"
                                                        autoFocus
                                                    />
                                                    <button 
                                                        onClick={() => saveMemory(msg.id)}
                                                        disabled={!memoryText.trim()}
                                                        className="text-xs bg-falcon-green text-white px-3 rounded font-bold disabled:opacity-50"
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        {msg.image && (
                                            <div className="mb-3 rounded-lg overflow-hidden border border-white/20">
                                                <img src={msg.image} alt="User uploaded" className="max-h-48 object-cover w-full" />
                                            </div>
                                        )}
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 px-1">
                                {msg.role === 'user' ? 'You' : 'BFHS Help'} • {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="flex flex-col items-start animate-fade-in">
                            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/5 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center space-x-1.5 h-[42px]">
                                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="bg-white dark:bg-gray-900 p-4 border-t border-gray-100 dark:border-white/5 shrink-0 transition-colors duration-300">
                    {messages.length < 3 && !isLoading && (
                        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-1">
                            {suggestionChips.map((chip, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSend(chip)}
                                    className="whitespace-nowrap px-3 py-1.5 bg-gray-50 dark:bg-white/5 hover:bg-falcon-green/10 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-falcon-green dark:hover:text-falcon-gold text-xs font-medium rounded-full border border-gray-200 dark:border-white/10 hover:border-falcon-green/30 transition-colors"
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedImage && (
                        <div className="mb-3 flex items-center gap-3 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-white/10 w-fit">
                            <div className="relative group">
                                <img src={selectedImage} alt="Preview" className="h-12 w-12 object-cover rounded shadow-sm" />
                                <button 
                                    onClick={() => setSelectedImage(null)}
                                    className="absolute -top-2 -right-2 bg-white text-gray-500 hover:text-red-500 rounded-full p-0.5 shadow border border-gray-200"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <span className="text-xs text-gray-500">Image attached</span>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 dark:bg-gray-800 focus-within:bg-white dark:focus-within:bg-black/50 border border-transparent focus-within:border-falcon-green/50 dark:focus-within:border-falcon-gold/50 rounded-lg flex items-center transition-all duration-200 ease-spring">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={handleKeyPress}
                                onPaste={handlePaste}
                                placeholder={selectedImage ? "Add a message..." : "Type a message..."}
                                className="flex-1 bg-transparent border-none text-gray-800 dark:text-gray-100 px-4 py-3 focus:ring-0 focus:outline-none placeholder-gray-400 text-sm"
                                disabled={isLoading}
                                autoFocus={isExpanded || forceOpen}
                            />
                            <label className="p-2 cursor-pointer text-gray-400 hover:text-falcon-green dark:hover:text-falcon-gold transition-colors mr-1" title="Attach Image">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    ref={fileInputRef}
                                    onChange={handleImageSelect}
                                />
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            </label>
                        </div>
                        <button
                            onClick={() => handleSend()}
                            disabled={isLoading || (!inputText.trim() && !selectedImage)}
                            className="p-3 bg-falcon-green dark:bg-falcon-gold dark:text-black text-white rounded-lg hover:bg-[#12261E] dark:hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                            aria-label="Send Message"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </div>
                    
                    <div className="mt-3 flex justify-between items-center px-1">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">Tutor • School Resource • Monitored Chat</span>
                        <span className="text-[10px] text-gray-300 dark:text-gray-600">BFHS Help v2.2</span>
                    </div>
                </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;
