import React, { useCallback, useEffect, useRef, useState } from 'react';
import SpotifyWebPlayback from 'react-spotify-web-playback';
import { getSpotifyLoginUrl, initSpotifyAuth, clearSpotifyAuth } from '../services/authService';

interface SpotifyPlayerProps {
    uris?: string[];
    className?: string;
    onArtworkChange?: (url: string | null) => void;
    onMenuToggle?: (open: boolean) => void;
    tone?: 'light' | 'dark';
}
const PLAYLISTS = [
    { id: 'deep-focus', label: 'Deep Focus', uris: ['spotify:playlist:37i9dQZF1DWZeKCadgRdKQ'] },
    { id: 'lofi', label: 'Lo-Fi Beats', uris: ['spotify:playlist:37i9dQZF1DWWQRwui0ExPn'] },
    { id: 'piano', label: 'Peaceful Piano', uris: ['spotify:playlist:37i9dQZF1DX4sWSpwq3LiO'] },
    { id: 'jazz', label: 'Jazz Vibes', uris: ['spotify:playlist:37i9dQZF1DX4wta20PHgwo'] }
];

const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ uris, className, onArtworkChange, onMenuToggle, tone = 'dark' }) => {
    const isLightTone = tone === 'light';
    const [token, setToken] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
    const [activeUris, setActiveUris] = useState<string[] | undefined>(uris && uris.length ? uris : undefined);
    const [selectedLabel, setSelectedLabel] = useState('Continue Listening');
    const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
    const [userPlaylists, setUserPlaylists] = useState<{ id: string; name: string; uri: string }[]>([]);
    const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
    const [playlistError, setPlaylistError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playerKey, setPlayerKey] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const artworkRef = useRef<string | null>(null);
    const fetchAbortRef = useRef<AbortController | null>(null);
    const lastFetchRef = useRef(0);
    const lastPlaybackRef = useRef(0);
    const retryCountRef = useRef(0);
    const loadStartRef = useRef(0);
    const playRequestRef = useRef(0);

    useEffect(() => {
        if (uris && uris.length > 0) {
            setActiveUris(uris);
            setSelectedPlaylistId('default');
            setSelectedLabel('Selected Mix');
        } else {
            setActiveUris(undefined);
            setSelectedPlaylistId(null);
            setSelectedLabel('Continue Listening');
        }
    }, [uris]);

    useEffect(() => {
        if (!isMenuOpen) return;
        const handleOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (containerRef.current && !containerRef.current.contains(target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [isMenuOpen]);

    useEffect(() => {
        const nextToken = initSpotifyAuth();
        if (nextToken) setToken(nextToken);
    }, []);

    const updateArtwork = useCallback((url: string | null) => {
        if (!url) return;
        if (url !== artworkRef.current) {
            artworkRef.current = url;
            setArtworkUrl(url);
            onArtworkChange?.(url);
            try {
                localStorage.setItem('spotify_last_artwork_url', url);
            } catch (e) {
                // Ignore storage failures.
            }
        }
    }, [onArtworkChange]);

    const handlePlayback = useCallback((state: any) => {
        const images = state?.track?.album?.images;
        const nextUrl =
            images?.[0]?.url ||
            images?.[1]?.url ||
            images?.[2]?.url ||
            null;
        updateArtwork(nextUrl);
        if (typeof state?.isPlaying === 'boolean') {
            if (state.isPlaying) {
                setIsPlaying(true);
                playRequestRef.current = 0;
            } else {
                const requestedAt = playRequestRef.current;
                if (!requestedAt || Date.now() - requestedAt > 2000) {
                    setIsPlaying(false);
                }
            }
        }
        if (state?.track?.uri || state?.track?.name) {
            lastPlaybackRef.current = Date.now();
            retryCountRef.current = 0;
        }
    }, [updateArtwork]);

    useEffect(() => {
        try {
            const cached = localStorage.getItem('spotify_last_artwork_url');
            if (cached) updateArtwork(cached);
        } catch (e) {
            // Ignore storage failures.
        }
    }, [updateArtwork]);

    const fetchNowPlaying = useCallback((delay = 0, immediate = false) => {
        if (!token) return;
        const run = () => {
            const now = Date.now();
            if (!immediate && now - lastFetchRef.current < 2500) return;
            lastFetchRef.current = now;
            fetchAbortRef.current?.abort();
            const controller = new AbortController();
            fetchAbortRef.current = controller;
            fetch('https://api.spotify.com/v1/me/player', {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal
            })
                .then((res) => (res.status === 204 ? null : res.json()))
                .then((data) => {
                    const images = data?.item?.album?.images;
                    const nextUrl =
                        images?.[0]?.url ||
                        images?.[1]?.url ||
                        images?.[2]?.url ||
                        null;
                    updateArtwork(nextUrl);
                })
                .catch((error) => {
                    if (error?.name === 'AbortError') return;
                    // Ignore transient errors; keep cached art.
                });
        };
        if (delay > 0) {
            window.setTimeout(run, delay);
        } else {
            run();
        }
    }, [token, updateArtwork]);

    const handleMixSelect = useCallback((nextId: string | null, label: string, nextUris?: string[]) => {
        setSelectedPlaylistId(nextId);
        setActiveUris(nextUris && nextUris.length ? nextUris : undefined);
        setSelectedLabel(label);
        playRequestRef.current = Date.now();
        setIsPlaying(true);
        fetchNowPlaying(250, true);
    }, [fetchNowPlaying]);

    const togglePlayback = useCallback(async () => {
        if (!token) return;
        const nextPlayState = !isPlaying;
        if (nextPlayState) {
            playRequestRef.current = Date.now();
        } else {
            playRequestRef.current = 0;
        }
        setIsPlaying(nextPlayState);
        try {
            await fetch(`https://api.spotify.com/v1/me/player/${nextPlayState ? 'play' : 'pause'}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (e) {
            // Ignore transient playback failures.
        }
        fetchNowPlaying(200, true);
    }, [token, isPlaying, fetchNowPlaying]);

    useEffect(() => {
        onMenuToggle?.(isMenuOpen);
        if (isMenuOpen) fetchNowPlaying(0, true);
    }, [isMenuOpen, onMenuToggle, fetchNowPlaying]);

    useEffect(() => {
        if (!token) return;
        fetchNowPlaying(0, true);
        const interval = window.setInterval(() => fetchNowPlaying(), 8000);
        return () => window.clearInterval(interval);
    }, [token, fetchNowPlaying]);

    useEffect(() => {
        if (!token) return;
        loadStartRef.current = Date.now();
        const interval = window.setInterval(() => {
            const now = Date.now();
            const last = lastPlaybackRef.current || loadStartRef.current;
            if (now - last < 12000) return;
            if (retryCountRef.current >= 3) return;
            retryCountRef.current += 1;
            loadStartRef.current = now;
            setPlayerKey((prev) => prev + 1);
            fetchNowPlaying(0, true);
        }, 4000);
        return () => window.clearInterval(interval);
    }, [token, fetchNowPlaying]);

    useEffect(() => {
        if (!token) return;
        const container = containerRef.current;
        if (!container) return;
        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            const button = target?.closest('button');
            if (!button) return;
            const label = button.getAttribute('aria-label')?.toLowerCase() || '';
            if (label.includes('play') || label.includes('pause')) {
                fetchNowPlaying(120, true);
                return;
            }
            if (label.includes('next') || label.includes('previous') || label.includes('skip')) {
                fetchNowPlaying(200, true);
            }
        };
        container.addEventListener('click', handleClick, true);
        return () => container.removeEventListener('click', handleClick, true);
    }, [token, fetchNowPlaying]);

    useEffect(() => {
        if (!token) return;
        setIsLoadingPlaylists(true);
        setPlaylistError(null);
        fetch('https://api.spotify.com/v1/me/playlists?limit=8', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then((res) => {
                if (!res.ok) throw new Error('playlists_error');
                return res.json();
            })
            .then((data) => {
                const items = Array.isArray(data?.items) ? data.items : [];
                const cleaned = items
                    .filter((item: any) => item && item.id && item.name && item.uri)
                    .map((item: any) => ({
                        id: String(item.id),
                        name: String(item.name),
                        uri: String(item.uri)
                    }));
                setUserPlaylists(cleaned);
            })
            .catch(() => {
                setPlaylistError('Unable to load your playlists.');
            })
            .finally(() => setIsLoadingPlaylists(false));
    }, [token]);

    useEffect(() => {
        if (!token) return;
        const isTypingElement = (element: Element | null) => {
            if (!element) return false;
            const tag = element.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
            if ((element as HTMLElement).isContentEditable) return true;
            const role = element.getAttribute('role');
            return role === 'textbox' || role === 'searchbox';
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            const isSpace =
                event.code === 'Space' ||
                event.key === ' ' ||
                event.key === 'Spacebar';
            if (!isSpace) return;
            if (isTypingElement(document.activeElement)) return;
            event.preventDefault();
            togglePlayback();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [token, togglePlayback]);

    if (!token) {
        return (
            <div ref={containerRef} className={`relative w-full ${className || ''}`}>
                <div className="text-xs font-bold uppercase tracking-widest text-falcon-gold">Spotify Focus</div>
                <p className="text-xs text-white/60 mt-2">Connect Spotify to add focus music.</p>
                <button
                    onClick={async () => {
                        const url = await getSpotifyLoginUrl();
                        window.location.href = url;
                    }}
                    className="mt-4 px-5 py-2.5 rounded-full bg-[#1DB954] text-black text-xs font-bold uppercase tracking-widest hover:brightness-110 transition shadow-[0_10px_24px_-12px_rgba(29,185,84,0.7)]"
                >
                    Login to Spotify
                </button>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`relative w-full ${className || ''}`}>
            <div className="w-full flex justify-center">
                <div className="relative w-full max-w-3xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsMenuOpen((prev) => !prev)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] uppercase tracking-[0.2em] transition ${
                                    isLightTone
                                        ? 'border-black/30 text-gray-900 hover:text-black hover:border-black/60'
                                        : 'border-white/20 text-white/80 hover:text-white hover:border-white/60'
                                }`}
                                aria-expanded={isMenuOpen}
                            >
                                <span className="text-xs font-bold">{'<'}</span>
                                <span>Playlists</span>
                            </button>
                            <span className={`text-[10px] uppercase tracking-[0.2em] ${isLightTone ? 'text-gray-600' : 'text-white/50'}`}>
                                {selectedLabel}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                clearSpotifyAuth();
                                setToken(null);
                                setArtworkUrl(null);
                                artworkRef.current = null;
                                onArtworkChange?.(null);
                                try {
                                    localStorage.removeItem('spotify_last_artwork_url');
                                } catch (e) {
                                    // Ignore storage failures.
                                }
                            }}
                            className={`text-[10px] uppercase tracking-[0.2em] font-bold transition ${
                                isLightTone ? 'text-gray-700 hover:text-black' : 'text-white/50 hover:text-white'
                            }`}
                        >
                            Log out
                        </button>
                    </div>

                    <div
                        className={`absolute right-full top-1/2 -translate-y-1/2 mr-6 w-[260px] max-w-[70vw] rounded-2xl border backdrop-blur-2xl shadow-[0_24px_60px_-30px_rgba(0,0,0,0.75)] transition-all duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)] ${
                            isLightTone
                                ? 'border-black/25 bg-black/80 text-white'
                                : 'border-white/15 bg-white/10 text-white'
                        } ${
                            isMenuOpen ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-4 pointer-events-none'
                        }`}
                    >
                        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                            <div className="text-[10px] uppercase tracking-[0.3em] text-white/80 font-bold">Mixes</div>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="text-[10px] uppercase tracking-[0.3em] text-white/60 hover:text-white transition"
                            >
                                Close
                            </button>
                        </div>
                        <div className="p-3 max-h-[260px] overflow-y-auto space-y-2">
                            <button
                                onClick={() => handleMixSelect(null, 'Continue Listening')}
                                className={`w-full text-left px-3 py-2 rounded-xl text-[10px] uppercase tracking-[0.2em] transition ${
                                    selectedPlaylistId === null
                                        ? 'bg-white/20 text-white border border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                                        : 'bg-white/5 text-white/70 border border-white/10 hover:text-white hover:border-white/30'
                                }`}
                            >
                                Continue Listening
                            </button>
                            <div className="text-[9px] uppercase tracking-[0.3em] text-white/50 pt-2">Featured</div>
                            {PLAYLISTS.map((playlist) => (
                                <button
                                    key={playlist.id}
                                    onClick={() => handleMixSelect(playlist.id, playlist.label, playlist.uris)}
                                    className={`w-full text-left px-3 py-2 rounded-xl text-[10px] uppercase tracking-[0.2em] transition ${
                                        selectedPlaylistId === playlist.id
                                            ? 'bg-white/20 text-white border border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                                            : 'bg-white/5 text-white/70 border border-white/10 hover:text-white hover:border-white/30'
                                    }`}
                                >
                                    {playlist.label}
                                </button>
                            ))}
                            <div className="text-[9px] uppercase tracking-[0.3em] text-white/50 pt-2">Your Playlists</div>
                            {userPlaylists.map((playlist) => (
                                <button
                                    key={playlist.id}
                                    onClick={() => handleMixSelect(`user:${playlist.id}`, playlist.name, [playlist.uri])}
                                    className={`w-full text-left px-3 py-2 rounded-xl text-[10px] uppercase tracking-[0.2em] transition ${
                                        selectedPlaylistId === `user:${playlist.id}`
                                            ? 'bg-white/20 text-white border border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                                            : 'bg-white/5 text-white/70 border border-white/10 hover:text-white hover:border-white/30'
                                    }`}
                                >
                                    {playlist.name}
                                </button>
                            ))}
                            <button
                                onClick={() => window.open('https://open.spotify.com/dj', '_blank', 'noopener,noreferrer')}
                                className="w-full text-left px-3 py-2 rounded-xl text-[10px] uppercase tracking-[0.2em] bg-white/5 text-white/70 border border-white/10 hover:text-white hover:border-white/30 transition"
                            >
                                DJ Mode
                            </button>
                        </div>
                        <div className="px-4 pb-3 text-[9px] uppercase tracking-[0.3em] text-white/40">
                            {isLoadingPlaylists && 'Loading your playlists...'}
                            {!isLoadingPlaylists && playlistError && playlistError}
                            {!isLoadingPlaylists && !playlistError && userPlaylists.length === 0 && 'No playlists found.'}
                        </div>
                    </div>

                    <div className={`transition-transform duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)] ${isMenuOpen ? 'translate-y-3' : 'translate-y-0'} mt-4`}>
                        <div className="w-full">
                            <div className="flex items-center gap-4">
                            {artworkUrl && (
                                <div className={`h-[72px] w-[72px] rounded-xl overflow-hidden border shrink-0 ${
                                    isLightTone ? 'border-black/20 bg-black/5' : 'border-white/10 bg-white/5'
                                }`}>
                                    <img
                                        src={artworkUrl}
                                        alt="Now playing cover"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            )}
                                <div className="flex-1 min-w-0">
                                    <SpotifyWebPlayback
                                        key={`spotify-player-${playerKey}`}
                                        token={token}
                                        uris={activeUris}
                                        play={isPlaying}
                                        callback={handlePlayback}
                                        layout="compact"
                                        hideCoverArt={true}
                                        hideAttribution={true}
                                        inlineVolume={false}
                                        styles={{
                                            activeColor: isLightTone ? '#111827' : '#EAB308',
                                            bgColor: 'transparent',
                                            color: isLightTone ? '#111827' : '#FFFFFF',
                                            errorColor: isLightTone ? '#DC2626' : '#F87171',
                                            loaderColor: isLightTone ? '#111827' : '#EAB308',
                                            sliderColor: isLightTone ? '#111827' : '#EAB308',
                                            sliderHandleColor: isLightTone ? '#111827' : '#EAB308',
                                            sliderHandleBorderRadius: '999px',
                                            sliderTrackBorderRadius: '999px',
                                            sliderTrackColor: isLightTone ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
                                            trackArtistColor: isLightTone ? '#4B5563' : '#D1D5DB',
                                            trackNameColor: isLightTone ? '#111827' : '#FFFFFF',
                                            height: 72,
                                            sliderHeight: 4
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpotifyPlayer;
