
import React, { useState, useEffect, useCallback } from 'react';
import { User, TrackScanLog } from '../types';
import { scanLogService } from '../services/scanLogService';
import Button from './common/Button';
import LogoutIcon from './icons/LogoutIcon';
import ScanPage from './ScanPage';
import DashboardViewPage from './DashboardViewPage';
import ProgressBar from './common/ProgressBar'; // Import ProgressBar

interface MainAppLayoutProps {
  user: User;
  onLogout: () => void;
}

type ActiveView = 'scan' | 'dashboard';

const MainAppLayout: React.FC<MainAppLayoutProps> = ({ user, onLogout }) => {
  const [previousScans, setPreviousScans] = useState<TrackScanLog[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('scan');
  const [isLoadingScans, setIsLoadingScans] = useState<boolean>(false);
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
      setScanError(error.message || "Could not load scan history.");
    } finally {
      setIsLoadingScans(false);
    }
  }, [user]);

  useEffect(() => {
    fetchScanLogs();
  }, [fetchScanLogs]);

  const handleClearAllScans = async () => {
    if (window.confirm("Are you sure you want to delete ALL scan records from the server? This action cannot be undone.")) {
      setIsLoadingScans(true);
      setScanError(null);
      try {
        await scanLogService.clearAllScanLogs();
        setPreviousScans([]);
      } catch (error: any) {
        console.error("Failed to clear all scan logs:", error);
        setScanError(error.message || "Could not clear scan history.");
      } finally {
        setIsLoadingScans(false);
      }
    }
  };

  const handleDeleteScan = async (logIdToDelete: string) => {
     if (window.confirm("Are you sure you want to delete this scan record and all its associated matches from the server?")) {
        setIsLoadingScans(true);
        setScanError(null);
        try {
          await scanLogService.deleteScanLog(logIdToDelete);
          setPreviousScans(prevScans => prevScans.filter(log => log.logId !== logIdToDelete));
        } catch (error: any) {
          console.error(`Failed to delete scan log ${logIdToDelete}:`, error);
          setScanError(error.message || `Could not delete scan log.`);
        } finally {
          setIsLoadingScans(false);
        }
     }
  };

   const addMultipleScanLogsToState = (newLogs: TrackScanLog[]) => {
    setPreviousScans(prevLogs => [...newLogs, ...prevLogs].sort((a,b) => new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime()));
  };


  return (
    <div className="min-h-screen bg-[#C0C0C0] flex flex-col">
      <header className="bg-[#084B8A] sticky top-0 z-50 border-b-2 border-b-black">
        <div className="mx-auto px-2">
          <div className="flex items-center justify-between h-8">
            <div className="flex items-center">
              <h1 className="text-lg font-normal text-white ml-2">SoundTrace</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-white hidden sm:block">User: {user.username}</span>
              <Button
                onClick={onLogout}
                size="sm"
                className="px-2 py-0.5 !bg-[#C0C0C0] !text-black !border-t-white !border-l-white !border-b-[#808080] !border-r-[#808080] !shadow-[1px_1px_0px_#000000] active:!shadow-[0px_0px_0px_#000000] active:!border-t-[#808080] active:!border-l-[#808080] active:!border-b-white active:!border-r-white"
                icon={<LogoutIcon className="w-3 h-3" />}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
        <nav className="flex justify-start space-x-0.5 p-1 bg-[#C0C0C0] border-t-2 border-[#DFDFDF]">
            <Button
              onClick={() => setActiveView('scan')}
              size="sm"
              className={`px-3 py-0.5 ${activeView === 'scan' ? 'win95-border-inset !shadow-none translate-x-[1px] translate-y-[1px]' : 'win95-border-outset'}`}
            >
              Scan Tracks
            </Button>
            <Button
              onClick={() => setActiveView('dashboard')}
              size="sm"
              className={`px-3 py-0.5 ${activeView === 'dashboard' ? 'win95-border-inset !shadow-none translate-x-[1px] translate-y-[1px]' : 'win95-border-outset'}`}
            >
              Dashboard ({previousScans.length})
            </Button>
          </nav>
      </header>

      <main className="mx-auto p-0.5 w-full flex-grow">
        <div className="bg-[#C0C0C0] p-2 h-full">
          {isLoadingScans && (
            <div className="p-4 win95-border-outset bg-[#C0C0C0] text-center">
              <ProgressBar text="Loading scan history..." />
            </div>
          )}
          {scanError && !isLoadingScans && ( // Only show error if not actively loading
            <div className="p-3 win95-border-outset bg-yellow-200 text-black border border-black">
              <p className="font-semibold text-center">Error loading scan history:</p>
              <p className="text-center mb-1">{scanError}</p>
              <div className="flex justify-center">
                <Button onClick={fetchScanLogs} size="sm">Retry</Button>
              </div>
            </div>
          )}
          {!isLoadingScans && !scanError && activeView === 'scan' && (
            <ScanPage
              user={user}
              previousScanLogs={previousScans}
              onNewScanLogsSaved={addMultipleScanLogsToState}
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
        </div>
      </main>

      <footer className="py-1 px-2 text-xs text-black border-t-2 border-t-white bg-[#C0C0C0] flex justify-between items-center">
        <div>
          <span>&copy; {new Date().getFullYear()} SoundTrace. </span>
          <span>Powered by ACRCloud.</span>
        </div>
        <span>Created by Michael Harrison</span>
      </footer>
    </div>
  );
};

export default MainAppLayout;