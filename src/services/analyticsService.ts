
import { DailyAnalyticsSnapshot } from '../types'; // Updated import

const defaultApiBaseUrl = 'https://api.soundtrace.uk'; 
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;
const ANALYTICS_BASE_URL = `${API_BASE_URL}/api/analytics`;

// This interface represents historical data points for a single song's streams.
export interface HistoricalSongStreamEntry {
  date: string; // YYYY-MM-DD
  streams: number;
}

// New interface for predicted daily streams
export interface PredictedStreamEntry {
  date: string; // YYYY-MM-DD
  predictedStreams: number;
}


const getAuthToken = () => {
    try {
        return localStorage.getItem('authToken');
    } catch {
        return null;
    }
};

const handleAnalyticsApiResponse = async (response: Response) => {
  if (!response.ok) {
    let errorData: { message?: string } = {};
    try {
      errorData = await response.json();
    } catch {
      // Ignore JSON parsing errors
    }
    const errorMessage = errorData.message || `Analytics API request failed with status ${response.status}: ${response.statusText || 'Unknown error'}`;
    const error = new Error(errorMessage);
    (error as unknown as { status?: number }).status = response.status; 
    throw error;
  }
  if (response.status === 204) { 
    return; 
  }
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) return response.json();
  // If not JSON, and not 204, it might be an issue or plain text response.
  // For now, we'll assume JSON or empty. If plain text is valid, handle it here.
  return response.text().then(() => {
    return null;
  });
};

export const analyticsService = {
  saveAnalyticsSnapshot: async (cumulativeFollowers: number, cumulativeStreams: number): Promise<DailyAnalyticsSnapshot> => { // Updated function signature
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot save analytics snapshot.");
      (authError as unknown as { status?: number }).status = 401;
      throw authError;
    }

    const response = await fetch(`${ANALYTICS_BASE_URL}/follower-snapshot`, { // Path remains for now, or change to /snapshot
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ cumulativeFollowers, cumulativeStreams }), // Send both
      credentials: 'include',
    });
    
    const savedData = await handleAnalyticsApiResponse(response);
    return {
        date: savedData.date.split('T')[0], 
        cumulativeFollowers: savedData.cumulativeFollowers,
        cumulativeStreams: savedData.cumulativeStreams || 0,
    };
  },

  getAnalyticsHistory: async (): Promise<DailyAnalyticsSnapshot[]> => { 
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot fetch analytics history.");
      (authError as unknown as { status?: number }).status = 401;
      throw authError;
    }

    const response = await fetch(`${ANALYTICS_BASE_URL}/follower-history`, { 
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });
    const historyData: unknown[] = await handleAnalyticsApiResponse(response);
    return historyData.map(item => {
      let date = '';
      let cumulativeFollowers = 0;
      let cumulativeStreams = 0;
      if (typeof item === 'object' && item !== null) {
        date = (item as { date?: string }).date ?? '';
        cumulativeFollowers = (item as { cumulativeFollowers?: number }).cumulativeFollowers ?? 0;
        cumulativeStreams = (item as { cumulativeStreams?: number }).cumulativeStreams ?? 0;
      }
      return { date, cumulativeFollowers, cumulativeStreams };
    });
  },

  deleteAnalyticsHistory: async (): Promise<void> => { 
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot delete analytics history.");
      (authError as unknown as { status?: number }).status = 401;
      throw authError;
    }

    const response = await fetch(`${ANALYTICS_BASE_URL}/follower-history`, { 
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });
    await handleAnalyticsApiResponse(response);
  },

  // New function to get stream history for a single song
  getSongStreamHistory: async (spotifyTrackId: string): Promise<HistoricalSongStreamEntry[]> => {
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot fetch song stream history.");
      (authError as unknown as { status?: number }).status = 401;
      throw authError;
    }
    if (!spotifyTrackId) {
      throw new Error("Spotify Track ID is required to fetch song stream history.");
    }
    
    // IMPORTANT: This API endpoint (/api/analytics/song-stream-history/:spotifyTrackId)
    // needs to be implemented on your backend.
    // It should return an array of { date: "YYYY-MM-DD", streams: number }
    const response = await fetch(`${ANALYTICS_BASE_URL}/song-stream-history/${spotifyTrackId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
    });
    const historyData: unknown[] = await handleAnalyticsApiResponse(response);
    return historyData.map(item => {
      let date = '';
      let streams = 0;
      if (typeof item === 'object' && item !== null) {
        date = (item as { date?: string }).date ?? '';
        streams = (item as { streams?: number }).streams ?? 0;
      }
      return { date, streams };
    });
  },

  getSongStreamForecast: async (spotifyTrackId: string, rangeInDays: number = 30): Promise<PredictedStreamEntry[]> => {
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot fetch song stream forecast.");
      (authError as unknown as { status?: number }).status = 401;
      throw authError;
    }
    if (!spotifyTrackId) {
      throw new Error("Spotify Track ID is required to fetch song stream forecast.");
    }
    let rangeQueryParam = '30d';
    if (rangeInDays === 7) rangeQueryParam = '7d';
    else if (rangeInDays === 90) rangeQueryParam = '90d';
    else if (rangeInDays === 180) rangeQueryParam = '180d';


    const response = await fetch(`${ANALYTICS_BASE_URL}/forecast/${spotifyTrackId}?range=${rangeQueryParam}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      credentials: 'include',
    });
    const forecastData: unknown[] = await handleAnalyticsApiResponse(response);
    return forecastData.map(item => {
      let date = '';
      let predictedStreams = 0;
      if (typeof item === 'object' && item !== null) {
        date = (item as { date?: string }).date ?? '';
        predictedStreams = (item as { predictedStreams?: number }).predictedStreams ?? 0;
      }
      return { date, predictedStreams };
    });
  }
};