
import React from 'react';
import { User, TrackScanLog } from '../types'; // Updated to TrackScanLog
import PreviousScans from './PreviousScans';

interface DashboardViewPageProps {
  user: User;
  previousScans: TrackScanLog[]; // Expects TrackScanLog[]
  onDeleteScan: (logId: string) => void; // Expects logId from TrackScanLog
  onClearAllScans: () => void;
}

const DashboardViewPage: React.FC<DashboardViewPageProps> = ({ user, previousScans, onDeleteScan, onClearAllScans }) => {
  const containerStyles = "p-4 win95-border-outset bg-[#C0C0C0] text-center";

  if (previousScans.length === 0) {
    return (
      <div className={containerStyles}>
        <span className="text-4xl text-gray-500" aria-hidden="true">♫</span>
        <h2 className="text-lg font-normal text-black mt-1">No Scan History Yet</h2>
        <p className="text-gray-700 mt-0.5 text-sm">Processed tracks and their matches will appear here.</p>
        <p className="text-gray-700 mt-0.5 text-sm">Go to "Scan Tracks" to start.</p>
      </div>
    );
  }

  return (
    <div>
      <PreviousScans
        scanLogs={previousScans} // Pass as scanLogs, expecting TrackScanLog[]
        onDeleteScan={onDeleteScan}
        onClearAllScans={onClearAllScans}
      />
    </div>
  );
};

export default DashboardViewPage;
