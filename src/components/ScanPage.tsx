
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

  const handleAuthError = useCallback((error: any) => {
    const isAuthError = (error.status === 401 || error.status === 403) ||
                        (typeof error.message === 'string' && error.message.toLowerCase().includes('token is not valid'));
    if (isAuthError) {
      console.warn("Authentication error detected. Logging out.", error.message);
      onLogout();
      setError("Your session has expired. Please log in again.");
      setIsLoading(false); // Stop loading on auth error
      return true;
    }
    return false;
  }, [onLogout]);

  const handleFileScan = useCallback(async (originalFiles: File[], numberOfSegments: number) => {
    setIsLoading(true);
    setError(null);
    setScanCompletionMessage(null);
    setAlreadyScannedMessage(null);
    setManualAddMessage(null);
    setScanProgressMessage('Preparing tracks for file upload scan...');

    if (originalFiles.length === 0) {
      setScanCompletionMessage("No tracks selected for file scanning.");
      setIsLoading(false);
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
      setIsLoading(false);
      setScanProgressMessage('');
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

      const logDataToSave: Omit<TrackScanLog, 'logId' | 'scanDate'> = {
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
    setIsLoading(false);
    setScanProgressMessage('');
  }, [onNewScanLogsSaved, previousScans, handleAuthError]);


  const handleProcessYouTubeUrl = useCallback(async (url: string, type: YouTubeUploadType) => {
    setIsLoading(true);
    setError(null);
    setScanCompletionMessage(null);
    setAlreadyScannedMessage(null);
    setManualAddMessage(null);
    setScanProgressMessage(`Processing YouTube URL (${type.replace(/_/g, ' ')})...`);

    try {
      const results = await scanLogService.processYouTubeUrl(url, type);
      const newLogs = Array.isArray(results) ? results : [results];
      if (newLogs.length > 0) {
        onNewScanLogsSaved(newLogs);
        setScanCompletionMessage(`Successfully processed YouTube URL. ${newLogs.length} log(s) updated/created.`);
      } else {
        setScanCompletionMessage(`YouTube URL processed, but no new logs were created (it might have been empty or no instrumentals found).`);
      }
    } catch (err: any) {
      console.error("Error processing YouTube URL:", err);
      if(handleAuthError(err)) return;
      setError(`Error processing YouTube URL: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setScanProgressMessage('');
    }
  }, [onNewScanLogsSaved, handleAuthError]);

  const handleProcessSpotifyPlaylistUrl = useCallback(async (url: string) => {
    setIsLoading(true);
    setError(null);
    setScanCompletionMessage(null);
    setAlreadyScannedMessage(null);
    setManualAddMessage(null);
    setScanProgressMessage('Processing Spotify Playlist URL...');
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
      setIsLoading(false);
      setScanProgressMessage('');
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

    try {
        const newLog = await scanLogService.addSpotifyTrackToLog(link);
        onNewScanLogsSaved([newLog]);
        setManualAddMessage(`Successfully added "${newLog.matches[0]?.title || 'Track'}" to your scan log.`);
        setIsLoading(false); setScanProgressMessage('');
        return true;
    } catch (err: any) {
        console.error("Error manually adding Spotify link:", err);
        if(handleAuthError(err)) { setIsLoading(false); setScanProgressMessage(''); return false; }
        setManualAddMessage(`Error: ${err.message || "Could not add Spotify track."}`);
        setIsLoading(false); setScanProgressMessage('');
        return false;
    }
  }, [onNewScanLogsSaved, handleAuthError]);


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
