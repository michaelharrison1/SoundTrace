
import type { VercelRequest, VercelResponse } from '@vercel/node';
// Removed problematic imports to backend modules:
// import User from '../../../../backend/models/User';
// import connectDB from '../../../../backend/config/db';
// import { generateCodeVerifier, generateCodeChallenge } from '../../../../backend/util/pkce';

const API_BASE_URL = process.env.API_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5001'; // Fallback for local

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // This Vercel serverless function endpoint for Spotify login initiation is likely misconfigured
  // or redundant if a main backend server handles Spotify OAuth.
  // The main backend (e.g., Express app) should handle /api/auth/spotify/login.
  // The frontend should redirect to that main backend endpoint.

  console.warn(`[Vercel Function - spotify/login.ts] This endpoint was accessed. It's recommended to use the main backend's Spotify login route (e.g., ${API_BASE_URL}/api/auth/spotify/login) for initiating Spotify login.`);

  res.status(501).json({
    message: 'Not Implemented: Spotify login should be initiated via the main backend API.',
    details: `Please ensure your frontend redirects to your backend's Spotify login initiation endpoint (e.g., ${API_BASE_URL}/api/auth/spotify/login) instead of this Vercel function.`
  });
}
