
import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch'; // Using node-fetch for consistency with backend
import { URLSearchParams } from 'url';
import jwt from 'jsonwebtoken';

// Assuming User model and db connection are in backend
// Adjust paths as necessary
import User from '../../../../backend/models/User';
import connectDB from '../../../../backend/config/db';
// PKCE utils are not directly used in callback logic here other than reading cookie
// but SPOTIFY_CLIENT_SECRET is crucial.

const JWT_SECRET = process.env.JWT_SECRET;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI; // This MUST match what's in Spotify Dev Dashboard
const FRONTEND_URL = process.env.FRONTEND_URL;


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
      return decoded.user.id;
    }
    return null;
  } catch (err) {
    console.error("Token verification failed in Spotify callback:", err instanceof Error ? err.message : err);
    return null;
  }
}

const getCookieString = (name: string, value: string, options: any): string => {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  if (options.maxAge) cookie += `; Max-Age=${options.maxAge / 1000}`;
  else if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
  if (options.path) cookie += `; Path=${options.path}`;
  if (options.domain) cookie += `; Domain=${options.domain}`;
  if (options.secure) cookie += `; Secure`;
  if (options.httpOnly) cookie += `; HttpOnly`;
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  return cookie;
};

const getSpotifyCookieOptions = (maxAgeMs: number) => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const options: any = { // Use 'any' for options to allow 'expires'
    httpOnly: true,
    secure: nodeEnv === 'production',
    sameSite: nodeEnv === 'production' ? 'None' : 'Lax',
    path: '/',
    domain: nodeEnv === 'production' && process.env.COOKIE_DOMAIN ? process.env.COOKIE_DOMAIN : undefined
  };
   if (maxAgeMs === 0) {
    options.expires = new Date(0); // Expire immediately
  } else {
    options.maxAge = maxAgeMs;
  }
  return options;
};


