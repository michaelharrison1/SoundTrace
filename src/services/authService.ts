
import { User } from '../types';

// IMPORTANT: This has been set to your actual Render backend URL.
const BACKEND_URL = 'https://soundtracebackend.onrender.com';

interface LoginResponse {
  token: string;
  userId: string;
  username: string;
  // Add any other fields your backend returns upon login/registration
}

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    if (!BACKEND_URL) {
      throw new Error('Backend URL is not configured. Cannot log in.');
    }

    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Login failed with status: ${response.status}`);
    }

    if (!data.token || !data.userId || !data.username) {
        console.error('Login response missing expected fields:', data);
        throw new Error('Login response from server was incomplete.');
    }

    return data as LoginResponse;
  },

  register: async (username: string, password: string): Promise<LoginResponse> => {
    if (!BACKEND_URL) {
      throw new Error('Backend URL is not configured. Cannot register.');
    }

    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Registration failed with status: ${response.status}`);
    }

    if (!data.token || !data.userId || !data.username) {
        console.error('Registration response missing expected fields:', data);
        throw new Error('Registration response from server was incomplete.');
    }
    return data as LoginResponse;
  },
};
