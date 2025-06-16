
import React, { useState, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import Button from './common/Button';
import ProgressBar from './common/ProgressBar';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const authResponse = await authService.login(username, password);
      localStorage.setItem('authToken', authResponse.token);
      const user: User = { id: authResponse.userId, username: authResponse.username };
      localStorage.setItem('currentUserDetails', JSON.stringify(user));
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  }, [username, password, onLogin]);

  return (
    <div className="bg-[#C0C0C0] p-0.5 win95-border-outset w-full h-full flex flex-col">
      <div className="bg-[#C0C0C0] p-4 border-2 border-transparent h-full flex flex-col justify-center flex-grow">
        <div className="flex justify-center mb-4">
          <span className="text-3xl text-[#084B8A]" aria-hidden="true">♫</span>
        </div>
        <h2 className="text-2xl font-normal text-center text-black mb-1">Account Login</h2>
        <p className="text-sm text-center text-black mb-5">
            Enter your credentials to access your dashboard.
        </p>

        {error && !isLoading && (
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>

          {!isLoading && (
            <Button type="submit" size="md" disabled={isLoading} className="w-full">
              Login
            </Button>
          )}
        </form>

        {isLoading && (
          <div className="mt-4">
            <ProgressBar text="Logging in..." />
            <p className="mt-1 text-xs text-center text-gray-700">
              This may take up to a minute.
            </p>
          </div>
        )}

        {!isLoading && (
            <p className="mt-2 text-xs text-center text-blue-800">
                Demo: user <span className="font-semibold text-black">producer</span>, pass <span className="font-semibold text-black">password123</span>
            </p>
        )}
      </div>
    </div>
  );
};

export default React.memo(LoginPage);
