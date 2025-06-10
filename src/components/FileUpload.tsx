
import React, { useState, useCallback, useRef } from 'react';
import Button from './common/Button';
import UploadIcon from './icons/UploadIcon';
import { TARGET_SAMPLE_RATE } from '../utils/audioProcessing'; // Import for note text

interface FileUploadProps {
  onScan: (files: File[], numberOfSegments: number) => void; // Expects original files and number of segments
  isLoading: boolean; // This isLoading is for the overall scanning process in ScanPage
}

const MAX_ORIGINAL_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB for pre-processing
const MAX_ORIGINAL_FILE_SIZE_MB = MAX_ORIGINAL_FILE_SIZE_BYTES / (1024 * 1024);


const FileUpload: React.FC<FileUploadProps> = ({ onScan, isLoading }) => {
  const [selectedOriginalFiles, setSelectedOriginalFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [selectedSegments, setSelectedSegments] = useState<number>(3); // Default to 3 segments

  const addFiles = (newInputFiles: FileList | File[]) => {
    const inputFilesArray = Array.from(newInputFiles);
    const validAudioFiles: File[] = [];
    const nonAudioFiles: string[] = [];

    inputFilesArray.forEach(file => {
      if (!file.type.startsWith('audio/')) {
        nonAudioFiles.push(file.name);
        return;
      }
      if (file.size > MAX_ORIGINAL_FILE_SIZE_BYTES) {
        alert(`File "${file.name}" (${formatFileSize(file.size)}) exceeds the ${MAX_ORIGINAL_FILE_SIZE_MB}MB limit and will be skipped.`);
        return;
      }
      validAudioFiles.push(file);
    });

    if (nonAudioFiles.length > 0) {
        alert(`Skipped non-audio files: ${nonAudioFiles.join(', ')}`);
    }

    if (validAudioFiles.length > 0) {
      setSelectedOriginalFiles(prevFiles => {
        const updatedFiles = [...prevFiles];
        validAudioFiles.forEach(newFile => {
          if (!updatedFiles.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size)) {
            updatedFiles.push(newFile);
          }
        });
        return updatedFiles;
      });
    }
  };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(event.target.files);
      event.target.value = ''; // Allow selecting the same file again
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    if (event.dataTransfer.files) {
      addFiles(event.dataTransfer.files);
    }
  }, []); // addFiles is stable

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  }, []);

  const handleScanClick = () => {
    if (selectedOriginalFiles.length > 0 && !isLoading) {
      onScan(selectedOriginalFiles, selectedSegments); // Pass selected number of segments
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setSelectedOriginalFiles(prevFiles => prevFiles.filter(file => file.name !== fileToRemove.name || file.size !== fileToRemove.size));
  };

  const handleClearAllFiles = () => {
    setSelectedOriginalFiles([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0)) + ' ' + sizes[i];
  };

  const handleSegmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedSegments(parseInt(event.target.value, 10));
  };

  return (
    <div className="bg-[#C0C0C0] p-0.5 win95-border-outset">
      <div className="p-3 bg-[#C0C0C0]">
        <h3 className="text-lg font-normal text-black mb-2">Upload Instrumentals</h3>
        <div
          className={`border-2 border-dashed rounded-none p-4 text-center cursor-pointer
                      ${dragOver ? 'border-black bg-gray-400' : 'border-gray-500 hover:border-black bg-[#C0C0C0]'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={openFileDialog}
          role="button"
          tabIndex={0}
          aria-label="File upload area"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/mpeg, audio/wav, audio/aac, audio/ogg, audio/flac, .mp3, .wav, .aac, .ogg, .flac"
            className="hidden"
            multiple
          />
          <UploadIcon className={`mx-auto h-10 w-10 ${dragOver ? 'text-black' : 'text-gray-700'} mb-1`} />
          <p className="text-sm text-black">
            Drag & drop audio files or <span className="font-semibold underline">click here</span>.
          </p>
          <p className="text-xs text-gray-700 mt-0.5">Supports: MP3, WAV, AAC, etc. (Originals up to ${MAX_ORIGINAL_FILE_SIZE_MB}MB)</p>
          <p className="text-xs text-black font-semibold mt-0.5">Note: Analyzing more segments can improve match accuracy but takes longer. All segments are stereo, ${TARGET_SAMPLE_RATE / 1000}kHz.</p>
        </div>

        <div className="mt-2 mb-1">
          <span className="text-sm text-black mr-2 font-normal">Scan Intensity:</span>
          <label className="mr-2 text-sm text-black">
            <input type="radio" name="segments" value="1" checked={selectedSegments === 1} onChange={handleSegmentChange} className="mr-0.5 align-middle"/>
            1 Segment (Fastest)
          </label>
          <label className="mr-2 text-sm text-black">
            <input type="radio" name="segments" value="2" checked={selectedSegments === 2} onChange={handleSegmentChange} className="mr-0.5 align-middle"/>
            2 Segments (Balanced)
          </label>
          <label className="text-sm text-black">
            <input type="radio" name="segments" value="3" checked={selectedSegments === 3} onChange={handleSegmentChange} className="mr-0.5 align-middle"/>
            3 Segments (Thorough)
          </label>
        </div>

        {processingMessage && (
            <div className="mt-2 text-sm text-black">{processingMessage}</div>
        )}

        {selectedOriginalFiles.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-base font-normal text-black">Selected Tracks for Scanning ({selectedOriginalFiles.length}):</h4>
              <Button onClick={handleClearAllFiles} size="sm" className="px-2 py-0.5">
                Clear All
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto win95-border-inset bg-white p-1 space-y-0.5">
              {selectedOriginalFiles.map((file, index) => (
                <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between p-1 bg-white hover:bg-gray-200">
                  <div className="flex items-center overflow-hidden">
                    <span className="text-black mr-1.5 flex-shrink-0" aria-hidden="true">♪</span>
                    <div className="truncate">
                      <p className="text-sm text-black font-normal truncate" title={file.name}>{file.name}</p>
                      <p className="text-xs text-gray-700">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(file)}
                    className="ml-1 p-0.5 text-red-700 hover:text-red-500"
                    aria-label={`Remove ${file.name}`}
                    title="Remove file"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedOriginalFiles.length > 0 && (
          <Button
            onClick={handleScanClick}
            isLoading={isLoading} // Controlled by ScanPage
            disabled={selectedOriginalFiles.length === 0 || isLoading}
            className="w-full mt-3"
            size="md"
          >
            {isLoading ? 'Scanning...' : `Scan ${selectedOriginalFiles.length} Track(s) (${selectedSegments} Segments)`}
          </Button>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
