
// This Vercel serverless function is no longer needed.
// The functionality has been moved to the Express backend (backend/controllers/spotifyController.js).
// Keeping this file empty or deleting it is appropriate.
// To avoid breaking imports if it's somehow still referenced before a full cleanup,
// an empty default export or a clear message is provided.

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(404).json({
    message: 'This endpoint has been moved. Please use the corresponding endpoint on the main API server (api.soundtrace.uk).'
  });
}
