
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

  useEffect(() => {
    const checkActiveJob = async () => {
        try {
            const response: ActiveScanJobResponse = await scanLogService.getActiveScanJob();
            if (response.activeJob) {
                setCurrentScanJob(response.activeJob);
                setScanProgressMessage(`Found active job: ${response.activeJob.originalInputUrl}. Status: ${response.activeJob.status}`);
                if (response.activeJob.status === 'processing_videos' || response.activeJob.status === 'fetching_videos') {
                    startJobStatusPolling(response.activeJob.jobId);
                } else if (response.activeJob.status === 'error_acr_credits') {
                    setError(`Scan paused due to ACR Cloud credit limits for job: ${response.activeJob.originalInputUrl}. Refill credits to resume.`);
                }
            }
        } catch (err: any) {
            if(handleAuthError(err)) return;
            console.error("Error checking for active scan job:", err);
        }
    };
    checkActiveJob();
    return () => {
      if (jobStatusPollIntervalRef.current) clearInterval(jobStatusPollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [handleAuthError, resetScanState]);

  const updateFileScanProgress = useCallback((processedCount: number, totalCount: number, fileName: string) => {
    const progress = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;
    setScanProgressMessage(`Scanning: ${fileName} (${progress}%) - File ${processedCount}/${totalCount}`);

    if (processedCount > 0 && totalCount > 0 && scanStartTimeRef.current) {
        const elapsedTime = (Date.now() - scanStartTimeRef.current) / 1000;
        const timePerFile = elapsedTime / processedCount;
        const remainingFiles = totalCount - processedCount;
        const remainingTime = Math.max(0, Math.round(remainingFiles * timePerFile));
        setEstimatedTimeRemaining(formatTime(remainingTime));
    } else {
        setEstimatedTimeRemaining(null);
    }
  }, []);


  const startJobStatusPolling = useCallback((jobId: string) => {
    if (jobStatusPollIntervalRef.current) clearInterval(jobStatusPollIntervalRef.current);
    setIsPollingJobStatus(true);

    const poll = async () => {
        try {
            const jobState = await scanLogService.getScanJobStatus(jobId);
            setCurrentScanJob(jobState);
            const { status, totalVideosToScan, videosProcessed, videosWithMatches, videosFailed, lastErrorMessage, pendingVideoCount } = jobState;
            let progressMsg = `Job for "${jobState.originalInputUrl}": ${status}. `;
            if (status === 'fetching_videos') progressMsg += 'Fetching video list...';
            else if (status === 'processing_videos') {
                 progressMsg += `Processed ${videosProcessed}/${totalVideosToScan} videos. Matches: ${videosWithMatches}. Failed: ${videosFailed}. Pending: ${pendingVideoCount || 0}.`;
            } else if (status === 'error_acr_credits') {
                 progressMsg += `Paused due to ACR Cloud credits. ${lastErrorMessage || ''}`;
                 setError(`Scan paused due to ACR Cloud credit limits for job: ${jobState.originalInputUrl}. Refill credits to resume.`);
                 setIsLoading(false);
            } else if (status === 'completed' || status === 'aborted' || status === 'error_youtube_api' || status === 'error_partial') {
                 progressMsg += `${lastErrorMessage || (status === 'completed' ? 'All videos processed.' : 'Job finished.')}`;
                 setScanCompletionMessage(progressMsg);
                 fetchScanLogs();
                 resetScanState();
                 setCurrentScanJob(null);
                 return;
            }
            setScanProgressMessage(progressMsg);

            if (status === 'processing_videos' || status === 'fetching_videos') {
                 setIsLoading(true);
                 jobStatusPollIntervalRef.current = setTimeout(poll, 5000);
            } else {
                 setIsLoading(false);
                 if (jobStatusPollIntervalRef.current) clearInterval(jobStatusPollIntervalRef.current);
                 setIsPollingJobStatus(false);
            }
        } catch (err: any) {
            if(handleAuthError(err)) { resetScanState(); return; }
            console.error(`Error polling job status for ${jobId}:`, err);
            setError(`Error fetching job status: ${err.message}. Polling stopped.`);
            setIsLoading(false);
            if (jobStatusPollIntervalRef.current) clearInterval(jobStatusPollIntervalRef.current);
            setIsPollingJobStatus(false);
        }
    };
    poll();
  }, [handleAuthError, resetScanState, fetchScanLogs]);

  const handleFileScan = useCallback(async (originalFiles: File[], numberOfSegments: number) => {
    setCurrentScanJob(null);
    setIsLoading(true); setError(null); setScanCompletionMessage(null); setAlreadyScannedMessage(null); setManualAddMessage(null);
    setScanProgressMessage(`Preparing ${originalFiles.length} file(s) for scanning...`);
    scanStartTimeRef.current = Date.now();
    let filesProcessedSuccessfully = 0; const totalFilesToProcess = originalFiles.length;
    let totalSnippetsGenerated = 0; let totalSnippetsAttemptedToScan = 0; let totalSnippetsScannedSuccessfully = 0;
    let newScanLogs: TrackScanLog[] = []; let combinedErrorMessages = ""; let allFilesSkipped = true;

    for (let i = 0; i < originalFiles.length; i++) {
      const originalFile = originalFiles[i];
      updateFileScanProgress(i, totalFilesToProcess, originalFile.name);
      setScanProgressMessage(`Processing ${originalFile.name} (${i + 1}/${totalFilesToProcess})... generating snippets...`);
      const snippets = await generateSnippetsForFile(originalFile, numberOfSegments);
      if (!snippets || snippets.length === 0) {
        console.warn(`No snippets generated for ${originalFile.name}. Skipping.`);
        combinedErrorMessages += `Skipped ${originalFile.name}: Could not generate audio snippets.\n`;
        continue;
      }
      allFilesSkipped = false; totalSnippetsGenerated += snippets.length;
      const snippetMatches: AcrCloudMatch[] = []; let snippetErrors = 0;
      for (let j = 0; j < snippets.length; j++) {
        const snippetFile = snippets[j];
        setScanProgressMessage(`Scanning snippet ${j + 1}/${snippets.length} of ${originalFile.name}...`);
        totalSnippetsAttemptedToScan++;
        try {
          const snippetScanResult = await acrCloudService.scanWithAcrCloud(snippetFile);
          if (snippetScanResult && snippetScanResult.matches) {
            snippetScanResult.matches.forEach(match => { if (!snippetMatches.some(existing => existing.id === match.id)) snippetMatches.push(match); });
            totalSnippetsScannedSuccessfully++;
          }
        } catch (snippetErr: any) {
          console.error(`Error scanning snippet ${snippetFile.name}:`, snippetErr);
          combinedErrorMessages += `Error scanning ${snippetFile.name}: ${snippetErr.message}\n`;
          snippetErrors++;
        }
      }
      let logStatus: TrackScanLog['status'] = 'no_matches_found';
      if (snippetMatches.length > 0) logStatus = 'matches_found';
      if (snippetErrors > 0 && snippetMatches.length > 0) logStatus = 'partially_completed';
      else if (snippetErrors === snippets.length && snippets.length > 0) logStatus = 'error_processing';

      const newLog: Omit<TrackScanLog, 'logId' | 'scanDate' | 'scanJobId'> = {
        originalFileName: originalFile.name, originalFileSize: originalFile.size,
        matches: snippetMatches, status: logStatus, platformSource: 'file_upload',
        acrResponseDetails: snippetErrors > 0 ? `Some snippets failed during scan.` : `Scanned ${snippets.length} snippet(s).`
      };
      try {
        const savedLog = await scanLogService.saveScanLog(newLog); newScanLogs.push(savedLog);
        filesProcessedSuccessfully++;
      } catch (dbErr: any) {
        console.error("Error saving scan log to DB:", dbErr); if(handleAuthError(dbErr)) return;
        combinedErrorMessages += `Failed to save scan result for ${originalFile.name}: ${dbErr.message}\n`;
      }
    }
    onNewScanLogsSaved(newScanLogs);
    let finalMessage = `${filesProcessedSuccessfully}/${totalFilesToProcess} files processed. `;
    finalMessage += `${totalSnippetsScannedSuccessfully}/${totalSnippetsAttemptedToScan} snippets scanned successfully from ${totalSnippetsGenerated} generated. `;
    if (newScanLogs.length > 0) finalMessage += `${newScanLogs.reduce((sum, log) => sum + log.matches.length, 0)} total unique matches found. `;
    if (combinedErrorMessages) finalMessage += `\nErrors/Skipped:\n${combinedErrorMessages.trim()}`;
    if (allFilesSkipped && originalFiles.length > 0) finalMessage = "All files were skipped or failed snippet generation.";
    setScanCompletionMessage(finalMessage.trim());
    resetScanState();
  }, [user.id, onNewScanLogsSaved, handleAuthError, updateFileScanProgress, resetScanState]);

  const handleProcessYouTubeUrl = useCallback(async (url: string, processType: YouTubeUploadType) => {
    setCurrentScanJob(null); setIsLoading(true); setError(null); setScanCompletionMessage(null); setAlreadyScannedMessage(null); setManualAddMessage(null);
    setScanProgressMessage('Initiating YouTube URL processing...');
    scanStartTimeRef.current = Date.now();
    try {
      const response = await scanLogService.processYouTubeUrl(url, processType);
      if ('scanJobId' in response && (processType === 'youtube_channel_instrumental_batch' || processType === 'youtube_playlist_instrumental_batch')) {
        const batchResponse = response as InitiateBatchScanResponse;
        setCurrentScanJob({
            jobId: batchResponse.scanJobId, status: batchResponse.initialJobStatus, jobType: processType, originalInputUrl: url,
            totalVideosToScan: batchResponse.totalVideosToScan, videosProcessed: 0, videosWithMatches: 0, videosFailed: 0,
        });
        setScanProgressMessage(`Batch scan job ${batchResponse.scanJobId} started. Status: ${batchResponse.initialJobStatus}.`);
        startJobStatusPolling(batchResponse.scanJobId);
      } else {
        const newLog = response as TrackScanLog;
        onNewScanLogsSaved([newLog]);
        setScanCompletionMessage(`Successfully processed YouTube URL. Log created/updated.`);
        resetScanState();
      }
    } catch (err: any) {
      console.error("Error processing YouTube URL:", err);
      if(handleAuthError(err)) return;
      setError(`Error processing YouTube URL: ${err.message || 'Unknown error'}`);
      resetScanState();
    }
  }, [onNewScanLogsSaved, handleAuthError, startJobStatusPolling, resetScanState]);

  const handleProcessSpotifyPlaylistUrl = useCallback(async (url: string) => {
    setCurrentScanJob(null);
    setIsLoading(true); setError(null); setScanCompletionMessage(null); setAlreadyScannedMessage(null); setManualAddMessage(null);
    setScanProgressMessage('Processing Spotify playlist URL...');
    scanStartTimeRef.current = Date.now();
    try {
        const newLogs = await scanLogService.processSpotifyPlaylistUrl(url);
        onNewScanLogsSaved(newLogs);
        setScanCompletionMessage(`Successfully processed Spotify playlist. ${newLogs.length} tracks added/updated.`);
    } catch (err: any) {
        console.error("Error processing Spotify playlist URL:", err);
        if(handleAuthError(err)) return;
        setError(`Error: ${err.message || "Could not process Spotify playlist."}`);
    } finally {
        resetScanState();
    }
  }, [onNewScanLogsSaved, handleAuthError, resetScanState]);

  const handleManualAddSpotifyTrack = useCallback(async (link: string): Promise<boolean> => {
    setCurrentScanJob(null);
    setIsLoading(true); setError(null); setScanCompletionMessage(null); setAlreadyScannedMessage(null); setManualAddMessage(null);
    setScanProgressMessage('Manually adding Spotify track...');
    scanStartTimeRef.current = Date.now();
    try {
        const newLog = await scanLogService.addSpotifyTrackToLog(link);
        onNewScanLogsSaved([newLog]);
        setManualAddMessage(`Successfully added "${newLog.matches[0]?.title || 'Track'}" to your scan log.`);
        resetScanState();
        return true;
    } catch (err: any) {
        console.error("Error manually adding Spotify link:", err);
        if(handleAuthError(err)) { resetScanState(); return false; }
        setManualAddMessage(`Error: ${err.message || "Could not add Spotify track."}`);
        resetScanState();
        return false;
    }
  }, [onNewScanLogsSaved, handleAuthError, resetScanState]);

  const handlePauseJob = useCallback(async () => {
    if (!currentScanJob?.jobId) return;
    setIsLoading(true);
    setScanProgressMessage('Pausing scan job...');
    try {
      await scanLogService.pauseScanJob(currentScanJob.jobId);
      setCurrentScanJob(prev => prev ? { ...prev, status: 'paused' } : null);
      setScanProgressMessage(`Job ${currentScanJob.jobId} paused.`);
      if (jobStatusPollIntervalRef.current) clearInterval(jobStatusPollIntervalRef.current);
      setIsPollingJobStatus(false);
    } catch (err: any) {
      if(handleAuthError(err)) return;
      setError(`Failed to pause job: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentScanJob, handleAuthError]);

  const handleResumeJob = useCallback(async () => {
    if (!currentScanJob?.jobId) return;
    setIsLoading(true);
    setError(null);
    setScanProgressMessage('Resuming scan job...');
    try {
      await scanLogService.resumeScanJob(currentScanJob.jobId);
      setCurrentScanJob(prev => prev ? { ...prev, status: 'processing_videos' } : null);
      setScanProgressMessage(`Job ${currentScanJob.jobId} resuming...`);
      startJobStatusPolling(currentScanJob.jobId);
    } catch (err: any) {
      if(handleAuthError(err)) return;
      setError(`Failed to resume job: ${err.message}`);
      setIsLoading(false);
    }
  }, [currentScanJob, handleAuthError, startJobStatusPolling]);

  const handleAbortScan = useCallback(async () => {
    if (!currentScanJob?.jobId) return;
    setIsLoading(true);
    setScanProgressMessage('Aborting scan job...');
    try {
      await scanLogService.abortScanJob(currentScanJob.jobId);
      setCurrentScanJob(prev => prev ? { ...prev, status: 'aborted' } : null);
      setScanCompletionMessage(`Job ${currentScanJob.jobId} abortion requested. It will stop shortly.`);
      fetchScanLogs();
      if (jobStatusPollIntervalRef.current) clearInterval(jobStatusPollIntervalRef.current);
      setIsPollingJobStatus(false);
    } catch (abortError: any) {
      if(handleAuthError(abortError)) return;
      setError(`Failed to abort job: ${abortError.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentScanJob, handleAuthError, fetchScanLogs]);

  const canPause = currentScanJob && (currentScanJob.status === 'processing_videos' || currentScanJob.status === 'fetching_videos');
  const canResume = currentScanJob && (currentScanJob.status === 'paused' || currentScanJob.status === 'error_acr_credits');
  const canAbort = currentScanJob && !['completed', 'aborted', 'error_youtube_api'].includes(currentScanJob.status);

  return (
    <div className="space-y-3">
      <FileUpload onScan={handleFileScan} isLoading={isLoading || isPollingJobStatus} />
      <UrlInputForms
        onProcessYouTubeUrl={handleProcessYouTubeUrl}
        onProcessSpotifyPlaylistUrl={handleProcessSpotifyPlaylistUrl}
        isLoading={isLoading || isPollingJobStatus}
      />
      <ManualSpotifyAddForm onAddTrack={handleManualAddSpotifyTrack} />

      {(isLoading || isPollingJobStatus || currentScanJob) && (
        <div className="p-3 win95-border-outset bg-[#C0C0C0]">
          <ProgressBar text={scanProgressMessage || 'Processing...'} className="mb-1" />
          {isLoading && estimatedTimeRemaining && <p className="text-xs text-gray-700 text-center mt-1">Est. time remaining (file scan): {estimatedTimeRemaining}</p>}
          {isLoading && !estimatedTimeRemaining && (!currentScanJob || (currentScanJob.jobType !== 'youtube_channel_instrumental_batch' && currentScanJob.jobType !== 'youtube_playlist_instrumental_batch')) &&
            <p className="text-xs text-gray-700 text-center mt-1">This may take up to a minute.</p>
          }

          <div className="flex space-x-2 mt-2 justify-center">
            {canPause && (
              <Button onClick={handlePauseJob} variant="secondary" size="sm" disabled={isLoading && !isPollingJobStatus }>Pause Batch Scan</Button>
            )}
            {canResume && (
              <Button onClick={handleResumeJob} variant="primary" size="sm" disabled={isLoading && !isPollingJobStatus}>Resume Batch Scan</Button>
            )}
            {canAbort && (
              <Button onClick={handleAbortScan} variant="danger" size="sm" disabled={isLoading && !isPollingJobStatus}>Abort Batch Scan</Button>
            )}
          </div>
        </div>
      )}

      <ScanMessages
        isLoading={isLoading || isPollingJobStatus}
        error={error}
        scanCompletionMessage={scanCompletionMessage}
        alreadyScannedMessage={alreadyScannedMessage}
        manualAddMessage={manualAddMessage}
      />

      {!isLoading && !isPollingJobStatus && !error && !scanCompletionMessage && !alreadyScannedMessage && !manualAddMessage && !currentScanJob && (
         <div className="p-4 win95-border-outset bg-[#C0C0C0] text-center">
            <span className="text-4xl text-gray-500" aria-hidden="true">♫</span>
            <h2 className="text-lg font-normal text-black mt-1">Ready to Scan?</h2>
            <p className="text-gray-700 mt-0.5 text-sm">Upload instrumentals or add a YouTube/Spotify link above to begin.</p>
         </div>
      )}
    </div>
  );
};

export default React.memo(ScanPage);