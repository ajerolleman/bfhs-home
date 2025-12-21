import React, { useEffect, useState } from 'react';
import SpotifyWebPlayback from 'react-spotify-web-playback';
import { getSpotifyLoginUrl, initSpotifyAuth, clearSpotifyAuth } from '../services/authService';

interface SpotifyPlayerProps {
    uris?: string[];
    className?: string;
}

const DEFAULT_URIS = ['spotify:playlist:37i9dQZF1DWZeKCadgRdKQ'];

const SpotifyPlayer: React.FC<SpotifyPlayerProps> = ({ uris = DEFAULT_URIS, className }) => {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const nextToken = initSpotifyAuth();
        if (nextToken) setToken(nextToken);
    }, []);

    if (!token) {
        return (
            <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-4 ${className || ''}`}>
                <div className="text-xs font-bold uppercase tracking-widest text-falcon-gold">Spotify</div>
                <p className="text-xs text-white/60 mt-2">Connect Spotify to add focus music.</p>
                <button
                    onClick={() => {
                        window.location.href = getSpotifyLoginUrl();
                    }}
                    className="mt-3 px-4 py-2 rounded-full bg-[#1DB954] text-black text-xs font-bold uppercase tracking-widest hover:brightness-110 transition"
                >
                    Login to Spotify
                </button>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-4 ${className || ''}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold uppercase tracking-widest text-falcon-gold">Spotify Focus</div>
                <button
                    onClick={() => {
                        clearSpotifyAuth();
                        setToken(null);
                    }}
                    className="text-[10px] uppercase tracking-widest font-bold text-white/50 hover:text-white"
                >
                    Log out
                </button>
            </div>
            <SpotifyWebPlayback
                token={token}
                uris={uris}
                play={true}
                styles={{
                    bgColor: 'transparent',
                    color: '#FFFFFF',
                    sliderColor: '#EAB308',
                    trackArtistColor: '#E5E7EB',
                    trackNameColor: '#FFFFFF',
                    sliderHandleColor: '#EAB308'
                }}
            />
        </div>
    );
};

export default SpotifyPlayer;
