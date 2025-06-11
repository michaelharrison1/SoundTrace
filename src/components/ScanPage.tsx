
import React, { useState, useCallback } from 'react';
import { User, TrackScanLog, SnippetScanResult, AcrCloudMatch, YouTubeUploadType } from '../types';
import FileUpload from './FileUpload';
import UrlInputForms from './scanPage/UrlInputForms';
import { acrCloudService } from '../services/acrCloudService';
import { scanLogService } from '../services/scanLogService';
import { generateSnippetsForFile } from '../utils/audioProcessing';
import ProgressBar from './common/ProgressBar';
import ManualSpotifyAddForm from './scanPage/ManualSpotifyAddForm';
import ScanMessages from './scanPage/ScanMessages';
import Button from './common/Button'; // Added for Abort button

interface ScanPageProps {
  user: User;
  previousScans: TrackScanLog[];
  onNewScanLogsSaved: (newLogs: TrackScanLog[]) => void;
  onLogout: () => void;
}

const ScanPage: React.FC<ScanPageProps> = ({ user, previousScans, onNewScanLogsSaved, onLogout }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [scanProgressMessage, setScanProgressMessage] = useState<string>('');
  const [scanCompletionMessage, setScanCompletionMessage] = useState<string | null>(null);
  const [alreadyScannedMessage, setAlreadyScannedMessage] = useState<string | null>(null);
  const [manualAddMessage, setManualAddMessage] = useState<string | null>(null);

  const [currentScanJobId, setCurrentScanJobId] = useState<string | null>(null);
  const [isAborting, setIsAborting] = useState<boolean>(false);
  const [activeScanTypeForAbort, setActiveScanTypeForAbort] = useState<YouTubeUploadType | null>(null);


  const handleAuthError = useCallback((error: any) => {
    const isAuthError = (error.status === 401 || error.status === 403) ||
                        (typeof error.message === 'string' && error.message.toLowerCase().includes('token is not valid'));
    if (isAuthError) {
      console.warn("Authentication error detected. Logging out.", error.message);
      onLogout();
      setError("Your session has expired. Please log in again.");
      setIsLoading(false); // Stop loading on auth error
      setCurrentScanJobId(null);
      setIsAborting(false);
      setActiveScanTypeForAbort(null);
      return true;
    }
    return false;
  }, [onLogout]);

  const resetScanState = () => {
    setIsLoading(false);
    setScanProgressMessage('');
    setCurrentScanJobId(null);
    setIsAborting(false);
    setActiveScanTypeForAbort(null);
  };

  const handleFileScan = useCallback(async (originalFiles: File[], numberOfSegments: number) => {
    setIsLoading(true);
    setError(null);
    setScanCompletionMessage(null);
    setAlreadyScannedMessage(null);
    setManualAddMessage(null);
    setScanProgressMessage('Preparing tracks for file upload scan...');
    setCurrentScanJobId(null); // File scans don't support abort currently
    setActiveScanTypeForAbort(null);

    if (originalFiles.length === 0) {
      setScanCompletionMessage("No tracks selected for file scanning.");
      resetScanState();
      return;
    }

    const filesToActuallyScan: File[] = [];
    const alreadyScannedFileNames: string[] = [];

    originalFiles.forEach(originalFile => {
      const isDuplicate = previousScans.some(log => log.originalFileName === originalFile.name && log.platformSource === 'file_upload');
      if (isDuplicate) {
        alreadyScannedFileNames.push(originalFile.name);
      } else {
        filesToActuallyScan.push(originalFile);
      }
    });

    if (alreadyScannedFileNames.length > 0) {
      setAlreadyScannedMessage(
        `The following ${alreadyScannedFileNames.length} file(s) have already been scanned via direct upload: ${alreadyScannedFileNames.join(', ')}. They were not scanned again.`
      );
    }

    if (filesToActuallyScan.length === 0) {
      resetScanState();
      if (originalFiles.length > 0 && alreadyScannedFileNames.length === originalFiles.length) {
        setScanCompletionMessage("All selected files have already been scanned.");
      } else if (originalFiles.length > 0) {
         setScanCompletionMessage("No new files to scan among the selection.");
      }
      return;
    }

    const successfullySavedLogs: TrackScanLog[] = [];
    let tracksProcessedCount = 0;

    for (let i = 0; i < filesToActuallyScan.length; i++) {
      const originalFile = filesToActuallyScan[i];
      tracksProcessedCount++;
      setScanProgressMessage(`Processing file ${i + 1}/${filesToActuallyScan.length}: "${originalFile.name}"...`);

      let trackMatches: AcrCloudMatch[] = [];
      let trackStatus: TrackScanLog['status'] = 'no_matches_found';
      let snippetsScannedCount = 0;
      let snippetErrors = 0;

      const snippets = await generateSnippetsForFile(originalFile, numberOfSegments);

      if (!snippets || snippets.length === 0) {
        trackStatus = 'error_processing';
        setError(prev => `${prev ? prev + '\\n' : ''}Could not generate scannable segments for ${originalFile.name}.`);
      } else {
        for (let j = 0; j < snippets.length; j++) {
          const snippet = snippets[j];
          setScanProgressMessage(`Scanning segment ${j + 1}/${snippets.length} of "${originalFile.name}"...`);
          try {
            const snippetScanResult: SnippetScanResult = await acrCloudService.scanWithAcrCloud(snippet);
            if (snippetScanResult.matches && snippetScanResult.matches.length > 0) {
              trackMatches.push(...snippetScanResult.matches);
            }
            snippetsScannedCount++;
          } catch (err: any) {
            console.error(`Error scanning snippet ${snippet.name} for ${originalFile.name}:`, err);
            setError(prev => `${prev ? prev + '\\n' : ''}Error scanning segment of ${originalFile.name}: ${err.message}`);
            snippetErrors++;
          }
        }
        if (snippetsScannedCount === 0 && snippetErrors > 0) trackStatus = 'error_processing';
        else if (trackMatches.length > 0) {
            const uniqueMatchesMap = new Map<string, AcrCloudMatch>();
            trackMatches.forEach(match => { if (!uniqueMatchesMap.has(match.id)) uniqueMatchesMap.set(match.id, match); });
            trackMatches = Array.from(uniqueMatchesMap.values());
            trackStatus = 'matches_found';
        } else trackStatus = 'no_matches_found';
        if (snippetErrors > 0 && snippetsScannedCount > 0 && trackStatus !== 'error_processing') trackStatus = 'partially_completed';
      }

      const logDataToSave: Omit<TrackScanLog, 'logId' | 'scanDate' | 'scanJobId'> = {
        originalFileName: originalFile.name,
        originalFileSize: originalFile.size,
        matches: trackMatches,
        status: trackStatus,
        platformSource: 'file_upload',
        sourceUrl: `file://${originalFile.name}`
      };

      try {
        setScanProgressMessage(`Saving results for "${originalFile.name}"...`);
        const savedLog = await scanLogService.saveScanLog(logDataToSave);
        successfullySavedLogs.push(savedLog);
      } catch (saveError: any) {
        console.error(`Failed to save scan log for ${originalFile.name}:`, saveError);
        if(handleAuthError(saveError)) return;
        setError(prev => `${prev ? prev + '\\n' : ''}Failed to save results for ${originalFile.name}: ${saveError.message}`);
      }
    }
    if (successfullySavedLogs.length > 0) onNewScanLogsSaved(successfullySavedLogs);
    setScanCompletionMessage(`${tracksProcessedCount} file(s) processed. Check dashboard for results.`);
    resetScanState();
  }, [onNewScanLogsSaved, previousScans, handleAuthError]);


  const handleProcessYouTubeUrl = useCallback(async (url: string, type: YouTubeUploadType) => {
    setIsLoading(true);
    setError(null);
    setScanCompletionMessage(null);
    setAlreadyScannedMessage(null);
    setManualAddMessage(null);
    setScanProgressMessage(`Processing YouTube URL (${type.replace(/_/g, ' ')})...`);
    
    const newScanJobId = (type === 'instrumental_channel' || type === 'instrumental_playlist') 
      ? `ytjob-${Date.now()}-${Math.random().toString(36).substring(2,9)}` 
      : null;
    setCurrentScanJobId(newScanJobId);
    setActiveScanTypeForAbort(newScanJobId ? type : null);


    try {
      const results = await scanLogService.processYouTubeUrl(url, type, newScanJobId); // Pass scanJobId
      const newLogs = Array.isArray(results) ? results : [results];
      if (newLogs.length > 0) {
        onNewScanLogsSaved(newLogs);
        const isAborted = newLogs.some(log => log.status === 'aborted');
        if (isAborted) {
          setScanCompletionMessage(`YouTube URL processing was aborted. ${newLogs.filter(log => log.status !== 'aborted').length} log(s) updated/created before abort.`);
        } else {
          setScanCompletionMessage(`Successfully processed YouTube URL. ${newLogs.length} log(s) updated/created.`);
        }
      } else {
        setScanCompletionMessage(`YouTube URL processed, but no new logs were created (it might have been empty, no instrumentals found, or aborted early).`);
      }
    } catch (err: any) {
      console.error("Error processing YouTube URL:", err);
      if(handleAuthError(err)) return;
      if (err.message && err.message.toLowerCase().includes('client closed request')) {
        setError('The scan operation was aborted by the client or timed out.');
      } else {
        setError(`Error processing YouTube URL: ${err.message || 'Unknown error'}`);
      }
    } finally {
      resetScanState();
    }
  }, [onNewScanLogsSaved, handleAuthError]);

  const handleProcessSpotifyPlaylistUrl = useCallback(async (url: string) => {
    setIsLoading(true);
    setError(null);
    setScanCompletionMessage(null);
    setAlreadyScannedMessage(null);
    setManualAddMessage(null);
    setScanProgressMessage('Processing Spotify Playlist URL...');
    setCurrentScanJobId(null); // Playlist processing doesn't support abort yet
    setActiveScanTypeForAbort(null);
    try {
      const newLogs = await scanLogService.processSpotifyPlaylistUrl(url);
      if (newLogs.length > 0) {
        onNewScanLogsSaved(newLogs);
        setScanCompletionMessage(`Successfully processed Spotify Playlist. ${newLogs.length} tracks added to log.`);
      } else {
        setScanCompletionMessage("Spotify Playlist processed, but no tracks were added (playlist might be empty or already processed).");
      }
    } catch (err: any) {
      console.error("Error processing Spotify Playlist URL:", err);
      if(handleAuthError(err)) return;
      setError(`Error processing Spotify Playlist: ${err.message || 'Unknown error'}`);
    } finally {
      resetScanState();
    }
  }, [onNewScanLogsSaved, handleAuthError]);

  const handleManualAddSpotifyTrack = useCallback(async (link: string) => {
    if (!link.trim()) {
        setManualAddMessage("Please enter a Spotify track link.");
        return false;
    }
    setIsLoading(true);
    setError(null); setScanCompletionMessage(null); setAlreadyScannedMessage(null); setManualAddMessage(null);
    setScanProgressMessage('Adding Spotify track to log...');
    setCurrentScanJobId(null);
    setActiveScanTypeForAbort(null);

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
  }, [onNewScanLogsSaved, handleAuthError]);

  const handleAbortScan = useCallback(async () => {
    if (!currentScanJobId) return;
    setIsAborting(true);
    setScanProgressMessage('Requesting scan abortion...');
    try {
      await scanLogService.abortScanJob(currentScanJobId);
      // The backend will eventually stop. The frontend shows completion/aborted message
      // once the initial `handleProcessYouTubeUrl` promise resolves or rejects.
      // Here, we're just setting the state to reflect that abort was requested.
      setScanCompletionMessage('Scan abortion requested. The process will stop shortly.');
      // No need to call resetScanState here, it will be called by the original handler's finally block.
    } catch (abortError: any) {
      console.error('Failed to request scan abortion:', abortError);
      setError(prev => `${prev ? prev + '\\n' : ''}Failed to request scan abortion: ${abortError.message}`);
      // Still, allow the main process to finish or error out.
    } finally {
      // Do not reset isLoading here as the main scan operation might still be "finishing up"
      // by acknowledging the abort.
      // Resetting isAborting and currentScanJobId can happen, but the main loading state
      // should persist until the initial scan promise from handleProcessYouTubeUrl settles.
      setIsAborting(false); 
      // currentScanJobId will be reset in resetScanState() by the main handler
    }
  }, [currentScanJobId]);


  const showAbortButton = isLoading && currentScanJobId && (activeScanTypeForAbort === 'instrumental_channel' || activeScanTypeForAbort === 'instrumental_playlist');

  return (
    <div className="space-y-3">
      <FileUpload onScan={handleFileScan} isLoading={isLoading} />
      <UrlInputForms
        onProcessYouTubeUrl={handleProcessYouTubeUrl}
        onProcessSpotifyPlaylistUrl={handleProcessSpotifyPlaylistUrl}
        isLoading={isLoading}
      />
      <ManualSpotifyAddForm onAddTrack={handleManualAddSpotifyTrack} />

      {isLoading && (
        <div className="p-3 win95-border-outset bg-[#C0C0C0]">
          <ProgressBar text={scanProgressMessage || 'Processing...'} className="mb-1" />
          <p className="text-xs text-gray-700 text-center">Please wait. This may take a while for channels or large playlists.</p>
          {showAbortButton && !isAborting && (
            <Button
              onClick={handleAbortScan}
              variant="danger"
              size="sm"
              className="w-full mt-2 !bg-red-400 hover:!bg-red-500"
            >
              Abort YouTube Batch Scan
            </Button>
          )}
          {isAborting && <p className="text-xs text-yellow-600 text-center mt-1">Abortion request sent...</p>}
        </div>
      )}
      
      <ScanMessages
        isLoading={isLoading}
        error={error}
        scanCompletionMessage={scanCompletionMessage}
        alreadyScannedMessage={alreadyScannedMessage}
        manualAddMessage={manualAddMessage}
      />

      {!isLoading && !error && !scanCompletionMessage && !alreadyScannedMessage && !manualAddMessage && (
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
