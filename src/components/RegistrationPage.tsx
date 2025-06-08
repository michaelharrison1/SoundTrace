
import React, { useState } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import Button from './common/Button';

interface RegistrationPageProps {
  onRegister: (user: User) => void; // Called on successful registration (acts like onLogin)
  onNavigateToLogin: () => void;
}

const RegistrationPage: React.FC<RegistrationPageProps> = ({ onRegister, onNavigateToLogin }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const authResponse = await authService.register(username, password);
      // Assuming authResponse is { token: string, userId: string, username: string }
      localStorage.setItem('authToken', authResponse.token);
      const user: User = { id: authResponse.userId, username: authResponse.username };
      localStorage.setItem('currentUserDetails', JSON.stringify(user));

      onRegister(user); // This will set the current user in App.tsx and change view

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#C0C0C0] p-2">
      <div className="bg-[#C0C0C0] p-0.5 win95-border-outset w-full max-w-sm">
        <div className="bg-[#C0C0C0] p-4 border-2 border-transparent">
          <div className="flex justify-center mb-4">
            <span className="text-3xl text-[#084B8A]" aria-hidden="true">♫</span>
          </div>
          <h2 className="text-2xl font-normal text-center text-black mb-1">Create Account</h2>
          <p className="text-sm text-center text-black mb-5">
            Join SoundTrace to start scanning your instrumentals.
          </p>

          {error && (
            <div className="mb-3 p-2 bg-red-200 text-black border border-black text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-username" className="block text-sm font-normal text-black mb-0.5">
                Username:
              </label>
              <input
                id="reg-username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                placeholder="Choose a username"
                aria-label="Choose a username"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-normal text-black mb-0.5">
                Password:
              </label>
              <input
                id="reg-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                placeholder="Create a password (min. 6 chars)"
                aria-label="Create a password"
              />
            </div>

            <div>
              <label htmlFor="reg-confirm-password" className="block text-sm font-normal text-black mb-0.5">
                Confirm Password:
              </label>
              <input
                id="reg-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                placeholder="Confirm your password"
                aria-label="Confirm your password"
              />
            </div>

            <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="w-full">
              {isLoading ? 'Creating Account...' : 'Register'}
            </Button>
          </form>
          <p className="mt-4 text-xs text-center text-black">
            Already have an account?{' '}
            <button
              onClick={onNavigateToLogin}
              className="font-semibold text-blue-800 hover:underline focus:outline-none"
              aria-label="Navigate to login page"
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;
