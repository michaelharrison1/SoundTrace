
import React, { useState, useCallback } from 'react';
import { User, TrackScanLog, SnippetScanResult, AcrCloudMatch } from '../types';
import FileUpload from './FileUpload';
import { acrCloudService } from '../services/acrCloudService';
import { scanLogService } from '../services/scanLogService';
import { generateSnippetsForFile } from '../utils/audioProcessing';
import ProgressBar from './common/ProgressBar'; // Import ProgressBar

interface ScanPageProps {
  user: User;
  previousScans: TrackScanLog[]; // To check for existing original file names
  onNewScanLogsSaved: (newLogs: TrackScanLog[]) => void;
}

const ScanPage: React.FC<ScanPageProps> = ({ user, previousScans, onNewScanLogsSaved }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [scanProgressMessage, setScanProgressMessage] = useState<string>('');
  const [scanCompletionMessage, setScanCompletionMessage] = useState<string | null>(null);
  const [alreadyScannedMessage, setAlreadyScannedMessage] = useState<string | null>(null);


  const handleScan = useCallback(async (originalFiles: File[]) => {
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

      const snippets = await generateSnippetsForFile(originalFile);

      if (!snippets || snippets.length === 0) {
        trackStatus = 'error_processing';
        const newError = `Could not generate scannable segments for ${originalFile.name}.`;
        setError(prev => prev ? `${prev}\n${newError}` : newError);
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
            setError(prev => prev ? `${prev}\n${newError}` : newError);
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
        const newError = `Failed to save results for ${originalFile.name}: ${saveError.message}`;
        setError(prev => prev ? `${prev}\n${newError}` : newError);
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
  }, [onNewScanLogsSaved, user, previousScans]);

  return (
    <div className="space-y-3">
      <section>
        <FileUpload onScan={handleScan} isLoading={isLoading} />
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

      {!isLoading && !error && !scanCompletionMessage && !alreadyScannedMessage && (
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
