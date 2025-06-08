
import React, { useState, useCallback } from 'react';
import { User, TrackScanLog, SnippetScanResult, AcrCloudMatch } from '../types';
import FileUpload from './FileUpload';
import { acrCloudService } from '../services/acrCloudService';
import { generateSnippetsForFile, MAX_SNIPPETS_PER_FILE } from '../utils/audioProcessing';

interface ScanPageProps {
  user: User;
  previousScans: TrackScanLog[]; // Now expects TrackScanLog[]
  setPreviousScans: React.Dispatch<React.SetStateAction<TrackScanLog[]>>;
}

const ScanPage: React.FC<ScanPageProps> = ({ user, previousScans, setPreviousScans }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [scanProgressMessage, setScanProgressMessage] = useState<string>('');
  const [scanCompletionMessage, setScanCompletionMessage] = useState<string | null>(null);
  const [skippedFilesMessage, setSkippedFilesMessage] = useState<string | null>(null);

  const isOriginalFileDuplicate = (originalFile: File, logs: TrackScanLog[]): boolean => {
    return logs.some(log => log.originalFileName === originalFile.name && log.originalFileSize === originalFile.size);
  };

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

    const newTrackLogs: TrackScanLog[] = [];
    const skippedOriginalFiles: string[] = [];
    let totalProcessedTracks = 0;
    let totalErrors = 0;

    for (let i = 0; i < originalFiles.length; i++) {
      const originalFile = originalFiles[i];
      setScanProgressMessage(`Processing track ${i + 1}/${originalFiles.length}: "${originalFile.name}"...`);

      if (isOriginalFileDuplicate(originalFile, previousScans)) {
        skippedOriginalFiles.push(originalFile.name);
        continue;
      }

      let trackMatches: AcrCloudMatch[] = [];
      let trackStatus: TrackScanLog['status'] = 'no_matches_found';
      let snippetsScannedCount = 0;
      let snippetErrors = 0;

      const snippets = await generateSnippetsForFile(originalFile);

      if (!snippets || snippets.length === 0) {
        trackStatus = 'error_processing';
        setError(prev => prev ? `${prev}\nCould not generate scannable segments for ${originalFile.name}.` : `Could not generate scannable segments for ${originalFile.name}.`);
        totalErrors++;
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
            setError(prev => prev ? `${prev}\nError scanning segment of ${originalFile.name}: ${err.message}` : `Error scanning segment of ${originalFile.name}: ${err.message}`);
            snippetErrors++;
            // Continue to scan other snippets of the same track
          }
        }

        if (snippetsScannedCount === 0 && snippetErrors > 0) { // All snippets failed to scan
            trackStatus = 'error_processing';
            totalErrors++;
        } else if (trackMatches.length > 0) {
            // Deduplicate matches based on AcrCloudMatch.id
            const uniqueMatchesMap = new Map<string, AcrCloudMatch>();
            trackMatches.forEach(match => {
                if (!uniqueMatchesMap.has(match.id)) {
                    uniqueMatchesMap.set(match.id, match);
                }
            });
            trackMatches = Array.from(uniqueMatchesMap.values());
            trackStatus = 'matches_found';
        } else {
             trackStatus = 'no_matches_found'; // Scanned, but no matches from any snippet
        }
        if (snippetErrors > 0 && snippetsScannedCount > 0 && trackStatus !== 'error_processing') {
            trackStatus = 'partially_completed'; // Some snippets scanned, some failed
        }
      }

      const newLogEntry: TrackScanLog = {
        logId: `tracklog-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        originalFileName: originalFile.name,
        originalFileSize: originalFile.size,
        scanDate: new Date().toISOString(),
        matches: trackMatches,
        status: trackStatus,
      };
      newTrackLogs.push(newLogEntry);
      totalProcessedTracks++;
    }

    if (newTrackLogs.length > 0) {
      setPreviousScans(prevLogs => [...newTrackLogs.slice().reverse(), ...prevLogs]);
    }

    let completionMsg = "";
    if (totalProcessedTracks > 0) {
        completionMsg += `${totalProcessedTracks} track(s) processed. `;
        const successfulMatches = newTrackLogs.filter(log => log.status === 'matches_found' && log.matches.length > 0).length;
        if (successfulMatches > 0) {
            completionMsg += `${successfulMatches} track(s) had new matches. `;
        }
        const noMatchesFoundCount = newTrackLogs.filter(log => log.status === 'no_matches_found').length;
         if (noMatchesFoundCount > 0) {
            completionMsg += `${noMatchesFoundCount} track(s) had no matches. `;
        }
    } else if (originalFiles.length > 0 && skippedOriginalFiles.length === originalFiles.length) {
        completionMsg = "All selected tracks were already processed and skipped.";
    } else {
        completionMsg = "No new tracks were processed.";
    }
    setScanCompletionMessage(completionMsg.trim());


    if (skippedOriginalFiles.length > 0) {
      setSkippedFilesMessage(`${skippedOriginalFiles.length} track(s) were already processed and skipped: ${skippedOriginalFiles.slice(0,3).join(', ')}${skippedOriginalFiles.length > 3 ? '...' : ''}.`);
    }

    // Consolidate error reporting. If specific errors were set, they remain.
    // If there were general processing errors not covered by specific messages:
    if (totalErrors > 0 && !error) {
        setError(`Encountered issues processing ${totalErrors} track(s). Check console for details.`);
    }


    setIsLoading(false);
    setScanProgressMessage('');
  }, [previousScans, setPreviousScans]);

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
