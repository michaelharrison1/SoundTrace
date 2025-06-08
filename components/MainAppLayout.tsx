import React, { useState } from 'react';
import { User, ScanResult } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import Button from './common/Button';
import LogoutIcon from './icons/LogoutIcon';
// import MusicNoteIcon from './icons/MusicNoteIcon'; // Title bar doesn't usually have an icon like this
import ScanPage from './ScanPage';
import DashboardViewPage from './DashboardViewPage';

interface MainAppLayoutProps {
  user: User;
  onLogout: () => void;
}

const PREVIOUS_SCANS_KEY = 'soundtrace_previous_scans'; 
type ActiveView = 'scan' | 'dashboard';

const MainAppLayout: React.FC<MainAppLayoutProps> = ({ user, onLogout }) => {
  const [previousScans, setPreviousScans] = useLocalStorage<ScanResult[]>(PREVIOUS_SCANS_KEY, []);
  const [activeView, setActiveView] = useState<ActiveView>('scan');

  const handleClearAllScans = () => {
    // Classic confirm dialog
    if (window.confirm("Are you sure you want to delete ALL scan records? This action cannot be undone.")) {
      setPreviousScans([]);
    }
  };

  const handleDeleteScan = (scanId: string) => {
     if (window.confirm("Are you sure you want to delete this scan record?")) {
        setPreviousScans(prevScans => prevScans.filter(s => s.scanId !== scanId));
     }
  };

  return (
    <div className="min-h-screen bg-[#C0C0C0] flex flex-col">
      {/* Header - W95 Title Bar */}
      <header className="bg-[#084B8A] sticky top-0 z-50 border-b-2 border-b-black"> {/* Changed blue here */}
        <div className="mx-auto px-2">
          <div className="flex items-center justify-between h-8">
            <div className="flex items-center">
              {/* <MusicNoteIcon className="h-5 w-5 text-white mr-1.5" /> Remove icon or use simpler one */}
              <h1 className="text-lg font-normal text-white">SoundTrace</h1>
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
        {/* Navigation as "Tabs" or simple buttons under title bar */}
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

      {/* Main Content Area - styled like a W95 panel */}
      <main className="mx-auto p-0.5 w-full flex-grow">
        <div className="bg-[#C0C0C0] p-2 h-full">
          {activeView === 'scan' && (
            <ScanPage
              user={user}
              previousScans={previousScans}
              setPreviousScans={setPreviousScans}
            />
          )}
          {activeView === 'dashboard' && (
            <DashboardViewPage
              user={user}
              previousScans={previousScans}
              onDeleteScan={handleDeleteScan}
              onClearAllScans={handleClearAllScans}
            />
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-1 px-2 text-left text-xs text-black border-t-2 border-t-white bg-[#C0C0C0]">
        &copy; {new Date().getFullYear()} SoundTrace (Simulated App)
      </footer>
    </div>
  );
};

export default MainAppLayout;