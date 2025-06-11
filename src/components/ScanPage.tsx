
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { User, TrackScanLog, YouTubeUploadType, ScanJobState, InitiateBatchScanResponse, ActiveScanJobResponse, AcrCloudMatch } from '../types';
import FileUpload from './FileUpload';
import UrlInputForms from './scanPage/UrlInputForms';
import { acrCloudService } from '../services/acrCloudService';
import { scanLogService } from '../services/scanLogService';
import { generateSnippetsForFile, SNIPPET_DURATION_SECONDS } from '../utils/audioProcessing';
import ProgressBar from './common/ProgressBar';
import ManualSpotifyAddForm from './scanPage/ManualSpotifyAddForm';
import ScanMessages from './scanPage/ScanMessages';
import Button from './common/Button';

interface ScanPageProps {
  user: User;
  previousScans: TrackScanLog[];
  onNewScanLogsSaved: (newLogs: TrackScanLog[]) => void;
  onLogout: () => void;
}

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [
    h > 0 ? h : null,
    m,
    s
  ].filter(part => part !== null).map(part => String(part).padStart(2, '0')).join(':');
};

const STALLED_JOB_THRESHOLD_MS = 120 * 1000; // 2 minutes for a job to be considered stalled

// In-memory store for managing active job controls (pause, abort signals)
// This is client-side and primarily for UI feedback/control, true state is on backend
const activeJobControls = new Map<string, 'running' | 'pausing' | 'resuming' | 'aborting'>();


