
import React, { useState, useCallback, useRef } from 'react';
import { User, TrackScanLog, JobFileState, ScanJob, JobCreationResponse } from '../types';
import FileUpload from './FileUpload';
import AutoDetectInputForms from './scanPage/AutoDetectInputForms';
import UrlInputForms from './scanPage/UrlInputForms';
import { scanLogService } from '../services/scanLogService';
import ManualSpotifyAddForm from './scanPage/ManualSpotifyAddForm';
import ScanMessages from './scanPage/ScanMessages';
import ProgressBar from './common/ProgressBar';

const ELECTRON_APP_API_BASE_URL = 'http://localhost:48757'; 
const ELECTRON_APP_DOWNLOAD_LINK = 'https://soundtrace.uk/download/latest';

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
  const [electronAppInfo, setElectronAppInfo] = useState<string | null>(null);

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
    setElectronAppError(null);
    setElectronAppInfo(null);
  };

  const handleJobInitiationError = (err: any, operation: string) => {
    console.error(`[ScanPage] Error during ${operation}:`, err);
    if (handleAuthError(err)) return;
    const message = `Failed to ${operation}: ${err.message || 'Unknown server error.'}`;
    setError(message);
    if (message.toLowerCase().includes("failed to fetch") || message.toLowerCase().includes("localhost:48757")) {
        setElectronAppError("Connection to SoundTrace Downloader failed. Is it running?");
    } else {
        setElectronAppError(null);
    }
    setIsInitiatingJob(false);
    setCurrentOperationMessage('');
  };

  const sendToElectronDownloader = async (endpoint: string, payload: any, operationName: string) => {
    const soundTraceToken = localStorage.getItem('authToken');
    if (!soundTraceToken) {
      setError("Authentication token not found. Please log in again.");
      handleAuthError({ status: 401, message: "Auth token missing for Electron request." });
      return { success: false, message: "Auth token missing." };
    }

    setElectronAppError(null);
    setElectronAppInfo(`Sending ${operationName} request to SoundTrace Downloader...`);

    try {
      const response = await fetch(`${ELECTRON_APP_API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, soundTraceToken }),
        credentials: 'omit', 
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || `Electron app error: ${response.statusText}`);
      }
      setElectronAppInfo(data.message || `${operationName} request accepted by downloader.`);
      return { success: true, data };
    } catch (err: any) {
      const commError = err.message?.includes("Failed to fetch") || err.message?.includes("localhost");
      const userMessage = commError
        ? "Failed to connect to SoundTrace Downloader. Please ensure the app is installed and running on your computer. Also check browser console for CORS or network errors."
        : `Error communicating with local downloader for ${operationName}: ${err.message || 'Unknown error'}`;

      setElectronAppError(userMessage);
      setError(prev => `${prev ? prev + '\n' : ''}${userMessage}`);
      return { success: false, message: userMessage };
    }
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

  const handleProcessSingleYouTubeVideoUrl = useCallback(async (url: string) => {
    resetPageMessages(); setIsInitiatingJob(true); setCurrentOperationMessage(`Initiating job for YouTube video...`);
    try {
      const videoTitleMatch = url.match(/v=([^&]+)/);
      const videoTitle = videoTitleMatch ? `YT Video ID: ${videoTitleMatch[1]}` : 'YouTube Video Scan';
      const job = await scanLogService.initiateSingleYouTubeVideoJob(url, videoTitle);
      onJobCreated(job);
      setCurrentOperationMessage(`Job ${job.id} created. Sending to local downloader...`);
      const electronResult = await sendToElectronDownloader('/download-and-scan', { youtubeUrl: url, videoTitle: job.jobName, jobId: job.id }, 'single YouTube video');
      if (electronResult.success) {
        setCompletionMessage(`Job ${job.id} for "${job.jobName}" sent to SoundTrace Downloader. Check Job Console.`);
      } 
    } catch (err: any) { handleJobInitiationError(err, "initiate single YouTube video job"); }
    finally { setIsInitiatingJob(false); setCurrentOperationMessage(''); }
  }, [onJobCreated, handleAuthError, sendToElectronDownloader]);

  const handleProcessMultipleYouTubeVideoUrls = useCallback(async (urlsString: string) => {
    resetPageMessages();
    const urls = urlsString.split('\n').map(url => url.trim()).filter(url => url.length > 0);
    if (urls.length === 0) {
      setError("No URLs provided for multiple video scan.");
      return;
    }

    setIsInitiatingJob(true);
    setCurrentOperationMessage(`Processing ${urls.length} YouTube videos...`);
    let successfulJobs = 0;
    let failedJobs = 0;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      setCurrentOperationMessage(`Processing video ${i + 1}/${urls.length}: ${url.substring(0,50)}...`);
      try {
        const videoTitleMatch = url.match(/v=([^&]+)/) || url.match(/youtu.be\/([^?]+)/) ;
        const videoId = videoTitleMatch ? videoTitleMatch[1] : null;
        const videoTitle = videoId ? `YT Video ID: ${videoId}` : `YouTube Video Scan (${i+1})`;

        const job = await scanLogService.initiateSingleYouTubeVideoJob(url, videoTitle);
        onJobCreated(job);

        const electronResult = await sendToElectronDownloader(
          '/download-and-scan',
          { youtubeUrl: url, videoTitle: job.jobName, jobId: job.id },
          `video ${i + 1}/${urls.length}`
        );

        if (electronResult.success) {
          successfulJobs++;
        } else {
          failedJobs++;
          setError(prev => `${prev ? prev + '\n' : ''}Failed to send video ${url.substring(0,30)}... to downloader: ${electronResult.message}`);
        }
      } catch (err: any) {
        failedJobs++;
        handleJobInitiationError(err, `process video ${url.substring(0,30)}...`);
      }
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setCurrentOperationMessage('');
    setIsInitiatingJob(false);
    if (failedJobs === 0 && successfulJobs > 0) {
      setCompletionMessage(`Successfully initiated processing for ${successfulJobs} YouTube videos. Check Job Console.`);
    } else if (successfulJobs > 0 && failedJobs > 0) {
      setCompletionMessage(`Initiated ${successfulJobs} video jobs. ${failedJobs} failed. Check notifications and Job Console.`);
    } else if (failedJobs > 0 && successfulJobs === 0) {
      setError(prev => `${prev ? prev + '\n' : ''}Failed to initiate any YouTube video jobs from the list.`);
    } else {
         setError("No videos were processed from the list.");
    }
  }, [onJobCreated, handleAuthError, sendToElectronDownloader, handleJobInitiationError]);


  const handleProcessYouTubeChannelUrl = useCallback(async (channelUrl: string) => {
    resetPageMessages(); setIsInitiatingJob(true); setCurrentOperationMessage(`Initiating job for YouTube channel...`);
    try {
      const job = await scanLogService.initiateYouTubeChannelJob(channelUrl);
      onJobCreated(job);
      setCurrentOperationMessage(`Job ${job.id} for channel created. Sending to local downloader for video discovery...`);
      const electronResult = await sendToElectronDownloader('/process-youtube-channel', { channelUrl, jobId: job.id }, 'YouTube channel');
      if (electronResult.success) {
        setCompletionMessage(`Job ${job.id} for channel "${job.jobName}" sent to SoundTrace Downloader for processing. Check Job Console.`);
      } 
    } catch (err: any) { handleJobInitiationError(err, "initiate YouTube channel scan job"); }
    finally { setIsInitiatingJob(false); setCurrentOperationMessage(''); }
  }, [onJobCreated, handleAuthError, sendToElectronDownloader]);

  const handleProcessYouTubePlaylistUrl = useCallback(async (playlistUrl: string) => {
    resetPageMessages(); setIsInitiatingJob(true); setCurrentOperationMessage(`Initiating job for YouTube playlist...`);
    try {
      const job = await scanLogService.initiateYouTubePlaylistJob(playlistUrl);
      onJobCreated(job);
      setCurrentOperationMessage(`Job ${job.id} for playlist created. Sending to local downloader for video discovery...`);
      const electronResult = await sendToElectronDownloader('/process-youtube-playlist', { playlistUrl, jobId: job.id }, 'YouTube playlist');
      if (electronResult.success) {
        setCompletionMessage(`Job ${job.id} for playlist "${job.jobName}" sent to SoundTrace Downloader for processing. Check Job Console.`);
      }
    } catch (err: any) { handleJobInitiationError(err, "initiate YouTube playlist scan job"); }
    finally { setIsInitiatingJob(false); setCurrentOperationMessage(''); }
  }, [onJobCreated, handleAuthError, sendToElectronDownloader]);


  const handleProcessSpotifyPlaylistUrl = useCallback(async (url: string) => {
    resetPageMessages(); setIsInitiatingJob(true); setCurrentOperationMessage("Initiating Spotify Playlist import job...");
    try { const job = await scanLogService.initiateSpotifyPlaylistJob(url); onJobCreated(job);
      setCompletionMessage(`Spotify Playlist Import Job ${job.id} for "${job.jobName}" initiated. Check Job Console for progress.`);
    } catch (err: any) { handleJobInitiationError(err, "process Spotify Playlist URL"); }
    finally { setIsInitiatingJob(false); setCurrentOperationMessage(''); }
  }, [onJobCreated, handleAuthError]);

  // Auto-detect and process YouTube URL (any type)
  const handleProcessYouTubeUrl = useCallback(async (url: string) => {
    resetPageMessages();
    
    // Check if it's multiple URLs (contains line breaks)
    if (url.includes('\n')) {
      const lines = url.split('\n').filter(line => line.trim().length > 0);
      if (lines.length > 1) {
        handleProcessMultipleYouTubeVideoUrls(url);
        return;
      }
    }

    try {
      const parsedUrl = new URL(url);
      
      // Check if it's a playlist
      if (parsedUrl.pathname.includes('/playlist') || parsedUrl.searchParams.has('list')) {
        setCurrentOperationMessage(`Detected YouTube playlist. Processing...`);
        handleProcessYouTubePlaylistUrl(url);
        return;
      }
      
      // Check if it's a channel
      if (parsedUrl.pathname.startsWith('/@') || 
          parsedUrl.pathname.startsWith('/channel/') || 
          parsedUrl.pathname.startsWith('/user/')) {
        setCurrentOperationMessage(`Detected YouTube channel. Processing...`);
        handleProcessYouTubeChannelUrl(url);
        return;
      }
      
      // Default to single video
      setCurrentOperationMessage(`Detected YouTube video. Processing...`);
      handleProcessSingleYouTubeVideoUrl(url);
      
    } catch (e) {
      setError(`Invalid YouTube URL: ${e instanceof Error ? e.message : 'Unknown error'}`);
      setIsInitiatingJob(false);
    }
  }, [
    handleProcessMultipleYouTubeVideoUrls, 
    handleProcessYouTubePlaylistUrl, 
    handleProcessYouTubeChannelUrl, 
    handleProcessSingleYouTubeVideoUrl
  ]);

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
      <div className="p-3 win95-border-outset bg-yellow-100 text-black border border-yellow-700">
        <h4 className="font-semibold text-yellow-800">YouTube Video Scanning Update!</h4>
        <p className="text-sm">
          To scan YouTube videos (single, multiple, playlists, or full channels), you now need the <strong className="text-yellow-900">SoundTrace Downloader</strong> desktop app.
          This app runs on your computer and handles downloads using your local browser cookies for better access.
        </p>
        <p className="text-xs mt-1">
          Please ensure the SoundTrace Downloader app is installed and running before submitting YouTube URLs.
          <a href={ELECTRON_APP_DOWNLOAD_LINK} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline ml-1">
            Download SoundTrace Downloader
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
      <AutoDetectInputForms
        onProcessYouTubeUrl={handleProcessYouTubeUrl}
        onProcessSpotifyUrl={handleProcessSpotifyUrl}
        isLoading={isInitiatingJob && !currentUploadingFile}
      />
      <UrlInputForms
        onProcessMultipleVideoUrls={handleProcessMultipleYouTubeVideoUrls}
        onProcessSingleYouTubeVideoUrl={handleProcessSingleYouTubeVideoUrl}
        onProcessSpotifyPlaylistUrl={handleProcessSpotifyPlaylistUrl}
        onProcessYouTubeChannelUrl={handleProcessYouTubeChannelUrl}
        onProcessYouTubePlaylistUrl={handleProcessYouTubePlaylistUrl} 
        isLoading={isInitiatingJob && !currentUploadingFile}
      />
      <ManualSpotifyAddForm onAddTrack={handleManualAdd} />

      {isInitiatingJob && currentOperationMessage && (
        <div className="mt-2 p-2 win95-border-outset bg-[#C0C0C0]">
          <ProgressBar text={currentOperationMessage} />
        </div>
      )}

      {electronAppError && (
           <div className="mt-2 p-2 win95-border-outset bg-red-200 text-black border border-red-700">
                <p className="font-semibold">Downloader Communication Issue:</p>
                <p className="whitespace-pre-line">{electronAppError}</p>
                <p className="text-xs mt-1">
                    Please ensure the SoundTrace Downloader desktop app is installed and running on your computer.
                    If it is running, try restarting it.
                    You can download it from <a href={ELECTRON_APP_DOWNLOAD_LINK} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">here</a>.
                </p>
            </div>
      )}
       {electronAppInfo && !electronAppError && (
            <div className="mt-2 p-2 win95-border-outset bg-blue-100 text-black border border-blue-700">
                <p className="font-semibold">Downloader Info:</p>
                <p>{electronAppInfo}</p>
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
