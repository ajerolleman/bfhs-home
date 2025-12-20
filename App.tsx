
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import QuickLinks from './components/QuickLinks';
import News from './components/News';
import Slides from './components/Slides';
import AIQuickBar from './components/AIQuickBar';
import TechResources from './components/TechResources';
import CustomCursor from './components/CustomCursor';
import Spotlight from './components/Spotlight';
import ProfileModal from './components/ProfileModal';
import ChatOverlay from './components/ChatOverlay';
import ChatPanel from './components/ChatPanel';
import FocusOverlay from './components/FocusOverlay';
import { subscribeToAuth, getUserProfile, getRecentMemoryNotes, addMemoryNote } from './services/firebase';
import { sendMessageToGemini } from './services/geminiService';
import { createNewSession, saveSession, getSessions, getLastActiveSessionId } from './services/chatHistoryService';
import { UserProfile, ChatMessage, MemoryNote, ChatSession } from './types';

const App: React.FC = () => {
  const [fullPageChatOpen, setFullPageChatOpen] = useState(false);
  const [techModalOpen, setTechModalOpen] = useState(false);
  
  // Focus Mode State
  const [isFocusMode, setIsFocusMode] = useState(false);
  
  // Chat State
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Auth & Profile State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Layout Measurement
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // 1. Lock Body Scroll when Chat is Open OR Focus Mode is active
  useEffect(() => {
    if (fullPageChatOpen || isFocusMode) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
    return () => {
        document.body.style.overflow = '';
    };
  }, [fullPageChatOpen, isFocusMode]);

  useEffect(() => {
    // Use ResizeObserver to track height changes smoothly during transitions
    if (!headerRef.current) return;

    const observer = new ResizeObserver(() => {
        if (headerRef.current) {
            setHeaderHeight(headerRef.current.offsetHeight);
        }
    });

    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle Fullscreen toggle
  const toggleFocusMode = async () => {
    if (!isFocusMode) {
      // Enter Focus
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        setIsFocusMode(true);
      } catch (e) {
        console.error("Fullscreen denied", e);
        // Still enter focus mode UI even if fullscreen denied
        setIsFocusMode(true);
      }
    } else {
      // Exit Focus
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      setIsFocusMode(false);
    }
  };

  // Listen for fullscreen changes (e.g. user presses ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFocusMode]);

  // Initialize Auth & Chat History
  useEffect(() => {
    // Auth Subscription
    const unsubscribe = subscribeToAuth(async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUserProfile(profile);
        } else {
          setUserProfile(null);
          setIsProfileModalOpen(true);
        }
      } else {
        setUserProfile(null);
        const seenWelcome = localStorage.getItem('seen_bfhs_help_welcome');
        if (!seenWelcome) {
            setIsProfileModalOpen(true);
            localStorage.setItem('seen_bfhs_help_welcome', 'true');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSearch = async (query: string, image?: string | null) => {
      // Security Guard: Prevent messaging if not logged in
      if (!currentUser) {
          setIsProfileModalOpen(true);
          return;
      }

      // Construct User Message object
      const userMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          text: query,
          image: image || undefined,
          timestamp: new Date()
      };

      // 1. Determine Session (Create or Append)
      let activeSession = currentSession;
      let updatedMessages: ChatMessage[];
      let updatedSession: ChatSession;

      if (!activeSession) {
          // Create new session - createNewSession includes the message in it
          activeSession = createNewSession(userMsg);
          updatedSession = activeSession;
          updatedMessages = activeSession.messages;
      } else {
          // Existing session - Append message
          updatedMessages = [...(activeSession.messages || []), userMsg];
          updatedSession = { ...activeSession, messages: updatedMessages, updatedAt: Date.now() };
          saveSession(updatedSession);
      }
      
      setCurrentSession(updatedSession);

      // 2. Open Full Screen & Set Loading
      // Note: If in Focus Mode, we don't open fullPageChatOpen, the FocusOverlay handles its own drawer
      if (!isFocusMode) {
          setFullPageChatOpen(true);
      }
      
      setIsSending(true);

      // 3. Send to Gemini
      try {
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

        const finalMessages = [...updatedMessages, botMsg];
        const finalSession = { ...updatedSession, messages: finalMessages, updatedAt: Date.now() };
        setCurrentSession(finalSession);
        saveSession(finalSession);

      } catch (error) {
        const errorMsg: ChatMessage = {
             id: (Date.now() + 1).toString(),
             role: 'model',
             text: "I'm having trouble connecting to the school network right now. Please try again later.",
             timestamp: new Date(),
             isError: true
        };
        const finalMessages = [...updatedMessages, errorMsg];
        const finalSession = { ...updatedSession, messages: finalMessages, updatedAt: Date.now() };
        setCurrentSession(finalSession);
        saveSession(finalSession);
      } finally {
          setIsSending(false);
      }
  };

  const handleNewChat = () => {
      const newSess = createNewSession();
      setCurrentSession(newSess);
  };

  const openTechInfoPage = () => {
    window.location.href = '/?page=tech-info';
  };

  return (
    <div>
      <CustomCursor />
      <Spotlight />
      <div className="min-h-screen bg-[#F3F4F6] pb-20 relative font-sans transition-colors duration-500 overflow-x-hidden">
        
        <div className="bg-noise fixed inset-0 z-[1]" />
        <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-falcon-green/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[0]" />
        <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-[150px] translate-x-1/3 translate-y-1/3 pointer-events-none z-[0]" />

        {/* Focus Mode Overlay - Takes over everything when active */}
        <FocusOverlay 
            isActive={isFocusMode} 
            onExit={toggleFocusMode}
            onSearch={handleSearch}
            currentSession={currentSession}
            isSending={isSending}
            userProfile={userProfile}
            onSignIn={() => setIsProfileModalOpen(true)}
            onNewChat={handleNewChat}
        />

        {/* 
            Main Layout Elements 
            Hidden completely when Focus Mode is active to ensure zero distractions
        */}
        <div className={`transition-opacity duration-500 ${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            
            <div 
                ref={headerRef} 
                className={`
                    z-[110] transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)]
                    ${fullPageChatOpen ? 'fixed top-0 left-0 right-0' : 'relative'}
                `}
            >
                {/* 1. Header */}
                <div className="bg-gradient-to-b from-[#1B3B2F] to-[#163127] transition-all duration-500 relative">
                  <Header 
                    onOpenChat={() => {
                        if (!currentSession) handleNewChat();
                        setFullPageChatOpen(true);
                    }} 
                    onOpenProfile={() => setIsProfileModalOpen(true)}
                    userProfile={userProfile}
                    currentUser={currentUser}
                    compact={fullPageChatOpen} 
                    isFocusMode={isFocusMode}
                    onToggleFocus={toggleFocusMode}
                  />
                  
                  {/* QuickLinks */}
                  <div className={`container mx-auto max-w-[1200px] relative z-10 flex justify-center transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${fullPageChatOpen ? 'pb-1 pt-0' : 'pb-4 pt-2'}`}>
                      <QuickLinks compact={fullPageChatOpen} />
                  </div>
                </div>

                {/* 2. Tech Info Bar */}
                <div className={`bg-gradient-to-b from-[#163127] to-[#12261E] w-full shadow-inner relative transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] overflow-hidden ${fullPageChatOpen ? 'max-h-0 opacity-0' : 'max-h-16 opacity-100'}`}>
                  <div className="w-3/4 mx-auto border-t border-white/20 pt-1"></div>
                  <div className="container mx-auto py-3 text-center">
                      <button 
                          onClick={openTechInfoPage}
                          className="text-white/90 font-bold tracking-widest text-sm hover:text-falcon-gold transition-colors uppercase flex items-center justify-center w-full"
                      >
                          <span className="mr-2">🔧</span> TECH INFO: WIFI, PRINTING & MORE
                      </button>
                  </div>
                </div>
            </div>

            {/* Placeholder Div */}
            {fullPageChatOpen && <div style={{ height: headerHeight }} />}

            {/* 3. AI Quick Bar */}
            <div className={`
                z-[40] flex justify-center transition-all duration-1000 ease-[cubic-bezier(0.2,0.9,0.2,1)]
                ${fullPageChatOpen ? 'opacity-0 pointer-events-none absolute' : 'opacity-100 relative py-10 md:py-12'}
            `}>
                <AIQuickBar 
                    onSearch={handleSearch} 
                    onOpenChat={() => {
                        if (!currentSession) handleNewChat();
                        setFullPageChatOpen(true);
                    }}
                />
            </div>
            
            {/* Main Content Area */}
            <main className={`container mx-auto px-4 py-4 max-w-[1200px] space-y-12 relative z-10 transition-all duration-700 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${fullPageChatOpen ? 'opacity-0 pointer-events-none scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
                  <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
                     <Slides />
                  </div>
                  <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                     <News />
                  </div>
                  <footer className="text-center text-xs text-gray-400 font-mono mt-20 mb-4 border-t border-gray-200 pt-8 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                      <p>BEN FRANKLIN HIGH SCHOOL • KATHERINE JOHNSON CAMPUS</p>
                      <p className="mt-2 opacity-60">Internal Student Portal © {new Date().getFullYear()}</p>
                  </footer>
            </main>

            {/* Full Screen Chat Overlay (Normal Mode) */}
            <ChatOverlay 
                isOpen={fullPageChatOpen} 
                onClose={() => setFullPageChatOpen(false)}
                currentSession={currentSession}
                onSwitchSession={setCurrentSession}
                onNewChat={handleNewChat}
                topOffset={headerHeight}
                composer={<AIQuickBar onSearch={handleSearch} />}
            >
                <ChatPanel 
                    messages={currentSession?.messages || []}
                    isLoading={isSending}
                    userProfile={userProfile}
                    onSignInRequest={() => setIsProfileModalOpen(true)}
                />
            </ChatOverlay>

            <TechResources 
              isOpen={techModalOpen} 
              onClose={() => setTechModalOpen(false)} 
            />
            
            <ProfileModal 
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                user={currentUser}
                profile={userProfile}
                onProfileUpdate={setUserProfile}
            />
        </div>
      </div>
    </div>
  );
};

export default App;
