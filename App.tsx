
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Header from './components/Header';
import QuickLinks from './components/QuickLinks';
import News from './components/News';
import Slides from './components/Slides';
import AIQuickBar from './components/AIQuickBar';
import SpotifyPlayer from './components/SpotifyPlayer';
import TechResources from './components/TechResources';
import CustomCursor from './components/CustomCursor';
import Spotlight from './components/Spotlight';
import ProfileModal from './components/ProfileModal';
import ChatOverlay from './components/ChatOverlay';
import ChatPanel from './components/ChatPanel';
import FocusOverlay from './components/FocusOverlay';
import { subscribeToAuth, getUserProfile, getRecentMemoryNotes, logout } from './services/firebase';
import { sendMessageToGemini } from './services/geminiService';
import { createNewSession, saveSession } from './services/chatHistoryService';
import { initSpotifyAuth, exchangeSpotifyCodeForToken, getStoredSpotifyToken } from './services/authService';
import { UserProfile, ChatMessage, MemoryNote, ChatSession } from './types';

const App: React.FC = () => {
  useEffect(() => {
    const handleSpotify = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (window.location.pathname.startsWith('/callback')) {
        if (error) {
          window.history.replaceState({}, document.title, '/');
          return;
        }
        if (code) {
          const token = await exchangeSpotifyCodeForToken(code);
          window.history.replaceState({}, document.title, '/');
          if (token) {
            setSpotifyToken(token);
            console.log('Spotify connected');
          }
          return;
        }
      }

      const token = initSpotifyAuth();
      if (token) {
        setSpotifyToken(token);
        console.log('Spotify connected');
      }
    };

    handleSpotify();
  }, []);

  const [fullPageChatOpen, setFullPageChatOpen] = useState(false);
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [isSpotifyPlaying, setIsSpotifyPlaying] = useState(false);
  const [isHomeSpotifyVisible, setIsHomeSpotifyVisible] = useState(false);
  const [spotifyArtworkUrl, setSpotifyArtworkUrl] = useState<string | null>(null);
  const [isMixesOpen, setIsMixesOpen] = useState(false);
  const [homeSpotifySlot, setHomeSpotifySlot] = useState<HTMLDivElement | null>(null);
  const [focusSpotifySlot, setFocusSpotifySlot] = useState<HTMLDivElement | null>(null);
  const spotifyMountRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  if (!spotifyMountRef.current && typeof document !== 'undefined') {
    spotifyMountRef.current = document.createElement('div');
  }

  useEffect(() => {
    if (!spotifyToken) {
      setIsSpotifyPlaying(false);
      return;
    }
    let isMounted = true;
    const checkPlayback = () => {
      const storedToken = getStoredSpotifyToken();
      if (!storedToken) {
        if (isMounted) {
          setSpotifyToken(null);
          setIsSpotifyPlaying(false);
        }
        return;
      }
      fetch('https://api.spotify.com/v1/me/player', {
        headers: { Authorization: `Bearer ${storedToken}` }
      })
        .then((res) => (res.status === 204 ? null : res.json()))
        .then((data) => {
          if (!isMounted) return;
          setIsSpotifyPlaying(Boolean(data?.is_playing && data?.item));
        })
        .catch(() => {
          if (isMounted) setIsSpotifyPlaying(false);
        });
    };
    checkPlayback();
    const interval = window.setInterval(checkPlayback, 15000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [spotifyToken]);

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

  useEffect(() => {
    if (!spotifyToken || !spotifyMountRef.current) return;
    const target = isFocusMode ? focusSpotifySlot : homeSpotifySlot;
    if (!target) return;
    if (!target.contains(spotifyMountRef.current)) {
      target.appendChild(spotifyMountRef.current);
    }
  }, [spotifyToken, isFocusMode, homeSpotifySlot, focusSpotifySlot]);

  const spotifyPortal = spotifyToken && spotifyMountRef.current
    ? createPortal(
        <SpotifyPlayer
          className="w-full"
          tone={isFocusMode ? 'dark' : 'light'}
          onArtworkChange={setSpotifyArtworkUrl}
          onMenuToggle={setIsMixesOpen}
          preparePlayback={isFocusMode}
        />,
        spotifyMountRef.current
      )
    : null;

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
      setAuthChecked(true);
      const email = user?.email?.toLowerCase() || '';
      if (user && !email.endsWith('@bfhsla.org')) {
        setAuthError('Please sign in with your @bfhsla.org email address to access BFHS Internal.');
        setCurrentUser(null);
        setUserProfile(null);
        setIsProfileModalOpen(true);
        await logout();
        return;
      }
      setCurrentUser(user);
      if (user) {
        setAuthError(null);
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUserProfile(profile);
          setIsProfileModalOpen(false);
        }
        else {
          setUserProfile(null);
          setIsProfileModalOpen(true);
        }
      } else {
        setUserProfile(null);
        setIsProfileModalOpen(true);
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

  const isAuthorized = Boolean(currentUser?.email && currentUser.email.toLowerCase().endsWith('@bfhsla.org'));

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0B1310] text-white flex items-center justify-center text-sm">
        Checking access...
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0B1310] text-white">
        <ProfileModal
          isOpen={true}
          onClose={() => {}}
          user={null}
          profile={null}
          onProfileUpdate={setUserProfile}
          authMessage={authError}
        />
      </div>
    );
  }

  return (
    <div>
      <CustomCursor />
      <Spotlight />
      <div className="min-h-screen bg-[#F3F4F6] pb-20 relative font-sans transition-colors duration-500 overflow-x-hidden">
        <div className="bg-noise fixed inset-0 z-[1]" />
        <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-falcon-green/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[0]" />
        
        <FocusOverlay
          isActive={isFocusMode}
          onExit={toggleFocusMode}
          onSearch={handleSearch}
          currentSession={currentSession}
          isSending={isSending}
          userProfile={userProfile}
          onSignIn={() => setIsProfileModalOpen(true)}
          onNewChat={() => setCurrentSession(createNewSession())}
          spotifyArtworkUrl={spotifyArtworkUrl}
          isMixesOpen={isMixesOpen}
          spotifySlotRef={setFocusSpotifySlot}
        />
        {spotifyPortal}

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
                <div className={`w-full flex flex-col items-center ${spotifyToken ? 'gap-3' : 'gap-6'}`}>
                    <AIQuickBar onSearch={handleSearch} onOpenChat={() => { if (!currentSession) setCurrentSession(createNewSession()); setFullPageChatOpen(true); }} />
                    {spotifyToken && (
                        <div className="w-full max-w-3xl px-4">
                            <button
                                onClick={() => setIsHomeSpotifyVisible((prev) => !prev)}
                                className={`px-3 py-1.5 rounded-full border border-gray-300 text-[10px] uppercase tracking-[0.2em] text-gray-600 hover:text-gray-900 hover:border-gray-400 transition ${
                                    isHomeSpotifyVisible ? 'mb-2' : 'mb-1'
                                }`}
                            >
                                {isHomeSpotifyVisible ? 'Hide Spotify' : 'Show Spotify'}
                            </button>
                            <div
                                className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)] ${
                                    isHomeSpotifyVisible
                                        ? 'mt-2 max-h-[260px] opacity-100'
                                        : 'mt-0 max-h-0 opacity-0 pointer-events-none'
                                }`}
                            >
                                <div ref={setHomeSpotifySlot} className="w-full" />
                            </div>
                            <div className={`w-full max-w-[1200px] ${isHomeSpotifyVisible ? 'mt-4' : 'mt-1'}`}>
                                <Slides />
                            </div>
                        </div>
                    )}
                    {!spotifyToken && (
                        <div className="w-full max-w-[1200px] px-4">
                            <Slides />
                        </div>
                    )}
                </div>
            </div>
            
            <main className={`container mx-auto px-4 py-4 max-w-[1200px] space-y-16 relative z-10 transition-all duration-700 ease-spring ${fullPageChatOpen ? 'opacity-0 pointer-events-none scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
                  
                  <div className="space-y-12">
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

            <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} user={currentUser} profile={userProfile} onProfileUpdate={setUserProfile} authMessage={authError} />
        </div>
      </div>
    </div>
  );
};

export default App;