const ScanPage: React.FC<ScanPageProps> = ({ user, previousScans, onNewScanLogsSaved, onLogout }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [scanProgressMessage, setScanProgressMessage] = useState<string>('');
  const [scanCompletionMessage, setScanCompletionMessage] = useState<string | null>(null);
  const [alreadyScannedMessage, setAlreadyScannedMessage] = useState<string | null>(null);
  const [manualAddMessage, setManualAddMessage] = useState<string | null>(null);

  // ScanJob related state
  const [currentScanJob, setCurrentScanJob] = useState<ScanJobState | null>(null);
  const [isPollingJobStatus, setIsPollingJobStatus] = useState<boolean>(false);

  const jobStatusPollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scanStartTimeRef = useRef<number | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleAuthError = useCallback((error: any): boolean => {
    const isAuthError = (error?.status === 401 || error?.status === 403) ||
                        (typeof error?.message === 'string' &&
                         (error.message.toLowerCase().includes('token is not valid') ||
                          error.message.toLowerCase().includes('not authenticated') ||
                          error.message.toLowerCase().includes('authorization denied')));
    if (isAuthError) {
      console.warn("Authentication error detected. Logging out.", error?.message);
      onLogout();
      return true; // Indicates auth error was handled
    }
    return false; // Not an auth error (or not one we handle by logout here)
  }, [onLogout]);


  const resetScanState = useCallback(() => {
    setIsLoading(false);
    setScanProgressMessage('');
    if (jobStatusPollIntervalRef.current) clearInterval(jobStatusPollIntervalRef.current);
    jobStatusPollIntervalRef.current = null;
    setIsPollingJobStatus(false);
    // currentScanJob is reset by specific handlers or on new job start
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    scanStartTimeRef.current = null;
    setEstimatedTimeRemaining(null);
  }, []);

  const fetchScanLogs = useCallback(async () => {
    try {
        const logs = await scanLogService.getScanLogs();
        onNewScanLogsSaved(logs);
    } catch (err) {
        console.error("Error refetching scan logs:", err);
        if (handleAuthError(err)) return;
    }
  }, [onNewScanLogsSaved, handleAuthError]);

    const handleResumeJob = useCallback(async (jobId: string) => {
    if (activeJobControls.get(jobId) === 'resuming' || isLoading) return;
    console.log(`[ScanPage] Attempting to resume job: ${jobId}`);
    activeJobControls.set(jobId, 'resuming');
    setScanProgressMessage(`Attempting to resume job ${jobId}...`);
    setError(null); // Clear previous errors
    setIsLoading(true);

    try {
        const { jobStatus } = await scanLogService.resumeScanJob(jobId);
        const updatedJob = await scanLogService.getScanJobStatus(jobId); // Fetch full status
        setCurrentScanJob(updatedJob);

        if (updatedJob.status === 'processing_videos' || updatedJob.status === 'fetching_videos' || updatedJob.status === 'pending_video_fetch') {
            setScanProgressMessage(`Job ${jobId} resumed. Status: ${updatedJob.status}.`);
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            startJobStatusPolling(jobId); // Restart polling
        } else {
             setScanProgressMessage(`Job ${jobId} status after resume attempt: ${updatedJob.status}. ${updatedJob.lastErrorMessage || ''}`);
             if (updatedJob.status === 'completed' || updatedJob.status === 'aborted' || updatedJob.status === 'error_youtube_api' || updatedJob.status === 'error_partial') {
                fetchScanLogs();
                resetScanState();
                setCurrentScanJob(null);
                setScanCompletionMessage(`Job ${jobId} is now ${updatedJob.status}. ${updatedJob.lastErrorMessage || ''}`);
             }
             setIsLoading(false); // Not actively processing if not in a pollable state
        }
    } catch (err: any) {
        console.error(`Error resuming job ${jobId}:`, err);
        if (handleAuthError(err)) return;
        setError(`Failed to resume job ${jobId}: ${err.message}`);
        setIsLoading(false);
    } finally {
        activeJobControls.delete(jobId);
    }
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  }, [isLoading, handleAuthError, fetchScanLogs, resetScanState, /* startJobStatusPolling is defined later, direct use ok */]);


  const pollJobStatus = useCallback(async (jobIdToPoll: string) => {
    if (!jobIdToPoll || activeJobControls.get(jobIdToPoll) === 'pausing' || activeJobControls.get(jobIdToPoll) === 'aborting') {
      console.log(`[Poll] Polling skipped for ${jobIdToPoll} due to state: ${activeJobControls.get(jobIdToPoll)}`);
      return;
    }
    console.log(`[Poll] Polling status for job ${jobIdToPoll}`);
    try {
        const jobStatus = await scanLogService.getScanJobStatus(jobIdToPoll);
        setCurrentScanJob(jobStatus);

        const {
            status, totalVideosToScan, videosProcessed, videosWithMatches, videosFailed,
            lastErrorMessage, lastProcessedVideoInfo, pendingVideoCount, updatedAt
        } = jobStatus;

        // 1. Handle Terminal States
        if (status === 'completed' || status === 'aborted' || status === 'error_youtube_api' || status === 'error_partial') {
            setIsLoading(false);
            let completionMsg = `Job ${jobIdToPoll} ${status}.`;
            if (status === 'completed') {
                completionMsg = `Scan job completed. Total Videos: ${totalVideosToScan}, Processed: ${videosProcessed}, Matches Found: ${videosWithMatches}, Failed: ${videosFailed}.`;
            } else if (status === 'aborted') {
                completionMsg = `Scan job aborted by user. Processed: ${videosProcessed} of ${totalVideosToScan}.`;
            } else if (status === 'error_youtube_api') {
                completionMsg = `Error fetching video list from YouTube for job ${jobIdToPoll}: ${lastErrorMessage || 'Unknown API error'}.`;
            } else if (status === 'error_partial') {
                completionMsg = `Job ${jobIdToPoll} completed with partial errors. Processed: ${videosProcessed}, Matches: ${videosWithMatches}, Failed: ${videosFailed}. Last error: ${lastErrorMessage || 'N/A'}`;
            }

            setScanCompletionMessage(completionMsg);
            if (lastErrorMessage && status !== 'completed' && status !== 'aborted') setError(lastErrorMessage);
            else setError(null);

            setCurrentScanJob(null);
            activeJobControls.delete(jobIdToPoll);
            if (jobStatusPollIntervalRef.current) clearInterval(jobStatusPollIntervalRef.current);
            jobStatusPollIntervalRef.current = null;
            setIsPollingJobStatus(false);
            fetchScanLogs();
            resetScanState();
            return;
        }

        // 2. Handle Non-Terminal States (Update UI messages, perform actions)
        let currentProgressMessage = scanProgressMessage;

        if (status === 'error_acr_credits') {
            const acrErrorMsg = `Scan job ${jobIdToPoll} paused due to ACR Cloud credit limit. Total: ${totalVideosToScan}, Processed: ${videosProcessed}, Matches: ${videosWithMatches}. Last processed: ${lastProcessedVideoInfo?.videoTitle || 'N/A'}. ${lastErrorMessage || ''}`;
            setError(acrErrorMsg);
            setScanCompletionMessage(null);
            currentProgressMessage = `Job Paused (ACR Credits). Processed: ${videosProcessed}/${totalVideosToScan}.`;
        } else if (status === 'fetching_videos') {
            currentProgressMessage = `Fetching video list for job ${jobIdToPoll}...`;
            setError(null); // Clear previous errors like ACR credits if now fetching
        } else if (status === 'processing_videos') {
            const processedVal = videosProcessed || 0;
            const totalVal = totalVideosToScan || 0;
            const currentVideoTitle = lastProcessedVideoInfo?.videoTitle || 'next video';
            let progressPercent = 0;
            if (totalVal > 0 && processedVal > 0) {
                progressPercent = Math.round((processedVal / totalVal) * 100);
            }
            const remainingVal = totalVal > 0 ? totalVal - processedVal : (pendingVideoCount || 0);
            currentProgressMessage = `Processing: ${currentVideoTitle.substring(0,30)}... (${progressPercent}%) - ${processedVal}/${totalVal} done. Matches: ${videosWithMatches}. Errors: ${videosFailed}. Remaining: ~${remainingVal}.`;
            setError(null); // Clear previous errors like ACR credits if now processing

            const jobUpdatedAt = new Date(updatedAt || Date.now()).getTime();
            if (Date.now() - jobUpdatedAt > STALLED_JOB_THRESHOLD_MS) {
                console.log(`[ScanPage] Job ${jobIdToPoll} appears stalled. Auto-resuming...`);
                handleResumeJob(jobIdToPoll);
                return;
            }
        } else if (status === 'pending_video_fetch') {
            currentProgressMessage = `Job ${jobIdToPoll} is queued and pending video list fetch.`;
            setError(null);
        } else if (status === 'paused') {
            currentProgressMessage = `Job ${jobIdToPoll} is paused by user. Processed: ${videosProcessed}/${totalVideosToScan}.`;
            setError(null);
        }
        setScanProgressMessage(currentProgressMessage);

        // 3. Decide if polling should continue
        const activePollingStates: ScanJobState['status'][] = ['processing_videos', 'fetching_videos', 'paused', 'error_acr_credits', 'pending_video_fetch'];
        if (activePollingStates.includes(status)) {
            setIsLoading(true);
            setIsPollingJobStatus(true);
            if (jobStatusPollIntervalRef.current) clearTimeout(jobStatusPollIntervalRef.current);
            jobStatusPollIntervalRef.current = setTimeout(() => pollJobStatus(jobIdToPoll), 5000);
        } else {
            console.warn(`[Poll] Job ${jobIdToPoll} in unexpected status '${status}'. Stopping polling.`);
            setIsLoading(false);
            if (jobStatusPollIntervalRef.current) clearInterval(jobStatusPollIntervalRef.current);
            jobStatusPollIntervalRef.current = null;
            setIsPollingJobStatus(false);
            setCurrentScanJob(null);
            activeJobControls.delete(jobIdToPoll);
            resetScanState();
        }
    } catch (err: any) {
        console.error(`Error polling job status for ${jobIdToPoll}:`, err);
        if (handleAuthError(err)) return;

        if (err.status === 404) {
            setError(`Job ${jobIdToPoll} not found. Stopping polling.`);
            setIsLoading(false);
            if (jobStatusPollIntervalRef.current) clearInterval(jobStatusPollIntervalRef.current);
            setIsPollingJobStatus(false);
            setCurrentScanJob(null);
            activeJobControls.delete(jobIdToPoll);
            resetScanState();
        } else {
            setError(`Error fetching job status: ${err.message}. Will retry polling.`);
            if (jobStatusPollIntervalRef.current) clearTimeout(jobStatusPollIntervalRef.current);
            jobStatusPollIntervalRef.current = setTimeout(() => pollJobStatus(jobIdToPoll), 10000); // Longer delay on error
        }
    }
  }, [fetchScanLogs, resetScanState, handleAuthError, handleResumeJob, scanProgressMessage /* Added scanProgressMessage */]);

  const startJobStatusPolling = useCallback((jobIdToPoll: string) => {
    if (jobStatusPollIntervalRef.current) clearInterval(jobStatusPollIntervalRef.current);
    setIsPollingJobStatus(true);
    setIsLoading(true);
    console.log(`[ScanPage] Starting polling for job ${jobIdToPoll}`);
    pollJobStatus(jobIdToPoll);
  }, [pollJobStatus]);


  useEffect(() => {
    const checkActiveJob = async () => {
        console.log("[ScanPage] Checking for active scan job on mount/user change...");
        setIsLoading(true);
        try {
            const response: ActiveScanJobResponse = await scanLogService.getActiveScanJob();
            if (response.activeJob) {
                setCurrentScanJob(response.activeJob);
                const job = response.activeJob;
                setScanProgressMessage(`Found active job: ${job.originalInputUrl}. Status: ${job.status}`);
                if (job.status === 'processing_videos' || job.status === 'fetching_videos' || job.status === 'paused' || job.status === 'error_acr_credits' || job.status === 'pending_video_fetch') {
                    startJobStatusPolling(job.jobId);
                } else if (job.status === 'error_acr_credits') {
                    setError(`Scan paused due to ACR Cloud credit limits for job: ${job.originalInputUrl}. Refill credits to resume.`);
                    setIsLoading(false);
                } else {
                    setScanCompletionMessage(`Job ${job.jobId} is ${job.status}. ${job.lastErrorMessage || ''}`);
                    setIsLoading(false);
                    setCurrentScanJob(null);
                }
            } else {
                console.log("[ScanPage] No active scan job found.");
                setIsLoading(false);
            }
        } catch (err: any) {
            if(handleAuthError(err)) return;
            console.error("Error checking for active scan job:", err);
            setError("Could not check for active scan jobs: " + err.message);
            setIsLoading(false);
        }
    };
    if(user) checkActiveJob();
    return () => {
      if (jobStatusPollIntervalRef.current) clearInterval(jobStatusPollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [user, handleAuthError, startJobStatusPolling]);

  const updateFileScanProgress = useCallback((processedCount: number, totalCount: number, fileName: string) => {
    const progress = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;
    setScanProgressMessage(`Scanning: ${fileName} (${progress}%) - File ${processedCount}/${totalCount}`);

    if (processedCount > 0 && totalCount > 0 && scanStartTimeRef.current) {
        const elapsedTime = (Date.now() - scanStartTimeRef.current) / 1000; // in seconds
        const timePerFile = elapsedTime / processedCount;
        const remainingFiles = totalCount - processedCount;
        const estimatedRemainingSeconds = Math.max(0, Math.round(timePerFile * remainingFiles));
        setEstimatedTimeRemaining(formatTime(estimatedRemainingSeconds));
    } else {
        setEstimatedTimeRemaining(null);
    }
  }, []);


  const handleFileScan = useCallback(async (files: File[], numberOfSegments: number) => {
    if (currentScanJob) { setError("An existing batch scan is in progress. Please wait for it to complete or abort it before starting a new scan."); return; }
    setIsLoading(true); setError(null); setScanCompletionMessage(null); setAlreadyScannedMessage(null);
    scanStartTimeRef.current = Date.now(); setEstimatedTimeRemaining(null);

    let newLogsCount = 0; let filesScannedThisSession = 0; let totalSnippetsToScan = 0; let snippetsProcessedThisSession = 0;
    const allNewLogs: TrackScanLog[] = [];

    for (let i = 0; i < files.length; i++) {
      const originalFile = files[i];
      updateFileScanProgress(i + 1, files.length, originalFile.name);
      const existingLog = previousScans.find(log => log.originalFileName === originalFile.name && log.originalFileSize === originalFile.size && (log.status === 'matches_found' || log.status === 'no_matches_found'));
      if (existingLog) { setAlreadyScannedMessage(prev => prev ? `${prev}, ${originalFile.name}` : originalFile.name); continue; }

      const snippets = await generateSnippetsForFile(originalFile, numberOfSegments);
      if (!snippets || snippets.length === 0) {
        setError(prev => `${prev ? prev + '\n' : ''}Could not process audio or generate snippets for ${originalFile.name}.`);
        const errorLog: Omit<TrackScanLog, 'logId' | 'scanDate' | 'scanJobId'> = { originalFileName: originalFile.name, originalFileSize: originalFile.size, matches: [], status: 'error_processing', platformSource: 'file_upload' };
        try { const saved = await scanLogService.saveScanLog(errorLog); allNewLogs.push(saved); } catch (e: any) { if (handleAuthError(e)) return; console.error("Failed to save error log:", e); }
        continue;
      }
      totalSnippetsToScan += snippets.length;
      let fileMatches: AcrCloudMatch[] = []; let anySnippetFailed = false;

      for (const snippet of snippets) {
        try {
          setScanProgressMessage(`Scanning ${originalFile.name} (snippet ${snippetsProcessedThisSession + 1}/${totalSnippetsToScan})...`);
          const result = await acrCloudService.scanWithAcrCloud(snippet);
          result.matches.forEach(match => { if (!fileMatches.find(m => m.id === match.id)) fileMatches.push(match);});
        } catch (err: any) {
          console.error(`Error scanning snippet ${snippet.name} from ${originalFile.name}:`, err);
          setError(prev => `${prev ? prev + '\n' : ''}Error scanning snippet from ${originalFile.name}: ${err.message}`);
          anySnippetFailed = true;
          if (err.message?.toLowerCase().includes('acrcloud error: http') || err.message?.toLowerCase().includes('acrcloud:')) {
            setError("ACRCloud API error. Your account might be out of credits or experiencing issues. Please check your ACRCloud dashboard.");
            resetScanState(); // Using resetScanState instead of just setIsLoading(false)
            return;
          }
        }
        snippetsProcessedThisSession++;
      }
      filesScannedThisSession++;
      const logStatus = fileMatches.length > 0 ? 'matches_found' : (anySnippetFailed ? 'partially_completed' : 'no_matches_found');
      const finalLog: Omit<TrackScanLog, 'logId' | 'scanDate' | 'scanJobId'> = { originalFileName: originalFile.name, originalFileSize: originalFile.size, matches: fileMatches, status: logStatus, platformSource: 'file_upload' };
      try { const saved = await scanLogService.saveScanLog(finalLog); allNewLogs.push(saved); newLogsCount++; } catch (e: any) { if (handleAuthError(e)) return; console.error("Failed to save scan log:", e); setError(prev => `${prev ? prev + '\n' : ''}Failed to save result for ${originalFile.name}.`); }
    }
    if (allNewLogs.length > 0) onNewScanLogsSaved(allNewLogs);
    setScanCompletionMessage(`${filesScannedThisSession} file(s) scanned. Found ${newLogsCount > 0 ? 'new results.' : 'no new matches.'}`);
    resetScanState();
  }, [previousScans, onNewScanLogsSaved, handleAuthError, currentScanJob, resetScanState, updateFileScanProgress]);

  const handleManualAdd = async (link: string): Promise<boolean> => {
    if (currentScanJob) { setManualAddMessage("Error: An existing batch scan is in progress. Please wait for it to complete or abort it."); return false; }
    setManualAddMessage(null); setError(null); setIsLoading(true);
    try {
      const newLog = await scanLogService.addSpotifyTrackToLog(link);
      onNewScanLogsSaved([newLog]);
      setManualAddMessage(`Successfully added "${newLog.originalFileName}" to your log.`);
      setIsLoading(false); return true;
    } catch (err: any) {
      if (handleAuthError(err)) { setIsLoading(false); return false; }
      setManualAddMessage(`Error: ${err.message || 'Failed to add Spotify track.'}`);
      setIsLoading(false); return false;
    }
  };

  const handleProcessYouTubeUrl = useCallback(async (url: string, type: YouTubeUploadType) => {
    if (currentScanJob && (type === 'youtube_channel_instrumental_batch' || type === 'youtube_playlist_instrumental_batch')) {
      setError("An existing batch scan is in progress. Please wait for it to complete or abort it before starting a new batch scan."); return;
    }
    setIsLoading(true); setError(null); setScanCompletionMessage(null); setAlreadyScannedMessage(null); setManualAddMessage(null);
    scanStartTimeRef.current = Date.now(); setEstimatedTimeRemaining(null);

    try {
      const result = await scanLogService.processYouTubeUrl(url, type);
      if ('scanJobId' in result) {
        const batchResult = result as InitiateBatchScanResponse;
        setCurrentScanJob({ jobId: batchResult.scanJobId, status: batchResult.initialJobStatus, originalInputUrl: url, jobType: type, totalVideosToScan: batchResult.totalVideosToScan, videosProcessed: 0, videosWithMatches: 0, videosFailed: 0 });
        setScanProgressMessage(batchResult.message);
        startJobStatusPolling(batchResult.scanJobId);
      } else {
        const singleResult = result as TrackScanLog;
        onNewScanLogsSaved([singleResult]);
        setScanCompletionMessage(`Processed YouTube URL: ${singleResult.originalFileName}. Status: ${singleResult.status}.`);
        resetScanState();
      }
    } catch (err: any) {
      console.error(`Error processing YouTube URL ${url}:`, err);
      if (handleAuthError(err)) return;
      setError(err.message || 'Failed to process YouTube URL.');
      resetScanState();
    }
  }, [onNewScanLogsSaved, handleAuthError, currentScanJob, resetScanState, startJobStatusPolling]);

  const handleProcessSpotifyPlaylistUrl = useCallback(async (url: string) => {
    if (currentScanJob) { setError("An existing batch scan is in progress. Please wait for it to complete or abort it."); return; }
    setIsLoading(true); setError(null); setScanCompletionMessage(null); setAlreadyScannedMessage(null); setManualAddMessage(null);
    scanStartTimeRef.current = Date.now();
    try {
        const newLogs = await scanLogService.processSpotifyPlaylistUrl(url);
        onNewScanLogsSaved(newLogs);
        setScanCompletionMessage(`Successfully added ${newLogs.length} tracks from Spotify playlist to your log.`);
    } catch (err: any) {
        if (handleAuthError(err)) return;
        setError(err.message || 'Failed to process Spotify Playlist URL.');
    } finally {
        resetScanState();
    }
  }, [onNewScanLogsSaved, handleAuthError, currentScanJob, resetScanState]);

  const handlePauseJob = useCallback(async (jobId: string) => {
    if (activeJobControls.get(jobId) === 'pausing' || activeJobControls.get(jobId) === 'aborting') return;
    console.log(`[ScanPage] Attempting to pause job: ${jobId}`);
    activeJobControls.set(jobId, 'pausing');
    setScanProgressMessage(`Attempting to pause job ${jobId}...`);
    try {
        const { jobStatus } = await scanLogService.pauseScanJob(jobId);
        if(jobStatusPollIntervalRef.current) clearInterval(jobStatusPollIntervalRef.current);
        setIsPollingJobStatus(false);
        setCurrentScanJob(prev => prev ? { ...prev, status: jobStatus } : null);
        setScanProgressMessage(`Job ${jobId} paused.`);
        setError(null);
    } catch (err: any) {
        console.error(`Error pausing job ${jobId}:`, err);
        if (handleAuthError(err)) return;
        setError(`Failed to pause job ${jobId}: ${err.message}`);
    } finally {
        activeJobControls.delete(jobId);
    }
  }, [handleAuthError]);

  const handleAbortJob = useCallback(async (jobId: string) => {
    if (activeJobControls.get(jobId) === 'aborting') return;
    const confirmAbort = window.confirm("Are you sure you want to abort this batch scan? Processed videos will remain, but pending videos will be cancelled.");
    if (!confirmAbort) return;

    console.log(`[ScanPage] Attempting to abort job: ${jobId}`);
    activeJobControls.set(jobId, 'aborting');
    setScanProgressMessage(`Attempting to abort job ${jobId}...`);
    setIsLoading(true);
    try {
        await scanLogService.abortScanJob(jobId);
        if(jobStatusPollIntervalRef.current) clearInterval(jobStatusPollIntervalRef.current);
        setIsPollingJobStatus(false);
        setScanCompletionMessage(`Job ${jobId} aborted.`);
        setError(null);
        setCurrentScanJob(null);
        fetchScanLogs();
    } catch (err: any) {
        console.error(`Error aborting job ${jobId}:`, err);
        if (handleAuthError(err)) return;
        setError(`Failed to abort job ${jobId}: ${err.message}`);
    } finally {
        activeJobControls.delete(jobId);
        setIsLoading(false);
    }
  }, [handleAuthError, fetchScanLogs]);

  return (
    <div className="space-y-3">
      <FileUpload onScan={handleFileScan} isLoading={isLoading && !currentScanJob} />
      <UrlInputForms
        onProcessYouTubeUrl={handleProcessYouTubeUrl}
        onProcessSpotifyPlaylistUrl={handleProcessSpotifyPlaylistUrl}
        isLoading={isLoading}
      />
      <ManualSpotifyAddForm onAddTrack={handleManualAdd} />

      {(isLoading || scanProgressMessage) && (!currentScanJob || ['pending_video_fetch', 'fetching_videos', 'processing_videos'].includes(currentScanJob.status)) && (
        <div className="mt-2 p-2 win95-border-outset bg-[#C0C0C0]">
          <ProgressBar text={scanProgressMessage || "Preparing scan..."} />
          {estimatedTimeRemaining && !currentScanJob && <p className="text-xs text-center text-gray-700 mt-1">Est. time remaining: {estimatedTimeRemaining}</p>}
          {currentScanJob && (currentScanJob.status === 'processing_videos' || currentScanJob.status === 'fetching_videos' || currentScanJob.status === 'pending_video_fetch') && (
            <div className="flex justify-center space-x-2 mt-1">
              <Button size="sm" onClick={() => handlePauseJob(currentScanJob.jobId)} disabled={activeJobControls.get(currentScanJob.jobId) === 'pausing'}>Pause Job</Button>
              <Button size="sm" onClick={() => handleAbortJob(currentScanJob.jobId)} variant="danger" disabled={activeJobControls.get(currentScanJob.jobId) === 'aborting'}>Abort Job</Button>
            </div>
          )}
        </div>
      )}

       {currentScanJob && (currentScanJob.status === 'paused' || currentScanJob.status === 'error_acr_credits') && (
         <div className="mt-2 p-2 win95-border-outset bg-yellow-100 border-yellow-500">
            <p className="text-sm text-black text-center mb-1">
                Job <span className="font-semibold">"{currentScanJob.originalInputUrl}"</span> is currently <span className="font-semibold">{currentScanJob.status === 'error_acr_credits' ? 'paused (ACR Credits)' : 'paused'}</span>.
            </p>
            {currentScanJob.lastErrorMessage && <p className="text-xs text-red-700 text-center mb-1">{currentScanJob.lastErrorMessage}</p>}
            <div className="flex justify-center space-x-2">
                <Button size="sm" onClick={() => handleResumeJob(currentScanJob.jobId)} disabled={isLoading || activeJobControls.get(currentScanJob.jobId) === 'resuming'}>Resume Job</Button>
                <Button size="sm" onClick={() => handleAbortJob(currentScanJob.jobId)} variant="danger" disabled={isLoading || activeJobControls.get(currentScanJob.jobId) === 'aborting'}>Abort Job</Button>
            </div>
         </div>
      )}


      <ScanMessages
        isLoading={isLoading}
        error={error}
        scanCompletionMessage={scanCompletionMessage}
        alreadyScannedMessage={alreadyScannedMessage}
        manualAddMessage={manualAddMessage}
      />
    </div>
  );
};

export default React.memo(ScanPage);
