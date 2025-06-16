
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import LoginPage from './components/LoginPage';
import RegistrationPage from './components/RegistrationPage';
import { User } from './types';
import ProgressBar from './components/common/ProgressBar';
import { SpotifyProvider, SpotifyCallbackReceiver } from './contexts/SpotifyContext';
import { GoogleApiProvider } from './contexts/GoogleAuthContext';
import { authService } from './services/authService';
import AppIntroduction from './components/app/AppIntroduction';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import TermsOfServicePage from './components/TermsOfServicePage';

import Desktop from './components/desktop/Desktop';
import Taskbar from './components/desktop/Taskbar';
import WindowFrame from './components/desktop/WindowFrame';

// Page components to be rendered in windows
import ScanPage from './components/ScanPage';
import DashboardViewPage from './components/DashboardViewPage';
import JobConsole from './components/jobConsole/JobConsole';
import { scanLogService } from './services/scanLogService';
import { TrackScanLog, ScanJob } from './types';

export type AuthView = 'login' | 'register';

export interface AppWindow {
  id: string;
  title: string;
  icon?: string; // Path to icon for taskbar tab
  content: React.ReactElement; // Ensured this is React.ReactElement
  isMinimized: boolean;
  zIndex: number;
  width?: string; // e.g., '80%', '600px'
  height?: string; // e.g., '70%', '500px'
  isModal?: boolean; // For login/registration type dialogs
}

