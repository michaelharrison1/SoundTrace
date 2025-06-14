
import React, { useState, useCallback, useRef } from 'react';
import { User, TrackScanLog, JobFileState, ScanJob, JobCreationResponse } from '../types';
import FileUpload from './FileUpload';
import UrlInputForms from './scanPage/UrlInputForms';
// Removed: import MyYouTubeVideos from './scanPage/MyYouTubeVideos';
import { scanLogService } from '../services/scanLogService';
import ManualSpotifyAddForm from './scanPage/ManualSpotifyAddForm';
import ScanMessages from './scanPage/ScanMessages';
import CRTProgressBar from './common/CRTProgressBar';

const ELECTRON_APP_URL = 'http://localhost:48757/download-and-scan'; // Port from Electron app
const ELECTRON_APP_DOWNLOAD_LINK = '[Your Electron App Download Link Here]'; // Placeholder

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
  const [electronAppError, setElectronAppError] = useState<string | null>(null);

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
    console.log('[ScanPage] resetPageMessages called');
    setError(null);
    setCompletionMessage(null);
    setManualAddMessage(null);
    setCurrentOperationMessage('');
    setElectronAppError(null);
  };

  const handleJobInitiationError = (err: any, operation: string) => {
    console.error(`[ScanPage] Error during ${operation}:`, err);
    if (handleAuthError(err)) return;
    const message = `Failed to ${operation}: ${err.message || 'Unknown server error.'}`;
    setError(message);
    if (message.includes("Failed to fetch") || message.includes("localhost:48757")) {
        setElectronAppError("Failed to connect to SoundTrace Downloader. Please ensure the app is installed and running on your computer.");
    } else {
        setElectronAppError(null);
    }
    setIsInitiatingJob(false);
    setCurrentOperationMessage('');
  };

  const sendToElectronDownloader = async (youtubeUrl: string, videoTitle: string = 'YouTube Video') => {
    console.log(`[ScanPage] sendToElectronDownloader called for URL: ${youtubeUrl}`);
    const soundTraceToken = localStorage.getItem('authToken');
    if (!soundTraceToken) {
      console.error('[ScanPage] Auth token not found for Electron request.');
      setError("Authentication token not found. Please log in again.");
      handleAuthError({ status: 401, message: "Auth token missing for Electron request." });
      return false;
    }
    setElectronAppError(null);
    try {
      console.log(`[ScanPage] Fetching ${ELECTRON_APP_URL} with title: ${videoTitle}`);
      const response = await fetch(ELECTRON_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl, soundTraceToken, videoTitle }),
        credentials: 'include', // Important for Electron CORS if it needs origin or cookies
      });
      console.log(`[ScanPage] Fetch response status: ${response.status}`);
      const data = await response.json();
      if (!response.ok) {
        console.error('[ScanPage] Electron app responded with an error:', data);
        throw new Error(data.error || `Electron app error: ${response.statusText}`);
      }
      console.log('[ScanPage] Successfully sent to Electron app:', data);
      setCompletionMessage(prev => `${prev ? prev + '\n' : ''}"${videoTitle}" sent to SoundTrace Downloader. Results will appear in Previous Scans.`);
      return true;
    } catch (err: any) {
      console.error(`[ScanPage] Error sending URL to Electron app for "${videoTitle}":`, err);
      const electronErrorMessage = err.message?.includes("Failed to fetch") || err.message?.includes("localhost")
        ? "Failed to connect to SoundTrace Downloader. Please ensure the app is installed and running on your computer. Also check browser console for CORS errors."
        : `Error communicating with local downloader: ${err.message || 'Unknown error'}`;
      setError(prev => `${prev ? prev + '\n' : ''}${electronErrorMessage}`);
      setElectronAppError(electronErrorMessage);
      return false;
    }
  };

  const handleFilesSelectedForJob = useCallback(async (files: File[], numberOfSegments: number) => {
    console.log('[ScanPage] handleFilesSelectedForJob called with', files.length, 'files');
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
    console.log('[ScanPage] handleManualAdd called with link:', link);
    resetPageMessages(); setIsInitiatingJob(true); setCurrentOperationMessage("Adding Spotify track to log...");
    try { const newLog = await scanLogService.addSpotifyTrackToLog(link); onJobCreated();
      setManualAddMessage(`Successfully added "${newLog.originalFileName}" to log.`); setCompletionMessage(null); return true;
    } catch (err: any) { if (handleAuthError(err)) return false; setManualAddMessage(`Error: ${err.message || 'Failed to add Spotify track.'}`); return false; }
    finally { setIsInitiatingJob(false); setCurrentOperationMessage(''); }
  };

  const handleProcessSingleYouTubeVideoUrl = useCallback(async (url: string) => {
    console.log('[ScanPage] handleProcessSingleYouTubeVideoUrl called with URL:', url);
    resetPageMessages(); setIsInitiatingJob(true); setCurrentOperationMessage(`Sending YouTube video to local downloader...`);
    const videoTitleMatch = url.match(/v=([^&]+)/);
    const videoTitle = videoTitleMatch ? `Video ID: ${videoTitleMatch[1]}` : 'YouTube Video';
    await sendToElectronDownloader(url, videoTitle);
    onJobCreated();
    setIsInitiatingJob(false);
    setCurrentOperationMessage('');
  }, [onJobCreated, electronAppError]); // Keep electronAppError in deps in case it influences subsequent logic

  const handleProcessMultipleYouTubeVideoUrls = useCallback(async (urlsString: string) => {
    console.log('[ScanPage] handleProcessMultipleYouTubeVideoUrls called');
    resetPageMessages();
    const urls = urlsString.split('\n').map(url => url.trim()).filter(url => url.length > 0);
    if (urls.length === 0) {
        setError("Please enter at least one YouTube video URL.");
        return;
    }
    setIsInitiatingJob(true);
    setCurrentOperationMessage(`Sending ${urls.length} YouTube video(s) to local downloader...`);
    let successCount = 0;
    for (const url of urls) {
        try {
            new URL(url);
            if (!url.includes("youtube.com/watch") && !url.includes("youtu.be/")) {
                setError(prev => `${prev ? prev + '\n' : ''}Invalid YouTube video URL skipped: ${url.substring(0,40)}...`);
                continue;
            }
            const videoTitleMatch = url.match(/v=([^&]+)/);
            const videoTitle = videoTitleMatch ? `Video ID: ${videoTitleMatch[1]}` : `YouTube Video ${successCount + 1}`;
            const success = await sendToElectronDownloader(url, videoTitle);
            if (success) successCount++;
            else {
                 if (electronAppError) break;
            }
        } catch (e) {
            setError(prev => `${prev ? prev + '\n' : ''}Invalid URL format skipped: ${url.substring(0,40)}...`);
        }
    }
    if (successCount > 0) {
        setCompletionMessage(`${successCount} of ${urls.length} video(s) sent to SoundTrace Downloader.`);
    }
    if (successCount !== urls.length && !electronAppError) {
        setError(prev => `${prev ? prev + '\n' : ''}Some videos could not be processed or sent. Check URLs or downloader status.`);
    }
    onJobCreated();
    setIsInitiatingJob(false);
    setCurrentOperationMessage('');
  }, [onJobCreated, electronAppError]);

  const handleProcessSpotifyPlaylistUrl = useCallback(async (url: string) => {
    console.log('[ScanPage] handleProcessSpotifyPlaylistUrl called with URL:', url);
    resetPageMessages(); setIsInitiatingJob(true); setCurrentOperationMessage("Initiating Spotify Playlist import job...");
    try { const job = await scanLogService.initiateSpotifyPlaylistJob(url); onJobCreated(job);
      setCompletionMessage(`Spotify Playlist Import Job ${job.id} for "${job.jobName}" initiated. Check Job Console for progress.`);
    } catch (err: any) { handleJobInitiationError(err, "process Spotify Playlist URL"); }
    finally { setIsInitiatingJob(false); setCurrentOperationMessage(''); }
  }, [onJobCreated, handleAuthError]);

  return (
    <div className="space-y-3">
      <div className="p-3 win95-border-outset bg-yellow-100 text-black border border-yellow-700">
        <h4 className="font-semibold text-yellow-800">YouTube Video Scanning Update!</h4>
        <p className="text-sm">
          To scan YouTube videos, you now need the <strong className="text-yellow-900">SoundTrace Downloader</strong> desktop app.
          This app runs on your computer and handles downloads using your local browser cookies for better access.
        </p>
        <p className="text-xs mt-1">
          Please ensure the SoundTrace Downloader app is installed and running before submitting YouTube URLs.
          {/* TODO: Replace with actual download link */}
          <a href={ELECTRON_APP_DOWNLOAD_LINK} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline ml-1">
            Download SoundTrace Downloader (Coming Soon)
          </a>
        </p>
      </div>

      <FileUpload
        onFilesSelectedForJob={handleFilesSelectedForJob}
        isLoading={isInitiatingJob && !!currentUploadingFile}
        currentFileStates={fileStates}
        currentUploadingFile={currentUploadingFile}
        currentUploadingProgress={currentUploadingProgress}
      />
      {/* MyYouTubeVideos component removed */}
      <UrlInputForms
        onProcessMultipleVideoUrls={handleProcessMultipleYouTubeVideoUrls}
        onProcessSingleYouTubeVideoUrl={handleProcessSingleYouTubeVideoUrl}
        onProcessSpotifyPlaylistUrl={handleProcessSpotifyPlaylistUrl}
        isLoading={isInitiatingJob && !currentUploadingFile} // Only disable URL forms if not in file upload specific loading
      />
      <ManualSpotifyAddForm onAddTrack={handleManualAdd} />

      {isInitiatingJob && currentOperationMessage && (
        <div className="mt-2 p-2 win95-border-outset bg-[#C0C0C0]">
          <CRTProgressBar text={currentOperationMessage} isActive={isInitiatingJob} />
        </div>
      )}

      {electronAppError && (
           <div className="mt-2 p-2 win95-border-outset bg-red-200 text-black border border-red-700">
                <p className="font-semibold">Downloader Connection Issue:</p>
                <p>{electronAppError}</p>
                <p className="text-xs mt-1">
                    Please ensure the SoundTrace Downloader desktop app is installed and running on your computer.
                    If it is running, try restarting it.
                    You can download it from <a href={ELECTRON_APP_DOWNLOAD_LINK} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">here (Coming Soon)</a>.
                </p>
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
