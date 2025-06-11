
import { TrackScanLog, YouTubeUploadType } from '../types';

const defaultApiBaseUrl = 'https://api.soundtrace.uk';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;
const BASE_URL = `${API_BASE_URL}/api/scanlogs`;

const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem('authToken');
  } catch (error) {
    console.error("Error accessing authToken from localStorage:", error);
    return null;
  }
};

const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    let errorData: { message?: string } = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // If response is not JSON, use status text or a generic message
    }
    const errorMessage = errorData.message || `Request failed with status ${response.status}: ${response.statusText || 'Unknown error'}`;
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    throw error;
  }
  if (response.status === 204) { // No Content
    return;
  }
  // Check if content type is JSON before parsing
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  } else {
    return response.text(); // Or handle as appropriate for non-JSON responses
  }
};

export const scanLogService = {
  getScanLogs: async (): Promise<TrackScanLog[]> => {
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot fetch scan logs.");
      (authError as any).status = 401;
      throw authError;
    }
    const response = await fetch(BASE_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      credentials: 'include',
    });
    return handleApiResponse(response);
  },

  saveScanLog: async (logData: Omit<TrackScanLog, 'logId' | 'scanDate'>): Promise<TrackScanLog> => {
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot save scan log.");
      (authError as any).status = 401;
      throw authError;
    }
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(logData),
      credentials: 'include',
    });
    return handleApiResponse(response);
  },

  deleteScanLog: async (logId: string): Promise<void> => {
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot delete scan log.");
      (authError as any).status = 401;
      throw authError;
    }
    const response = await fetch(`${BASE_URL}/${logId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include',
    });
    await handleApiResponse(response);
  },

  clearAllScanLogs: async (): Promise<void> => {
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot clear all scan logs.");
      (authError as any).status = 401;
      throw authError;
    }
    const response = await fetch(BASE_URL, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include',
    });
    await handleApiResponse(response);
  },

  addSpotifyTrackToLog: async (spotifyTrackLink: string): Promise<TrackScanLog> => {
    const token = getAuthToken();
    if (!token) {
        const authError = new Error("Not authenticated. Cannot add Spotify track.");
        (authError as any).status = 401;
        throw authError;
    }
    const response = await fetch(`${BASE_URL}/manual-spotify-add`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ spotifyTrackLink }),
        credentials: 'include',
    });
    return handleApiResponse(response);
  },

  processYouTubeUrl: async (url: string, processType: YouTubeUploadType): Promise<TrackScanLog[] | TrackScanLog> => {
    const token = getAuthToken();
    if (!token) {
        const authError = new Error("Not authenticated. Cannot process YouTube URL.");
        (authError as any).status = 401;
        throw authError;
    }
    const response = await fetch(`${BASE_URL}/process-youtube-url`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ youtubeUrl: url, processType }),
        credentials: 'include',
    });
    return handleApiResponse(response);
  },

  processSpotifyPlaylistUrl: async (url: string): Promise<TrackScanLog[]> => {
    const token = getAuthToken();
    if (!token) {
        const authError = new Error("Not authenticated. Cannot process Spotify Playlist URL.");
        (authError as any).status = 401;
        throw authError;
    }
    const response = await fetch(`${BASE_URL}/process-spotify-playlist-url`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ spotifyPlaylistUrl: url }),
        credentials: 'include',
    });
    return handleApiResponse(response);
  }
};
