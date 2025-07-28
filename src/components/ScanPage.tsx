
import React, { useState, useCallback, useRef } from 'react';
import { User, TrackScanLog, JobFileState, ScanJob, JobCreationResponse } from '../types';
import FileUpload from './FileUpload';
import AutoDetectInputForms from './scanPage/AutoDetectInputForms';
import UrlInputForms from './scanPage/UrlInputForms';
import { scanLogService } from '../services/scanLogService';
import ManualSpotifyAddForm from './scanPage/ManualSpotifyAddForm';
import ScanMessages from './scanPage/ScanMessages';
import ProgressBar from './common/ProgressBar';

interface ScanPageProps {
  user: User;
  onJobCreated: (job?: ScanJob | Partial<ScanJob>) => void;
  onLogout: () => void;
}

const ScanPage: React.FC<ScanPageProps> = ({ user, onJobCreated, onLogout }) => {
  const [isInitiatingJob, setIsInitiatingJob] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentOperationMessage, setCurrentOperationMessage] = useState<string>('');
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [manualAddMessage, setManualAddMessage] = useState<string | null>(null);

  const [fileStates, setFileStates] = useState<JobFileState[]>([]);
  const [currentUploadingFile, setCurrentUploadingFile] = useState<string | null>(null);
  const [currentUploadingProgress, setCurrentUploadingProgress] = useState(0);
  const currentJobIdForFileUploadRef = useRef<string | null>(null);


  const handleAuthError = useCallback((error: any): boolean => {
    const isAuthError = (error?.status === 401 || error?.status === 403) ||
                        (typeof error?.message === 'string' &&
                         (error.message.toLowerCase().includes('token is not valid') ||
                          error.message.toLowerCase().includes('not authenticated') ||
                          error.message.toLowerCase().includes('authorization denied')));
    if (isAuthError) {
      console.warn("[ScanPage] Authentication error detected. Logging out.", error?.message);
      onLogout();
      return true;
    }
    return false;
  }, [onLogout]);

  const resetPageMessages = () => {
    setError(null);
    setCompletionMessage(null);
    setManualAddMessage(null);
    setCurrentOperationMessage('');
  };

  const handleJobInitiationError = (err: any, operation: string) => {
    console.error(`[ScanPage] Error during ${operation}:`, err);
    if (handleAuthError(err)) return;
    const message = `Failed to ${operation}: ${err.message || 'Unknown server error.'}`;
    setError(message);
    setIsInitiatingJob(false);
    setCurrentOperationMessage('');
  };

  const handleFilesSelectedForJob = useCallback(async (files: File[]) => {
    resetPageMessages();
    if (files.length === 0) return;
    setIsInitiatingJob(true);
    setCurrentOperationMessage(`Initiating file scan job for ${files.length} file(s)...`);
    setFileStates(files.map(f => ({ originalFileName: f.name, originalFileSize: f.size, status: 'pending' })));
    setCurrentUploadingFile(null); setCurrentUploadingProgress(0);
    const filesMetadata = files.map(f => ({ fileName: f.name, fileSize: f.size }));
    let job: JobCreationResponse | null = null;
    try {
      job = await scanLogService.initiateFileUploadJob(filesMetadata);
      currentJobIdForFileUploadRef.current = job.id; onJobCreated(job);
      setCompletionMessage(`Job ${job.id} created for ${files.length} files. Starting uploads...`);
      const newFileStates: JobFileState[] = files.map(f => ({ originalFileName: f.name, originalFileSize: f.size, status: 'pending' }));
      for (let i = 0; i < files.length; i++) {
        const file = files[i]; setCurrentUploadingFile(file.name);
        newFileStates[i] = { ...newFileStates[i], status: 'uploading', uploadedBytes: 0 }; setFileStates([...newFileStates]);
        setCurrentOperationMessage(`Uploading ${file.name} (${i + 1}/${files.length})...`);
        try {
          await scanLogService.uploadFileForJob(job.id, file, (loaded, total) => {
            const progress = total > 0 ? Math.round((loaded / total) * 100) : 0; setCurrentUploadingProgress(progress);
            newFileStates[i] = { ...newFileStates[i], uploadedBytes: loaded }; setFileStates([...newFileStates]);
          });
          newFileStates[i] = { ...newFileStates[i], status: 'uploaded' }; setFileStates([...newFileStates]);
          setCurrentOperationMessage(`${file.name} uploaded. Job ${job.id} processing in background.`);
        } catch (uploadError: any) {
            if (handleAuthError(uploadError)) return;
            newFileStates[i] = { ...newFileStates[i], status: 'error_upload', errorMessage: uploadError.message }; setFileStates([...newFileStates]);
            setError(prev => `${prev ? prev + '\n' : ''}Failed to upload ${file.name}: ${uploadError.message}`);
        }
        setCurrentUploadingProgress(0);
      }
      setCompletionMessage(`All ${files.length} files uploaded for job ${job.id}. Check Job Console for progress.`);
    } catch (err: any) { handleJobInitiationError(err, `initiate file scan job`); }
    finally { setIsInitiatingJob(false); setCurrentUploadingFile(null); }
  }, [onJobCreated, handleAuthError]);


  const handleManualAdd = async (link: string): Promise<boolean> => {
    resetPageMessages(); setIsInitiatingJob(true); setCurrentOperationMessage("Adding Spotify track to log...");
    try {
      const newLog = await scanLogService.addSpotifyTrackToLog(link);
      // Create a partial job object to trigger redirection
      onJobCreated({ id: newLog.logId, jobName: newLog.originalFileName });
      setManualAddMessage(`Successfully added "${newLog.originalFileName}" to log.`);
      setCompletionMessage(null);
      return true;
    } catch (err: any) { if (handleAuthError(err)) return false; setManualAddMessage(`Error: ${err.message || 'Failed to add Spotify track.'}`); return false; }
    finally { setIsInitiatingJob(false); setCurrentOperationMessage(''); }
  };

  const handleProcessSpotifyPlaylistUrl = useCallback(async (url: string) => {
    resetPageMessages(); setIsInitiatingJob(true); setCurrentOperationMessage("Initiating Spotify Playlist import job...");
    try { const job = await scanLogService.initiateSpotifyPlaylistJob(url); onJobCreated(job);
      setCompletionMessage(`Spotify Playlist Import Job ${job.id} for "${job.jobName}" initiated. Check Job Console for progress.`);
    } catch (err: any) { handleJobInitiationError(err, "process Spotify Playlist URL"); }
    finally { setIsInitiatingJob(false); setCurrentOperationMessage(''); }
  }, [onJobCreated, handleAuthError]);

  // Auto-detect and process Spotify URL (track or playlist)
  const handleProcessSpotifyUrl = useCallback(async (url: string) => {
    resetPageMessages();

    try {
      const parsedUrl = new URL(url);

      if (!parsedUrl.hostname.includes('open.spotify.com')) {
        setError('Not a valid Spotify URL');
        return;
      }

      // Check if it's a track
      if (parsedUrl.pathname.includes('/track/')) {
        setCurrentOperationMessage(`Detected Spotify track. Processing...`);
        handleManualAdd(url);
        return;
      }

      // Check if it's a playlist
      if (parsedUrl.pathname.includes('/playlist/')) {
        setCurrentOperationMessage(`Detected Spotify playlist. Processing...`);
        handleProcessSpotifyPlaylistUrl(url);
        return;
      }

      setError('Unrecognized Spotify URL format');

    } catch (e) {
      setError(`Invalid Spotify URL: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, [handleManualAdd, handleProcessSpotifyPlaylistUrl]);

  return (
    <div className="space-y-3 bg-[#C0C0C0] p-2">
      <FileUpload
        onFilesSelectedForJob={handleFilesSelectedForJob}
        isLoading={isInitiatingJob && !!currentUploadingFile}
        currentFileStates={fileStates}
        currentUploadingFile={currentUploadingFile}
        currentUploadingProgress={currentUploadingProgress}
      />
      <AutoDetectInputForms
        onProcessSpotifyUrl={handleProcessSpotifyUrl}
        isLoading={isInitiatingJob && !currentUploadingFile}
      />
      <UrlInputForms
        onProcessSpotifyPlaylistUrl={handleProcessSpotifyPlaylistUrl}
        isLoading={isInitiatingJob && !currentUploadingFile}
      />
      <ManualSpotifyAddForm onAddTrack={handleManualAdd} />

      {isInitiatingJob && currentOperationMessage && (
        <div className="mt-2 p-2 win95-border-outset bg-[#C0C0C0]">
          <ProgressBar text={currentOperationMessage} />
        </div>
      )}

      <ScanMessages
        isLoading={false}
        error={error}
        scanCompletionMessage={completionMessage}
        alreadyScannedMessage={null}
        manualAddMessage={manualAddMessage}
      />
    </div>
  );
};

export default React.memo(ScanPage);