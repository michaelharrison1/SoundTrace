

import React, { useState, useCallback } from 'react';
import { ScanJob, JobStatus, JobFileState, JobType } from '../../types';
import Button from '../common/Button';
import CRTProgressBar from '../common/CRTProgressBar';
import { scanLogService } from '../../services/scanLogService';

interface JobConsoleItemProps {
  job: ScanJob;
  onJobAction: (updatedJob?: ScanJob) => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
  isGloballyLoading: boolean; // True if any job item is interacting
  onLogout: () => void;
}

const formatJobType = (type: JobType): string => {
  switch (type) {
    case 'file_upload_batch': return 'File Batch Scan';
    case 'spotify_playlist_import': return 'Spotify Playlist Import';
    case 'youtube_single_video_electron': return 'YouTube Video Scan (Desktop)';
    case 'youtube_channel_electron_orchestrated': return 'YouTube Channel Scan (Desktop)';
    case 'youtube_playlist_electron_orchestrated': return 'YouTube Playlist Scan (Desktop)';
    default:
      // This ensures that if a new JobType is added, TypeScript will warn us
      // if we haven't handled it here. For runtime, it will display the raw type.
      const exhaustiveCheck: never = type;
      return exhaustiveCheck;
  }
};

const formatJobStatus = (status: JobStatus): string => {
  switch (status) {
    case 'pending_setup': return 'Pending Setup';
    case 'pending_upload': return 'Waiting for File Uploads';
    case 'uploading_files': return 'Uploading Files...';
    case 'queued_for_processing': return 'Queued for Processing';
    case 'in_progress_fetching': return 'Fetching Items...';
    case 'in_progress_processing': return 'Processing Items...';
    case 'waiting_for_electron': return 'Waiting for Desktop App';
    case 'processing_by_electron': return 'Processing (Desktop App)';
    case 'completed': return 'Completed';
    case 'completed_with_errors': return 'Completed with Errors';
    case 'failed_acr_credits': return 'Paused: ACR Credits Needed';
    case 'failed_youtube_api': return 'Failed: YouTube API Error';
    case 'failed_electron_communication': return 'Failed: Desktop App Error';
    case 'failed_setup': return 'Failed: Setup Error';
    case 'failed_upload_incomplete': return 'Incomplete: Re-upload Files';
    case 'failed_other': return 'Failed: Unknown Error';
    case 'aborted': return 'Aborted by User';
    default:
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
  }
};

