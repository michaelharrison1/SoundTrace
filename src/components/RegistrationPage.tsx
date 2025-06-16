
import React, { useState, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import ProgressBar from './common/ProgressBar';

interface RegistrationPageProps {
  onRegister: (user: User) => void;
}

const RegistrationPage: React.FC<RegistrationPageProps> = ({ onRegister }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
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
      localStorage.setItem('authToken', authResponse.token);
      const user: User = { id: authResponse.userId, username: authResponse.username };
      localStorage.setItem('currentUserDetails', JSON.stringify(user));
      onRegister(user);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  }, [username, password, confirmPassword, onRegister]);

  return (
    <div className="p-4 flex flex-col justify-center h-full text-black">
       <div className="flex justify-center mb-3">
         <img src="/src/components/windows95icons/actions/add_user_32x32.png" alt="Register User" width="32" height="32" style={{imageRendering: 'pixelated'}} />
      </div>
      <h2 className="text-lg font-normal text-center mb-1">Create New Account</h2>
      <p className="text-xs text-center mb-3">
        Enter details to register for SoundTrace 95.
      </p>

      {error && !isLoading && (
        <div className="mb-2 p-1 text-xs field-row bg-red-100 border border-red-500 text-red-700" role="alert">
          <strong>Registration Error:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="field-row-stacked">
          <label htmlFor="reg-username">Username:</label>
          <input
            id="reg-username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-label="Choose a username"
            disabled={isLoading}
          />
        </div>

        <div className="field-row-stacked">
          <label htmlFor="reg-password">Password:</label>
          <input
            id="reg-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Create a password (min. 6 characters)"
            disabled={isLoading}
          />
        </div>

        <div className="field-row-stacked">
          <label htmlFor="reg-confirm-password">Confirm Password:</label>
          <input
            id="reg-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-label="Confirm your password"
            disabled={isLoading}
          />
        </div>

        {!isLoading && (
          <div className="field-row mt-3 flex justify-center space-x-2">
            <button type="submit" disabled={isLoading} style={{minWidth: '80px'}}>
              Register
            </button>
          </div>
        )}
      </form>

      {isLoading && (
        <div className="mt-3">
          <ProgressBar text="Registering..." />
        </div>
      )}
    </div>
  );
};

export default React.memo(RegistrationPage);
