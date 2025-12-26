
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
import ActivityOverlay from './components/ActivityOverlay';
import CommunityOverlay from './components/CommunityOverlay';
import { subscribeToAuth, getUserProfile, getRecentMemoryNotes, logout, saveUserProfile } from './services/firebase';
import { sendMessageToGemini } from './services/geminiService';
import { createNewSession, saveSession } from './services/chatHistoryService';
import { initSpotifyAuth, exchangeSpotifyCodeForToken, getStoredSpotifyToken, loginToSpotify } from './services/authService';
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
  const [isDashboardBarExpanded, setIsDashboardBarExpanded] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [activitySpotifySlot, setActivitySpotifySlot] = useState<HTMLDivElement | null>(null);
  const [isCommunityOpen, setIsCommunityOpen] = useState(false);

  // ROUTING LOGIC
  useEffect(() => {
      // 1. Check URL on load
      if (window.location.pathname === '/community') {
          setIsCommunityOpen(true);
      }

      // 2. Listen for back/forward button
      const handlePopState = () => {
          if (window.location.pathname === '/community') {
              setIsCommunityOpen(true);
          } else {
              setIsCommunityOpen(false);
          }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenCommunity = () => {
      setIsCommunityOpen(true);
      window.history.pushState({ page: 'community' }, '', '/community');
  };

  const handleCloseCommunity = () => {
      setIsCommunityOpen(false);
      // Go back if possible, otherwise replace
      if (window.history.state?.page === 'community') {
          window.history.back();
      } else {
          window.history.pushState(null, '', '/');
      }
  };
  
  // Christmas Mode - Default to TRUE, then check localStorage
  const [isChristmasMode, setIsChristmasMode] = useState(() => {
    const saved = localStorage.getItem('bfhs_christmas_mode');
    return saved !== null ? saved === 'true' : true;
  });

  // Persist Christmas mode whenever it changes
  useEffect(() => {
    localStorage.setItem('bfhs_christmas_mode', isChristmasMode.toString());
  }, [isChristmasMode]);

  const overflowXRef = useRef<{ body: string; html: string } | null>(null);

  useEffect(() => {
    if (isChristmasMode && !fullPageChatOpen) {
      document.body.classList.add('christmas-mode');
    } else {
      document.body.classList.remove('christmas-mode');
    }
  }, [isChristmasMode, fullPageChatOpen]);
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
    if (fullPageChatOpen || isFocusMode) return;
    if (!isDashboardBarExpanded) {
      if (overflowXRef.current) {
        document.body.style.overflowX = overflowXRef.current.body;
        document.documentElement.style.overflowX = overflowXRef.current.html;
        overflowXRef.current = null;
      }
      return;
    }
    if (!overflowXRef.current) {
      overflowXRef.current = {
        body: document.body.style.overflowX,
        html: document.documentElement.style.overflowX
      };
    }
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    return () => {
      if (!overflowXRef.current) return;
      document.body.style.overflowX = overflowXRef.current.body;
      document.documentElement.style.overflowX = overflowXRef.current.html;
      overflowXRef.current = null;
    };
  }, [isDashboardBarExpanded, fullPageChatOpen, isFocusMode]);

  useEffect(() => {
    if (fullPageChatOpen || isFocusMode) {
      setIsDashboardBarExpanded(false);
    }
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
    const target = isFocusMode ? focusSpotifySlot : isActivityOpen ? activitySpotifySlot : homeSpotifySlot;
    if (!target) return;
    if (!target.contains(spotifyMountRef.current)) {
      target.appendChild(spotifyMountRef.current);
    }
  }, [spotifyToken, isFocusMode, isActivityOpen, homeSpotifySlot, focusSpotifySlot, activitySpotifySlot]);

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

  const handleOpenFullScreen = () => {
    if (!currentSession || currentSession.messages.length === 0) {
      // Create a fresh session with a perfect context-aware greeting
      const welcomeMsg: ChatMessage = {
        id: 'welcome-' + Date.now(),
        role: 'model',
        text: "Welcome to **BFHS Help**! 🦅\n\nI'm your dedicated student portal assistant, ready to help you navigate school life at Ben Franklin. \n\nWhether you need to clarify a **policy** in the handbook, check the **bell schedule**, or need some deep **tutoring** for your classes, I'm here to support you. \n\n_What's on your mind today?_",
        timestamp: new Date()
      };
      
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [welcomeMsg],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      setCurrentSession(newSession);
      saveSession(newSession);
    }
    setFullPageChatOpen(true);
  };

  const handleOpenActivity = () => {
    if (isFocusMode) return;
    setIsActivityOpen(true);
  };

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user) => {
      setAuthChecked(true);
      const email = user?.email?.toLowerCase() || '';
      const isWhitelisted = email === 'ajerolleman1@gmail.com';
      
      if (user && !email.endsWith('@bfhsla.org') && !isWhitelisted) {
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
        
        // AUTO-SAVE EMAIL: If profile exists or is new, ensure email is synced
        const baseProfile = {
            uid: user.uid,
            name: profile?.name || user.displayName || 'Student',
            email: user.email?.toLowerCase(),
            grade: profile?.grade || '9th',
            allowMemory: profile?.allowMemory ?? true
        };
        await saveUserProfile(user.uid, baseProfile);

        if (profile) {
          setUserProfile({ ...profile, ...baseProfile });
          setIsProfileModalOpen(false);
        }
        else {
          setUserProfile(baseProfile as UserProfile);
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

  const isWhitelisted = currentUser?.email?.toLowerCase() === 'ajerolleman1@gmail.com';
  const isAuthorized = Boolean((currentUser?.email && currentUser.email.toLowerCase().endsWith('@bfhsla.org')) || isWhitelisted);

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
      <div 
        className="min-h-screen bg-[#F3F4F6] pb-20 relative font-sans transition-colors duration-500 overflow-x-hidden"
        style={(isChristmasMode && !fullPageChatOpen) ? {
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.2)), url("https://t3.ftcdn.net/jpg/03/05/14/48/360_F_305144878_OMA5iXpxmDowvZZLz1TOjt78lMa41GqF.jpg")',
            backgroundRepeat: 'no-repeat, repeat',
            backgroundSize: 'cover, 400px auto'
        } : {}}
      >
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
          onSpotifyLogin={loginToSpotify}
          isSpotifyConnected={Boolean(spotifyToken)}
        />
        {spotifyPortal}

        <div className={`transition-opacity duration-500 ${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div ref={headerRef} className={`z-[110] transition-all duration-700 ease-spring ${fullPageChatOpen ? 'fixed top-0 left-0 right-0' : 'relative'}`}>
                <div
                  style={{ paddingTop: '30px' }}
                  className={`header-safe bg-gradient-to-b from-[#1B3B2F] to-[#163127] transition-all duration-500 relative flex flex-col items-center gap-1 ${fullPageChatOpen ? 'pb-6' : 'pb-2'}`}
                >
                  <Header 
                    onOpenChat={handleOpenFullScreen} 
                    onOpenProfile={() => setIsProfileModalOpen(true)} 
                    userProfile={userProfile} 
                    currentUser={currentUser} 
                    compact={fullPageChatOpen} 
                    isFocusMode={isFocusMode} 
                    onToggleFocus={toggleFocusMode} 
                    onOpenActivity={handleOpenActivity} 
                    onOpenCommunity={handleOpenCommunity}
                    isPausedLogo={fullPageChatOpen}
                  />
                  <div className={`container mx-auto max-w-[1200px] relative z-10 flex justify-center transition-all duration-700 ease-spring ${fullPageChatOpen ? 'py-0' : 'py-0.5'}`}>
                      <QuickLinks compact={fullPageChatOpen} />
                  </div>
                </div>
                <div className={`bg-gradient-to-b from-[#163127] to-[#12261E] w-full shadow-inner relative transition-all duration-700 ease-spring overflow-hidden ${fullPageChatOpen ? 'max-h-0 opacity-0' : 'max-h-25 opacity-100'}`}>
                  <div className="w-3/4 mx-auto border-t border-white/10 pt-1"></div>
                  <div className="container mx-auto py-3 text-center relative">
                      <button onClick={() => window.location.href = '/?page=tech-info'} className="text-white/90 font-bold tracking-widest text-sm hover:text-falcon-gold transition-colors uppercase flex items-center justify-center w-full">
                          <span className="mr-2">🔧</span> TECH INFO: WIFI, PRINTING & MORE
                      </button>
                  </div>
                </div>
            </div>

            {/* Christmas Lights Border Line */}
            <div className="relative w-full h-0 z-[120] pointer-events-none">
                <div className="christmas-lights"></div>
            </div>

            {/* Christmas Toggle */}
            <button
              onClick={() => setIsChristmasMode(!isChristmasMode)}
              className="fixed bottom-6 left-6 z-[200] w-14 h-14 rounded-full bg-white shadow-2xl flex items-center justify-center text-2xl hover:scale-110 transition-transform active:scale-95 border-2 border-red-500"
              title="Toggle Christmas Mode"
            >
              {isChristmasMode ? '🎄' : '🎁'}
            </button>

            {fullPageChatOpen && <div style={{ height: headerHeight }} />}

            <div className={`z-[40] flex justify-center transition-all duration-1000 ease-spring ${fullPageChatOpen ? 'opacity-0 pointer-events-none absolute' : 'opacity-100 relative py-12 md:py-16'}`}>
                <div className={`w-full flex flex-col items-center ${spotifyToken ? 'gap-3' : 'gap-6'}`}>
                    <AIQuickBar
                      onSearch={handleSearch}
                      onOpenChat={handleOpenFullScreen}
                      onExpandChange={setIsDashboardBarExpanded}
                      lockScrollOnFocus={false}
                      searchMode="bfhs-google"
                    />
                    {spotifyToken && (
                        <div className="w-full max-w-3xl px-4">
                            <button
                                onClick={() => setIsHomeSpotifyVisible((prev) => !prev)}
                                className={`px-4 py-1.5 rounded-full backdrop-blur-md bg-white/40 border border-white/40 shadow-sm text-[10px] uppercase tracking-[0.2em] text-gray-700 hover:text-black hover:bg-white/60 hover:shadow-md transition-all duration-300 ${
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
            
            <main className={`container mx-auto px-4 py-4 pb-16 max-w-[1200px] space-y-16 relative z-10 transition-all duration-700 ease-spring ${fullPageChatOpen ? 'opacity-0 pointer-events-none scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
                  
                  <div className="space-y-12">
                      <News />
                  </div>

                  <footer className="text-center text-xs text-gray-400 font-mono mt-20 mb-4 border-t border-gray-200 dark:border-white/5 pt-8">
                      <p>BEN FRANKLIN HIGH SCHOOL</p>
                      <p className="mt-2 opacity-60">Katherine Johnson Campus © {new Date().getFullYear()}</p>
                  </footer>
            </main>

            <ChatOverlay
              isOpen={fullPageChatOpen}
              onClose={() => setFullPageChatOpen(false)}
              currentSession={currentSession}
              onSwitchSession={setCurrentSession}
              onNewChat={() => setCurrentSession(createNewSession())}
              topOffset={0}
              composer={<AIQuickBar onSearch={handleSearch} docked={true} searchMode="bfhs-only" />}
            >
                <ChatPanel messages={currentSession?.messages || []} isLoading={isSending} userProfile={userProfile} onSignInRequest={() => setIsProfileModalOpen(true)} hideInitialVerifiedSource={true} />
            </ChatOverlay>

            <ActivityOverlay
              isOpen={isActivityOpen}
              onClose={() => setIsActivityOpen(false)}
              userProfile={userProfile}
              spotifySlotRef={setActivitySpotifySlot}
            />

            <CommunityOverlay
                isOpen={isCommunityOpen}
                onClose={handleCloseCommunity}
                userProfile={userProfile}
            />

            <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} user={currentUser} profile={userProfile} onProfileUpdate={setUserProfile} authMessage={authError} />
        </div>
      </div>
    </div>
  );
};

export default App;
