// Service for dashboard cache API
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.soundtrace.uk';

export interface DashboardCache {
  _id: string;
  userId: string;
  dashboardData: unknown;
  lastRefreshed: string;
  createdAt: string;
  updatedAt: string;
}

export async function getDashboardCache(): Promise<DashboardCache | null> {
  try {
    const token = localStorage.getItem('authToken');
    const res = await axios.get(`${API_BASE_URL}/api/dashboard-cache`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (err: unknown) {
    if (
      typeof err === 'object' && err !== null &&
      'response' in err &&
      (err as { response?: { status?: number } }).response?.status === 404
    ) {
      return null;
    }
    throw err;
  }
}

export async function refreshDashboardCache(): Promise<DashboardCache> {
  const token = localStorage.getItem('authToken');
  const res = await axios.post(`${API_BASE_URL}/api/dashboard-cache/refresh`, {}, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}
