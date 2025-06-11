
import React, { useState, useEffect, useCallback } from 'react';
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

  const fetchData = useCallback(async () => {
    if (!user) return;
    console.log('[MainAppLayout] Starting fetchData...');
    setIsLoading(true);
    setError(null);
    try {
      console.log('[MainAppLayout] Attempting to fetch scan logs...');
      const logs = await promiseWithTimeout(
        scanLogService.getScanLogs(),
        25000, // 25 seconds timeout for logs
        new Error('Failed to load scan logs in time. Please check your connection or try again later.')
      );
      console.log(`[MainAppLayout] Scan logs fetched: ${logs.length} items.`);
      setPreviousScans(logs.sort((a, b) => new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime()));

      console.log('[MainAppLayout] Attempting to fetch scan jobs...');
      // scanLogService.getAllJobs() is expected to return ScanJob[] directly
      const userJobs = await promiseWithTimeout(
        scanLogService.getAllJobs(),
        25000, // 25 seconds timeout for jobs
        new Error('Failed to load scan jobs in time. Please check your connection or try again later.')
      );
      console.log(`[MainAppLayout] Scan jobs fetched: ${userJobs.length} items.`);
      setJobs(userJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

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
        setError(err.message || "Could not load initial app data.");
      }
    } finally {
      setIsLoading(false);
      console.log('[MainAppLayout] Finished fetchData (finally block).');
    }
  }, [user, onLogout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshAllData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const handleJobUpdate = useCallback((updatedJob?: ScanJob) => {
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
    !job.status.startsWith('failed_') &&
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
      {error && !isLoading && (
        <div className="p-3 win95-border-outset bg-yellow-200 text-black border border-black mb-2">
          <p className="font-semibold text-center">Error:</p>
          <p className="text-center mb-1">{error}</p>
          <div className="flex justify-center">
            <Button onClick={refreshAllData} size="sm" className="hover:bg-gray-300">Retry</Button>
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
              isLoading={isLoading}
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
