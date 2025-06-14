
import React, { useState, useEffect, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import RegistrationPage from './components/RegistrationPage';
import MainAppLayout from './components/MainAppLayout';
import { User } from './types';
import ProgressBar from './components/common/ProgressBar';
import { SpotifyProvider, SpotifyCallbackReceiver } from './contexts/SpotifyContext';
import { GoogleApiProvider } from './contexts/GoogleAuthContext'; 
import { authService } from './services/authService';
import AuthHeaderContent from './components/app/AuthHeaderContent';
import AppIntroduction from './components/app/AppIntroduction';
import PrivacyPolicyPage from './components/PrivacyPolicyPage'; 
import TermsOfServicePage from './components/TermsOfServicePage';
// Removed: import YouTubeChannelSelectorModal from './components/modals/YouTubeChannelSelectorModal';

type AuthView = 'login' | 'register';

const AppContentInternal: React.FC = React.memo(() => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authView, setAuthView] = useState<AuthView>('login');
  // Removed: const { showChannelSelectorModal } = useGoogleAuth(); 

  useEffect(() => {
    try {
      const token = localStorage.getItem('authToken');
      const userDetailsJson = localStorage.getItem('currentUserDetails');
      if (token && userDetailsJson) {
        const userDetails: User = JSON.parse(userDetailsJson);
        setCurrentUser(userDetails);
        document.body.classList.remove('logged-out-background');
        document.body.classList.add('logged-in-background');
      } else {
        document.body.classList.add('logged-out-background');
        document.body.classList.remove('logged-in-background');
      }
    } catch (error) {
      console.error("Error reading auth data from localStorage:", error);
      localStorage.removeItem('authToken'); localStorage.removeItem('currentUserDetails');
      document.body.classList.add('logged-out-background'); document.body.classList.remove('logged-in-background');
    }
    setIsLoading(false);
  }, []);

  const handleAuthSuccess = useCallback((user: User) => {
    setCurrentUser(user); setAuthView('login');
    document.body.classList.remove('logged-out-background');
    document.body.classList.add('logged-in-background');
    if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === 'function') (document.activeElement as HTMLElement).blur();
  }, []);

  const handleLogout = useCallback(async () => {
    await authService.logout().catch(err => console.error("Error backend logout:", err));
    try { localStorage.removeItem('authToken'); localStorage.removeItem('currentUserDetails'); } 
    catch (error) { console.error("Error clearing localStorage:", error); }
    setCurrentUser(null); setAuthView('login');
    document.body.classList.add('logged-out-background'); document.body.classList.remove('logged-in-background');
    if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === 'function') (document.activeElement as HTMLElement).blur();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-transparent p-4">
        <div className="w-full max-w-xs p-4 bg-[#C0C0C0] win95-border-outset">
          <ProgressBar text="Loading App..." /><p className="text-xs text-gray-700 text-center mt-1">This may take up to a minute.</p>
        </div>
      </div>);
  }

  const { pathname } = window.location;
  if (pathname === '/spotify-callback-receiver') return <SpotifyCallbackReceiver />;
  if (pathname === '/privacy-policy') return <PrivacyPolicyPage />;
  if (pathname === '/terms-of-service') return <TermsOfServicePage />;

  return (
    <>
      <div className="min-h-screen bg-transparent flex flex-col">
        <header className="bg-[#084B8A] sticky top-0 z-50 border-b-2 border-b-black">
          <div className="mx-auto px-2">
            <div className="flex items-center justify-between h-8">
              <div className="flex items-center"><h1 className="text-lg font-normal text-white ml-2">SoundTrace</h1></div>
              <div className="flex items-center space-x-1">
                 <AuthHeaderContent currentUser={currentUser} authView={authView} onSetAuthView={setAuthView} onLogout={handleLogout} />
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto p-2 w-full flex-grow">
            {currentUser ? ( <MainAppLayout user={currentUser} onLogout={handleLogout} /> ) : (
              <div className="flex flex-col md:flex-row w-full gap-4 max-w-6xl mx-auto">
                <AppIntroduction />
                <div className="w-full md:w-1/3 order-2 md:order-2 flex flex-col">
                  {authView === 'login' ? (<LoginPage onLogin={handleAuthSuccess} />) : (<RegistrationPage onRegister={handleAuthSuccess} />)}
                </div>
              </div> )}
        </main>
        <footer className="py-1 px-2 text-xs text-black border-t-2 border-t-white bg-[#C0C0C0] flex justify-between items-center">
          <div><span>&copy; {new Date().getFullYear()} SoundTrace. </span><span>Powered by ACRCloud, Spotify & YouTube. </span>
            <a href="/privacy-policy" className="text-blue-700 hover:underline">Privacy Policy</a><span className="mx-1">|</span>
            <a href="/terms-of-service" className="text-blue-700 hover:underline">Terms of Service</a>
          </div><span>Created by Michael Harrison</span>
        </footer>
      </div>
      {/* Removed: {showChannelSelectorModal && <YouTubeChannelSelectorModal />} */}
    </>
  );
});
AppContentInternal.displayName = 'AppContentInternal';

const App: React.FC = () => (
  <GoogleApiProvider>
    <SpotifyProvider>
      <AppContentInternal />
    </SpotifyProvider>
  </GoogleApiProvider>
);
export default App;
