
import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import MainAppLayout from './components/MainAppLayout';
import { User } from './types';
// import { mockAuthService } from './services/mockAuthService'; // Replaced by localStorage check

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check for token and user details in localStorage
    try {
      const token = localStorage.getItem('authToken');
      const userDetailsJson = localStorage.getItem('currentUserDetails');

      if (token && userDetailsJson) {
        const userDetails: User = JSON.parse(userDetailsJson);
        setCurrentUser(userDetails);
      }
    } catch (error) {
      console.error("Error reading auth data from localStorage:", error);
      // Clear potentially corrupted data
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUserDetails');
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Attempt to blur the currently focused element to prevent extension issues
    if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === 'function') {
      (document.activeElement as HTMLElement).blur();
    }
  };

  const handleLogout = () => {
    // Clear token and user details from localStorage
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUserDetails');
    } catch (error) {
      console.error("Error clearing auth data from localStorage:", error);
    }
    setCurrentUser(null);
    // Optionally, blur after logout too if similar issues arise
    if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === 'function') {
      (document.activeElement as HTMLElement).blur();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#C0C0C0]">
        <div className="text-xl font-semibold text-black">Loading App...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#C0C0C0]">
      {currentUser ? (
        <MainAppLayout user={currentUser} onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
