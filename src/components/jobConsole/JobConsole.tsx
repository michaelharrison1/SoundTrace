
import React, { useState, useCallback } from 'react';
import { useWin95Modal } from '../common/Win95ModalProvider';
import { ScanJob, User } from '../../types';
import JobConsoleItem from './JobConsoleItem';
import Button from '../common/Button';
import ProgressBar from '../common/ProgressBar';
import { scanLogService } from '../../services/scanLogService'; // Import service
import TrashIcon from '../icons/TrashIcon'; // For delete all icon

interface JobConsoleProps {
  jobs: ScanJob[];
  onJobAction: (updatedJob?: ScanJob) => void;
  isLoading: boolean;
  onRefreshJobs: () => void;
  onLogout: () => void;
}

const JobConsole: React.FC<JobConsoleProps> = ({ jobs, onJobAction, isLoading, onRefreshJobs, onLogout }) => {
  const [isInteracting, setIsInteracting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);

  const handleInteractionStart = useCallback(() => setIsInteracting(true), []);
  const handleInteractionEnd = useCallback(() => setIsInteracting(false), []);

  const { confirm } = useWin95Modal();
  const handleDeleteAllJobs = useCallback(async () => {
    const shouldDelete = await confirm({
      title: 'Delete All Job Logs',
      message: 'Are you sure you want to delete ALL job logs? This action cannot be undone and only removes the job entries, not the scan data itself.',
      confirmText: 'Delete All',
      cancelText: 'Cancel',
    });
    if (!shouldDelete) return;
    setDeleteAllError(null);
    setIsDeletingAll(true);
    handleInteractionStart();
    try {
      await scanLogService.deleteAllJobs();
      onRefreshJobs(); // Refresh the job list from the parent
      // Optionally, show a success message if needed, though UI refresh is primary feedback
    } catch (err: any) {
      console.error("Error deleting all jobs:", err);
      if (err?.status === 401 || err?.status === 403) { // Check for auth error
        onLogout();
        return;
      }
      setDeleteAllError(err.message || "Failed to delete all job logs.");
    } finally {
      setIsDeletingAll(false);
      handleInteractionEnd();
    }
  }, [onRefreshJobs, handleInteractionStart, handleInteractionEnd, onLogout, confirm]);


  return (
    <div className="win95-border-outset bg-[#C0C0C0] p-0.5">
      <div className="bg-[#000080] text-white px-1 py-0.5 h-7 flex items-center justify-between select-none">
        <h2 className="text-sm font-bold">Job Console</h2>
        <div className="flex items-center space-x-1">
          <Button onClick={onRefreshJobs} size="sm" className="!py-0 !px-1 !text-xs !h-5 win95-button-sm" disabled={isLoading || isInteracting || isDeletingAll}>
            Refresh Jobs
          </Button>
          {jobs.length > 0 && (
            <Button
              onClick={handleDeleteAllJobs}
              size="sm"
              variant="danger"
              className="!py-0 !px-1 !text-xs !h-5 win95-button-sm !bg-red-200 hover:!bg-red-300 !border-red-500 !shadow-[0.5px_0.5px_0px_#800000]"
              disabled={isLoading || isInteracting || isDeletingAll}
              isLoading={isDeletingAll}
              title="Delete All Job Logs"
            >
             {isDeletingAll ? 'Deleting...' : <TrashIcon className="w-3 h-3" />}
            </Button>
          )}
        </div>
      </div>
      {deleteAllError && <div className="p-1 bg-red-200 text-red-800 text-xs text-center border-b-2 border-black">{deleteAllError}</div>}
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
                isGloballyLoading={isInteracting || isDeletingAll} // Disable individual actions if global action is in progress
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