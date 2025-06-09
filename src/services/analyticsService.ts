
import { FollowerSnapshot } from '../types';

const defaultApiBaseUrl = 'https://api.soundtrace.uk'; // Or your local dev URL
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
      // If response is not JSON, use status text or a generic message
    }
    const errorMessage = errorData.message || `Analytics API request failed with status ${response.status}: ${response.statusText || 'Unknown error'}`;
    const error = new Error(errorMessage);
    (error as any).status = response.status; // Attach status
    throw error;
  }
  if (response.status === 204) {
    return;
  }
  return response.json();
};

export const analyticsService = {
  saveFollowerSnapshot: async (cumulativeFollowers: number): Promise<FollowerSnapshot> => {
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot save follower snapshot.");
      (authError as any).status = 401;
      throw authError;
    }

    const response = await fetch(`${ANALYTICS_BASE_URL}/follower-snapshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ cumulativeFollowers }),
      credentials: 'include',
    });
    // The backend now returns the full snapshot object, which might include an _id or id
    // Ensure the FollowerSnapshot type matches this or adapt here.
    const savedData = await handleAnalyticsApiResponse(response);
    // Backend date is full ISO string, convert to YYYY-MM-DD if frontend expects that format strictly for the date field.
    // Backend now returns date as YYYY-MM-DD, so direct use is fine.
    return {
        date: savedData.date.split('T')[0], // Ensure YYYY-MM-DD from backend's Date field
        cumulativeFollowers: savedData.cumulativeFollowers
    };
  },

  getFollowerHistory: async (): Promise<FollowerSnapshot[]> => {
    const token = getAuthToken();
    if (!token) {
      const authError = new Error("Not authenticated. Cannot fetch follower history.");
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
    // Backend already formats date to YYYY-MM-DD, so direct mapping is fine.
    return historyData.map(item => ({
        date: item.date, // Assuming backend sends it as 'YYYY-MM-DD'
        cumulativeFollowers: item.cumulativeFollowers
    }));
  },
};
