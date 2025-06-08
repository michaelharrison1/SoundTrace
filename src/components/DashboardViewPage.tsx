import React from 'react';
import { User, ScanResult } from '../types';
import PreviousScans from './PreviousScans';
// import MusicNoteIcon from './icons/MusicNoteIcon'; // Simpler placeholder

interface DashboardViewPageProps {
  user: User;
  previousScans: ScanResult[];
  onDeleteScan: (scanId: string) => void;
  onClearAllScans: () => void;
}

const DashboardViewPage: React.FC<DashboardViewPageProps> = ({ user, previousScans, onDeleteScan, onClearAllScans }) => {
  const containerStyles = "p-4 win95-border-outset bg-[#C0C0C0] text-center";
  
  if (previousScans.length === 0) {
    return (
      <div className={containerStyles}>
        {/* <MusicNoteIcon className="mx-auto h-12 w-12 text-gray-500 mb-2" /> */}
        <span className="text-4xl text-gray-500" aria-hidden="true">♫</span>
        <h2 className="text-lg font-normal text-black mt-1">No Scans Yet</h2>
        <p className="text-gray-700 mt-0.5 text-sm">Scanned instrumentals and matches appear here.</p>
        <p className="text-gray-700 mt-0.5 text-sm">Go to "Scan Tracks" to start.</p>
      </div>
    );
  }

  // PreviousScans component handles its own "no matches" state internally now.
  return (
    <div>
      <PreviousScans
        scans={previousScans}
        onDeleteScan={onDeleteScan}
        onClearAllScans={onClearAllScans}
      />
    </div>
  );
};

export default DashboardViewPage;