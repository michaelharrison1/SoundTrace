import React, { useState, useCallback } from 'react';
import { User, ScanResult } from '../types';
import FileUpload from './FileUpload';
import { acrCloudService } from '../services/acrCloudService'; // Updated import
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

  const isFileDuplicate = (file: File, scans: ScanResult[]): boolean => {
    return scans.some(scan => scan.instrumentalName === file.name && scan.instrumentalSize === file.size);
  };

  const handleScan = useCallback(async (files: File[]) => {
    setIsLoading(true);
    setError(null);
    setScanCompletionMessage(null);
    setDuplicateFilesMessage(null);
    setScanProgressMessage(`Preparing ${files.length} file(s)...`);

    const newFilesToScan: File[] = [];
    const duplicateFiles: string[] = [];

    files.forEach(file => {
      if (isFileDuplicate(file, previousScans)) {
        duplicateFiles.push(file.name);
      } else {
        newFilesToScan.push(file);
      }
    });

    if (duplicateFiles.length > 0) {
      setDuplicateFilesMessage(`${duplicateFiles.length} file(s) were duplicates: ${duplicateFiles.join(', ')}.`);
    }

    if (newFilesToScan.length === 0 && files.length > 0) {
        setScanCompletionMessage(duplicateFiles.length > 0 ? "No new files to scan." : "No files selected.");
        setIsLoading(false);
        setScanProgressMessage('');
        if (duplicateFiles.length === 0 && files.length > 0) {
            setError("Selected files are duplicates or no new files.");
        } else {
            setError(null);
        }
        return;
    }
     if (newFilesToScan.length === 0 && files.length === 0) {
        setScanCompletionMessage("No files selected.");
        setIsLoading(false);
        setScanProgressMessage('');
        setError("Please select files to scan.");
        return;
    }


    const batchResults: ScanResult[] = [];
    let firstError: string | null = null;

    for (let i = 0; i < newFilesToScan.length; i++) {
      const file = newFilesToScan[i];
      setScanProgressMessage(`Scanning ${i + 1}/${newFilesToScan.length}: "${file.name}"...`);
      try {
        // Use the new acrCloudService
        const result = await acrCloudService.scanWithAcrCloud(file);
        batchResults.push(result);
      } catch (err: any) {
        console.error(`Error scanning ${file.name}:`, err);
        if (!firstError) {
          firstError = `Error scanning "${file.name}": ${err.message || 'Unknown error.'}`;
        }
      }
    }

    if (batchResults.length > 0) {
      setPreviousScans(prevScans => [...batchResults.slice().reverse(), ...prevScans]);
      setScanCompletionMessage(`${batchResults.length} new scans added to dashboard.`);
    } else if (newFilesToScan.length > 0 && !firstError) {
       setScanCompletionMessage("No new matches found from the uploaded files.");
    }


    if (firstError) {
        setError(firstError);
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
          {/* <Spinner size="md" color="text-black" /> */}
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
                <p className="font-semibold">Duplicates:</p>
                <p>{duplicateFilesMessage}</p>
                </div>
            )}
            </div>
        </div>
      )}

      {!isLoading && !error && !scanCompletionMessage && !duplicateFilesMessage && (
         <div className="p-4 win95-border-outset bg-[#C0C0C0] text-center">
            {/* <MusicNoteIcon className="mx-auto h-12 w-12 text-gray-500 mb-2" /> */}
            <span className="text-4xl text-gray-500" aria-hidden="true">♫</span>
            <h2 className="text-lg font-normal text-black mt-1">Ready to Scan?</h2>
            <p className="text-gray-700 mt-0.5 text-sm">Upload instrumentals above to begin.</p>
         </div>
      )}
    </div>
  );
};

export default ScanPage;