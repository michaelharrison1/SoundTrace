

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
  icon?: string;
  content: React.ReactElement;
  isMinimized: boolean;
  zIndex: number;
  width?: string;
  height?: string;
  isModal?: boolean;
}

const AppContentInternal: React.FC = React.memo(() => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authView, setAuthView] = useState<AuthView>('login');

  const [openWindows, setOpenWindows] = useState<AppWindow[]>([]);
  const [nextZIndex, setNextZIndex] = useState(101);

  const [previousScans, setPreviousScans] = useState<TrackScanLog[]>([]);
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [isAppDataLoading, setIsAppDataLoading] = useState<boolean>(false);
  const [appDataError, setAppDataError] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.soundtrace.uk';
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleLogout = useCallback(async (closeOpenWindows = true) => { // closeOpenWindows param might not be needed anymore if modals handled separately
    try { await authService.logout(); }
    catch (err) { console.error("Error during backend logout:", err); }
    finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUserDetails');
      setCurrentUser(null);
      setAuthView('login');
      setOpenWindows(prev => prev.filter(w => w.isModal)); // Keep modals, clear others
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
        handleLogout(false); // Keep modals if any, but logout
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

  const refreshAllData = useCallback(() => { fetchData('manual'); }, [fetchData]);
  const handleIndividualLogUpdate = useCallback(() => { refreshAllData(); }, [refreshAllData]);
  const handleJobUpdate = useCallback(() => { refreshAllData(); }, [refreshAllData]);


  useEffect(() => {
    if (currentUser && (eventSourceRef.current === null || eventSourceRef.current.readyState === EventSource.CLOSED)) {
        fetchData('initial');

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
    return () => {
        if (eventSourceRef.current) {
            console.log('[App SSE] Cleaning up SSE connection on component unmount/user change.');
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    };
  }, [currentUser, fetchData, API_BASE_URL]);

  const generateDefaultApps = useCallback((user: User) => [
      { id: 'dashboard', title: 'User Dashboard', icon: '/src/components/windows95icons/apps/my_computer_16x16.png', content: <DashboardViewPage user={user} previousScans={previousScans} onDeleteScan={refreshAllData} onClearAllScans={refreshAllData} />, isMinimized: false, zIndex: 101, width: 'min(80vw, 900px)', height: 'min(80vh, 700px)', isModal: false },
      { id: 'scan', title: 'New Scan Job', icon: '/src/components/windows95icons/actions/scan_disk_16x16.png', content: <ScanPage user={user} onJobCreated={handleJobUpdate} onLogout={handleLogout}/>, isMinimized: true, zIndex: 100, width: 'min(80vw, 900px)', height: 'min(80vh, 700px)', isModal: false },
      { id: 'jobs', title: 'Job Console', icon: '/src/components/windows95icons/apps/tasks_16x16.png', content: <JobConsole jobs={jobs} onJobAction={handleJobUpdate} isLoading={isAppDataLoading} onRefreshJobs={refreshAllData} onLogout={handleLogout} />, isMinimized: true, zIndex: 100, width: 'min(80vw, 900px)', height: 'min(80vh, 700px)', isModal: false },
  ], [previousScans, jobs, isAppDataLoading, refreshAllData, handleLogout, handleJobUpdate]);

  useEffect(() => {
    if (currentUser) {
        const defaultApps = generateDefaultApps(currentUser);
        setOpenWindows(prevWindows => {
            const modals = prevWindows.filter(w => w.isModal);
            const updatedDefaultApps = defaultApps.map(app => {
                const existingApp = prevWindows.find(pw => pw.id === app.id && !pw.isModal);
                if (existingApp) { // Preserve zIndex and minimized state if app already existed
                    return { ...app, content: app.content, zIndex: existingApp.zIndex, isMinimized: existingApp.isMinimized};
                }
                return app;
            });
            return [...modals, ...updatedDefaultApps];
        });
    } else {
        // When logging out, non-modal windows are cleared by handleLogout
    }
  }, [currentUser, generateDefaultApps]);


  const openWindow = useCallback((id: string, title: string, content: React.ReactElement, icon?: string, options?: Partial<Pick<AppWindow, 'width' | 'height' | 'isModal'>>) => {
    setOpenWindows(prev => {
      const existingWindowIndex = prev.findIndex(w => w.id === id);
      if (existingWindowIndex !== -1) {
        // If window exists, bring to front and ensure it's not minimized (especially for modals)
        return prev.map((w, index) =>
          index === existingWindowIndex ? { ...w, isMinimized: false, zIndex: nextZIndex } : w
        );
      } else {
        // If new window, add it (typically for modals like login/privacy)
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


  const focusWindow = useCallback((id: string) => {
    setOpenWindows(prev =>
      prev.map(w =>
        w.id === id
          ? { ...w, isMinimized: false, zIndex: nextZIndex }
          : w.isModal ? w : { ...w, isMinimized: true } // Minimize other non-modal windows
      )
    );
    setNextZIndex(prev => prev + 1);
  }, [nextZIndex]);


  const minimizeWindow = useCallback((id: string) => {
    setOpenWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w));
    // No need to explicitly focus another window here; taskbar click will handle activation.
  }, []);

  const closeWindow = useCallback((id: string) => {
    setOpenWindows(prev => {
        const windowToClose = prev.find(w => w.id === id);
        if (windowToClose && !windowToClose.isModal) {
            // For non-modals, "closing" means minimizing/hiding
            return prev.map(w => (w.id === id ? { ...w, isMinimized: true } : w));
        }
        // If it's a modal or not found (shouldn't happen for close), filter it out
        return prev.filter(w => w.id !== id);
    });
  }, []);

  const handleLoginRegistrationSuccess = useCallback((user: User) => {
    setCurrentUser(user);
    setAuthView('login');
    setOpenWindows(prev => prev.filter(w => w.id !== 'login' && w.id !== 'register' && w.id !== 'introduction'));
    // Default apps will be set by the useEffect hook watching `currentUser`
  }, []);


  const desktopIcons = useMemo(() => {
    // Icons are now non-interactive for opening windows
    return [
      { id: 'dashboard_icon', name: 'My Computer (Dashboard)', icon: '/src/components/windows95icons/apps/my_computer_32x32.png', action: () => {} },
      { id: 'scan_icon', name: 'New Scan Job', icon: '/src/components/windows95icons/apps/file_cabinet_32x32.png', action: () => {} },
      { id: 'jobs_icon', name: 'Job Console', icon: '/src/components/windows95icons/apps/tasks_32x32.png', action: () => {} },
      { id: 'recyclebin_icon', name: 'Recycle Bin', icon: '/src/components/windows95icons/apps/recycle_bin_full_32x32.png', action: () => {} },
    ];
  }, []);


  useEffect(() => {
    try {
      const token = localStorage.getItem('authToken');
      const userDetailsJson = localStorage.getItem('currentUserDetails');
      if (token && userDetailsJson) {
        const userDetails: User = JSON.parse(userDetailsJson);
        setCurrentUser(userDetails);
        // Default apps are now set in another useEffect based on currentUser
      } else {
        // No user, ensure default apps are cleared if any were set for a previous session
        setOpenWindows(prev => prev.filter(w => w.isModal));
      }
    } catch (error) {
      console.error("Error reading auth data from localStorage:", error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUserDetails');
    }
    setIsLoading(false);
  }, []);

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

  const activeNonModalWindow = openWindows.find(win => !win.isModal && !win.isMinimized);
  const activeWindowId = activeNonModalWindow ? activeNonModalWindow.id : undefined;

  return (
    <div className="flex flex-col h-full overflow-hidden" id="soundtrace-desktop-environment">
      <Desktop icons={desktopIcons} />

      {/* Render all windows; WindowFrame will handle display based on isMinimizedByApp */}
      {openWindows.map(win => (
         <WindowFrame
            key={win.id}
            id={win.id}
            title={win.title}
            icon={win.icon}
            onClose={() => closeWindow(win.id)}
            onMinimize={() => minimizeWindow(win.id)}
            onFocus={() => focusWindow(win.id)}
            isActive={!win.isMinimized && activeWindowId === win.id && !win.isModal} // Active if visible non-modal and highest zIndex
            zIndex={win.zIndex}
            initialWidth={win.width}
            initialHeight={win.height}
            isModal={win.isModal}
            isMinimizedByApp={win.isMinimized && !win.isModal} // Pass this to WindowFrame
          >
            {win.content}
          </WindowFrame>
      ))}

      <Taskbar
        openWindows={openWindows.filter(w => !w.isModal)} // Taskbar only shows non-modal app tabs
        activeWindowId={activeWindowId} // The ID of the currently visible non-modal window
        onTabClick={focusWindow} // This will make the window visible
        onCloseTab={closeWindow} // This will hide/minimize the window
        currentUser={currentUser}
        onLogout={() => handleLogout(true)}
        onSwitchAuthView={setAuthView}
        currentAuthView={authView}
        onOpenWindow={openWindow} // For Start Menu items like Privacy, Terms (modals)
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