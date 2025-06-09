
import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import RegistrationPage from './components/RegistrationPage';
import MainAppLayout from './components/MainAppLayout';
import { User } from './types';
import Button from './components/common/Button';
import LogoutIcon from './components/icons/LogoutIcon';
import ProgressBar from './components/common/ProgressBar';

type AuthView = 'login' | 'register';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authView, setAuthView] = useState<AuthView>('login');

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

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setAuthView('login');
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
    setAuthView('login'); // Default to login view after logout
    if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === 'function') {
      (document.activeElement as HTMLElement).blur();
    }
  };

  const getButtonClass = (viewType: AuthView) => {
    return `px-2 py-0.5 !bg-[#C0C0C0] !text-black !border-t-white !border-l-white !border-b-[#808080] !border-r-[#808080] !shadow-[1px_1px_0px_#000000] active:!shadow-[0px_0px_0px_#000000] active:!border-t-[#808080] active:!border-l-[#808080] active:!border-b-white active:!border-r-white ${authView === viewType && !currentUser ? '!shadow-none !translate-x-[1px] !translate-y-[1px] !border-t-[#808080] !border-l-[#808080] !border-b-white !border-r-white' : ''}`;
  };


  const renderAuthHeaderContent = () => {
    if (currentUser) {
      return (
        <>
          <span className="text-xs text-white hidden sm:block mr-2">User: {currentUser.username}</span>
          <Button
            onClick={handleLogout}
            size="sm"
            className={getButtonClass('login')} // Use a default class or adjust if needed
            icon={<LogoutIcon className="w-3 h-3" />}
          >
            Logout
          </Button>
        </>
      );
    } else {
      return (
        <>
          <Button
            onClick={() => setAuthView('login')}
            size="sm"
            className={getButtonClass('login')}
            // aria-pressed={authView === 'login'} // For accessibility
          >
            Login
          </Button>
          <Button
            onClick={() => setAuthView('register')}
            size="sm"
            className={getButtonClass('register')}
            // aria-pressed={authView === 'register'} // For accessibility
          >
            Register
          </Button>
        </>
      );
    }
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#C0C0C0] p-4">
        <div className="w-full max-w-xs">
          <ProgressBar text="Loading App..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#C0C0C0] flex flex-col">
      {/* GLOBAL HEADER */}
      <header className="bg-[#084B8A] sticky top-0 z-50 border-b-2 border-b-black">
        <div className="mx-auto px-2">
          <div className="flex items-center justify-between h-8">
            <div className="flex items-center">
              <h1 className="text-lg font-normal text-white ml-2">SoundTrace</h1>
            </div>
            <div className="flex items-center space-x-2">
              {renderAuthHeaderContent()}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="mx-auto p-2 w-full flex-grow"> {/* Adjusted padding for content */}
          {currentUser ? (
            <MainAppLayout user={currentUser} onLogout={handleLogout} /> // onLogout might be redundant if header handles all logout
          ) : (
            // Two-column layout for Login/Register Blurb and Form
            <div className="flex flex-col md:flex-row w-full gap-4 max-w-6xl mx-auto"> {/* Centered and max-width */}
              {/* Left Blurb Area */}
              <div className="w-full md:w-2/3 p-0.5 win95-border-outset bg-[#C0C0C0] order-1 md:order-1 flex flex-col">
                <div className="bg-[#C0C0C0] p-6 h-full text-black flex-grow">
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
              {/* Right Auth Form Area */}
              <div className="w-full md:w-1/3 order-2 md:order-2 flex flex-col">
                {authView === 'login' ? (
                  <LoginPage onLogin={handleAuthSuccess} />
                ) : (
                  <RegistrationPage onRegister={handleAuthSuccess} />
                )}
              </div>
            </div>
          )}
      </main>

      {/* GLOBAL FOOTER */}
      <footer className="py-1 px-2 text-xs text-black border-t-2 border-t-white bg-[#C0C0C0] flex justify-between items-center">
        <div>
          <span>&copy; {new Date().getFullYear()} SoundTrace. </span>
          <span>Powered by ACRCloud.</span>
        </div>
        <span>Created by Michael Harrison</span>
      </footer>
    </div>
  );
};

export default App;