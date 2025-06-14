
import { User } from '../types';

// Ensure VITE_API_BASE_URL is set in your environment for production.
const defaultApiBaseUrl = 'https://api.soundtrace.uk';
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;


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
      credentials: 'include', // Added for sending cookies if needed (though login sets cookie via response)
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
      credentials: 'include', // Added for sending cookies if needed (though register sets cookie via response)
    });

    return handleAuthApiResponse(response);
  },

  logout: async (): Promise<void> => {
    const token = localStorage.getItem('authToken'); // This is the JWT, not the session cookie
    if (!BACKEND_URL) {
      console.warn('Backend URL not configured. Cannot call logout endpoint.');
      return;
    }

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      // The authMiddleware primarily checks for the HttpOnly cookie.
      // Sending the Bearer token is secondary but good for consistency if middleware checks both.
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        headers,
        credentials: 'include', // Crucial for sending the HttpOnly soundtrace_session_token cookie
      });
      if (!response.ok) {
        const errorBody = await response.text().catch(()=>'Could not read error response body');
        console.error('Backend logout call failed:', response.status, errorBody);
      }
    } catch (error) {
      console.error('Error calling backend logout:', error);
    }
  },
};
