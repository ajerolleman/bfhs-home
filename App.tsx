
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
import { subscribeToAuth, getUserProfile, getRecentMemoryNotes } from './services/firebase';
import { sendMessageToGemini } from './services/geminiService';
import { createNewSession, saveSession } from './services/chatHistoryService';
import { initSpotifyAuth } from './services/authService';
import { UserProfile, ChatMessage, MemoryNote, ChatSession } from './types';

const App: React.FC = () => {
  useEffect(() => {
    const token = initSpotifyAuth();
    if (token) console.log('Spotify connected');
  }, []);

  const [fullPageChatOpen, setFullPageChatOpen] = useState(false);
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (fullPageChatOpen || isFocusMode) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [fullPageChatOpen, isFocusMode]);

  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver(() => {
        if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  const toggleFocusMode = async () => {
    if (!isFocusMode) {
      try {
        if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        setIsFocusMode(true);
      } catch (e) { setIsFocusMode(true); }
    } else {
      if (document.fullscreenElement) await document.exitFullscreen();
      setIsFocusMode(false);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile) setUserProfile(profile);
        else {
          setUserProfile(null);
          setIsProfileModalOpen(true);
        }
      } else {
        setUserProfile(null);
        if (!localStorage.getItem('seen_bfhs_help_welcome')) {
            setIsProfileModalOpen(true);
            localStorage.setItem('seen_bfhs_help_welcome', 'true');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSearch = async (query: string, image?: string | null) => {
      if (!currentUser) { setIsProfileModalOpen(true); return; }
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: query, image: image || undefined, timestamp: new Date() };
      let activeSession = currentSession;
      let updatedMessages: ChatMessage[];
      let updatedSession: ChatSession;
      if (!activeSession) {
          activeSession = createNewSession(userMsg);
          updatedSession = activeSession;
          updatedMessages = activeSession.messages;
      } else {
          updatedMessages = [...(activeSession.messages || []), userMsg];
          updatedSession = { ...activeSession, messages: updatedMessages, updatedAt: Date.now() };
          saveSession(updatedSession);
      }
      setCurrentSession(updatedSession);
      if (!isFocusMode) setFullPageChatOpen(true);
      setIsSending(true);
      try {
        let notes: MemoryNote[] = [];
        if (userProfile?.uid && userProfile.allowMemory) notes = await getRecentMemoryNotes(userProfile.uid, 5);
        const responseText = await sendMessageToGemini(userMsg.text, userMsg.image, { profile: userProfile || null, notes });
        const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: new Date() };
        const finalMessages = [...updatedMessages, botMsg];
        const finalSession = { ...updatedSession, messages: finalMessages, updatedAt: Date.now() };
        setCurrentSession(finalSession);
        saveSession(finalSession);
      } catch (error) {
        const finalSession = { ...updatedSession, messages: [...updatedMessages, { id: (Date.now() + 1).toString(), role: 'model', text: "Error connecting to network.", timestamp: new Date(), isError: true } as ChatMessage], updatedAt: Date.now() };
        setCurrentSession(finalSession);
        saveSession(finalSession);
      } finally { setIsSending(false); }
  };

  return (
    <div>
      <CustomCursor />
      <Spotlight />
      <div className="min-h-screen bg-[#F3F4F6] pb-20 relative font-sans transition-colors duration-500 overflow-x-hidden">
        <div className="bg-noise fixed inset-0 z-[1]" />
        <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-falcon-green/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[0]" />
        
        <FocusOverlay isActive={isFocusMode} onExit={toggleFocusMode} onSearch={handleSearch} currentSession={currentSession} isSending={isSending} userProfile={userProfile} onSignIn={() => setIsProfileModalOpen(true)} onNewChat={() => setCurrentSession(createNewSession())} />

        <div className={`transition-opacity duration-500 ${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div ref={headerRef} className={`z-[110] transition-all duration-700 ease-spring ${fullPageChatOpen ? 'fixed top-0 left-0 right-0' : 'relative'}`}>
                <div
                  style={{ paddingTop: '50px' }}
                  className={`header-safe bg-gradient-to-b from-[#1B3B2F] to-[#163127] transition-all duration-500 relative flex flex-col items-center gap-4 ${fullPageChatOpen ? 'pb-6' : 'pb-4'}`}
                >
                  <Header onOpenChat={() => { if (!currentSession) setCurrentSession(createNewSession()); setFullPageChatOpen(true); }} onOpenProfile={() => setIsProfileModalOpen(true)} userProfile={userProfile} currentUser={currentUser} compact={fullPageChatOpen} isFocusMode={isFocusMode} onToggleFocus={toggleFocusMode} />
                  <div className={`container mx-auto max-w-[1200px] relative z-10 flex justify-center transition-all duration-700 ease-spring ${fullPageChatOpen ? 'py-0' : 'py-2'}`}>
                      <QuickLinks compact={fullPageChatOpen} />
                  </div>
                </div>
                <div className={`bg-gradient-to-b from-[#163127] to-[#12261E] w-full shadow-inner relative transition-all duration-700 ease-spring overflow-hidden ${fullPageChatOpen ? 'max-h-0 opacity-0' : 'max-h-25 opacity-100'}`}>
                  <div className="w-3/4 mx-auto border-t border-white/10 pt-1"></div>
                  <div className="container mx-auto py-3 text-center">
                      <button onClick={() => window.location.href = '/?page=tech-info'} className="text-white/90 font-bold tracking-widest text-sm hover:text-falcon-gold transition-colors uppercase flex items-center justify-center w-full">
                          <span className="mr-2">🔧</span> TECH INFO: WIFI, PRINTING & MORE
                      </button>
                  </div>
                </div>
            </div>

            {fullPageChatOpen && <div style={{ height: headerHeight }} />}

            <div className={`z-[40] flex justify-center transition-all duration-1000 ease-spring ${fullPageChatOpen ? 'opacity-0 pointer-events-none absolute' : 'opacity-100 relative py-12 md:py-16'}`}>
                <AIQuickBar onSearch={handleSearch} onOpenChat={() => { if (!currentSession) setCurrentSession(createNewSession()); setFullPageChatOpen(true); }} />
            </div>
            
            <main className={`container mx-auto px-4 py-4 max-w-[1200px] space-y-16 relative z-10 transition-all duration-700 ease-spring ${fullPageChatOpen ? 'opacity-0 pointer-events-none scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
                  
                  <div className="space-y-12">
                      <Slides />
                      <News />
                  </div>

                  <footer className="text-center text-xs text-gray-400 font-mono mt-20 mb-4 border-t border-gray-200 dark:border-white/5 pt-8">
                      <p>BEN FRANKLIN HIGH SCHOOL • KATHERINE JOHNSON CAMPUS</p>
                      <p className="mt-2 opacity-60">Internal Student Portal © {new Date().getFullYear()}</p>
                  </footer>
            </main>

            <ChatOverlay isOpen={fullPageChatOpen} onClose={() => setFullPageChatOpen(false)} currentSession={currentSession} onSwitchSession={setCurrentSession} onNewChat={() => setCurrentSession(createNewSession())} topOffset={headerHeight} composer={<AIQuickBar onSearch={handleSearch} docked={true} />}>
                <ChatPanel messages={currentSession?.messages || []} isLoading={isSending} userProfile={userProfile} onSignInRequest={() => setIsProfileModalOpen(true)} />
            </ChatOverlay>

            <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} user={currentUser} profile={userProfile} onProfileUpdate={setUserProfile} />
        </div>
      </div>
    </div>
  );
};

export default App;
