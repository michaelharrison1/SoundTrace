
import React, { useState, useCallback } from 'react';
import { User, TrackScanLog, ScanJob } from '../types';
import Button from './common/Button';
import ScanPage from './ScanPage';
import DashboardViewPage from './DashboardViewPage';
import JobConsole from './jobConsole/JobConsole';
import ProgressBar from './common/ProgressBar';
import UploadIcon from './icons/UploadIcon'; // Assuming this icon exists

interface MainAppLayoutProps {
  user: User;
  onLogout: () => void;
  previousScans: TrackScanLog[];
  jobs: ScanJob[];
  isAppDataLoading: boolean;
  appDataError: string | null;
  onRefreshAllData: () => void; // Callback to refresh all data
  onJobUpdate: (job?: ScanJob | Partial<ScanJob>) => void; // Callback after a job action
  onIndividualLogUpdate: (logId?: string) => void; // Callback after deleting a log
}

type ActiveView = 'dashboard' | 'scan' | 'jobs';

const MainAppLayout: React.FC<MainAppLayoutProps> = ({
  user,
  onLogout,
  previousScans,
  jobs,
  isAppDataLoading,
  appDataError,
  onRefreshAllData,
  onJobUpdate,
  onIndividualLogUpdate,
}) => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  const getNavButtonClass = (viewType: ActiveView) => {
    const base = "px-3 py-1 text-black text-sm"; // VT323 default font size is larger
    // Apply Win95 border styles dynamically
    const borderStyle = activeView === viewType 
        ? 'win95-border-inset !shadow-none translate-x-[1px] translate-y-[1px]' 
        : 'win95-border-outset hover:bg-gray-300';
    return `${base} ${borderStyle}`;
  };
  
  const totalJobs = jobs.length;
  const activeOrPendingJobs = jobs.filter(job =>
    job.status !== 'completed' &&
    job.status !== 'aborted' &&
    !job.status.startsWith('failed_') &&
    job.status !== 'completed_with_errors'
  ).length;

  const handleExportAllData = useCallback(() => {
    alert("Full data export (e.g., combined CSV/PDF of all sections) is coming soon! Individual tables may have their own export options.");
  }, []);


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
        <div className="ml-auto"> {/* Pushes export button to the right */}
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

      {isAppDataLoading && (
        <div className="p-4 win95-border-outset bg-[#C0C0C0] text-center">
          <ProgressBar text={`Loading ${activeView} data...`} />
          <p className="text-xs text-gray-700 text-center mt-1">This may take up to a minute.</p>
        </div>
      )}
      {appDataError && (
        <div className="p-3 win95-border-outset bg-yellow-200 text-black border border-black mb-2">
          <p className="font-semibold text-center">Application Error:</p>
          <p className="text-center mb-1 whitespace-pre-line">{appDataError}</p>
          <div className="flex justify-center">
            <Button onClick={onRefreshAllData} size="sm" className="hover:bg-gray-300">Retry Load</Button>
          </div>
        </div>
      )}
      {!isAppDataLoading && !appDataError && (
        <>
          {activeView === 'scan' && (
            <ScanPage
              user={user}
              onJobCreated={onJobUpdate}
              onLogout={onLogout}
            />
          )}
          {activeView === 'jobs' && (
            <JobConsole
              jobs={jobs}
              onJobAction={onJobUpdate}
              isLoading={isAppDataLoading} 
              onRefreshJobs={onRefreshAllData}
              onLogout={onLogout}
            />
          )}
          {activeView === 'dashboard' && (
            <DashboardViewPage
              user={user}
              previousScans={previousScans}
              onDeleteScan={onIndividualLogUpdate}
              onClearAllScans={onRefreshAllData}
            />
          )}
        </>
      )}
    </>
  );
};

export default React.memo(MainAppLayout);
