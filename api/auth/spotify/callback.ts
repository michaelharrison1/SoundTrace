
import type { VercelRequest, VercelResponse } from '@vercel/node';
// Removed problematic imports to backend modules:
// import User from '../../../../backend/models/User';
// import connectDB from '../../../../backend/config/db';
import { Buffer } from 'buffer'; // Standard Node.js module, should be fine

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'; // Fallback for local frontend

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // This Vercel serverless function endpoint for Spotify callback is likely misconfigured
  // or redundant if a main backend server handles Spotify OAuth.
  // The SPOTIFY_REDIRECT_URI should point to the main backend's callback endpoint.

  console.warn("[Vercel Function - spotify/callback.ts] This endpoint was accessed. It's recommended that SPOTIFY_REDIRECT_URI points to your main backend's Spotify callback route.");

  // Redirect to a frontend page that displays an error or status,
  // as this function cannot complete the OAuth flow without backend logic access.
  const frontendCallbackReceiver = `${FRONTEND_URL}/spotify-callback-receiver`;
  const queryParams = new URLSearchParams();
  queryParams.append('status', 'error');
  queryParams.append('message', 'MisconfiguredCallbackHandler');
  queryParams.append('details', 'This Vercel serverless function is not the correct handler for Spotify OAuth callback. Please ensure SPOTIFY_REDIRECT_URI points to your main backend API.');

  res.redirect(302, `${frontendCallbackReceiver}?${queryParams.toString()}`);
}
