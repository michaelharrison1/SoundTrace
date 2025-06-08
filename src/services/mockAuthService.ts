
import { User } from '../types';

const MOCK_USER_KEY = 'soundtrace_user'; // This key is no longer the primary source of truth for logged-in user with real backend.

// Hardcoded credentials for demo purposes - still useful if backend matches these for testing.
const MOCK_VALID_USERNAME = 'producer';
const MOCK_VALID_PASSWORD = 'password123';

export const mockAuthService = {
  // login, logout, and getCurrentUser are now primarily handled by authService.ts and direct localStorage checks.
  // These mock implementations are effectively deprecated for the core auth flow.

  /**
   * @deprecated Use authService.login and localStorage for real authentication.
   */
  login: async (username: string, password: string): Promise<User | null> => {
    console.warn("mockAuthService.login called - this should be replaced by real backend calls.");
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (username === MOCK_VALID_USERNAME && password === MOCK_VALID_PASSWORD) {
          const user: User = { id: 'user-123', username };
          // Real app now stores token and user details separately from backend response
          // localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
          resolve(user);
        } else {
          reject(new Error('Mock: Invalid username or password.'));
        }
      }, 500);
    });
  },

  /**
   * @deprecated Real logout is handled in App.tsx by clearing localStorage.
   */
  logout: (): void => {
    console.warn("mockAuthService.logout called - real logout clears localStorage in App.tsx.");
    // try {
    //   localStorage.removeItem(MOCK_USER_KEY); // Real app clears 'authToken' and 'currentUserDetails'
    // } catch (error) {
    //   console.error("Error removing user from localStorage:", error);
    // }
  },

  /**
   * @deprecated Real current user check is handled in App.tsx by checking localStorage for 'authToken' and 'currentUserDetails'.
   */
  getCurrentUser: (): User | null => {
    console.warn("mockAuthService.getCurrentUser called - real check is in App.tsx via localStorage.");
    // try {
    //   const userJson = localStorage.getItem(MOCK_USER_KEY); // Real app uses 'currentUserDetails'
    //   if (userJson) {
    //     return JSON.parse(userJson) as User;
    //   }
    //   return null;
    // } catch (error) {
    //   console.error("Error retrieving user from localStorage:", error);
    //   return null;
    // }
    return null; // Reflect that this shouldn't be the source of truth anymore
  },
};
