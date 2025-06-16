
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


const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem('authToken');
  } catch (error) {
    console.error("Error accessing authToken from localStorage:", error);
    return null;
  }
};

const handleAnalyticsApiResponse = async (response: Response) => {
  if (!response.ok) {
    let errorData: { message?: string } = {};
    try {
      errorData = await response.json();
    } catch (e) {
    }
    const errorMessage = errorData.message || `Analytics API request failed with status ${response.status}: ${response.statusText || 'Unknown error'}`;
    const error = new Error(errorMessage);
    (error as any).status = response.status; 
    throw error;
  }
  if (response.status === 204) { 
    return; 
  }
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) return response.json();
  // If not JSON, and not 204, it might be an issue or plain text response.
  // For now, we'll assume JSON or empty. If plain text is valid, handle it here.
  return response.text().then(text => {
    // If expecting JSON but got text, it might indicate an issue if text is not empty.
    if (text) { 
        console.warn("Expected JSON response from analytics API but received text:", text.substring(0, 100));
    }
    return null; // Or throw error if plain text is unexpected.
  });
};

export const analyticsService = {
  saveAnalyticsSnapshot: async (cumulativeFollowers: number, cumulativeStreams: number): Promise<DailyAnalyticsSnapshot> => { // Updated function signature
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot save analytics snapshot.");
      (authError as any).status = 401;
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
      (authError as any).status = 401;
      throw authError;
    }

    const response = await fetch(`${ANALYTICS_BASE_URL}/follower-history`, { 
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });
    const historyData: any[] = await handleAnalyticsApiResponse(response);
    return historyData.map(item => ({
        date: item.date, 
        cumulativeFollowers: item.cumulativeFollowers,
        cumulativeStreams: item.cumulativeStreams || 0, 
    }));
  },

  deleteAnalyticsHistory: async (): Promise<void> => { 
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot delete analytics history.");
      (authError as any).status = 401;
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
      (authError as any).status = 401;
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
    const historyData: any[] = await handleAnalyticsApiResponse(response);
    return historyData.map(item => ({
        date: item.date, // Ensure date is in YYYY-MM-DD string format or convert as needed
        streams: item.streams || 0,
    }));
  },

  getSongStreamForecast: async (spotifyTrackId: string, rangeInDays: number = 30): Promise<PredictedStreamEntry[]> => {
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot fetch song stream forecast.");
      (authError as any).status = 401;
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
    const forecastData: any[] = await handleAnalyticsApiResponse(response);
    return forecastData.map(item => ({
      date: item.date, // Expects YYYY-MM-DD
      predictedStreams: item.predictedStreams || 0,
    }));
  }
};