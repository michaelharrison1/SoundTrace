
import type { VercelRequest, VercelResponse } from '@vercel/node';

// This Vercel serverless function is likely a misconfiguration if your main backend
// (handling database, user models, full Spotify auth flow) is hosted separately (e.g., on Render).
// The Spotify Application's "Redirect URI" in the Spotify Developer Dashboard
// should point to your main backend's callback endpoint (e.g., https://your-backend-api.onrender.com/api/auth/spotify/callback).
// That backend endpoint would then handle the code exchange and redirect the user back to the frontend application.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const frontendCallbackReceiverUrl = process.env.FRONTEND_URL || 'https://your-frontend-url.example.com'; // Replace with your actual frontend URL

  res.status(501).json({
    message: 'Not Implemented on Vercel Frontend / Misconfigured Spotify Redirect URI.',
    guidance: `The Spotify redirect URI should point to your main backend's callback endpoint. This Vercel function at /api/auth/spotify/callback should not be the target for Spotify's redirect if your backend is separate. Your backend should handle the OAuth code exchange and then redirect to a page on your frontend (e.g., ${frontendCallbackReceiverUrl}/spotify-callback-receiver).`,
    details: 'This function previously attempted to import backend-specific modules (User model, DB connection) which are not available in this Vercel frontend deployment.'
  });
}
