
const defaultApiBaseUrl = 'https://api.soundtrace.uk';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;
const STREAMS_BASE_URL = `${API_BASE_URL}/api/spotify-streams`;

export interface SpotifyStreamCountResponse {
  trackName: string;
  artistName: string;
  albumName?: string; // Optional, as it might not always be needed or fetched
  coverArtUrl?: string; // Optional
  streamCount: number | null; // Can be null if unavailable
  streamCountStatus?: 'available' | 'unavailable_token_error' | 'unavailable_data_missing' | 'unavailable_api_error';
  message?: string; // Optional message from backend
}

const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem('authToken');
  } catch (error) {
    console.error("Error accessing authToken from localStorage:", error);
    return null;
  }
};

const handleStreamApiResponse = async (response: Response) => {
  // For 200 status with streamCountStatus indicating partial success/failure,
  // we still want to parse the JSON body.
  if (!response.ok && response.status !== 200) {
    let errorData: { message?: string } = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // If response is not JSON, use status text or a generic message
    }
    const errorMessage = errorData.message || `Request failed with status ${response.status}: ${response.statusText || 'Unknown error'}`;
    const error = new Error(errorMessage);
    (error as any).status = response.status; // Attach status
    throw error;
  }
  return response.json();
};

export const spotifyStreamService = {
  getTrackStreams: async (trackIdOrUrl: string): Promise<SpotifyStreamCountResponse> => {
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot fetch stream counts.");
      (authError as any).status = 401;
      throw authError;
    }

    const response = await fetch(`${STREAMS_BASE_URL}/track/${encodeURIComponent(trackIdOrUrl)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });
    return handleStreamApiResponse(response);
  },
};
