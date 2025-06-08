
import React, { useState, useCallback } from 'react';
import { User, TrackScanLog, SnippetScanResult, AcrCloudMatch } from '../types';
import FileUpload from './FileUpload';
import { acrCloudService } from '../services/acrCloudService';
import { scanLogService } from '../services/scanLogService'; // Added
import { generateSnippetsForFile } from '../utils/audioProcessing';

interface ScanPageProps {
  user: User;
  onNewScanLogsSaved: (newLogs: TrackScanLog[]) => void; // Callback to update MainAppLayout state
}

const ScanPage: React.FC<ScanPageProps> = ({ user, onNewScanLogsSaved }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [scanProgressMessage, setScanProgressMessage] = useState<string>('');
  const [scanCompletionMessage, setScanCompletionMessage] = useState<string | null>(null);
  const [skippedFilesMessage, setSkippedFilesMessage] = useState<string | null>(null);

  // Note: Duplicate checking based on `previousScans` from MainAppLayout might be complex
  // if `previousScans` is large or fetched asynchronously.
  // For now, the backend should ideally handle duplicate original file checks if needed,
  // or this check could be removed/simplified from the frontend if causing issues with async data.
  // For this iteration, we'll keep it simple and assume `previousScans` is not needed for dup check here
  // as the backend persistence is the source of truth.

  const handleScan = useCallback(async (originalFiles: File[]) => {
    setIsLoading(true);
    setError(null);
    setScanCompletionMessage(null);
    setSkippedFilesMessage(null);
    setScanProgressMessage('');

    if (originalFiles.length === 0) {
      setScanCompletionMessage("No tracks selected for scanning.");
      setIsLoading(false);
      return;
    }

    const successfullySavedLogs: TrackScanLog[] = [];
    let processingErrorOccurred = false;
    let tracksProcessedCount = 0;

    for (let i = 0; i < originalFiles.length; i++) {
      const originalFile = originalFiles[i];
      tracksProcessedCount++;
      setScanProgressMessage(`Processing track ${i + 1}/${originalFiles.length}: "${originalFile.name}"...`);

      let trackMatches: AcrCloudMatch[] = [];
      let trackStatus: TrackScanLog['status'] = 'no_matches_found';
      let snippetsScannedCount = 0;
      let snippetErrors = 0;

      const snippets = await generateSnippetsForFile(originalFile);

      if (!snippets || snippets.length === 0) {
        trackStatus = 'error_processing';
        setError(prev => {
            const newError = `Could not generate scannable segments for ${originalFile.name}.`;
            return prev ? `${prev}\n${newError}` : newError;
        });
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
            setError(prev => {
                const newError = `Error scanning segment of ${originalFile.name}: ${err.message}`;
                return prev ? `${prev}\n${newError}` : newError;
            });
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

      // Data for the new log, logId will be assigned by backend
      const logDataToSave: Omit<TrackScanLog, 'logId' | 'scanDate'> = {
        originalFileName: originalFile.name,
        originalFileSize: originalFile.size,
        // scanDate will be set by backend or here before save if needed, but backend is better
        matches: trackMatches,
        status: trackStatus,
      };

      try {
        setScanProgressMessage(`Saving results for "${originalFile.name}"...`);
        // The backend should set its own scanDate and generate a logId (_id)
        const savedLog = await scanLogService.saveScanLog(logDataToSave);
        successfullySavedLogs.push(savedLog);
      } catch (saveError: any) {
        console.error(`Failed to save scan log for ${originalFile.name}:`, saveError);
        setError(prev => {
            const newError = `Failed to save results for ${originalFile.name}: ${saveError.message}`;
            return prev ? `${prev}\n${newError}` : newError;
        });
        processingErrorOccurred = true;
      }
    }

    if (successfullySavedLogs.length > 0) {
      onNewScanLogsSaved(successfullySavedLogs); // Update parent state
    }

    let finalCompletionMsg = "";
    if (tracksProcessedCount > 0) {
        finalCompletionMsg += `${tracksProcessedCount} track(s) processed. `;
        if (successfullySavedLogs.length > 0) {
             const foundMatchesCount = successfullySavedLogs.filter(log => log.status === 'matches_found' && log.matches.length > 0).length;
             if (foundMatchesCount > 0) {
                finalCompletionMsg += `${foundMatchesCount} had new matches saved. `;
             }
        }
    } else {
        finalCompletionMsg = "No tracks were selected or processed.";
    }
    setScanCompletionMessage(finalCompletionMsg.trim());

    // Skipped files message can be handled based on an initial check against backend if desired,
    // but that adds complexity here. For now, it's removed as duplicates are more robustly handled by backend.
    setSkippedFilesMessage(null);


    setIsLoading(false);
    setScanProgressMessage('');
  }, [onNewScanLogsSaved, user]); // user might be needed if duplicate check against backend was implemented here.

  return (
    <div className="space-y-3">
      <section>
        <FileUpload onScan={handleScan} isLoading={isLoading} />
      </section>

      {isLoading && (
        <div className="p-3 win95-border-outset bg-[#C0C0C0] text-center">
          <p className="mt-1 text-base text-black font-normal">
            {scanProgressMessage || 'Initializing Scan...'}
          </p>
          <p className="text-xs text-gray-700">Please wait.</p>
        </div>
      )}

      {!isLoading && (error || scanCompletionMessage || skippedFilesMessage) && (
        <div className="p-0.5 win95-border-outset bg-[#C0C0C0]">
            <div className="p-2 bg-[#C0C0C0] space-y-1.5">
            {scanCompletionMessage && (
                <div className="p-2 bg-green-200 text-black border border-black">
                <p className="font-semibold">Scan Status:</p>
                <p>{scanCompletionMessage}</p>
                </div>
            )}
            {/* skippedFilesMessage is currently not set, but kept for potential future use */}
            {skippedFilesMessage && (
                <div className="p-2 bg-blue-200 text-black border border-black">
                <p className="font-semibold">Skipped Tracks:</p>
                <p>{skippedFilesMessage}</p>
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

      {!isLoading && !error && !scanCompletionMessage && !skippedFilesMessage && (
         <div className="p-4 win95-border-outset bg-[#C0C0C0] text-center">
            <span className="text-4xl text-gray-500" aria-hidden="true">♫</span>
            <h2 className="text-lg font-normal text-black mt-1">Ready to Scan?</h2>
            <p className="text-gray-700 mt-0.5 text-sm">Upload instrumentals above to begin.</p>
         </div>
      )}
    </div>
  );
};

export default ScanPage;
