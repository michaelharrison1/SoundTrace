
import React, { useState, useCallback, useRef } from 'react';
import { User, TrackScanLog, YouTubeUploadType, JobFileState, ScanJob, JobCreationResponse } from '../types';
import FileUpload from './FileUpload';
import UrlInputForms from './scanPage/UrlInputForms';
import MyYouTubeVideos from './scanPage/MyYouTubeVideos'; // Import new component
import { scanLogService } from '../services/scanLogService';
import ManualSpotifyAddForm from './scanPage/ManualSpotifyAddForm';
import ScanMessages from './scanPage/ScanMessages';
import CRTProgressBar from './common/CRTProgressBar'; 

interface ScanPageProps {
  user: User;
  onJobCreated: (job?: ScanJob) => void; 
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
      console.warn("Authentication error detected. Logging out.", error?.message);
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
    console.error(`Error during ${operation}:`, err);
    if (handleAuthError(err)) return;
    setError(`Failed to ${operation}: ${err.message || 'Unknown server error.'}`);
    setIsInitiatingJob(false);
    setCurrentOperationMessage('');
  };

  const handleFilesSelectedForJob = useCallback(async (files: File[], numberOfSegments: number) => {
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

  const handleMyYouTubeVideosSelectedForJob = useCallback(async (videoUrls: string[]) => {
    resetPageMessages();
    if (videoUrls.length === 0) return;
    setIsInitiatingJob(true);
    setCurrentOperationMessage(`Initiating scan job for ${videoUrls.length} of your YouTube video(s)...`);
    try {
        // For simplicity, create one job per video. Backend could be enhanced to batch these.
        let allJobsCreated = true;
        let firstJobName = "";
        for (const url of videoUrls) {
            const job = await scanLogService.initiateSingleYouTubeVideoScanJob(url);
            if(!firstJobName) firstJobName = job.jobName;
            onJobCreated(job); // Notify parent for each job created
        }
         if (videoUrls.length === 1) {
            setCompletionMessage(`Job for "${firstJobName}" initiated. Check Job Console.`);
        } else {
            setCompletionMessage(`${videoUrls.length} YouTube video scan jobs initiated. Check Job Console.`);
        }
    } catch (err: any) {
        handleJobInitiationError(err, `initiate scan for selected YouTube videos`);
    } finally {
        setIsInitiatingJob(false);
        setCurrentOperationMessage('');
    }
  }, [onJobCreated, handleAuthError]);


  const handleManualAdd = async (link: string): Promise<boolean> => {
    resetPageMessages(); setIsInitiatingJob(true); setCurrentOperationMessage("Adding Spotify track to log...");
    try { const newLog = await scanLogService.addSpotifyTrackToLog(link); onJobCreated(); 
      setManualAddMessage(`Successfully added "${newLog.originalFileName}" to log.`); setCompletionMessage(null); return true;
    } catch (err: any) { if (handleAuthError(err)) return false; setManualAddMessage(`Error: ${err.message || 'Failed to add Spotify track.'}`); return false; } 
    finally { setIsInitiatingJob(false); setCurrentOperationMessage(''); }
  };

  const handleProcessYouTubeUrl = useCallback(async (url: string, type: YouTubeUploadType) => {
    resetPageMessages(); setIsInitiatingJob(true); setCurrentOperationMessage(`Initiating YouTube job (${type})...`);
    try { const job = await scanLogService.initiateYouTubeScanJob(url, type); onJobCreated(job);
      setCompletionMessage(`YouTube Job ${job.id} (${type}) for "${job.jobName}" initiated. Check Job Console for progress.`);
    } catch (err: any) { handleJobInitiationError(err, `process YouTube URL (${type})`); } 
    finally { setIsInitiatingJob(false); setCurrentOperationMessage(''); }
  }, [onJobCreated, handleAuthError]);

  const handleProcessSingleYouTubeVideoUrl = useCallback(async (url: string) => {
    resetPageMessages(); setIsInitiatingJob(true); setCurrentOperationMessage(`Initiating single YouTube video scan...`);
    try { const job = await scanLogService.initiateSingleYouTubeVideoScanJob(url); onJobCreated(job);
      setCompletionMessage(`Single YouTube Video Job ${job.id} for "${job.jobName}" initiated. Check Job Console for progress.`);
    } catch (err: any) { handleJobInitiationError(err, `process single YouTube video URL`); } 
    finally { setIsInitiatingJob(false); setCurrentOperationMessage(''); }
  }, [onJobCreated, handleAuthError]);


  const handleProcessSpotifyPlaylistUrl = useCallback(async (url: string) => {
    resetPageMessages(); setIsInitiatingJob(true); setCurrentOperationMessage("Initiating Spotify Playlist import job...");
    try { const job = await scanLogService.initiateSpotifyPlaylistJob(url); onJobCreated(job);
      setCompletionMessage(`Spotify Playlist Import Job ${job.id} for "${job.jobName}" initiated. Check Job Console for progress.`);
    } catch (err: any) { handleJobInitiationError(err, "process Spotify Playlist URL"); } 
    finally { setIsInitiatingJob(false); setCurrentOperationMessage(''); }
  }, [onJobCreated, handleAuthError]);


  return (
    <div className="space-y-3">
      <FileUpload
        onFilesSelectedForJob={handleFilesSelectedForJob}
        isLoading={isInitiatingJob && !!currentUploadingFile}
        currentFileStates={fileStates}
        currentUploadingFile={currentUploadingFile}
        currentUploadingProgress={currentUploadingProgress}
      />
      <MyYouTubeVideos onVideosSelected={handleMyYouTubeVideosSelectedForJob} isJobInitiating={isInitiatingJob} />
      <UrlInputForms
        onProcessYouTubeUrl={handleProcessYouTubeUrl}
        onProcessSingleYouTubeVideoUrl={handleProcessSingleYouTubeVideoUrl} 
        onProcessSpotifyPlaylistUrl={handleProcessSpotifyPlaylistUrl}
        isLoading={isInitiatingJob}
      />
      <ManualSpotifyAddForm onAddTrack={handleManualAdd} />

      {isInitiatingJob && currentOperationMessage && (
        <div className="mt-2 p-2 win95-border-outset bg-[#C0C0C0]">
          <CRTProgressBar text={currentOperationMessage} isActive={isInitiatingJob} />
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