export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[spotifyAuth/callback.ts] ENTERED. Query: ${JSON.stringify(req.query)}, Cookies: spotify_auth_state=${req.cookies?.spotify_auth_state ? 'present' : 'MISSING'}, spotify_code_verifier=${req.cookies?.spotify_code_verifier ? 'present' : 'MISSING'}`);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Perform critical environment variable checks early
  if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in Spotify callback.");
    // For critical config errors, a direct 500 might be more revealing than a redirect.
    return res.status(500).json({ message: "Server configuration error: JWT_SECRET missing." });
  }
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI || !FRONTEND_URL) {
    console.error("CRITICAL: Spotify/Frontend URL config missing in callback.");
     // If FRONTEND_URL itself is missing, we can't reliably redirect.
    return res.status(500).json({ message: "Server configuration error: Spotify/Frontend URL(s) missing." });
  }

  const soundTraceUserId = await getAuthenticatedUserId(req);
  if (!soundTraceUserId) {
    console.error("[spotifyAuth/callback.ts] User not authenticated with SoundTrace. Cannot process Spotify callback.");
    return res.redirect(302, `${FRONTEND_URL}/spotify-callback-receiver?status=error&message=UserSessionExpired`);
  }
  console.log(`[spotifyAuth/callback.ts] SoundTrace User ID from auth: ${soundTraceUserId}`);

  const { code, state, error: spotifyError } = req.query;
  const storedState = req.cookies.spotify_auth_state;
  const codeVerifier = req.cookies.spotify_code_verifier;

  // Clear cookies regardless of outcome after this point
  const cookieClearOpts = getSpotifyCookieOptions(0);
  const cookiesToClear = [
    getCookieString('spotify_auth_state', '', cookieClearOpts),
    getCookieString('spotify_code_verifier', '', cookieClearOpts)
  ];
  res.setHeader('Set-Cookie', cookiesToClear);
  console.log('[spotifyAuth/callback.ts] Cleared cookies: spotify_auth_state and spotify_code_verifier');


  if (spotifyError) {
    console.error('Spotify returned an error during authorization:', spotifyError);
    let friendlyMessage = 'SpotifyAuthorizationFailed';
    if (spotifyError === 'access_denied') friendlyMessage = 'AccessDenied';
    return res.redirect(302, `${FRONTEND_URL}/spotify-callback-receiver?status=error&message=${encodeURIComponent(String(friendlyMessage))}`);
  }

  if (!state || state !== storedState) {
    console.error('Spotify callback state mismatch:', { received: state, stored: storedState });
    return res.redirect(302, `${FRONTEND_URL}/spotify-callback-receiver?status=error&message=StateMismatch`);
  }
  if (!codeVerifier) {
    console.error('Spotify callback missing code_verifier cookie.');
    return res.redirect(302, `${FRONTEND_URL}/spotify-callback-receiver?status=error&message=MissingVerifier`);
  }

  try {
    await connectDB(); // Ensure DB connection

    const tokenRequestBody = new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: SPOTIFY_REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: String(codeVerifier)
      });

    console.log('[spotifyAuth/callback.ts] Requesting token from Spotify with body:', tokenRequestBody.toString());

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + (Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'))
      },
      body: tokenRequestBody.toString() // Ensure body is string
    });

    const tokenResponseText = await tokenResponse.text();

    if (!tokenResponse.ok) {
      let errorDescription = 'TokenExchangeFailed';
       try {
        const errorBodyJson = JSON.parse(tokenResponseText);
        if (errorBodyJson.error_description) errorDescription = errorBodyJson.error_description;
        else if (errorBodyJson.error) errorDescription = errorBodyJson.error;
        console.error(`Spotify token exchange error (${tokenResponse.status}):`, errorBodyJson);
      } catch (e) {
        console.error(`Spotify token exchange error (${tokenResponse.status}) (Non-JSON response): ${tokenResponseText.substring(0,500)}`);
        errorDescription = tokenResponseText.substring(0, 100);
      }
      return res.redirect(302, `${FRONTEND_URL}/spotify-callback-receiver?status=error&message=${encodeURIComponent(errorDescription)}`);
    }

    const tokens = JSON.parse(tokenResponseText);
    const { access_token, refresh_token, expires_in } = tokens;

    console.log('[spotifyAuth/callback.ts] Tokens received. Fetching Spotify user profile...');
    const userProfileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    if (!userProfileResponse.ok) {
        const profileErrorBodyText = await userProfileResponse.text();
        let errorMessage = "ProfileFetchFailed";
        try {
            const profileErrorJson = JSON.parse(profileErrorBodyText);
            errorMessage = profileErrorJson.error?.message || userProfileResponse.statusText || "ProfileFetchFailed";
            console.error(`Failed to fetch Spotify user profile (${userProfileResponse.status}):`, profileErrorJson);
        } catch(e){
            console.error(`Failed to fetch Spotify user profile (${userProfileResponse.status}) (Non-JSON response): ${profileErrorBodyText.substring(0,500)}`);
        }
        return res.redirect(302, `${FRONTEND_URL}/spotify-callback-receiver?status=error&message=${encodeURIComponent(errorMessage)}`);
    }
    const spotifyProfile = await userProfileResponse.json() as any; // Typecast for simplicity
    console.log(`[spotifyAuth/callback.ts] Spotify profile fetched for ${spotifyProfile.id} (${spotifyProfile.display_name}). Updating SoundTrace user ${soundTraceUserId}...`);

    const user = await User.findById(soundTraceUserId);
    if (!user) {
        console.error(`User not found in DB: ${soundTraceUserId} during Spotify callback.`);
        return res.redirect(302, `${FRONTEND_URL}/spotify-callback-receiver?status=error&message=UserNotFound`);
    }

    user.spotifyAccessToken = access_token;
    if (refresh_token) user.spotifyRefreshToken = refresh_token; // Only update if a new one is provided
    user.spotifyTokenExpiresAt = new Date(Date.now() + expires_in * 1000);
    user.spotifyUserId = spotifyProfile.id;
    user.spotifyDisplayName = spotifyProfile.display_name || spotifyProfile.id;
    user.spotifyProfileUrl = spotifyProfile.external_urls?.spotify;
    user.spotifyAvatarUrl = spotifyProfile.images?.length > 0 ? spotifyProfile.images[0].url : null;

    await user.save();
    console.log(`[spotifyAuth/callback.ts] User ${user.id} updated with Spotify details. Redirecting to frontend success page.`);

    res.redirect(302, `${FRONTEND_URL}/spotify-callback-receiver?status=success`);

  } catch (error) { // This will catch errors from connectDB, fetch calls, user.save(), etc.
    console.error('Critical error in Spotify callback processing:', error);
    const errorMessage = error instanceof Error ? error.message : 'CallbackProcessingError_Unknown';
    // If FRONTEND_URL is somehow undefined here despite earlier check, this redirect might fail.
    // However, the initial check should prevent that.
    return res.redirect(302, `${FRONTEND_URL}/spotify-callback-receiver?status=error&message=${encodeURIComponent(errorMessage)}`);
  }
}
