
import React, { useState, useCallback } from 'react';
import { User, TrackScanLog, SnippetScanResult, AcrCloudMatch } from '../types';
import FileUpload from './FileUpload';
import { acrCloudService } from '../services/acrCloudService';
import { scanLogService } from '../services/scanLogService';
import { generateSnippetsForFile } from '../utils/audioProcessing';
import ProgressBar from './common/ProgressBar';
import Button from './common/Button'; // Added Button import

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
  const [manualSpotifyLink, setManualSpotifyLink] = useState<string>('');
  const [isAddingManualLink, setIsAddingManualLink] = useState<boolean>(false);
  const [manualAddMessage, setManualAddMessage] = useState<string | null>(null);


  const handleScan = useCallback(async (originalFiles: File[], numberOfSegments: number) => {
    setIsLoading(true);
    setError(null);
    setScanCompletionMessage(null);
    setAlreadyScannedMessage(null);
    setScanProgressMessage('Preparing tracks...');

    if (originalFiles.length === 0) {
      setScanCompletionMessage("No tracks selected for scanning.");
      setIsLoading(false);
      return;
    }

    const filesToActuallyScan: File[] = [];
    const alreadyScannedFileNames: string[] = [];

    originalFiles.forEach(originalFile => {
      const isDuplicate = previousScans.some(log => log.originalFileName === originalFile.name);
      if (isDuplicate) {
        alreadyScannedFileNames.push(originalFile.name);
      } else {
        filesToActuallyScan.push(originalFile);
      }
    });

    if (alreadyScannedFileNames.length > 0) {
      setAlreadyScannedMessage(
        `The following ${alreadyScannedFileNames.length} file(s) have already been scanned and are in your dashboard: ${alreadyScannedFileNames.join(', ')}. They were not scanned again.`
      );
    }

    if (filesToActuallyScan.length === 0) {
      setIsLoading(false);
      setScanProgressMessage('');
      if (originalFiles.length > 0 && alreadyScannedFileNames.length === originalFiles.length) {
        setScanCompletionMessage("All selected tracks have already been scanned.");
      } else if (originalFiles.length > 0) {
         setScanCompletionMessage("No new tracks to scan among the selection.");
      } else {
         setScanCompletionMessage("No tracks selected for scanning.");
      }
      return;
    }

    const successfullySavedLogs: TrackScanLog[] = [];
    let processingErrorOccurred = false;
    let tracksProcessedCount = 0;

    for (let i = 0; i < filesToActuallyScan.length; i++) {
      const originalFile = filesToActuallyScan[i];
      tracksProcessedCount++;
      setScanProgressMessage(`Processing track ${i + 1}/${filesToActuallyScan.length}: "${originalFile.name}"...`);

      let trackMatches: AcrCloudMatch[] = [];
      let trackStatus: TrackScanLog['status'] = 'no_matches_found';
      let snippetsScannedCount = 0;
      let snippetErrors = 0;

      const snippets = await generateSnippetsForFile(originalFile, numberOfSegments);

      if (!snippets || snippets.length === 0) {
        trackStatus = 'error_processing';
        const newError = `Could not generate scannable segments for ${originalFile.name}.`;
        setError(prev => prev ? `${prev}\\n${newError}` : newError);
        processingErrorOccurred = true;
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
            const newError = `Error scanning segment of ${originalFile.name}: ${err.message}`;
            setError(prev => prev ? `${prev}\\n${newError}` : newError);
            snippetErrors++;
            processingErrorOccurred = true;
          }
        }

        if (snippetsScannedCount === 0 && snippetErrors > 0) {
            trackStatus = 'error_processing';
        } else if (trackMatches.length > 0) {
            const uniqueMatchesMap = new Map<string, AcrCloudMatch>();
            trackMatches.forEach(match => {
                if (!uniqueMatchesMap.has(match.id)) { uniqueMatchesMap.set(match.id, match); }
            });
            trackMatches = Array.from(uniqueMatchesMap.values());
            trackStatus = 'matches_found';
        } else {
             trackStatus = 'no_matches_found';
        }
        if (snippetErrors > 0 && snippetsScannedCount > 0 && trackStatus !== 'error_processing') {
            trackStatus = 'partially_completed';
        }
      }

      const logDataToSave: Omit<TrackScanLog, 'logId' | 'scanDate'> = {
        originalFileName: originalFile.name,
        originalFileSize: originalFile.size,
        matches: trackMatches,
        status: trackStatus,
      };

      try {
        setScanProgressMessage(`Saving results for "${originalFile.name}"...`);
        const savedLog = await scanLogService.saveScanLog(logDataToSave);
        successfullySavedLogs.push(savedLog);
      } catch (saveError: any) {
        console.error(`Failed to save scan log for ${originalFile.name}:`, saveError);
        const isAuthError = (saveError.status === 401 || saveError.status === 403) ||
                            (typeof saveError.message === 'string' && saveError.message.toLowerCase().includes('token is not valid'));
        if (isAuthError) {
          console.warn("Authentication error while saving scan log. Logging out.", saveError.message);
          onLogout();
          setIsLoading(false);
          return;
        }
        const newError = `Failed to save results for ${originalFile.name}: ${saveError.message}`;
        setError(prev => prev ? `${prev}\\n${newError}` : newError);
        processingErrorOccurred = true;
      }
    }

    if (successfullySavedLogs.length > 0) {
      onNewScanLogsSaved(successfullySavedLogs);
    }

    let finalCompletionMsg = "";
    if (tracksProcessedCount > 0) {
        finalCompletionMsg += `${tracksProcessedCount} new track(s) processed. `;
        const foundMatchesCount = successfullySavedLogs.filter(log => log.status === 'matches_found' && log.matches.length > 0).length;
        if (foundMatchesCount > 0) {
            finalCompletionMsg += `${foundMatchesCount} had new matches saved. `;
        } else if (successfullySavedLogs.length > 0) {
            finalCompletionMsg += `No new matches found in the processed tracks. `;
        }
    } else if (alreadyScannedFileNames.length === originalFiles.length && originalFiles.length > 0) {
        // This state is handled before the loop now.
    } else {
        finalCompletionMsg = "No new tracks were processed.";
    }
    setScanCompletionMessage(finalCompletionMsg.trim() || null);

    setIsLoading(false);
    setScanProgressMessage('');
  }, [onNewScanLogsSaved, user, previousScans, onLogout]);

  const handleManualAddSpotifyLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manualSpotifyLink.trim()) {
        setManualAddMessage("Please enter a Spotify track link.");
        return;
    }
    setIsAddingManualLink(true);
    setManualAddMessage(null);
    setError(null); // Clear general errors

    try {
        const newLog = await scanLogService.addSpotifyTrackToLog(manualSpotifyLink);
        onNewScanLogsSaved([newLog]);
        setManualAddMessage(`Successfully added "${newLog.matches[0]?.title || 'Track'}" to your scan log.`);
        setManualSpotifyLink('');
    } catch (err: any) {
        console.error("Error manually adding Spotify link:", err);
        setManualAddMessage(`Error: ${err.message || "Could not add Spotify track."}`);
         const isAuthError = (err.status === 401 || err.status === 403) ||
                            (typeof err.message === 'string' && err.message.toLowerCase().includes('token is not valid'));
        if (isAuthError) {
          onLogout();
        }
    } finally {
        setIsAddingManualLink(false);
    }
  };

  return (
    <div className="space-y-3">
      <section>
        <FileUpload onScan={handleScan} isLoading={isLoading} />
      </section>

      <section className="p-0.5 win95-border-outset bg-[#C0C0C0]">
        <div className="p-3 bg-[#C0C0C0]">
            <h3 className="text-lg font-normal text-black mb-2">Manually Add Spotify Track</h3>
            <form onSubmit={handleManualAddSpotifyLink} className="space-y-2">
                <div>
                    <label htmlFor="spotifyLink" className="block text-sm text-black mb-0.5">Spotify Track Link:</label>
                    <input
                        id="spotifyLink"
                        type="url"
                        value={manualSpotifyLink}
                        onChange={(e) => setManualSpotifyLink(e.target.value)}
                        placeholder="https://open.spotify.com/track/..."
                        className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                        disabled={isAddingManualLink}
                        aria-label="Spotify Track Link"
                    />
                </div>
                <Button type="submit" size="md" isLoading={isAddingManualLink} disabled={isAddingManualLink || !manualSpotifyLink.trim()}>
                    {isAddingManualLink ? 'Adding...' : 'Add to Scan Log'}
                </Button>
            </form>
            {manualAddMessage && (
                <div className={`mt-2 p-1.5 text-xs border ${manualAddMessage.startsWith("Error:") ? "bg-red-100 border-red-700 text-red-700" : "bg-green-100 border-green-700 text-green-700"}`}>
                    {manualAddMessage}
                </div>
            )}
        </div>
      </section>


      {isLoading && (
        <div className="p-3 win95-border-outset bg-[#C0C0C0]">
          <ProgressBar text={scanProgressMessage || 'Scanning...'} className="mb-1" />
          <p className="text-xs text-gray-700 text-center">Please wait.</p>
        </div>
      )}

      {!isLoading && (error || scanCompletionMessage || alreadyScannedMessage) && (
        <div className="p-0.5 win95-border-outset bg-[#C0C0C0]">
            <div className="p-2 bg-[#C0C0C0] space-y-1.5">
            {scanCompletionMessage && (
                <div className="p-2 bg-green-200 text-black border border-black">
                <p className="font-semibold">Scan Status:</p>
                <p>{scanCompletionMessage}</p>
                </div>
            )}
            {alreadyScannedMessage && (
                <div className="p-2 bg-blue-200 text-black border border-black">
                <p className="font-semibold">Already Scanned:</p>
                <p>{alreadyScannedMessage}</p>
                </div>
            )}
            {error && (
                <div className="p-2 bg-yellow-200 text-black border border-black">
                <p className="font-semibold">Notifications/Errors:</p>
                <p style={{whiteSpace: 'pre-line'}}>{error}</p>
                </div>
            )}
            </div>
        </div>
      )}

      {!isLoading && !isAddingManualLink && !error && !scanCompletionMessage && !alreadyScannedMessage && !manualAddMessage && (
         <div className="p-4 win95-border-outset bg-[#C0C0C0] text-center">
            <span className="text-4xl text-gray-500" aria-hidden="true">♫</span>
            <h2 className="text-lg font-normal text-black mt-1">Ready to Scan?</h2>
            <p className="text-gray-700 mt-0.5 text-sm">Upload instrumentals or add a Spotify link above to begin.</p>
         </div>
      )}
    </div>
  );
};

export default ScanPage;
