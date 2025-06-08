
import React, { useState } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import Button from './common/Button';

interface LoginPageProps {
  onLogin: (user: User) => void;
  onNavigateToRegister: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onNavigateToRegister }) => {
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#C0C0C0] p-4">
      <div className="flex flex-col md:flex-row w-full max-w-6xl gap-6 mb-6"> {/* max-w-6xl for wider layout, gap for spacing */}
        {/* Left Blurb */}
        <div className="w-full md:w-2/3 p-0.5 win95-border-outset bg-[#C0C0C0] order-1 md:order-none">
          <div className="bg-[#C0C0C0] p-6 h-full text-black">
            <h3 className="text-xl font-normal mb-4">Welcome to SoundTrace</h3>
            <p className="text-base mb-3">
              Built for producers to track the use of their instrumentals online by other artists.
            </p>
            <p className="text-base mb-3">
              You can get Spotify links to the track, estimate your total monthly outreach from Spotify monthly listeners (feature TBD), and get artists’ names and important info.
            </p>
            <p className="text-base">
              Upload your audio files and it compares them against 100 million tracks from the ACR cloud library.
            </p>
          </div>
        </div>

        {/* Right Login Form */}
        <div className="w-full md:w-1/3 order-2 md:order-none">
          <div className="bg-[#C0C0C0] p-0.5 win95-border-outset w-full"> {/* Login box enlarged by taking full 1/3 width */}
            <div className="bg-[#C0C0C0] p-4 border-2 border-transparent">
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
              {isLoading && (
                <p className="mt-3 text-xs text-center text-black">
                  Logging in can take up to a minute.
                </p>
              )}
              <p className="mt-4 text-xs text-center text-black">
                Don't have an account?{' '}
                <button
                  onClick={onNavigateToRegister}
                  className="font-semibold text-blue-800 hover:underline focus:outline-none"
                  aria-label="Navigate to registration page"
                >
                  Register here
                </button>
              </p>
              <p className="mt-2 text-xs text-center text-blue-800">
                Demo: user <span className="font-semibold text-black">producer</span>, pass <span className="font-semibold text-black">password123</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Text for Login Page */}
      <div className="text-xs text-black w-full max-w-6xl mt-auto"> {/* mt-auto pushes to bottom if content is short */}
        <div className="flex justify-between items-center border-t-2 border-t-white bg-[#C0C0C0] py-1 px-2 win95-border-inset border-b-0 border-l-0 border-r-0">
            <span className="flex-1 text-center">Powered by ACRCloud</span>
            <span className="flex-1 text-right">Created by Michael Harrison</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
