
import { DailyAnalyticsSnapshot } from '../types'; // Updated import

const defaultApiBaseUrl = 'https://api.soundtrace.uk'; 
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;
const ANALYTICS_BASE_URL = `${API_BASE_URL}/api/analytics`;

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
  return response.json();
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

  getAnalyticsHistory: async (): Promise<DailyAnalyticsSnapshot[]> => { // Renamed function
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot fetch analytics history.");
      (authError as any).status = 401;
      throw authError;
    }

    const response = await fetch(`${ANALYTICS_BASE_URL}/follower-history`, { // Path remains for now or change to /history
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
        cumulativeStreams: item.cumulativeStreams || 0, // Default to 0 if not present
    }));
  },

  deleteAnalyticsHistory: async (): Promise<void> => { // Renamed function
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot delete analytics history.");
      (authError as any).status = 401;
      throw authError;
    }

    const response = await fetch(`${ANALYTICS_BASE_URL}/follower-history`, { // Path remains for now
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });
    await handleAnalyticsApiResponse(response);
  },
};