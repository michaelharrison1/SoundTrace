
import { User } from '../types';

// IMPORTANT: Replace this with your actual Render backend URL
const BACKEND_URL = 'https://soundtracebackend.onrender.com';
// Example: const BACKEND_URL = 'https://my-auth-backend-123.onrender.com';

if (BACKEND_URL === 'https://soundtracebackend.onrender.com') {
  console.warn(
    'Please update YOUR_RENDER_BACKEND_URL in src/services/authService.ts with your actual Render backend URL.'
  );
  alert(
    'Development Warning: Backend URL is not configured. Login will fail. See src/services/authService.ts'
  );
}


interface LoginResponse {
  token: string;
  userId: string;
  username: string;
  // Add any other fields your backend returns upon login
}

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    if (!BACKEND_URL || BACKEND_URL === 'YOUR_RENDER_BACKEND_URL') {
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

    // Ensure the response contains the expected fields
    if (!data.token || !data.userId || !data.username) {
        console.error('Login response missing expected fields:', data);
        throw new Error('Login response from server was incomplete.');
    }

    return data as LoginResponse;
  },

  // TODO: Implement registration if your backend supports it and you add a UI for it
  // register: async (username: string, password: string): Promise<LoginResponse> => {
  //   const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({ username, password }),
  //   });
  //   const data = await response.json();
  //   if (!response.ok) {
  //     throw new Error(data.message || `Registration failed with status: ${response.status}`);
  //   }
  //  if (!data.token || !data.userId || !data.username) {
  //       console.error('Registration response missing expected fields:', data);
  //       throw new Error('Registration response from server was incomplete.');
  //   }
  //   return data as LoginResponse;
  // },

  // You might add other auth-related functions here, e.g.,
  // verifyToken: async (token: string): Promise<User | null> => { ... }
  // refreshToken: async (): Promise<string | null> => { ... }
};
