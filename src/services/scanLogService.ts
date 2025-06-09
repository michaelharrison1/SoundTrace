
import { TrackScanLog } from '../types';

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
  if (response.status === 204) {
    return;
  }
  return response.json();
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
    // This endpoint (`/manual-spotify-add`) would need to be created on the backend.
    // It would take the spotifyTrackLink, fetch details from Spotify,
    // create AcrCloudMatch-like data, and save a new TrackScanLog.
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
  }
};
