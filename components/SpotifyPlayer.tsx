import React, { useEffect, useMemo, useRef, useState } from 'react';
import SpotifyWebPlayback from 'react-spotify-web-playback';
import { getSpotifyLoginUrl, initSpotifyAuth, clearSpotifyAuth } from '../services/authService';

interface SpotifyPlayerProps {
    uris?: string[];
    className?: string;
}

const DEFAULT_URIS = ['spotify:playlist:37i9dQZF1DWZeKCadgRdKQ'];
const PLAYLISTS = [
    { id: 'deep-focus', label: 'Deep Focus', uris: ['spotify:playlist:37i9dQZF1DWZeKCadgRdKQ'] },
    { id: 'lofi', label: 'Lo-Fi Beats', uris: ['spotify:playlist:37i9dQZF1DWWQRwui0ExPn'] },
    { id: 'piano', label: 'Peaceful Piano', uris: ['spotify:playlist:37i9dQZF1DX4sWSpwq3LiO'] },
    { id: 'jazz', label: 'Jazz Vibes', uris: ['spotify:playlist:37i9dQZF1DX4wta20PHgwo'] }
];

const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ uris = DEFAULT_URIS, className }) => {
    const [token, setToken] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState(PLAYLISTS[0].id);
    const [activeUris, setActiveUris] = useState<string[]>(uris);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setActiveUris(uris);
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

    const selectedPlaylist = useMemo(
        () => PLAYLISTS.find((item) => item.id === selectedPlaylistId) || PLAYLISTS[0],
        [selectedPlaylistId]
    );

    useEffect(() => {
        const nextToken = initSpotifyAuth();
        if (nextToken) setToken(nextToken);
    }, []);

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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsMenuOpen((prev) => !prev)}
                        className="px-3 py-1.5 rounded-full border border-white/15 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:text-white hover:border-white/40 transition"
                    >
                        {isMenuOpen ? 'Close Mixes' : 'Pull Up Mixes'}
                    </button>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">{selectedPlaylist.label}</span>
                </div>
                <button
                    onClick={() => {
                        clearSpotifyAuth();
                        setToken(null);
                    }}
                    className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/50 hover:text-white transition"
                >
                    Log out
                </button>
            </div>

            <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)] ${isMenuOpen ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                <div className="mx-auto w-full max-w-2xl flex flex-wrap gap-2">
                    {PLAYLISTS.map((playlist) => (
                        <button
                            key={playlist.id}
                            onClick={() => {
                                setSelectedPlaylistId(playlist.id);
                                setActiveUris(playlist.uris);
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
                    <button
                        onClick={() => window.open('https://open.spotify.com/dj', '_blank', 'noopener,noreferrer')}
                        className="px-3 py-2 rounded-full text-[10px] uppercase tracking-[0.2em] border border-white/10 text-white/60 hover:text-white hover:border-white/40 transition"
                    >
                        DJ Mode
                    </button>
                </div>
            </div>

            <div className={`transition-transform duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1)] ${isMenuOpen ? 'translate-y-3' : 'translate-y-0'} mt-4`}>
                <div className="mx-auto w-full max-w-2xl">
                    <SpotifyWebPlayback
                        token={token}
                        uris={activeUris}
                        play={true}
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
                            height: 72,
                            sliderHeight: 4
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default SpotifyPlayer;
