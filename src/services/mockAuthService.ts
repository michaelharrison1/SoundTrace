import { User } from '../types';

const MOCK_USER_KEY = 'soundtrace_user'; // Updated key

// Hardcoded credentials for demo purposes
const MOCK_VALID_USERNAME = 'producer';
const MOCK_VALID_PASSWORD = 'password123';

export const mockAuthService = {
  login: async (username: string, password: string): Promise<User | null> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (username === MOCK_VALID_USERNAME && password === MOCK_VALID_PASSWORD) {
          const user: User = { id: 'user-123', username };
          try {
            localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
            resolve(user);
          } catch (error) {
            console.error("Error saving user to localStorage:", error);
            reject(new Error("Failed to save session. Please try again."));
          }
        } else {
          reject(new Error('Invalid username or password.'));
        }
      }, 500); // Shorter delay for retro feel
    });
  },

  logout: (): void => {
    try {
      localStorage.removeItem(MOCK_USER_KEY);
    } catch (error) {
      console.error("Error removing user from localStorage:", error);
    }
  },

  getCurrentUser: (): User | null => {
    try {
      const userJson = localStorage.getItem(MOCK_USER_KEY);
      if (userJson) {
        return JSON.parse(userJson) as User;
      }
      return null;
    } catch (error) {
      console.error("Error retrieving user from localStorage:", error);
      return null;
    }
  },
};