
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, TrackScanLog, ScanJob } from '../types';
import { scanLogService } from '../services/scanLogService';
import Button from './common/Button';
import ScanPage from './ScanPage';
import DashboardViewPage from './DashboardViewPage';
import JobConsole from './jobConsole/JobConsole';
import ProgressBar from './common/ProgressBar';
import UploadIcon from './icons/UploadIcon';

interface MainAppLayoutProps {
  user: User;
  onLogout: () => void;
}

type ActiveView = 'scan' | 'dashboard' | 'jobs';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.soundtrace.uk';

// Helper function for Promise with timeout
function promiseWithTimeout<T>(promise: Promise<T>, ms: number, timeoutError = new Error('Promise timed out')): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(timeoutError);
    }, ms);
  });
  return Promise.race([promise, timeout]);
}

const MainAppLayout: React.FC<MainAppLayoutProps> = ({ user, onLogout }) => {
  const [previousScans, setPreviousScans] = useState<TrackScanLog[]>([]);
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchData = useCallback(async (source: 'initial' | 'sse' | 'manual' = 'initial') => {
    if (!user) return;
    console.log(`[MainAppLayout] Starting fetchData (source: ${source})...`);
    if (source === 'initial' || source === 'manual') setIsLoading(true);
    if (source === 'manual') setError(null); // Clear previous errors on manual refresh

    try {
      const logs = await promiseWithTimeout(scanLogService.getScanLogs(), 25000);
      setPreviousScans(logs.sort((a, b) => new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime()));

      const userJobs = await promiseWithTimeout(scanLogService.getAllJobs(), 25000);
      setJobs(userJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      if (source === 'initial' || source === 'manual') setError(null); // Clear error on successful manual/initial load
      console.log('[MainAppLayout] FetchData completed successfully.');
    } catch (err: any) {
      console.error("[MainAppLayout] Error during fetchData:", err);
      const isAuthError = (err.status === 401 || err.status === 403) ||
                          (typeof err.message === 'string' && (
                            err.message.toLowerCase().includes('token is not valid') ||
                            err.message.toLowerCase().includes('not authenticated') ||
                            err.message.toLowerCase().includes('authorization denied')
                          ));
      if (isAuthError) {
        console.warn("[MainAppLayout] Authentication error during data fetch. Logging out.", err.message);
        onLogout();
      } else {
        setError(err.message || "Could not load app data. Please check your connection or try again later.");
      }
    } finally {
      if (source === 'initial' || source === 'manual') setIsLoading(false);
      console.log('[MainAppLayout] Finished fetchData (finally block).');
    }
  }, [user, onLogout]);

  useEffect(() => {
    fetchData('initial');

    const token = localStorage.getItem('authToken');
    if (token && API_BASE_URL) {
        const url = `${API_BASE_URL}/api/job-updates/subscribe`;
        console.log(`[MainAppLayout] Connecting to SSE at ${url}`);
        const es = new EventSource(url, { withCredentials: true });
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            console.log('[MainAppLayout] SSE message received:', event.data);
            try {
                const eventData = JSON.parse(event.data);
                if (eventData.type === 'JOB_UPDATE' && eventData.job) {
                    console.log('[MainAppLayout] Job update via SSE for job ID:', eventData.job.id);
                    // More sophisticated: update just the specific job in state
                    // For simplicity, or if other related data might change:
                    fetchData('sse');
                } else if (eventData.type === 'JOBS_REFRESH_REQUESTED') {
                    console.log('[MainAppLayout] Full jobs refresh requested via SSE');
                    fetchData('sse');
                }
            } catch (parseError) {
                console.error('[MainAppLayout] Error parsing SSE message data:', parseError);
            }
        };

        es.onerror = (err) => {
            console.error('[MainAppLayout] SSE Error:', err);
            // es.close(); // Optionally close and attempt to reconnect later or notify user
        };

        return () => {
            console.log('[MainAppLayout] Closing SSE connection.');
            es.close();
            eventSourceRef.current = null;
        };
    }
  }, [fetchData]); // Only fetchData (which depends on user & onLogout)

  const refreshAllData = useCallback(() => {
    fetchData('manual');
  }, [fetchData]);

  const handleJobUpdate = useCallback((updatedJob?: ScanJob | Partial<ScanJob>) => {
    // With SSE, this might become less critical for immediate UI, but good for optimistic updates or if SSE fails
    refreshAllData();
  }, [refreshAllData]);

  const handleIndividualLogUpdate = useCallback(() => {
     refreshAllData();
  }, [refreshAllData]);

  const getNavButtonClass = (viewType: ActiveView) => {
    return `px-3 py-0.5 hover:bg-gray-300 ${activeView === viewType ? 'win95-border-inset !shadow-none translate-x-[1px] translate-y-[1px]' : 'win95-border-outset'}`;
  };

  const handleExportAllData = useCallback(() => {
    alert("Full data export (e.g., combined CSV/PDF of all sections) is coming soon! Individual tables may have their own export options.");
  }, []);

  const totalJobs = jobs.length;
  const activeOrPendingJobs = jobs.filter(job =>
    job.status !== 'completed' &&
    job.status !== 'aborted' &&
    !job.status.startsWith('failed_') && // covers all 'failed_...' statuses
    job.status !== 'completed_with_errors'
  ).length;


  return (
    <>
      <nav className="flex justify-start items-center space-x-0.5 p-1 bg-[#C0C0C0] border-t-2 border-[#DFDFDF] mb-2">
        <Button
          onClick={() => setActiveView('scan')}
          size="sm"
          className={getNavButtonClass('scan')}
          aria-pressed={activeView === 'scan'}
        >
          New Scan Job
        </Button>
        <Button
          onClick={() => setActiveView('jobs')}
          size="sm"
          className={getNavButtonClass('jobs')}
          aria-pressed={activeView === 'jobs'}
        >
          Job Console ({activeOrPendingJobs > 0 ? `${activeOrPendingJobs} Active / ` : ''}{totalJobs} Total)
        </Button>
        <Button
          onClick={() => setActiveView('dashboard')}
          size="sm"
          className={getNavButtonClass('dashboard')}
          aria-pressed={activeView === 'dashboard'}
        >
          Dashboard ({previousScans.length} Logs)
        </Button>
        <div className="ml-auto">
            <Button
              onClick={handleExportAllData}
              size="sm"
              className="win95-border-outset hover:bg-gray-300"
              icon={<UploadIcon className="w-3 h-3 transform rotate-180"/>}
              title="Export all data (feature coming soon)"
            >
                Export All (Soon)
            </Button>
        </div>
      </nav>

      {isLoading && !error && (
        <div className="p-4 win95-border-outset bg-[#C0C0C0] text-center">
          <ProgressBar text="Loading SoundTrace data..." />
          <p className="text-xs text-gray-700 text-center mt-1">This may take up to a minute.</p>
        </div>
      )}
      {error && ( // Display error prominently, even if not loading
        <div className="p-3 win95-border-outset bg-yellow-200 text-black border border-black mb-2">
          <p className="font-semibold text-center">Application Error:</p>
          <p className="text-center mb-1 whitespace-pre-line">{error}</p>
          <div className="flex justify-center">
            <Button onClick={refreshAllData} size="sm" className="hover:bg-gray-300">Retry Load</Button>
          </div>
        </div>
      )}
      {!isLoading && !error && (
        <>
          {activeView === 'scan' && (
            <ScanPage
              user={user}
              onJobCreated={handleJobUpdate}
              onLogout={onLogout}
            />
          )}
          {activeView === 'jobs' && (
            <JobConsole
              jobs={jobs}
              onJobAction={handleJobUpdate}
              isLoading={isLoading} // Pass the main loading state
              onRefreshJobs={refreshAllData}
              onLogout={onLogout}
            />
          )}
          {activeView === 'dashboard' && (
            <DashboardViewPage
              user={user}
              previousScans={previousScans}
              onDeleteScan={handleIndividualLogUpdate}
              onClearAllScans={refreshAllData}
            />
          )}
        </>
      )}
    </>
  );
};

export default React.memo(MainAppLayout);