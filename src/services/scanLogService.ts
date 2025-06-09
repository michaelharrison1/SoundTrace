
import { TrackScanLog } from '../types';

const BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'https://soundtracebackend.onrender.com'}/api/scanlogs`;

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
    (error as any).status = response.status; // Attach status
    throw error;
  }
  if (response.status === 204) { // Handle No Content for DELETE operations
    return;
  }
  return response.json();
};

export const scanLogService = {
  getScanLogs: async (): Promise<TrackScanLog[]> => {
    const token = getAuthToken(); // JWT for Bearer
    if (!token) {
      console.warn("No auth token found, cannot fetch scan logs.");
      const authError = new Error("Not authenticated. Cannot fetch scan logs.");
      (authError as any).status = 401;
      throw authError;
    }

    const response = await fetch(BASE_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include', // Ensures HttpOnly session cookie is sent
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(logData),
      credentials: 'include', // Ensures HttpOnly session cookie is sent
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
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include', // Ensures HttpOnly session cookie is sent
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
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include', // Ensures HttpOnly session cookie is sent
    });
    await handleApiResponse(response);
  },
};