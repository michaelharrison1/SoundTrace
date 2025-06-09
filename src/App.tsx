
import React, { useState, useEffect, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import RegistrationPage from './components/RegistrationPage';
import MainAppLayout from './components/MainAppLayout';
import { User } from './types';
import Button from './components/common/Button';
import LogoutIcon from './components/icons/LogoutIcon';
import ProgressBar from './components/common/ProgressBar';
import { SpotifyProvider, useSpotifyPlayer, SpotifyCallbackReceiver } from './contexts/SpotifyContext';
import { authService } from './services/authService';

type AuthView = 'login' | 'register';

const SpotifyConnectButton: React.FC = () => {
  const {
    isSpotifyConnected,
    spotifyUser,
    isLoadingSpotifyAuth,
    initiateSpotifyLogin,
    disconnectSpotify
  } = useSpotifyPlayer();

  if (isLoadingSpotifyAuth) {
    return <span className="text-xs text-yellow-300 hidden sm:block mr-2">(Checking Spotify...)</span>;
  }

  if (isSpotifyConnected && spotifyUser) {
    return (
      <>
        <img src={spotifyUser.avatarUrl} alt={spotifyUser.displayName} className="w-5 h-5 rounded-full mr-1 hidden sm:inline-block win95-border-inset"/>
        <span className="text-xs text-green-300 hidden sm:block mr-2" title={`Connected to Spotify as ${spotifyUser.displayName}`}>
          Spotify: {spotifyUser.displayName.substring(0,15)}{spotifyUser.displayName.length > 15 ? '...' : ''}
        </span>
        <Button onClick={disconnectSpotify} size="sm" className="!px-1 !py-0 !text-xs !h-5 hover:bg-gray-300">Disconnect</Button>
      </>
    );
  }
  return <Button onClick={initiateSpotifyLogin} size="sm" className="!px-1 !py-0 !text-xs !h-5 hover:bg-gray-300">Connect Spotify</Button>;
};


const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authView, setAuthView] = useState<AuthView>('login');
  const { disconnectSpotify: spotifyDisconnect } = useSpotifyPlayer();

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

  const handleLogout = useCallback(async () => {
    try {
      if (spotifyDisconnect) {
        await spotifyDisconnect().catch(err => console.error("Error during Spotify disconnect on logout (non-critical):", err));
      }
    } catch (error) {
      console.error("Error calling spotifyDisconnect function (non-critical):", error);
    }
    await authService.logout().catch(err => console.error("Error calling backend logout (non-critical):", err));
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUserDetails');
    } catch (error) {
      console.error("Error clearing auth data from localStorage:", error);
    }
    setCurrentUser(null);
    setAuthView('login');
    if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === 'function') {
      (document.activeElement as HTMLElement).blur();
    }
  }, [spotifyDisconnect, setCurrentUser, setAuthView]);

  const getNavButtonClass = (viewType: AuthView, isUserContext: boolean) => {
    const isActive = isUserContext ? false : authView === viewType; // Logout button isn't "active" like login/reg tabs
    return `px-2 py-0.5 !text-black !border-t-white !border-l-white !border-b-[#808080] !border-r-[#808080] !shadow-[1px_1px_0px_#000000] hover:!bg-gray-300 active:!shadow-[0px_0px_0px_#000000] active:!border-t-[#808080] active:!border-l-[#808080] active:!border-b-white active:!border-r-white ${isActive && !currentUser ? '!shadow-none !translate-x-[1px] !translate-y-[1px] !border-t-[#808080] !border-l-[#808080] !border-b-white !border-r-white' : ''}`;
  };


  const renderAuthHeaderContent = () => {
    if (currentUser) {
      return (
        <>
          <span className="text-xs text-white hidden sm:block mr-2">User: {currentUser.username}</span>
          <SpotifyConnectButton />
          <Button
            onClick={handleLogout}
            size="sm"
            className={`${getNavButtonClass('login', true)} ml-2`} // Pass true for isUserContext
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
            className={getNavButtonClass('login', false)}
          >
            Login
          </Button>
          <Button
            onClick={() => setAuthView('register')}
            size="sm"
            className={getNavButtonClass('register', false)}
          >
            Register
          </Button>
        </>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-transparent p-4"> {/* bg-transparent for body bg to show */}
        <div className="w-full max-w-xs p-4 bg-[#C0C0C0] win95-border-outset">
          <ProgressBar text="Loading App..." />
        </div>
      </div>
    );
  }

  if (window.location.pathname === '/spotify-callback-receiver') {
    return <SpotifyCallbackReceiver />;
  }

  return (
      <div className="min-h-screen bg-transparent flex flex-col"> {/* bg-transparent for body bg to show */}
        <header className="bg-[#084B8A] sticky top-0 z-50 border-b-2 border-b-black">
          <div className="mx-auto px-2">
            <div className="flex items-center justify-between h-8">
              <div className="flex items-center">
                <h1 className="text-lg font-normal text-white ml-2">SoundTrace</h1>
              </div>
              <div className="flex items-center space-x-1">
                {renderAuthHeaderContent()}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto p-2 w-full flex-grow">
            {currentUser ? (
              <MainAppLayout user={currentUser} onLogout={handleLogout} />
            ) : (
              <div className="flex flex-col md:flex-row w-full gap-4 max-w-6xl mx-auto">
                <div className="w-full md:w-2/3 p-0.5 win95-border-outset bg-[#C0C0C0] order-1 md:order-1 flex flex-col">
                  <div className="bg-[#C0C0C0] p-6 h-full text-black flex-grow">
                    <h3 className="text-xl font-normal mb-4">Find out who's using your beats.</h3>
                    <p className="text-base mb-3">
                      SoundTrace scans over 100 million tracks to discover where your instrumentals are used, so you never miss a placement.
                    </p>
                    <ul className="list-none space-y-1 mb-3 text-base">
                        <li>✔ Track your music across platforms</li>
                        <li>✔ Get names of artists and links to tracks</li>
                        <li>✔ Powered by industry-leading audio recognition.</li>
                    </ul>
                    <p className="text-base mb-3">
                      Now with <strong className="text-green-700">Spotify playlist exporting</strong>! Connect your Spotify account to easily create playlists from your matched tracks.
                    </p>
                    <p className="text-base">
                      Get Spotify links, estimate reach from artist followers, and discover where your music is being played.
                    </p>
                     <p className="text-xs text-gray-700 mt-4">
                      Note: Spotify features require a Spotify account. Exporting playlists requires granting SoundTrace permission.
                    </p>
                  </div>
                </div>
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

        <footer className="py-1 px-2 text-xs text-black border-t-2 border-t-white bg-[#C0C0C0] flex justify-between items-center">
          <div>
            <span>&copy; {new Date().getFullYear()} SoundTrace. </span>
            <span>Powered by ACRCloud & Spotify.</span>
          </div>
          <span>Created by Michael Harrison</span>
        </footer>
      </div>
  );
};

const App: React.FC = () => {
  return (
    <SpotifyProvider>
      <AppContent />
    </SpotifyProvider>
  )
}

export default App;
