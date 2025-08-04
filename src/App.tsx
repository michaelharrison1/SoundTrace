// List of available gif filenames in public/gifs (now 1.gif to 34.gif)
const GIFS = Array.from({ length: 34 }, (_, i) => `${i + 1}.gif`);

// IMPORTANT: For Vite/React, GIFs must be in the public directory for direct URL access
// Move your gifs to 'public/gifs/' and use '/gifs/filename.gif' as the URL
function getRandomGifUrl() {
  const idx = Math.floor(Math.random() * GIFS.length);
  return `/gifs/${GIFS[idx]}`;
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './components/customScrollbars.css';
import LoginPage from './components/LoginPage';
import RegistrationPage from './components/RegistrationPage';
import MainAppLayout from './components/MainAppLayout';
import { User, TrackScanLog, ScanJob } from './types';
import ProgressBar from './components/common/ProgressBar';
import { SpotifyProvider, SpotifyCallbackReceiver } from './contexts/SpotifyContext';
import { Win95ModalProvider } from './components/common/Win95ModalProvider';
import { authService } from './services/authService';
import MainAppMenu from './components/MainAppMenu';
import AppIntroduction from './components/app/AppIntroduction';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import TermsOfServicePage from './components/TermsOfServicePage';
import { scanLogService } from './services/scanLogService';


export type AuthView = 'login' | 'register';

// Define and export AppWindow type based on usage in child components
export interface AppWindow {
  id: string;
  title: string;
  content: React.ReactElement;
  icon?: string;
  zIndex: number;
  isActive: boolean;
  isMinimized: boolean;
  width?: string;
  height?: string;
  isModal?: boolean;
}


const AppContentInternal: React.FC = React.memo(() => {


  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authView, setAuthView] = useState<AuthView>('login');

  const [previousScans, setPreviousScans] = useState<TrackScanLog[]>([]);
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [isAppDataLoading, setIsAppDataLoading] = useState<boolean>(false);
  const [appDataError, setAppDataError] = useState<string | null>(null);

  // On each reload, randomly choose a GIF, and keep it fixed until next reload
  const [gifIndex] = useState(() => {
    return Math.floor(Math.random() * GIFS.length);
  });
  const bgGif = `/gifs/${GIFS[gifIndex]}`;

  // Only set GIF background if not logged in
  useEffect(() => {
    if (currentUser) {
      // Remove any existing style if logging in
      const styleTag = document.getElementById('soundtrace-bg-gif-style');
      if (styleTag) styleTag.remove();
      document.body.style.background = '';
      return;
    }
    if (!bgGif) return;
    const styleId = 'soundtrace-bg-gif-style';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
      body::before {
        content: '';
        position: fixed !important;
        z-index: -1 !important;
        top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
        background-image: url('${bgGif}') !important;
        background-repeat: no-repeat !important;
        background-position: center center !important;
        background-size: cover !important;
        filter: blur(2px) brightness(0.7) !important;
        opacity: 1 !important;
        pointer-events: none !important;
        background-color: transparent !important;
      }
    `;
    document.body.style.background = '#222';
    return () => {
      if (styleTag) styleTag.remove();
      document.body.style.background = '';
    };
  }, [bgGif, currentUser]);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.soundtrace.uk';
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleLogout = useCallback(async () => {
    try { await authService.logout(); }
    catch (err) { console.error("Error during backend logout:", err); }
    finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUserDetails');
      setCurrentUser(null);
      setAuthView('login');
      document.body.classList.add('logged-out-background');
      document.body.classList.remove('logged-in-background');
      if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === 'function') {
        (document.activeElement as HTMLElement).blur();
      }
    }
  }, []);

  const handleAuthError = useCallback((err: unknown, operation?: string) => {
    let isAuthError = false;
    let message = '';
    if (typeof err === 'object' && err !== null) {
      const status = (err as { status?: number }).status;
      const msg = (err as { message?: string }).message;
      if (status === 401 || status === 403) isAuthError = true;
      if (typeof msg === 'string') {
        message = msg;
        const lowerMsg = msg.toLowerCase();
        if (
          lowerMsg.includes('token is not valid') ||
          lowerMsg.includes('not authenticated') ||
          lowerMsg.includes('authorization denied')
        ) {
          isAuthError = true;
        }
      }
    }
    if (isAuthError) {
      console.warn(`[App] Auth error during "${operation || 'unknown operation'}". Logging out.`, message);
      handleLogout();
      return true;
    } else {
      setAppDataError(message || "Could not load app data.");
      return false;
    }
  }, [handleLogout]);


  const fetchData = useCallback(async (source: 'initial' | 'sse' | 'manual' = 'initial') => {
    if (!currentUser) return;
    if (source === 'initial' || source === 'manual') setIsAppDataLoading(true);
    if (source === 'manual') setAppDataError(null);

    try {
      const logsPromise = scanLogService.getScanLogs();
      const jobsPromise = scanLogService.getAllJobs();

      const [logs, userJobs] = await Promise.all([logsPromise, jobsPromise]);

      setPreviousScans(logs.sort((a, b) => new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime()));
      setJobs(userJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      if (source === 'initial' || source === 'manual') setAppDataError(null);
    } catch (err: unknown) {
      if (!handleAuthError(err, 'fetch app data')) {
        let message = "Could not load app data.";
        if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: string }).message === 'string') {
          message = (err as { message?: string }).message!;
        }
        setAppDataError(message);
      }
    } finally {
      if (source === 'initial' || source === 'manual') setIsAppDataLoading(false);
    }
  }, [currentUser, handleAuthError]);

  const handleGenericUpdateTrigger = useCallback(() => {
    fetchData('sse'); // Or 'manual', depending on desired behavior for job/log updates
  }, [fetchData]);


  useEffect(() => {
    if (currentUser && (eventSourceRef.current === null || eventSourceRef.current.readyState === EventSource.CLOSED)) {
        fetchData('initial'); // Initial fetch for logged-in user

        const token = localStorage.getItem('authToken');
        if (token && API_BASE_URL) {
            const url = `${API_BASE_URL}/api/job-updates/subscribe`;
            const es = new EventSource(url, { withCredentials: true });
            eventSourceRef.current = es;

            es.onopen = () => {};
            es.onmessage = (event) => {
                try {
                    const eventData = JSON.parse(event.data);
                    if (eventData.type === 'JOB_UPDATE' || eventData.type === 'JOBS_REFRESH_REQUESTED') {
                        fetchData('sse');
                    }
                } catch (parseError) {
                    console.error('[App SSE] Error parsing SSE message data:', parseError, 'Data:', event.data);
                }
            };
            es.onerror = (err) => {
                console.error('[App SSE] Error:', err);
                es.close();
                eventSourceRef.current = null;
            };
        }
    } else if (!currentUser && eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
    }
    // Cleanup function
    return () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    };
  }, [currentUser, fetchData, API_BASE_URL]);

  const handleLoginRegistrationSuccess = useCallback((user: User) => {
    setCurrentUser(user);
    setAuthView('login');
    document.body.classList.remove('logged-out-background');
    document.body.classList.add('logged-in-background');
    if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === 'function') {
      (document.activeElement as HTMLElement).blur();
    }
  }, []);

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
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUserDetails');
      document.body.classList.add('logged-out-background');
      document.body.classList.remove('logged-in-background');
    }
    setIsLoading(false);
  }, []);


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-transparent p-4">
        <div className="w-full max-w-xs p-4 bg-[#C0C0C0] win95-border-outset">
          <ProgressBar text="Loading App..." />
          <p className="text-xs text-gray-700 text-center mt-1">This may take up to a minute.</p>
        </div>
      </div>
    );
  }

  const { pathname } = window.location;
  if (pathname === '/spotify-callback-receiver') return <SpotifyCallbackReceiver />;


  return (
    <>
      <div className="min-h-screen bg-transparent flex flex-col app-bg-transparent" style={{ background: 'transparent', boxShadow: 'none' }}>
        <main className="mx-auto p-2 w-full flex-grow">
            {currentUser ? (
              <MainAppLayout
                user={currentUser}
                onLogout={handleLogout}
                previousScans={previousScans}
                jobs={jobs}
                isAppDataLoading={isAppDataLoading}
                appDataError={appDataError}
                onRefreshAllData={() => fetchData('manual')}
                onJobUpdate={handleGenericUpdateTrigger}
                onIndividualLogUpdate={handleGenericUpdateTrigger}
              />
            ) : (
              <div className="flex flex-col md:flex-row w-full gap-4 max-w-6xl mx-auto">
                <AppIntroduction />
                <div className="w-full md:w-1/3 order-2 md:order-2 flex flex-col">
                  {authView === 'login' ? (
                    <LoginPage onLogin={handleLoginRegistrationSuccess} />
                  ) : (
                    <RegistrationPage onRegister={handleLoginRegistrationSuccess} />
                  )}
                </div>
              </div>
            )}
        </main>
        <footer className="py-1 px-2 text-xs text-black border-t-2 border-t-white bg-[#C0C0C0] flex justify-between items-center">
          <div>
            <span>&copy; {new Date().getFullYear()} SoundTrace. </span>
            <span>Powered by ACRCloud, Spotify & StreamClout. </span>
          </div>
          <span>Created by Michael Harrison</span>
        </footer>
      </div>
    </>
  );
});
AppContentInternal.displayName = 'AppContentInternal';

const App: React.FC = () => (
  <Win95ModalProvider>
    <SpotifyProvider>
      <AppContentInternal />
    </SpotifyProvider>
  </Win95ModalProvider>
);
export default App;