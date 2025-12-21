import React, { useCallback, useEffect, useRef, useState } from 'react';
import SpotifyWebPlayback from 'react-spotify-web-playback';
import { getSpotifyLoginUrl, initSpotifyAuth, clearSpotifyAuth } from '../services/authService';

interface SpotifyPlayerProps {
    uris?: string[];
    className?: string;
    onArtworkChange?: (url: string | null) => void;
    onMenuToggle?: (open: boolean) => void;
    layout?: 'horizontal' | 'vertical';
}
const PLAYLISTS = [
    { id: 'deep-focus', label: 'Deep Focus', uris: ['spotify:playlist:37i9dQZF1DWZeKCadgRdKQ'] },
    { id: 'lofi', label: 'Lo-Fi Beats', uris: ['spotify:playlist:37i9dQZF1DWWQRwui0ExPn'] },
    { id: 'piano', label: 'Peaceful Piano', uris: ['spotify:playlist:37i9dQZF1DX4sWSpwq3LiO'] },
    { id: 'jazz', label: 'Jazz Vibes', uris: ['spotify:playlist:37i9dQZF1DX4wta20PHgwo'] }
];

const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ uris, className, onArtworkChange, onMenuToggle, layout = 'horizontal' }) => {
    const isVertical = layout === 'vertical';
    const [token, setToken] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
    const [activeUris, setActiveUris] = useState<string[] | undefined>(uris && uris.length ? uris : undefined);
    const [selectedLabel, setSelectedLabel] = useState('Continue Listening');
    const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
    const [userPlaylists, setUserPlaylists] = useState<{ id: string; name: string; uri: string }[]>([]);
    const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
    const [playlistError, setPlaylistError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const artworkRef = useRef<string | null>(null);

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
        onMenuToggle?.(isMenuOpen);
    }, [isMenuOpen, onMenuToggle]);

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
    }, [updateArtwork]);

    useEffect(() => {
        try {
            const cached = localStorage.getItem('spotify_last_artwork_url');
            if (cached) updateArtwork(cached);
        } catch (e) {
            // Ignore storage failures.
        }
    }, [updateArtwork]);

    const fetchNowPlaying = useCallback((delay = 0) => {
        if (!token) return;
        const run = () => {
            fetch('https://api.spotify.com/v1/me/player', {
                headers: { Authorization: `Bearer ${token}` }
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
                .catch(() => {
                    // Ignore transient errors; keep cached art.
                });
        };
        if (delay > 0) {
            window.setTimeout(run, delay);
        } else {
            run();
        }
    }, [token, updateArtwork]);

    useEffect(() => {
        if (!token) return;
        fetchNowPlaying();
        const interval = window.setInterval(() => fetchNowPlaying(), 15000);
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
            if (label.includes('next') || label.includes('previous') || label.includes('skip')) {
                fetchNowPlaying(350);
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

    if (!token) {
        return (
            <div ref={containerRef} className={`relative w-full ${className || ''}`}>
                <div className={isVertical ? 'rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.6)]' : ''}>
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
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`relative w-full ${className || ''}`}>
            <div className={isVertical ? 'rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.6)]' : ''}>
                <div className={`flex ${isVertical ? 'flex-col gap-3' : 'items-center justify-between'}`}>
                    <div className={`${isVertical ? 'flex flex-col gap-2' : 'flex items-center gap-3'}`}>
                        {isVertical && (
                            <div className="text-[10px] uppercase tracking-[0.25em] text-white/60">Spotify Focus</div>
                        )}
                        <button
                            onClick={() => setIsMenuOpen((prev) => !prev)}
                            className={`px-3 py-1.5 rounded-full border border-white/15 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-white hover:border-white/40 transition ${
                                isVertical ? 'w-full text-center' : ''
                            }`}
                        >
                            {isMenuOpen ? 'Close Mixes' : 'Pull Up Mixes'}
                        </button>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">{selectedLabel}</span>
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
                        className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/50 hover:text-white transition"
                    >
                        Log out
                    </button>
                </div>

                <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)] ${
                    isMenuOpen ? (isVertical ? 'max-h-56 opacity-100 mt-4' : 'max-h-40 opacity-100 mt-4') : 'max-h-0 opacity-0 mt-0'
                }`}>
                    <div className={`mx-auto w-full ${isVertical ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2'}`}>
                        {PLAYLISTS.map((playlist) => (
                            <button
                                key={playlist.id}
                                onClick={() => {
                                    setSelectedPlaylistId(playlist.id);
                                    setActiveUris(playlist.uris);
                                    setSelectedLabel(playlist.label);
                                }}
                                className={`px-3 py-2 rounded-full text-[10px] uppercase tracking-[0.2em] border transition ${
                                    selectedPlaylistId === playlist.id
                                        ? 'border-falcon-gold/60 text-falcon-gold bg-white/10'
                                        : 'border-white/10 text-white/60 hover:text-white hover:border-white/40'
                                }`}
                            >
                                {playlist.label}
                            </button>
                        ))}
                        {userPlaylists.map((playlist) => (
                            <button
                                key={playlist.id}
                                onClick={() => {
                                    setSelectedPlaylistId(`user:${playlist.id}`);
                                    setActiveUris([playlist.uri]);
                                    setSelectedLabel(playlist.name);
                                }}
                                className="px-3 py-2 rounded-full text-[10px] uppercase tracking-[0.2em] border border-white/10 text-white/60 hover:text-white hover:border-white/40 transition"
                            >
                                {playlist.name}
                            </button>
                        ))}
                        <button
                            onClick={() => window.open('https://open.spotify.com/dj', '_blank', 'noopener,noreferrer')}
                            className="px-3 py-2 rounded-full text-[10px] uppercase tracking-[0.2em] border border-white/10 text-white/60 hover:text-white hover:border-white/40 transition"
                        >
                            DJ Mode
                        </button>
                    </div>
                    <div className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/40">
                        {isLoadingPlaylists && 'Loading your playlists...'}
                        {!isLoadingPlaylists && playlistError && playlistError}
                        {!isLoadingPlaylists && !playlistError && userPlaylists.length === 0 && 'No playlists found.'}
                    </div>
                </div>

                <div className={`transition-transform duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)] ${isMenuOpen ? 'translate-y-3' : 'translate-y-0'} mt-4`}>
                    <div className="mx-auto w-full max-w-2xl">
                        <div className={`flex ${isVertical ? 'flex-col items-center gap-4' : 'items-center gap-4'}`}>
                            {artworkUrl && (
                                <div className={`${isVertical ? 'h-[96px] w-[96px]' : 'h-[72px] w-[72px]'} rounded-xl overflow-hidden border border-white/10 bg-white/5 shrink-0`}>
                                    <img
                                        src={artworkUrl}
                                        alt="Now playing cover"
                                        className="h-full w-full object-cover relative z-10"
                                    />
                                </div>
                            )}
                            <div className="flex-1 min-w-0 w-full">
                                <SpotifyWebPlayback
                                    token={token}
                                    uris={activeUris}
                                    callback={handlePlayback}
                                    layout="compact"
                                    hideCoverArt={true}
                                    hideAttribution={true}
                                    inlineVolume={false}
                                    styles={{
                                        activeColor: '#EAB308',
                                        bgColor: 'transparent',
                                        color: '#FFFFFF',
                                        errorColor: '#F87171',
                                        loaderColor: '#EAB308',
                                        sliderColor: '#EAB308',
                                        sliderHandleColor: '#EAB308',
                                        sliderHandleBorderRadius: '999px',
                                        sliderTrackBorderRadius: '999px',
                                        sliderTrackColor: 'rgba(255,255,255,0.2)',
                                        trackArtistColor: '#D1D5DB',
                                        trackNameColor: '#FFFFFF',
                                        height: isVertical ? 88 : 72,
                                        sliderHeight: 4
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpotifyPlayer;
