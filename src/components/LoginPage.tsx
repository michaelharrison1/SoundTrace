
import React, { useState } from 'react';
import { User } from '../types';
import { authService } from '../services/authService'; // Import the new authService
import Button from './common/Button';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const authResponse = await authService.login(username, password);
      // Assuming authResponse is { token: string, userId: string, username: string }
      // Store token and user details in localStorage
      localStorage.setItem('authToken', authResponse.token);
      const user: User = { id: authResponse.userId, username: authResponse.username };
      localStorage.setItem('currentUserDetails', JSON.stringify(user));

      onLogin(user);

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#C0C0C0] p-2">
      <div className="bg-[#C0C0C0] p-0.5 win95-border-outset w-full max-w-sm">
        <div className="bg-[#C0C0C0] p-4 border-2 border-transparent"> {/* Inner padding */}
          <div className="flex justify-center mb-4">
            <span className="text-3xl text-[#084B8A]" aria-hidden="true">♫</span>
          </div>
          <h2 className="text-2xl font-normal text-center text-black mb-1">SoundTrace Login</h2>
          <p className="text-sm text-center text-black mb-5">
            Upload instrumentals, scan for uses, and track results.
          </p>

          {error && (
            <div className="mb-3 p-2 bg-red-200 text-black border border-black text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-normal text-black mb-0.5">
                Username:
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                placeholder="Enter username"
                aria-label="Username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-normal text-black mb-0.5">
                Password:
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                placeholder="Enter password"
                aria-label="Password"
              />
            </div>

            <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="w-full">
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          {/*
            Keeping the demo credentials hint might be useful for your backend testing,
            but consider removing it for a "real" application.
          */}
          <p className="mt-4 text-xs text-center text-blue-800">
            Demo: user <span className="font-semibold text-black">producer</span>, pass <span className="font-semibold text-black">password123</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
