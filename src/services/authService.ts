
import { User } from '../types';

const BACKEND_URL = 'https://soundtracebackend.onrender.com';

interface LoginResponse {
  token: string;
  userId: string;
  username: string;
}

const handleAuthApiResponse = async (response: Response): Promise<LoginResponse> => {
    const data = await response.json().catch(() => ({ message: `Invalid JSON response from server during auth operation. Status: ${response.status}` }));

    if (!response.ok) {
      const error = new Error(data.message || `Authentication operation failed with status: ${response.status}`);
      (error as any).status = response.status;
      throw error;
    }

    if (!data.token || !data.userId || !data.username) {
        console.error('Auth response missing expected fields:', data);
        const error = new Error('Authentication response from server was incomplete.');
        (error as any).status = response.status; // Or a generic 500-like client error
        throw error;
    }
    return data as LoginResponse;
}

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    if (!BACKEND_URL) {
      const configError = new Error('Backend URL is not configured. Cannot log in.');
      (configError as any).status = 500; // Indicate server-side configuration issue from client's perspective
      throw configError;
    }

    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    return handleAuthApiResponse(response);
  },

  register: async (username: string, password: string): Promise<LoginResponse> => {
    if (!BACKEND_URL) {
       const configError = new Error('Backend URL is not configured. Cannot register.');
      (configError as any).status = 500;
      throw configError;
    }

    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    return handleAuthApiResponse(response);
  },
};