import React, { useState } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import Button from './common/Button';
import ProgressBar from './common/ProgressBar';

interface AccountSettingsProps {
  user: User;
  onAccountDeleted: () => void;
  onClose: () => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ user, onAccountDeleted, onClose }) => {
  const [password, setPassword] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleShowDeleteConfirmation = () => {
    setShowDeleteConfirmation(true);
    setError(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setPassword('');
    setError(null);
  };

  const handleDeleteAccount = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      await authService.deleteAccount(password);
      setSuccess('Account deleted successfully!');
      
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUserDetails');
      
      // Short delay to show success message
      setTimeout(() => {
        onAccountDeleted();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-[#C0C0C0] p-0.5 win95-border-outset w-full">
        <div className="bg-[#C0C0C0] p-4 border-2 border-transparent">
          <div className="flex justify-center mb-4">
            <span className="text-3xl text-green-600">✓</span>
          </div>
          <h2 className="text-2xl font-normal text-center text-black mb-1">Success</h2>
          <p className="text-center text-black mb-5">
            {success}
          </p>
          <ProgressBar text="Logging out..." />
        </div>
      </div>
    );
  }

  if (showDeleteConfirmation) {
    return (
      <div className="bg-[#C0C0C0] p-0.5 win95-border-outset w-full">
        <div className="bg-[#C0C0C0] p-4 border-2 border-transparent">
          <h2 className="text-2xl font-normal text-center text-black mb-1">Confirm Account Deletion</h2>
          <p className="text-center text-red-600 font-semibold mb-4">
            This action cannot be undone.
          </p>
          
          <p className="text-center text-black mb-5">
            All your data will be permanently deleted, including scan history and job data.
          </p>
          
          {error && (
            <div className="mb-4 p-2 bg-red-200 text-black border border-black text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-normal text-black mb-0.5">
              Enter your password to confirm:
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
              placeholder="Enter password to confirm"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex justify-between">
            <Button 
              onClick={handleCancelDelete} 
              size="md" 
              disabled={isLoading}
              className="bg-[#C0C0C0]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteAccount} 
              size="md" 
              disabled={isLoading || !password}
              className="bg-red-200 hover:bg-red-300 text-red-900"
            >
              Delete My Account
            </Button>
          </div>
          
          {isLoading && (
            <div className="mt-4">
              <ProgressBar text="Deleting account..." />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#C0C0C0] p-0.5 win95-border-outset w-full">
      <div className="bg-[#C0C0C0] p-4 border-2 border-transparent">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-normal text-black">Account Settings</h2>
          <Button onClick={onClose} size="sm" className="!px-2 !py-0">X</Button>
        </div>
        
        <div className="mb-4 p-3 win95-border-inset">
          <div className="flex flex-col">
            <p className="text-sm text-black mb-1">
              <strong>Username:</strong> {user.username}
            </p>
            <p className="text-sm text-black">
              <strong>Account ID:</strong> {user.id}
            </p>
          </div>
        </div>
        
        <div className="mb-4 p-3 win95-border-inset">
          <h3 className="text-lg font-normal text-black mb-2">Danger Zone</h3>
          <p className="text-sm text-black mb-3">
            Delete your account and all associated data.
          </p>
          <Button 
            onClick={handleShowDeleteConfirmation} 
            size="sm" 
            className="bg-red-200 hover:bg-red-300 text-red-900"
          >
            Delete Account
          </Button>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={onClose} size="md">Close</Button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AccountSettings);
