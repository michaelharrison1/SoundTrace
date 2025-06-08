
import { TrackScanLog } from '../types';

const BASE_URL = 'https://soundtracebackend.onrender.com/api/scanlogs'; // Replace with your actual backend URL if different

const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem('authToken');
  } catch (error) {
    console.error("Error accessing authToken from localStorage:", error);
    return null;
  }
};

export const scanLogService = {
  getScanLogs: async (): Promise<TrackScanLog[]> => {
    const token = getAuthToken();
    if (!token) {
      // Or throw new Error("Not authenticated"); depending on how you want to handle this globally
      console.warn("No auth token found, cannot fetch scan logs.");
      return [];
    }

    const response = await fetch(BASE_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `Failed to fetch scan logs: ${response.status}` }));
      throw new Error(errorData.message || `Failed to fetch scan logs: ${response.status}`);
    }
    return response.json();
  },

  saveScanLog: async (logData: Omit<TrackScanLog, 'logId' | 'scanDate'>): Promise<TrackScanLog> => {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated. Cannot save scan log.");
    }

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(logData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `Failed to save scan log: ${response.status}` }));
      throw new Error(errorData.message || `Failed to save scan log: ${response.status}`);
    }
    return response.json();
  },

  deleteScanLog: async (logId: string): Promise<void> => {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated. Cannot delete scan log.");
    }

    const response = await fetch(`${BASE_URL}/${logId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `Failed to delete scan log: ${response.status}` }));
      throw new Error(errorData.message || `Failed to delete scan log: ${response.status}`);
    }
    // No explicit content expected on successful DELETE other than 200/204
  },

  clearAllScanLogs: async (): Promise<void> => {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated. Cannot clear all scan logs.");
    }

    const response = await fetch(BASE_URL, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `Failed to clear all scan logs: ${response.status}` }));
      throw new Error(errorData.message || `Failed to clear all scan logs: ${response.status}`);
    }
    // No explicit content expected on successful DELETE
  },
};
