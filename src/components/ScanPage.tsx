
import React, { useState, useCallback } from 'react';
import { User, ScanResult } from '../types';
import FileUpload from './FileUpload';
import { acrCloudService } from '../services/acrCloudService'; // Corrected: Use actual service
// import Spinner from './common/Spinner'; // Using simple text for loading
// import MusicNoteIcon from './icons/MusicNoteIcon'; // Using text/simpler icon

interface ScanPageProps {
  user: User;
  previousScans: ScanResult[];
  setPreviousScans: React.Dispatch<React.SetStateAction<ScanResult[]>>;
}

const ScanPage: React.FC<ScanPageProps> = ({ user, previousScans, setPreviousScans }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [scanProgressMessage, setScanProgressMessage] = useState<string>('');
  const [scanCompletionMessage, setScanCompletionMessage] = useState<string | null>(null);
  const [duplicateFilesMessage, setDuplicateFilesMessage] = useState<string | null>(null);

  // Checks if a processed snippet is a duplicate of a previously scanned snippet
  const isFileDuplicate = (file: File, scans: ScanResult[]): boolean => {
    return scans.some(scan => scan.instrumentalName === file.name && scan.instrumentalSize === file.size);
  };

  const handleScan = useCallback(async (filesToProcess: File[]) => { // filesToProcess are the snippets from FileUpload
    setIsLoading(true);
    setError(null);
    setScanCompletionMessage(null);
    setDuplicateFilesMessage(null);

    if (filesToProcess.length === 0) {
        setScanProgressMessage('');
        setScanCompletionMessage("No snippets selected or generated for scanning.");
        setIsLoading(false);
        return;
    }

    setScanProgressMessage(`Preparing ${filesToProcess.length} snippet(s)...`);

    const newFilesToScan: File[] = []; // Snippets that are not duplicates
    const duplicateFileNames: string[] = [];

    filesToProcess.forEach(snippet => {
      if (isFileDuplicate(snippet, previousScans)) {
        duplicateFileNames.push(snippet.name);
      } else {
        newFilesToScan.push(snippet);
      }
    });

    if (duplicateFileNames.length > 0) {
      setDuplicateFilesMessage(`${duplicateFileNames.length} snippet(s) were duplicates and were not re-scanned: ${duplicateFileNames.slice(0,3).join(', ')}${duplicateFileNames.length > 3 ? '...' : ''}.`);
    }

    if (newFilesToScan.length === 0) {
        // This means all snippets passed were duplicates, or no snippets were passed initially (handled above)
        setScanCompletionMessage(duplicateFileNames.length > 0 ? "No new snippets to scan. All were duplicates." : "No snippets available for scanning.");
        setIsLoading(false);
        setScanProgressMessage('');
        // setError(null); // No error if they were just duplicates
        return;
    }

    const batchResults: ScanResult[] = [];
    let firstError: string | null = null;

    for (let i = 0; i < newFilesToScan.length; i++) {
      const file = newFilesToScan[i];
      setScanProgressMessage(`Scanning ${i + 1}/${newFilesToScan.length}: "${file.name}"...`);
      try {
        const result = await acrCloudService.scanWithAcrCloud(file);
        batchResults.push(result);
      } catch (err: any) {
        console.error(`Error scanning ${file.name}:`, err);
        if (!firstError) {
          firstError = `Error scanning "${file.name}": ${err.message || 'Unknown error.'}`;
        }
        // Optionally, decide if you want to stop all scans on first error or continue
        // For now, it continues with other files.
      }
    }

    if (batchResults.length > 0) {
      setPreviousScans(prevScans => [...batchResults.slice().reverse(), ...prevScans]); // Add new results to the top
      setScanCompletionMessage(`${batchResults.length} new scan result(s) added to dashboard.`);
    } else if (newFilesToScan.length > 0 && !firstError) {
       // This case means scans were attempted for new files, but ACRCloud found no matches in any of them.
       setScanCompletionMessage("Scans completed. No new matches found in the processed snippets.");
    }


    if (firstError) {
        // If there was a completion message from successful scans, append error, otherwise set error.
        if(scanCompletionMessage) {
            setError(`${scanCompletionMessage} However, some scans failed: ${firstError}`);
            setScanCompletionMessage(null); // Clear scanCompletionMessage if error is shown
        } else {
            setError(firstError);
        }
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
            {scanProgressMessage || 'Scanning...'}
          </p>
          <p className="text-xs text-gray-700">Please wait.</p>
        </div>
      )}

      {!isLoading && (error || scanCompletionMessage || duplicateFilesMessage) && (
        <div className="p-0.5 win95-border-outset bg-[#C0C0C0]">
            <div className="p-2 bg-[#C0C0C0] space-y-1.5">
            {error && (
                <div className="p-2 bg-yellow-200 text-black border border-black">
                <p className="font-semibold">Error:</p>
                <p>{error}</p>
                </div>
            )}
            {scanCompletionMessage && (
                <div className="p-2 bg-green-200 text-black border border-black">
                <p className="font-semibold">Status:</p>
                <p>{scanCompletionMessage}</p>
                </div>
            )}
            {duplicateFilesMessage && (
                <div className="p-2 bg-blue-200 text-black border border-black">
                <p className="font-semibold">Note:</p>
                <p>{duplicateFilesMessage}</p>
                </div>
            )}
            </div>
        </div>
      )}

      {!isLoading && !error && !scanCompletionMessage && !duplicateFilesMessage && (
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
