// Service to interact with your backend's Spotify auth endpoints

const API_BASE_URL_ROOT = import.meta.env.VITE_API_BASE_URL || 'https://soundtracebackend.onrender.com';
const SPOTIFY_AUTH_ENDPOINT = `${API_BASE_URL_ROOT}/api/auth/spotify`;


async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('authToken'); // Your app's main auth token
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
  return fetch(url, { ...options, headers });
}

export const spotifyService = {
  // initiateLogin: Handled by direct navigation: window.location.href = `${SPOTIFY_AUTH_ENDPOINT}/login`;

  getConnectionStatus: async (): Promise<any> => {
    const response = await fetchWithAuth(`${SPOTIFY_AUTH_ENDPOINT}/status`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch Spotify status');
    }
    return response.json();
  },

  refreshToken: async (): Promise<{accessToken: string, expiresAt: string}> => {
    const response = await fetchWithAuth(`${SPOTIFY_AUTH_ENDPOINT}/refresh`, { method: 'POST' });
    if (!response.ok) {
       const errorData = await response.json().catch(() => ({}));
       throw new Error(errorData.message || 'Failed to refresh Spotify token');
    }
    return response.json();
  },

  disconnect: async (): Promise<any> => {
    const response = await fetchWithAuth(`${SPOTIFY_AUTH_ENDPOINT}/disconnect`, { method: 'POST' });
     if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to disconnect Spotify');
    }
    return response.json();
  }
};