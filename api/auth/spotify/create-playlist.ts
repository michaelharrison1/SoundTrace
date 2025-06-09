
import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import User from '../../../../backend/models/User'; // Adjust path as needed
import connectDB from '../../../../backend/config/db'; // Adjust path as needed
import { URLSearchParams } from 'url';

const JWT_SECRET = process.env.JWT_SECRET;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

interface SpotifyPlaylistResponse {
    id: string;
    external_urls: {
        spotify: string;
    };
    // other fields if needed
}

// Interfaces for handling Spotify API error responses
interface SpotifyErrorDetail {
    status?: number;
    message?: string;
    reason?: string;
}
interface SpotifyErrorResponse {
    error?: SpotifyErrorDetail | string; // Spotify error can be an object or a simple string
}


async function getAuthenticatedUser(req: VercelRequest): Promise<any | null> {
  let token: string | undefined = undefined;
  const authHeader = req.headers['authorization'];

  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.soundtrace_session_token) {
    token = req.cookies.soundtrace_session_token;
  }

  if (!token || !JWT_SECRET) {
    console.warn("[create-playlist.ts] No token or JWT_SECRET found.");
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { user: { id: string } };
    if (decoded && decoded.user && decoded.user.id) {
      await connectDB();
      const user = await User.findById(decoded.user.id); // Fetch full user doc
      if (!user) {
        console.warn(`[create-playlist.ts] User ${decoded.user.id} not found in DB.`);
        return null;
      }
      return user;
    }
    return null;
  } catch (err: unknown) {
    let errorMessage = "Token verification failed";
    if (err instanceof Error) {
        errorMessage = err.message;
    }
    console.error("[create-playlist.ts] Token verification failed:", errorMessage);
    return null;
  }
}

async function refreshSpotifyUserToken(user: any): Promise<string | null> {
  if (!user.spotifyRefreshToken) {
    console.warn(`[create-playlist.ts] User ${user.id} has no Spotify refresh token.`);
    return null;
  }
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.error("[create-playlist.ts] Spotify client ID or secret not configured for token refresh.");
    return null;
  }

  console.log(`[create-playlist.ts] Refreshing Spotify token for user ${user.id}`);
  const refreshRequestBody = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: user.spotifyRefreshToken
  });

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + (Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'))
      },
      body: refreshRequestBody.toString()
    });

    const tokenData = await response.json() as SpotifyTokenResponse; // Assuming tokenData is SpotifyTokenResponse or similar error structure
    if (!response.ok) {
      console.error(`[create-playlist.ts] Spotify token refresh failed for user ${user.id}:`, tokenData);
      // Potentially clear bad refresh token from user model here if error indicates invalid_grant
      return null;
    }

    user.spotifyAccessToken = tokenData.access_token;
    user.spotifyTokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    if (tokenData.refresh_token) user.spotifyRefreshToken = tokenData.refresh_token; // Spotify might issue a new refresh token
    await user.save();
    console.log(`[create-playlist.ts] Spotify token refreshed and saved for user ${user.id}`);
    return tokenData.access_token;
  } catch (error: unknown) {
    let errorMessage = "Error during Spotify token refresh";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    console.error(`[create-playlist.ts] ${errorMessage} for user ${user.id}:`, error);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const user = await getAuthenticatedUser(req);
  if (!user || !user.spotifyUserId || !user.spotifyAccessToken) {
    return res.status(401).json({ message: 'User not authenticated or not connected to Spotify.' });
  }

  let { playlistName, trackUris, description } = req.body;

  if (!playlistName || !Array.isArray(trackUris) || trackUris.length === 0) {
    return res.status(400).json({ message: 'Playlist name and track URIs are required.' });
  }

  description = description || `Playlist created by SoundTrace on ${new Date().toLocaleDateString()}`;


  let accessToken = user.spotifyAccessToken;
  if (user.spotifyTokenExpiresAt && new Date(user.spotifyTokenExpiresAt) < new Date(Date.now() - 60 * 1000)) {
    console.log(`[create-playlist.ts] Spotify token for user ${user.id} expired or expiring soon, attempting refresh.`);
    accessToken = await refreshSpotifyUserToken(user);
    if (!accessToken) {
      return res.status(401).json({ message: 'Failed to refresh Spotify token. Please reconnect Spotify.' });
    }
  }

  try {
    // 1. Create Playlist
    const createPlaylistResponse = await fetch(`https://api.spotify.com/v1/users/${user.spotifyUserId}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: playlistName,
        description: description,
        public: false, // Default to private, can be changed
      }),
    });

    if (!createPlaylistResponse.ok) {
      const errorData = await createPlaylistResponse.json() as SpotifyErrorResponse;
      console.error('[create-playlist.ts] Error creating Spotify playlist:', errorData);
      let spotifyApiErrorMessage = 'Unknown Spotify API error';
      if (errorData.error) {
        if (typeof errorData.error === 'string') {
          spotifyApiErrorMessage = errorData.error;
        } else {
          spotifyApiErrorMessage = errorData.error.message || errorData.error.reason || 'Unknown Spotify API error detail';
        }
      }
      return res.status(createPlaylistResponse.status).json({ message: `Spotify API error creating playlist: ${spotifyApiErrorMessage}` });
    }
    const newPlaylist = await createPlaylistResponse.json() as SpotifyPlaylistResponse;
    console.log(`[create-playlist.ts] Playlist "${newPlaylist.id}" created successfully for user ${user.spotifyUserId}.`);

    // 2. Add Tracks (Spotify API allows up to 100 tracks per request)
    const trackChunks = [];
    for (let i = 0; i < trackUris.length; i += 100) {
      trackChunks.push(trackUris.slice(i, i + 100));
    }

    let tracksAddedSuccessfully = true;
    for (const chunk of trackChunks) {
      const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: chunk }),
      });

      if (!addTracksResponse.ok) {
        const errorDataTracks = await addTracksResponse.json() as SpotifyErrorResponse; // Use type assertion
        console.error(`[create-playlist.ts] Error adding tracks to playlist ${newPlaylist.id}:`, errorDataTracks);
        tracksAddedSuccessfully = false;
        // Continue trying other chunks but report overall partial failure
      } else {
        console.log(`[create-playlist.ts] Chunk of tracks added to playlist ${newPlaylist.id}.`);
      }
    }

    if (!tracksAddedSuccessfully) {
         return res.status(207).json({ // Multi-Status
            message: `Playlist "${playlistName}" created, but some tracks might not have been added.`,
            playlistUrl: newPlaylist.external_urls.spotify,
            playlistId: newPlaylist.id
        });
    }

    return res.status(201).json({
      message: `Playlist "${playlistName}" created and ${trackUris.length} tracks added successfully.`,
      playlistUrl: newPlaylist.external_urls.spotify,
      playlistId: newPlaylist.id,
    });

  } catch (e: unknown) {
    console.error('[create-playlist.ts] Server error details:', e);
    let responseMessage = 'Server error while creating Spotify playlist.';
    // Optionally, if you want to use the error message from e, check its type:
    // if (e instanceof Error) {
    //   responseMessage = e.message; // Be cautious about exposing internal error messages
    // }
    return res.status(500).json({ message: responseMessage });
  }
}
