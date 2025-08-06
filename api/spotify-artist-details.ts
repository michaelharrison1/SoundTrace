
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Buffer } from 'buffer'; // Import Buffer

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Update this interface to include popularity and genres
interface SpotifyArtistApiResponse {
  followers: {
    href: string | null;
    total: number;
  };
  popularity: number; // Typically 0-100
  genres: string[];   // Array of genre strings
  // other artist details can be added here if needed like name, images etc.
  id: string;
  name: string;
}

// Simple in-memory cache for the Spotify access token
const tokenCache = {
  accessToken: '',
  expiresAt: 0,
};

const getSpotifyAccessToken = async (): Promise<string> => {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error('Spotify API credentials are not configured on the server.');
  }

  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }

  const authString = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify authentication failed: ${response.statusText}`);
  }

  const data = (await response.json()) as SpotifyTokenResponse;
  tokenCache.accessToken = data.access_token;
  // Set expiry time a bit earlier than actual to be safe (e.g., 5 minutes buffer)
  tokenCache.expiresAt = Date.now() + (data.expires_in - 300) * 1000;

  return data.access_token;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const artistId = req.query.artistId as string;

  if (!artistId) {
    return res.status(400).json({ message: 'Spotify Artist ID is required.' });
  }

  try {
    const accessToken = await getSpotifyAccessToken();
    const spotifyApiUrl = `https://api.spotify.com/v1/artists/${artistId}`;

    const artistResponse = await fetch(spotifyApiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!artistResponse.ok) {
      if (artistResponse.status === 404) {
        return res.status(404).json({ message: `Artist with ID '${artistId}' not found on Spotify.` });
      }
      const errorBody = await artistResponse.text();
      // Try to parse to see if Spotify provides a structured error
      let spotifyErrorMessage = `Failed to fetch artist details from Spotify: ${artistResponse.statusText}`;
      try {
        const spotifyErrorJson = JSON.parse(errorBody);
        if (spotifyErrorJson.error && spotifyErrorJson.error.message) {
          spotifyErrorMessage = `Spotify API: ${spotifyErrorJson.error.message}`;
        }
      } catch {
        // ignore if not json
      }

      return res.status(artistResponse.status).json({ message: spotifyErrorMessage });
    }

    const artistData = (await artistResponse.json()) as SpotifyArtistApiResponse;

    // Return followers, popularity, and genres
    return res.status(200).json({
      followers: artistData.followers?.total,
      popularity: artistData.popularity,
      genres: artistData.genres,
    });

  } catch (error: unknown) {
    let clientMessage = 'Failed to fetch Spotify artist details.';
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Spotify API credentials')) {
        clientMessage = 'Server configuration error for Spotify API.';
    } else if (errorMessage.includes('Spotify authentication failed')) {
        clientMessage = 'Could not authenticate with Spotify API.';
    }
    // Only return the clientMessage to avoid leaking internal details.
    return res.status(500).json({ message: clientMessage });
  }
}