const AppContentInternal: React.FC = React.memo(() => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authView, setAuthView] = useState<AuthView>('login');

  const [openWindows, setOpenWindows] = useState<AppWindow[]>([]);
  const [nextZIndex, setNextZIndex] = useState(101); // Start z-index for windows

  const [previousScans, setPreviousScans] = useState<TrackScanLog[]>([]);
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [isAppDataLoading, setIsAppDataLoading] = useState<boolean>(false);
  const [appDataError, setAppDataError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.soundtrace.uk';
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleAuthError = useCallback((err: any, operation?: string) => {
    const isAuthError = (err.status === 401 || err.status === 403) ||
                          (typeof err.message === 'string' &&
                           (err.message.toLowerCase().includes('token is not valid') ||
                            err.message.toLowerCase().includes('not authenticated') ||
                            err.message.toLowerCase().includes('authorization denied')));
    if (isAuthError) {
        console.warn(`[App] Auth error during "${operation || 'unknown operation'}". Logging out.`, err.message);
        handleLogout(false);
        return true;
    }
    return false;
  }, []); // handleLogout will be defined later, ensure it's in deps if used here directly

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


  useEffect(() => {
    if (currentUser && (eventSourceRef.current === null || eventSourceRef.current.readyState === EventSource.CLOSED)) {
        fetchData('initial');

        const token = localStorage.getItem('authToken');
        if (token && API_BASE_URL) {
            const url = `${API_BASE_URL}/api/job-updates/subscribe`;
            console.log('[App SSE] Attempting to connect to SSE endpoint:', url);
            const es = new EventSource(url, { withCredentials: true });
            eventSourceRef.current = es;

            es.onopen = () => {
                console.log('[App SSE] Connection opened.');
            };
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
                es.close(); // Close on error to prevent multiple connections if server restarts
                eventSourceRef.current = null;
            };
        }
    } else if (!currentUser && eventSourceRef.current) {
        console.log('[App SSE] Closing SSE connection due to logout.');
        eventSourceRef.current.close();
        eventSourceRef.current = null;
    }
    return () => {
        if (eventSourceRef.current) {
            console.log('[App SSE] Cleaning up SSE connection on component unmount/user change.');
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    };
  }, [currentUser, fetchData, API_BASE_URL]);


  const openWindow = useCallback((id: string, title: string, content: React.ReactElement, icon?: string, options?: Partial<Pick<AppWindow, 'width' | 'height' | 'isModal'>>) => {
    setOpenWindows(prev => {
      const existingWindowIndex = prev.findIndex(w => w.id === id);
      if (existingWindowIndex !== -1) {
        // If window exists, bring to front and ensure it's not minimized
        return prev.map((w, index) =>
          index === existingWindowIndex ? { ...w, isMinimized: false, zIndex: nextZIndex } : w
        );
      } else {
        // If new window, add it
        return [...prev, {
          id, title, content, icon,
          isMinimized: false, zIndex: nextZIndex,
          width: options?.width || (id.startsWith('privacy_') || id.startsWith('terms_')) ? '650px' : (id === 'introduction' ? '550px' : 'min(80vw, 900px)'),
          height: options?.height || (id.startsWith('privacy_') || id.startsWith('terms_')) ? '550px' : (id === 'introduction' ? 'auto' : 'min(80vh, 700px)'),
          isModal: options?.isModal || false,
        }];
      }
    });
    setNextZIndex(prev => prev + 1);
  }, [nextZIndex]);

  const closeWindow = useCallback((id: string) => {
    setOpenWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setOpenWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w));
  }, []);

  const focusWindow = useCallback((id: string) => {
    setOpenWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: false, zIndex: nextZIndex } : w));
    setNextZIndex(prev => prev + 1);
  }, [nextZIndex]);

  const refreshAllData = useCallback(() => {
    fetchData('manual');
  }, [fetchData]);

  const handleIndividualLogUpdate = useCallback(() => {
     refreshAllData();
  }, [refreshAllData]);

  const handleJobUpdate = useCallback(() => {
    refreshAllData();
  }, [refreshAllData]);

  const handleLoginRegistrationSuccess = useCallback((user: User) => {
    setCurrentUser(user);
    setAuthView('login');
    // Close auth-related modal windows after successful login/registration
    setOpenWindows(prev => prev.filter(w => w.id !== 'login' && w.id !== 'register' && w.id !== 'introduction'));
  }, []);

  const handleLogout = useCallback(async (closeOpenWindows = true) => {
    try { await authService.logout(); }
    catch (err) { console.error("Error during backend logout:", err); }
    finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUserDetails');
      setCurrentUser(null);
      setAuthView('login');
      if(closeOpenWindows) setOpenWindows([]);
      if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === 'function') {
        (document.activeElement as HTMLElement).blur();
      }
    }
  }, []);


  const desktopIcons = useMemo(() => {
    if (!currentUser) return [];
    return [
      { id: 'dashboard', name: 'My Computer (Dashboard)', icon: '/src/components/windows95icons/apps/my_computer_32x32.png', action: () => openWindow('dashboard', 'User Dashboard', <DashboardViewPage user={currentUser} previousScans={previousScans} onDeleteScan={handleIndividualLogUpdate} onClearAllScans={refreshAllData} />, '/src/components/windows95icons/apps/my_computer_16x16.png') },
      { id: 'scan', name: 'New Scan Job', icon: '/src/components/windows95icons/apps/file_cabinet_32x32.png', action: () => openWindow('scan', 'New Scan Job', <ScanPage user={currentUser} onJobCreated={handleJobUpdate} onLogout={handleLogout}/>, '/src/components/windows95icons/actions/scan_disk_16x16.png') },
      { id: 'jobs', name: 'Job Console', icon: '/src/components/windows95icons/apps/tasks_32x32.png', action: () => openWindow('jobs', 'Job Console', <JobConsole jobs={jobs} onJobAction={handleJobUpdate} isLoading={isAppDataLoading} onRefreshJobs={refreshAllData} onLogout={handleLogout} />, '/src/components/windows95icons/apps/tasks_16x16.png') },
      { id: 'links', name: 'Useful Links', icon: '/src/components/windows95icons/apps/internet_explorer_32x32.png', action: () => openWindow('links', 'Useful Links',
        <div className="p-4 space-y-2 text-black">
            <p>Visit the <a href="https://soundtrace.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">SoundTrace Website</a>.</p>
            <p>Download the <a href="https://soundtrace.uk/download/latest" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">SoundTrace Downloader App</a> for YouTube scanning.</p>
        </div>,
        '/src/components/windows95icons/apps/internet_explorer_16x16.png', {width: '400px', height: 'auto'})
      },
      { id: 'recyclebin', name: 'Recycle Bin', icon: '/src/components/windows95icons/apps/recycle_bin_full_32x32.png', action: () => alert("Nothing to recycle yet!")},
    ];
  }, [currentUser, openWindow, previousScans, jobs, isAppDataLoading, handleLogout, handleJobUpdate, refreshAllData, handleIndividualLogUpdate]);


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

  // Combine the two useEffect hooks that manage window opening
  useEffect(() => {
    if (isLoading) return;

    const { pathname } = window.location;

    if (!currentUser) {
      const introWindow = openWindows.find(w => w.id === 'introduction');
      const loginWindow = openWindows.find(w => w.id === 'login');
      const registerWindow = openWindows.find(w => w.id === 'register');

      if (!introWindow && !loginWindow && !registerWindow) {
        openWindow('introduction', 'Welcome to SoundTrace 95', <AppIntroduction />, '/src/components/windows95icons/apps/sound_recorder_16x16.png', { width: '550px', height: 'auto', isModal: true });
      } else if (!loginWindow && authView === 'login' && (!introWindow || introWindow.isMinimized === false ) ) {
        openWindow('login', 'User Login', <LoginPage onLogin={handleLoginRegistrationSuccess} />, '/src/components/windows95icons/actions/key_16x16.png', { width: '380px', height: 'auto', isModal: true });
      } else if (!registerWindow && authView === 'register' && (!introWindow || introWindow.isMinimized === false)) {
        openWindow('register', 'Create Account', <RegistrationPage onRegister={handleLoginRegistrationSuccess} />, '/src/components/windows95icons/actions/add_user_16x16.png', { width: '380px', height: 'auto', isModal: true });
      }

      // Handle privacy policy and terms of service windows
      if (pathname === '/privacy-policy' && !openWindows.some(w => w.id === 'privacy_startmenu')) {
        openWindow('privacy_startmenu', 'Privacy Policy', <PrivacyPolicyPage />, '/src/components/windows95icons/apps/notepad_16x16.png', { width: '650px', height: '550px', isModal: true });
      }
      if (pathname === '/terms-of-service' && !openWindows.some(w => w.id === 'terms_startmenu')) {
        openWindow('terms_startmenu', 'Terms of Service', <TermsOfServicePage />, '/src/components/windows95icons/apps/ms_dos_16x16.png', { width: '650px', height: '550px', isModal: true });
      }
    }
  }, [currentUser, isLoading, authView, openWindow, handleLoginRegistrationSuccess, openWindows]);


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-transparent p-4">
        <div className="w-full max-w-xs p-4 bg-[#C0C0C0] win95-border-outset">
          <ProgressBar text="Booting SoundTrace 95..." />
        </div>
      </div>
    );
  }

  const { pathname } = window.location;
  if (pathname === '/spotify-callback-receiver') return <SpotifyCallbackReceiver />;


  const activeWin = openWindows.reduce((max, win) => (win.zIndex > max.zIndex ? win : max), { zIndex: -1 } as AppWindow);
  const activeWindowId = activeWin.zIndex !== -1 ? activeWin.id : undefined;


  return (
    <div className="flex flex-col h-full overflow-hidden" id="soundtrace-desktop-environment">
      <Desktop
        icons={desktopIcons}
        openWindows={openWindows.filter(w => !w.isModal && !w.isMinimized)}
        activeWindowId={activeWindowId}
        focusWindow={focusWindow}
      />

      {openWindows.filter(w => w.isModal && !w.isMinimized).map(win => (
         <WindowFrame
            key={win.id}
            id={win.id}
            title={win.title}
            icon={win.icon}
            onClose={() => closeWindow(win.id)}
            onMinimize={() => minimizeWindow(win.id)}
            onFocus={() => focusWindow(win.id)}
            isActive={activeWindowId === win.id}
            zIndex={win.zIndex}
            initialWidth={win.width}
            initialHeight={win.height}
            isModal={win.isModal}
          >
            {win.content}
          </WindowFrame>
      ))}

      <Taskbar
        openWindows={openWindows}
        activeWindowId={activeWindowId}
        onTabClick={focusWindow}
        onCloseTab={closeWindow}
        currentUser={currentUser}
        onLogout={() => handleLogout(true)}
        onSwitchAuthView={setAuthView}
        currentAuthView={authView}
        onOpenWindow={openWindow}
      />
    </div>
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
