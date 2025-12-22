const SPOTIFY_CLIENT_ID = '74092c1583494edcae059620291957ed';
const SPOTIFY_AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';

const TOKEN_KEY = 'spotify_token';
const EXPIRES_KEY = 'spotify_token_expires_at';
const VERIFIER_KEY = 'spotify_code_verifier';

const SPOTIFY_SCOPES = [
    'streaming',
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-modify-playback-state',
    'playlist-read-private',
    'playlist-read-collaborative'
];

const base64UrlEncode = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const sha256 = async (input: string) => {
    const data = new TextEncoder().encode(input);
    return crypto.subtle.digest('SHA-256', data);
};

const generateCodeVerifier = () => {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    return base64UrlEncode(array.buffer);
};

const generateCodeChallenge = async (verifier: string) => {
    const hashed = await sha256(verifier);
    return base64UrlEncode(hashed);
};

export const getSpotifyRedirectUri = () => {
    return 'https://bfhs-home.onrender.com/callback';
};

export const getSpotifyLoginUrl = async () => {
    const redirectUri = getSpotifyRedirectUri();
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem(VERIFIER_KEY, verifier);

    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: redirectUri,
        scope: SPOTIFY_SCOPES.join(' '),
        code_challenge_method: 'S256',
        code_challenge: challenge,
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
    sessionStorage.setItem(TOKEN_KEY, token);
    if (expiresIn) {
        const expiresAt = Date.now() + Number(expiresIn) * 1000;
        localStorage.setItem(EXPIRES_KEY, String(expiresAt));
        sessionStorage.setItem(EXPIRES_KEY, String(expiresAt));
    }
};

export const clearSpotifyAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EXPIRES_KEY);
};

export const getStoredSpotifyToken = () => {
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    const expiresAt = localStorage.getItem(EXPIRES_KEY) || sessionStorage.getItem(EXPIRES_KEY);
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

export const exchangeSpotifyCodeForToken = async (code: string) => {
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!verifier) return null;

    const body = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: getSpotifyRedirectUri(),
        code_verifier: verifier
    });

    const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (data.access_token) {
        storeToken(data.access_token, data.expires_in);
        sessionStorage.removeItem(VERIFIER_KEY);
        return data.access_token as string;
    }
    return null;
};
