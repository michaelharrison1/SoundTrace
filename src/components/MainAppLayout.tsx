
import React, { useState, useEffect, useCallback } from 'react';
import { User, TrackScanLog } from '../types';
import { scanLogService } from '../services/scanLogService';
import Button from './common/Button';
import ScanPage from './ScanPage';
import DashboardViewPage from './DashboardViewPage';
import ProgressBar from './common/ProgressBar';
import UploadIcon from './icons/UploadIcon';

interface MainAppLayoutProps {
  user: User;
  onLogout: () => void;
}

type ActiveView = 'scan' | 'dashboard';

const MainAppLayout: React.FC<MainAppLayoutProps> = ({ user, onLogout }) => {
  const [previousScans, setPreviousScans] = useState<TrackScanLog[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isLoadingScans, setIsLoadingScans] = useState<boolean>(true);
  const [scanError, setScanError] = useState<string | null>(null);

  const fetchScanLogs = useCallback(async () => {
    if (!user) return;
    setIsLoadingScans(true);
    setScanError(null);
    try {
      const logs = await scanLogService.getScanLogs();
      setPreviousScans(logs.sort((a,b) => new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime()));
    } catch (error: any) {
      console.error("Failed to fetch scan logs:", error);
      const isAuthError = (error.status === 401 || error.status === 403) ||
                          (typeof error.message === 'string' && error.message.toLowerCase().includes('token is not valid'));
      if (isAuthError) {
        console.warn("Authentication error during scan log fetch. Logging out.", error.message);
        onLogout();
      } else {
        setScanError(error.message || "Could not load scan history.");
      }
    } finally {
      setIsLoadingScans(false);
    }
  }, [user, onLogout]);

  useEffect(() => {
    fetchScanLogs();
  }, [fetchScanLogs]);

  const handleClearAllScans = useCallback(async () => {
    if (window.confirm("Are you sure you want to delete ALL scan records from the server? This action cannot be undone.")) {
      setIsLoadingScans(true);
      setScanError(null);
      try {
        await scanLogService.clearAllScanLogs();
        setPreviousScans([]);
      } catch (error: any) {
        console.error("Failed to clear all scan logs:", error);
        if ((error.status === 401 || error.status === 403) || (typeof error.message === 'string' && error.message.toLowerCase().includes('token is not valid'))) {
            onLogout();
        } else {
            setScanError(error.message || "Could not clear scan history.");
        }
      } finally {
        setIsLoadingScans(false);
      }
    }
  }, [onLogout]);

  const handleDeleteScan = useCallback(async (logIdToDelete: string) => {
     if (window.confirm("Are you sure you want to delete this scan record and all its associated matches from the server?")) {
        setIsLoadingScans(true);
        setScanError(null);
        try {
          await scanLogService.deleteScanLog(logIdToDelete);
          setPreviousScans(prevScans => prevScans.filter(log => log.logId !== logIdToDelete));
        } catch (error: any) {
          console.error(`Failed to delete scan log ${logIdToDelete}:`, error);
          if ((error.status === 401 || error.status === 403) || (typeof error.message === 'string' && error.message.toLowerCase().includes('token is not valid'))) {
            onLogout();
          } else {
            setScanError(error.message || `Could not delete scan log.`);
          }
        } finally {
          setIsLoadingScans(false);
        }
     }
  }, [onLogout]);

   const addMultipleScanLogsToState = useCallback((newLogs: TrackScanLog[]) => {
    setPreviousScans(prevLogs => [...newLogs, ...prevLogs].sort((a,b) => new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime()));
  }, []);

  const getNavButtonClass = (viewType: ActiveView) => {
    return `px-3 py-0.5 hover:bg-gray-300 ${activeView === viewType ? 'win95-border-inset !shadow-none translate-x-[1px] translate-y-[1px]' : 'win95-border-outset'}`;
  };

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
          Scan Tracks
        </Button>
        <Button
          onClick={() => setActiveView('dashboard')}
          size="sm"
          className={getNavButtonClass('dashboard')}
          aria-pressed={activeView === 'dashboard'}
        >
          Dashboard ({previousScans.length})
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

      {isLoadingScans && !scanError && (
        <div className="p-4 win95-border-outset bg-[#C0C0C0] text-center">
          <ProgressBar text="Loading scan history..." />
          <p className="text-xs text-gray-700 text-center mt-1">This may take up to a minute.</p>
        </div>
      )}
      {scanError && !isLoadingScans && (
        <div className="p-3 win95-border-outset bg-yellow-200 text-black border border-black mb-2">
          <p className="font-semibold text-center">Error loading scan history:</p>
          <p className="text-center mb-1">{scanError}</p>
          <div className="flex justify-center">
            <Button onClick={fetchScanLogs} size="sm" className="hover:bg-gray-300">Retry</Button>
          </div>
        </div>
      )}
      {!isLoadingScans && !scanError && activeView === 'scan' && (
        <ScanPage
          user={user}
          previousScans={previousScans}
          onNewScanLogsSaved={addMultipleScanLogsToState}
          onLogout={onLogout}
        />
      )}
      {!isLoadingScans && !scanError && activeView === 'dashboard' && (
        <DashboardViewPage
          user={user}
          previousScans={previousScans}
          onDeleteScan={handleDeleteScan}
          onClearAllScans={handleClearAllScans}
        />
      )}
    </>
  );
};

export default React.memo(MainAppLayout);
