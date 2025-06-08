
import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import RegistrationPage from './components/RegistrationPage'; // Import RegistrationPage
import MainAppLayout from './components/MainAppLayout';
import { User } from './types';

type AuthView = 'login' | 'register';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authView, setAuthView] = useState<AuthView>('login'); // To toggle between login and register

  useEffect(() => {
    try {
      const token = localStorage.getItem('authToken');
      const userDetailsJson = localStorage.getItem('currentUserDetails');

      if (token && userDetailsJson) {
        const userDetails: User = JSON.parse(userDetailsJson);
        setCurrentUser(userDetails);
      }
    } catch (error) {
      console.error("Error reading auth data from localStorage:", error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUserDetails');
    }
    setIsLoading(false);
  }, []);

  const handleAuthSuccess = (user: User) => { // Renamed from handleLogin for clarity
    setCurrentUser(user);
    setAuthView('login'); // Reset to login view for next time
    if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === 'function') {
      (document.activeElement as HTMLElement).blur();
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUserDetails');
    } catch (error) {
      console.error("Error clearing auth data from localStorage:", error);
    }
    setCurrentUser(null);
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
      ) : authView === 'login' ? (
        <LoginPage
          onLogin={handleAuthSuccess}
          onNavigateToRegister={() => setAuthView('register')}
        />
      ) : (
        <RegistrationPage
          onRegister={handleAuthSuccess}
          onNavigateToLogin={() => setAuthView('login')}
        />
      )}
    </div>
  );
};

export default App;
