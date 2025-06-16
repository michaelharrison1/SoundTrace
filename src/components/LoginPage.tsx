
import React, { useState, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
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
    <div className="p-4 flex flex-col justify-center h-full text-black"> {/* Ensure text color is black */}
      <div className="flex justify-center mb-3">
        <img src="/src/components/windows95icons/actions/key_32x32.png" alt="Login" width="32" height="32" style={{imageRendering: 'pixelated'}} />
      </div>
      <h2 className="text-lg font-normal text-center mb-1">User Login</h2>
      <p className="text-xs text-center mb-3">
          Enter your username and password.
      </p>

      {error && !isLoading && (
        <div className="mb-2 p-1 text-xs field-row bg-red-100 border border-red-500 text-red-700" role="alert">
          <strong>Login Error:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="field-row-stacked">
          <label htmlFor="login-username">Username:</label>
          <input
            id="login-username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-label="Username"
            disabled={isLoading}
          />
        </div>

        <div className="field-row-stacked">
          <label htmlFor="login-password">Password:</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
            disabled={isLoading}
          />
        </div>

        {!isLoading && (
          <div className="field-row mt-3 flex justify-center space-x-2"> {/* Use field-row for button alignment */}
            <button type="submit" disabled={isLoading} style={{minWidth: '80px'}}>
              OK
            </button>
            {/* Optional: Add a Cancel button if it makes sense for the flow */}
            {/* <button type="button" onClick={() => console.log('Login Cancelled')} style={{minWidth: '80px'}}>Cancel</button> */}
          </div>
        )}
      </form>

      {isLoading && (
        <div className="mt-3">
          <ProgressBar text="Authenticating..." />
        </div>
      )}
    </div>
  );
};

export default React.memo(LoginPage);
