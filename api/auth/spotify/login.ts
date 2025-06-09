
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { URL } from 'url'; // Import URL

// Assuming User model, db connection, and pkce utils are in backend
// Adjust paths as necessary based on your Vercel project structure and how it handles monorepos/imports
import User from '../../../../backend/models/User';
import connectDB from '../../../../backend/config/db';
import { generateCodeVerifier, generateCodeChallenge } from '../../../../backend/util/pkce';

const JWT_SECRET = process.env.JWT_SECRET;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI; // This MUST match what's in Spotify Dev Dashboard
const FRONTEND_URL = process.env.FRONTEND_URL;

const spotifyScopes = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-modify-public',
  'playlist-modify-private'
];

// Simplified authentication check for Vercel function
async function getAuthenticatedUserId(req: VercelRequest): Promise<string | null> {
  let token: string | undefined = undefined;
  const authHeader = req.headers['authorization'];

  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.soundtrace_session_token) {
    token = req.cookies.soundtrace_session_token;
  }

  if (!token || !JWT_SECRET) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { user: { id: string } };
    if (decoded && decoded.user && decoded.user.id) {
      // Optionally, verify user exists in DB for extra security, though JWT implies they did at issuance.
      // await connectDB();
      // const user = await User.findById(decoded.user.id).lean();
      // if (!user) return null;
      return decoded.user.id;
    }
    return null;
  } catch (err) {
    console.error("Token verification failed in Spotify login initiator:", err instanceof Error ? err.message : err);
    return null;
  }
}


const getCookieString = (name: string, value: string, options: any): string => {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  if (options.maxAge) cookie += `; Max-Age=${options.maxAge / 1000}`;
  if (options.path) cookie += `; Path=${options.path}`;
  if (options.domain) cookie += `; Domain=${options.domain}`;
  if (options.secure) cookie += `; Secure`;
  if (options.httpOnly) cookie += `; HttpOnly`;
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  return cookie;
};

const getSpotifyCookieOptions = (maxAgeMs: number) => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const options = {
    httpOnly: true,
    secure: nodeEnv === 'production',
    sameSite: nodeEnv === 'production' ? 'None' : 'Lax',
    path: '/',
    maxAge: maxAgeMs,
    // Domain might need careful configuration for Vercel preview/production URLs
    // Consider omitting domain or using a function to determine it if deployed to multiple subdomains.
    // For simplicity, if FRONTEND_URL is https://www.soundtrace.uk, domain might be .soundtrace.uk
    // If it's a vercel.app domain, this needs adjustment or removal.
    domain: nodeEnv === 'production' && process.env.COOKIE_DOMAIN ? process.env.COOKIE_DOMAIN : undefined
  };
  if (nodeEnv === 'production' && !options.secure) {
      console.warn("WARNING (spotifyAuth/login.ts): NODE_ENV is production, but 'secure' cookie attribute is false. This is usually incorrect for production cookies handling cross-site redirects.");
  }
  if (nodeEnv === 'production' && options.sameSite !== 'None') {
      console.warn("WARNING (spotifyAuth/login.ts): NODE_ENV is production, but 'sameSite' cookie attribute is not 'None'. This is usually incorrect for cross-site cookies in production handling cross-site redirects.");
  }
  return options;
};


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in Spotify login initiator.");
    return res.status(500).send("Server configuration error: JWT_SECRET missing.");
  }
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_REDIRECT_URI || !FRONTEND_URL) {
    console.error("Spotify auth configuration error: Client ID, Redirect URI, or Frontend URL is missing in Spotify login initiator.");
    return res.status(500).send("Server configuration error for Spotify authentication.");
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    // Redirect to frontend login page or send 401
    // For now, sending 401 as the original middleware would.
    console.warn("[spotifyAuth/login.ts] User not authenticated. Cannot initiate Spotify login.");
    return res.status(401).json({ message: 'User not authenticated. Please log in to SoundTrace first.' });
  }
   console.log(`[spotifyAuth/login.ts] Initiating Spotify login for SoundTrace user ID: ${userId}`);


  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString('hex');

  const cookieOpts = getSpotifyCookieOptions(5 * 60 * 1000); // 5 minutes for auth flow cookies

  const cookiesToSet = [
    getCookieString('spotify_auth_state', state, cookieOpts),
    getCookieString('spotify_code_verifier', codeVerifier, cookieOpts)
  ];

  res.setHeader('Set-Cookie', cookiesToSet);
  console.log(`[spotifyAuth/login.ts] Set cookies: spotify_auth_state, spotify_code_verifier with secure=${cookieOpts.secure}, sameSite=${cookieOpts.sameSite}, domain=${cookieOpts.domain}`);

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('client_id', SPOTIFY_CLIENT_ID);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', SPOTIFY_REDIRECT_URI);
  authUrl.searchParams.append('scope', spotifyScopes.join(' '));
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  authUrl.searchParams.append('code_challenge', codeChallenge);

  console.log(`[spotifyAuth/login.ts] Redirecting to Spotify: ${authUrl.toString().substring(0,120)}...`);
  res.redirect(302, authUrl.toString());
}
