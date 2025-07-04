
import React, { useState, useEffect, useCallback, useRef } from 'react';
import LoginPage from './components/LoginPage';
import RegistrationPage from './components/RegistrationPage';
import MainAppLayout from './components/MainAppLayout';
import { User, TrackScanLog, ScanJob } from './types';
import ProgressBar from './components/common/ProgressBar';
import { SpotifyProvider, SpotifyCallbackReceiver } from './contexts/SpotifyContext';
import { authService } from './services/authService';
import AuthHeaderContent from './components/app/AuthHeaderContent';
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
  
  const handleAuthError = useCallback((err: any, operation?: string) => {
    const isAuthError = (err.status === 401 || err.status === 403) ||
                          (typeof err.message === 'string' &&
                           (err.message.toLowerCase().includes('token is not valid') ||
                            err.message.toLowerCase().includes('not authenticated') ||
                            err.message.toLowerCase().includes('authorization denied')));
    if (isAuthError) {
        console.warn(`[App] Auth error during "${operation || 'unknown operation'}". Logging out.`, err.message);
        handleLogout();
        return true;
    }
    return false;
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
    } catch (err: any) {
      if(!handleAuthError(err, 'fetch app data')) {
        setAppDataError(err.message || "Could not load app data.");
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
            console.log('[App SSE] Attempting to connect to SSE endpoint:', url);
            const es = new EventSource(url, { withCredentials: true });
            eventSourceRef.current = es;

            es.onopen = () => { console.log('[App SSE] Connection opened.'); };
            es.onmessage = (event) => {
                try {
                    const eventData = JSON.parse(event.data);
                     console.log('[App SSE] Message received:', eventData.type);
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
        console.log('[App SSE] Closing SSE connection due to logout.');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
    }
    // Cleanup function
    return () => {
        if (eventSourceRef.current) {
            console.log('[App SSE] Cleaning up SSE connection on component unmount/user change.');
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
  if (pathname === '/privacy-policy') return <PrivacyPolicyPage />;
  if (pathname === '/terms-of-service') return <TermsOfServicePage />;

  return (
    <>
      <div className="min-h-screen bg-transparent flex flex-col">
        <header className="bg-[#084B8A] sticky top-0 z-50 border-b-2 border-b-black">
          <div className="mx-auto px-2">
            <div className="flex items-center justify-between h-8">
              <div className="flex items-center">
                <h1 className="text-lg font-normal text-white ml-2">SoundTrace</h1>
              </div>
              <div className="flex items-center space-x-1">
                 <AuthHeaderContent
                    currentUser={currentUser}
                    authView={authView}
                    onSetAuthView={setAuthView}
                    onLogout={handleLogout}
                 />
              </div>
            </div>
          </div>
        </header>
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
            <span>Powered by ACRCloud, Spotify & YouTube. </span>
            <a href="/privacy-policy" className="text-blue-700 hover:underline">Privacy Policy</a>
            <span className="mx-1">|</span>
            <a href="/terms-of-service" className="text-blue-700 hover:underline">Terms of Service</a>
          </div>
          <span>Created by Michael Harrison</span>
        </footer>
      </div>
    </>
  );
});
AppContentInternal.displayName = 'AppContentInternal';

const App: React.FC = () => (
  <SpotifyProvider>
    <AppContentInternal />
  </SpotifyProvider>
);
export default App;