const JobConsoleItem: React.FC<JobConsoleItemProps> = ({
  job,
  onJobAction,
  onInteractionStart,
  onInteractionEnd,
  isGloballyLoading,
  onLogout
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthError = useCallback((err: any) => {
    if (err?.status === 401 || err?.status === 403) {
      onLogout();
      return true;
    }
    return false;
  }, [onLogout]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm(`Are you sure you want to delete job "${job.jobName}" and all its associated scan logs? This cannot be undone.`)) return;
    setError(null);
    setIsDeleting(true);
    onInteractionStart();
    try {
      await scanLogService.deleteJob(job.id); // Changed from job.jobId
      onJobAction(); // Notify parent to refresh
    } catch (err: any) {
      console.error("Error deleting job:", err);
      if (handleAuthError(err)) return;
      setError(err.message || "Failed to delete job.");
    } finally {
      setIsDeleting(false);
      onInteractionEnd();
    }
  }, [job.id, job.jobName, onJobAction, onInteractionStart, onInteractionEnd, handleAuthError]); // Changed from job.jobId

  const handleResume = useCallback(async () => {
    setError(null);
    setIsResuming(true);
    onInteractionStart();
    try {
      const updatedJob = await scanLogService.resumeJob(job.id); // Changed from job.jobId
      onJobAction(updatedJob); // Notify parent to refresh with updated job
    } catch (err: any) {
      console.error("Error resuming job:", err);
      if (handleAuthError(err)) return;
      setError(err.message || "Failed to resume job.");
    } finally {
      setIsResuming(false);
      onInteractionEnd();
    }
  }, [job.id, onJobAction, onInteractionStart, onInteractionEnd, handleAuthError]); // Changed from job.jobId

  const isResumable = job.status === 'failed_acr_credits' || job.status === 'failed_upload_incomplete';
  const isProcessing = ['in_progress_fetching', 'in_progress_processing', 'uploading_files', 'queued_for_processing', 'processing_by_electron', 'waiting_for_electron'].includes(job.status);


  const progressPercent = job.totalItems > 0 ? (job.itemsProcessed / job.totalItems) * 100 : 0;

  let reuploadMessage = '';
  if (job.status === 'failed_upload_incomplete' && job.files) {
    const missingFiles = job.files.filter(f => f.status !== 'uploaded' && f.status !== 'completed_match' && f.status !== 'completed_no_match').length;
    if (missingFiles > 0) {
        reuploadMessage = `Please re-select and upload ${missingFiles} missing/failed file(s) in the "New Scan Job" tab to resume this job. The job will automatically pick up once all files are present.`;
    }
  }

  return (
    <div className="win95-border-outset bg-[#C0C0C0] p-0.5">
      <div className="p-2 bg-[#C0C0C0] space-y-1">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-base font-semibold text-black">{job.jobName}</h3>
            <p className="text-xs text-gray-700">ID: {job.id} | Type: {formatJobType(job.jobType)}</p> {/* Changed from job.jobId */}
            <p className="text-xs text-gray-700">Created: {new Date(job.createdAt).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <span className={`text-xs px-1.5 py-0.5 win95-border-inset inline-block ${
              job.status === 'completed' ? 'bg-green-200 text-green-800' :
              job.status.startsWith('failed_') || job.status === 'aborted' || job.status === 'completed_with_errors' ? 'bg-red-200 text-red-800' :
              isProcessing ? 'bg-blue-200 text-blue-800' : 'bg-yellow-200 text-yellow-800'
            }`}>
              {formatJobStatus(job.status)}
            </span>
          </div>
        </div>

        {(isProcessing || job.totalItems > 0) && (
          <div>
            {isProcessing ? (
              <CRTProgressBar isActive={true} text={`${job.itemsProcessed} / ${job.totalItems > 0 ? job.totalItems : '?'} items. ${job.lastProcessedItemInfo?.itemName ? `Last: ${job.lastProcessedItemInfo.itemName.substring(0,30)}${job.lastProcessedItemInfo.itemName.length > 30 ? '...' : ''}`:'' }`} />
            ) : (
              <div className="w-full h-5 bg-gray-300 win95-border-inset p-0.5" title={`${job.itemsProcessed}/${job.totalItems} items (${progressPercent.toFixed(0)}%)`}>
                <div className="h-full bg-[#084B8A]" style={{ width: `${progressPercent}%` }}>
                   <span className="text-[10px] text-white pl-1 mix-blend-difference whitespace-nowrap">
                        {job.itemsProcessed}/{job.totalItems} ({progressPercent.toFixed(0)}%)
                    </span>
                </div>
              </div>
            )}
            {job.itemsWithMatches > 0 && <p className="text-xs text-green-700 mt-0.5">{job.itemsWithMatches} item(s) with matches found.</p>}
            {job.itemsFailed > 0 && <p className="text-xs text-red-700 mt-0.5">{job.itemsFailed} item(s) failed processing.</p>}
          </div>
        )}

        {job.lastErrorMessage && <p className="text-xs text-red-600 italic mt-0.5">Error: {job.lastErrorMessage}</p>}
        {reuploadMessage && <p className="text-xs text-yellow-700 italic mt-0.5">{reuploadMessage}</p>}
        {error && <p className="text-xs text-red-600 mt-0.5">Action Error: {error}</p>}

        <div className="flex items-center space-x-1 pt-1">
          {isResumable && (
            <Button onClick={handleResume} size="sm" isLoading={isResuming} disabled={isGloballyLoading || isDeleting}>
              Resume Job
            </Button>
          )}
          <Button
            onClick={handleDelete}
            size="sm"
            isLoading={isDeleting}
            disabled={isGloballyLoading || isResuming}
            className="!bg-red-200 hover:!bg-red-300 !border-t-red-100 !border-l-red-100 !border-b-red-500 !border-r-red-500 active:!bg-red-400 active:!border-t-red-500 active:!border-l-red-500 active:!border-b-red-100 active:!border-r-red-100"
          >
            Delete Job
          </Button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(JobConsoleItem);
