
import React, { useState, useCallback } from 'react';
import { ScanJob, User } from '../../types';
import JobConsoleItem from './JobConsoleItem';
import Button from '../common/Button';
import ProgressBar from '../common/ProgressBar';

interface JobConsoleProps {
  jobs: ScanJob[];
  onJobAction: (updatedJob?: ScanJob) => void; 
  isLoading: boolean; 
  onRefreshJobs: () => void; 
  onLogout: () => void;
}

const JobConsole: React.FC<JobConsoleProps> = ({ jobs, onJobAction, isLoading, onRefreshJobs, onLogout }) => {
  const [isInteracting, setIsInteracting] = useState(false); 

  const handleInteractionStart = useCallback(() => setIsInteracting(true), []);
  const handleInteractionEnd = useCallback(() => setIsInteracting(false), []);

  return (
    <div className="win95-border-outset bg-[#C0C0C0] p-0.5">
      <div className="bg-[#000080] text-white px-1 py-0.5 h-6 flex items-center justify-between select-none">
        <h2 className="text-sm font-bold">Job Console</h2>
        <Button onClick={onRefreshJobs} size="sm" className="!py-0 !px-1 !text-xs !h-5 win95-button-sm" disabled={isLoading || isInteracting}>
          Refresh Jobs
        </Button>
      </div>
      <div className="p-2 bg-[#C0C0C0]">
        {isLoading && jobs.length === 0 ? (
          <ProgressBar text="Loading jobs..." />
        ) : jobs.length === 0 ? (
          <p className="text-center text-black py-4">No scan jobs found. Create one from the "New Scan Job" tab.</p>
        ) : (
          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
            {jobs.map(job => (
              <JobConsoleItem
                key={job.id}
                job={job}
                onJobAction={onJobAction}
                onInteractionStart={handleInteractionStart}
                onInteractionEnd={handleInteractionEnd}
                isGloballyLoading={isInteracting}
                onLogout={onLogout}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(JobConsole);
