// Service to interact with your backend's Spotify auth endpoints

// Ensure VITE_API_BASE_URL is set in your environment for production.
const defaultApiBaseUrl = 'https://api.soundtrace.uk';
const API_BASE_URL_ROOT = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;
const SPOTIFY_AUTH_ENDPOINT = `${API_BASE_URL_ROOT}/api/auth/spotify`;


async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('authToken'); // Your app's main auth token (JWT)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json', // Default, can be overridden by options.headers
    ...options.headers as Record<string, string>,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Crucial for sending HttpOnly session cookie
  });

  if (!response.ok && response.status !== 207) { // 207 is Multi-Status, handle as potentially partial success
    let errorData: { message?: string } = {};
    try {
      errorData = await response.json();
    } catch {
      // If response is not JSON, use status text or a generic message
    }
    const errorMessage = errorData.message || `Request to ${url} failed with status ${response.status}: ${response.statusText || 'Unknown server error'}`;
    const error = new Error(errorMessage);
    (error as unknown as { status?: number }).status = response.status;
    throw error;
  }
  return response;
}

export const spotifyService = {
  getConnectionStatus: async (): Promise<unknown> => {
    const response = await fetchWithAuth(`${SPOTIFY_AUTH_ENDPOINT}/status`);
    return response.json();
  },

  refreshToken: async (): Promise<{accessToken: string, expiresAt: string}> => {
    const response = await fetchWithAuth(`${SPOTIFY_AUTH_ENDPOINT}/refresh`, { method: 'POST' });
    return response.json();
  },

  disconnect: async (): Promise<unknown> => {
    const response = await fetchWithAuth(`${SPOTIFY_AUTH_ENDPOINT}/disconnect`, { method: 'POST' });
    if (response.status === 204 || response.headers.get("content-length") === "0") { // Check for empty response body
      return { message: 'Successfully disconnected from Spotify on backend.' };
    }
    return response.json();
  },

  createPlaylistAndAddTracks: async (
    playlistName: string,
    trackUris: string[],
    description?: string
  ): Promise<{playlistUrl: string, playlistId: string, message: string}> => {
    const response = await fetchWithAuth(`${SPOTIFY_AUTH_ENDPOINT}/create-playlist`, {
      method: 'POST',
      body: JSON.stringify({ playlistName, trackUris, description }),
    });
    const data = await response.json();
    if (!response.ok && response.status !== 207) { // if not ok and not multi-status
        throw new Error(data.message || `Failed to create playlist (status: ${response.status})`);
    }
    return data; // Contains playlistUrl, playlistId, message
  },

  getArtistDetails: async (artistId: string): Promise<{ followers: number; popularity: number; genres: string[] }> => {
    const response = await fetchWithAuth(`${API_BASE_URL_ROOT}/api/spotify-track-details/artist-details?artistId=${artistId}`);
    return response.json();
  },
};