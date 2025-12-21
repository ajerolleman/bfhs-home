const SPOTIFY_CLIENT_ID = '74092c1583494edcae059620291957ed';
const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';

const TOKEN_KEY = 'spotify_token';
const EXPIRES_KEY = 'spotify_token_expires_at';

const SPOTIFY_SCOPES = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state'
];

export const getSpotifyRedirectUri = () => {
    const origin = window.location.origin;
    if (origin.includes('localhost')) {
        return 'http://localhost:5173/callback';
    }
    return 'https://bfhs-home.onrender.com/callback';
};

export const getSpotifyLoginUrl = () => {
    const redirectUri = getSpotifyRedirectUri();
    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'token',
        redirect_uri: redirectUri,
        scope: SPOTIFY_SCOPES.join(' '),
        show_dialog: 'true'
    });

    return `${SPOTIFY_AUTH_ENDPOINT}?${params.toString()}`;
};

const clearHash = () => {
    if (!window.location.hash) return;
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
};

const storeToken = (token: string, expiresIn?: string | null) => {
    localStorage.setItem(TOKEN_KEY, token);
    if (expiresIn) {
        const expiresAt = Date.now() + Number(expiresIn) * 1000;
        localStorage.setItem(EXPIRES_KEY, String(expiresAt));
    }
};

export const clearSpotifyAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_KEY);
};

export const getStoredSpotifyToken = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    const expiresAt = localStorage.getItem(EXPIRES_KEY);
    if (expiresAt && Date.now() > Number(expiresAt)) {
        clearSpotifyAuth();
        return null;
    }
    return token;
};

export const initSpotifyAuth = () => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.replace('#', '?'));
        const token = params.get('access_token');
        const expiresIn = params.get('expires_in');

        if (token) {
            storeToken(token, expiresIn);
            clearHash();
            return token;
        }
    }
    return getStoredSpotifyToken();
};
