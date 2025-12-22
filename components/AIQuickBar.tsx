
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AIQuickBarProps {
    onSearch: (query: string, image?: string | null) => void;
    onExpandChange?: (expanded: boolean) => void;
    onOpenChat?: () => void;
    onBarFocus?: () => void;
    docked?: boolean;
    hideChips?: boolean;
    searchMode?: 'bfhs-only' | 'bfhs-google';
    placeholder?: string;
}

const AIQuickBar: React.FC<AIQuickBarProps> = ({ onSearch, onExpandChange, onOpenChat, onBarFocus, docked, hideChips, searchMode = 'bfhs-google', placeholder }) => {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMultiline, setIsMultiline] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [fileName, setFileName] = useState<string | null>(null);
    const [imageContent, setImageContent] = useState<string | null>(null);
    const [isAboutOpen, setIsAboutOpen] = useState(false);
    
    // Refs
    const barContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const hasQuery = query.trim().length > 0;
    const showDropdown = isFocused && hasQuery;
    
    // Expansion logic
    const isExpanded = isFocused || isMenuOpen;

    useEffect(() => {
        if (onExpandChange) {
            onExpandChange(isExpanded);
        }
    }, [isExpanded, onExpandChange]);

    // Options configuration
    const options = [
        { 
            id: 'bfhs', 
            label: 'BFHS Help', 
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            ),
            shortcut: 'return'
        },
        ...(searchMode === 'bfhs-google' ? [{
            id: 'google',
            label: 'Google',
            icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>
            ),
            shortcut: ''
        }] : [])
    ];
    const showSelector = showDropdown && options.length > 1;
    const inputPlaceholder = placeholder ?? (searchMode === 'bfhs-only' ? 'Message BFHS Help...' : 'Message BFHS Help or Google...');

    // Auto-resize Textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const handleResize = () => {
            // Reset height to allow shrinking
            textarea.style.height = 'auto';
            
            // Calculate new height (max 200px)
            const MAX_HEIGHT = 200;
            const scrollHeight = textarea.scrollHeight;
            const newHeight = Math.max(28, Math.min(scrollHeight, MAX_HEIGHT));
            
            textarea.style.height = `${newHeight}px`;
            textarea.style.overflowY = scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
            const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight || '28');
            setIsMultiline(scrollHeight > lineHeight + 4);
        };

        handleResize();
        
        textarea.addEventListener('input', handleResize);
        return () => textarea.removeEventListener('input', handleResize);
    }, [query, imageContent]);

    // Handle clicks outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (barContainerRef.current && !barContainerRef.current.contains(target)) {
                setIsFocused(false);
                setIsMenuOpen(false); 
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const executeSearch = (index: number) => {
        if (!hasQuery && !fileName && !imageContent) return;
        
        const option = options[index];

        if (option.id === 'bfhs') {
            onSearch(query, imageContent);
        } else if (option.id === 'google') {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
        }
        
        setQuery('');
        setFileName(null);
        setImageContent(null);
        setIsFocused(false);
        setIsMultiline(false);
        textareaRef.current?.blur();
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!hasQuery && !fileName && !imageContent) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % options.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + options.length) % options.length);
        } else if (e.key === 'Enter') {
            if (!e.shiftKey) {
                e.preventDefault();
                executeSearch(selectedIndex);
            }
        } else if (e.key === 'Escape') {
            setIsFocused(false);
            textareaRef.current?.blur();
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
                        setImageContent(reader.result as string);
                        setFileName("Pasted Image");
                        setIsFocused(true);
                    };
                    reader.readAsDataURL(file);
                    e.preventDefault();
                    return;
                }
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageContent(reader.result as string);
            };
            reader.readAsDataURL(file);
            setIsMenuOpen(false);
            setIsFocused(true);
            textareaRef.current?.focus();
        }
    };

    const removeImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setImageContent(null);
        setFileName(null);
    };

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(!isMenuOpen);
        setIsFocused(true);
        onBarFocus?.();
    };

    return (
        <div className="w-full flex flex-col items-center z-[50]">
            
            {/* Docked Label */}
            {docked && (
                <div className="mb-2 text-falcon-gold font-bold text-xs uppercase tracking-widest opacity-80 animate-fade-in-up">
                    Ask BFHS Help
                </div>
            )}

            {/* Main Bar Container */}
            <div 
                ref={barContainerRef}
                className={`
                    relative flex flex-col
                    transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)]
                    ${docked 
                        ? 'w-[95%] md:w-[820px]' 
                        : isExpanded ? 'w-[98%] md:w-[980px]' : 'w-[90%] md:w-[680px]' 
                    }
                    z-[60]
                `}
            >
                {/* Input Pill Container */}
                <div 
                    className={`
                        w-full flex flex-col relative overflow-hidden z-20
                        bg-[#1B3B2F] text-[#E3E3E3] 
                        border border-white/10 shadow-2xl
                        transition-[border-radius, box-shadow, height, padding] duration-160 ease-out
                        ${showSelector ? 'rounded-t-[32px] rounded-b-none' : 'rounded-[32px]'}
                        ${isFocused ? 'ring-1 ring-white/10' : 'hover:shadow-2xl'}
                    `}
                    style={{ transform: 'translateZ(0)' }}
                    onClick={() => {
                        textareaRef.current?.focus();
                        onBarFocus?.();
                    }}
                >
                    {/* Grain Texture Overlay */}
                    <div className="absolute inset-0 bg-noise opacity-[0.07] pointer-events-none mix-blend-overlay"></div>

                    {/* Image Preview Area */}
                    {imageContent && (
                        <div className="relative z-10 w-full px-6 pt-4 pb-1 animate-fade-in-up">
                            <div className="relative inline-block group">
                                <div className="p-1.5 bg-white/10 rounded-xl border border-white/10">
                                    <img 
                                        src={imageContent} 
                                        alt="Preview" 
                                        className="h-16 w-auto rounded-lg object-cover" 
                                    />
                                </div>
                                <button 
                                    onClick={removeImage}
                                    className="absolute -top-2 -right-2 bg-gray-800 text-white hover:bg-red-500 rounded-full p-1 shadow-md border border-white/20 transition-colors"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Main Input Row - increased py-4 and gap-4 for a more spacious feel */}
                    <div className={`flex gap-4 px-5 py-4 ${isMultiline ? 'items-end' : 'items-center'} min-h-[64px] transition-all duration-200`}>
                        
                        {/* 1. Plus Button */}
                        <div className="relative z-10 flex items-center justify-center h-10 w-10 shrink-0"> 
                            <button 
                                onClick={toggleMenu}
                                className={`p-2 transition-colors rounded-full shrink-0 ${isMenuOpen ? 'bg-white text-black' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                            >
                                <svg className={`w-6 h-6 transition-transform duration-300 ${isMenuOpen ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </button>

                            {/* Pull Up Menu */}
                            {isMenuOpen && (
                                <div ref={menuRef} className="absolute top-full left-0 mt-3 w-56 bg-[#1B3B2F] border border-white/10 rounded-2xl shadow-2xl p-2 overflow-hidden animate-fade-in origin-top-left flex flex-col gap-1 z-[60]">
                                    <div className="absolute inset-0 bg-noise opacity-[0.07] pointer-events-none mix-blend-overlay"></div>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative z-10 flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 text-gray-300 hover:text-white transition-colors w-full text-left group"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center text-blue-400 transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                        <span className="text-sm font-medium">Upload Photo</span>
                                    </button>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        onChange={handleFileSelect}
                                    />
                                </div>
                            )}
                        </div>
                        
                        {/* 2. Falcon Emoji */}
                        <div className="relative z-10 shrink-0 hidden md:block">
                            <span className="text-2xl leading-none">🦅</span>
                        </div>

                        {/* 3. Textarea - Aligned based on query state */}
                        <textarea 
                            ref={textareaRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => {
                                setIsFocused(true);
                                onBarFocus?.();
                            }}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            placeholder={inputPlaceholder}
                            className={`
                                relative z-10 flex-1 bg-transparent border-none outline-none 
                                text-[#E3E3E3] placeholder-white/50 font-normal min-w-0 
                                resize-none overflow-hidden 
                                p-0 m-0 py-0
                                leading-[28px]
                                ${imageContent ? 'text-falcon-gold font-medium' : ''} 
                                text-lg md:text-xl
                            `}
                            style={{ minHeight: '28px', maxHeight: '200px' }} 
                            rows={1}
                        />

                        {/* Right Side Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            {/* 4. Info Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsAboutOpen(true);
                                }}
                                className="relative z-10 p-2 text-white/40 hover:text-white transition-colors rounded-full shrink-0 outline-none focus:text-white"
                                title="About BFHS Help"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>

                            {/* 5. Fullscreen / Expand Trigger */}
                            {onOpenChat && !docked && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenChat();
                                    }}
                                    className="relative z-10 p-2 text-white/40 hover:text-white transition-colors rounded-full shrink-0 outline-none focus:text-white"
                                    title="Open Fullscreen Chat"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m5 5v-4m0 4h-4" /></svg>
                                </button>
                            )}

                            {/* 6. Send Button (Orange) */}
                            <button 
                                onClick={() => executeSearch(selectedIndex)}
                                className={`
                                    relative z-10 p-2.5 rounded-full transition-all duration-300 shrink-0 flex items-center justify-center shadow-lg
                                    ${(hasQuery || fileName || imageContent)
                                        ? 'bg-[#F97316] text-white hover:bg-[#EA580C] scale-100' 
                                        : 'bg-[#F97316]/50 text-white/50 cursor-default'}
                                `}
                                disabled={!hasQuery && !fileName && !imageContent}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dropdown Menu */}
                {showSelector && (
                    <div className="w-full bg-[#1B3B2F] rounded-b-[32px] shadow-2xl overflow-hidden py-3 border-t border-white/5 animate-fade-in z-10 relative">
                        <div className="absolute inset-0 bg-noise opacity-[0.07] pointer-events-none mix-blend-overlay"></div>
                        {options.map((option, idx) => (
                            <button
                                key={option.id}
                                onClick={() => executeSearch(idx)}
                                onMouseEnter={() => setSelectedIndex(idx)}
                                className={`
                                    relative z-10 w-full px-6 py-4 flex items-center justify-between gap-4 text-left transition-colors
                                    ${idx === selectedIndex ? 'bg-white/10' : 'bg-transparent'}
                                `}
                            >
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center shrink-0
                                        ${idx === selectedIndex ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-400'}
                                    `}>
                                        {option.icon}
                                    </div>
                                    <span className="text-[#E3E3E3] truncate text-base md:text-lg font-medium">
                                        {query} <span className="text-gray-500 font-normal">— {option.label}</span>
                                    </span>
                                </div>
                                
                                {option.shortcut && idx === selectedIndex && (
                                    <span className="hidden md:block text-xs text-gray-500 font-medium shrink-0 pr-2">
                                        {option.shortcut}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Helper Chips - Only show when NOT docked */}
            {!docked && !hideChips && (
                <div className={`
                    w-full flex justify-center gap-3 overflow-x-auto no-scrollbar py-2
                    transition-all duration-[800ms] ease-out origin-top
                    ${(hasQuery || fileName) 
                        ? 'max-h-0 opacity-0 mt-0 pointer-events-none scale-95' 
                        : 'max-h-[200px] opacity-100 mt-8 scale-100'
                    }
                `}>
                    {["Dress code", "Bell schedule", "Late work", "Absences"].map((chip, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setQuery(chip);
                                setIsFocused(true);
                                setTimeout(() => textareaRef.current?.focus(), 50);
                            }}
                            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium bg-white/60 dark:bg-black/20 text-gray-600 dark:text-gray-400 border border-transparent hover:bg-white dark:hover:bg-black/40 hover:shadow-sm transition-all whitespace-nowrap"
                        >
                            {chip}
                        </button>
                    ))}
                </div>
            )}

            {/* About Modal */}
            {isAboutOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity pointer-events-auto" onClick={() => setIsAboutOpen(false)} />
                    <div className="bg-[#1B3B2F] border-2 border-white/20 rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden animate-fade-in-up transform scale-100 pointer-events-auto">
                        <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-10">
                            <h3 className="text-white font-header text-2xl uppercase tracking-wide flex items-center gap-3">
                                <span className="text-falcon-gold text-3xl">ⓘ</span> About BFHS Help
                            </h3>
                            <button onClick={() => setIsAboutOpen(false)} className="text-white/50 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-8 space-y-4 text-gray-200 text-lg leading-relaxed relative z-10">
                            <p><strong>BFHS Help</strong> is an AI assistant trained on the Student Handbook and official school policies.</p>
                            <p className="text-sm">It can help with:</p>
                            <ul className="text-sm list-disc pl-5 space-y-1 text-white/80">
                                <li>School policies (Dress code, Attendance, Grading)</li>
                                <li>Bell schedules & Calendar events</li>
                                <li>Finding tech resources</li>
                                <li>Academic concepts (Tutoring mode)</li>
                            </ul>
                            <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10 text-sm">
                                <strong className="text-falcon-gold">Note:</strong> While helpful, this AI may occasionally make mistakes. Always verify critical information with official school documents or staff.
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default AIQuickBar;
