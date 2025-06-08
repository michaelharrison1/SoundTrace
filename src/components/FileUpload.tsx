import React, { useState, useCallback, useRef } from 'react';
import Button from './common/Button';
import UploadIcon from './icons/UploadIcon';
// import MusicNoteIcon from './icons/MusicNoteIcon'; // Simplied list item

interface FileUploadProps {
  onScan: (files: File[]) => void; // Changed to accept File[]
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onScan, isLoading }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: FileList | File[]) => {
    const filesArray = Array.from(newFiles);
    const audioFiles = filesArray.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length !== filesArray.length) {
      alert('Some files were not valid audio files and were not added.'); // Classic alert
    }

    setSelectedFiles(prevFiles => {
      const updatedFiles = [...prevFiles];
      audioFiles.forEach(newFile => {
        if (!updatedFiles.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size)) {
          updatedFiles.push(newFile);
        }
      });
      return updatedFiles;
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(event.target.files);
      event.target.value = ''; 
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    if (event.dataTransfer.files) {
      addFiles(event.dataTransfer.files);
    }
  }, []);

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
    if (selectedFiles.length > 0) {
      onScan(selectedFiles);
    }
  };
  
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setSelectedFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };

  const handleClearAllFiles = () => {
    setSelectedFiles([]);
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(0)) + ' ' + sizes[i]; // Simpler, no decimals
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
            accept="audio/mpeg, audio/wav, audio/aac, .mp3, .wav, .aac"
            className="hidden"
            multiple
          />
          <UploadIcon className={`mx-auto h-10 w-10 ${dragOver ? 'text-black' : 'text-gray-700'} mb-1`} />
          <p className="text-sm text-black">
            Drag & drop audio files or <span className="font-semibold underline">click here</span>.
          </p>
          <p className="text-xs text-gray-700 mt-0.5">Supports: MP3, WAV, AAC</p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-base font-normal text-black">Selected ({selectedFiles.length}):</h4>
              <Button onClick={handleClearAllFiles} size="sm" className="px-2 py-0.5">
                Clear All
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto win95-border-inset bg-white p-1 space-y-0.5">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between p-1 bg-white hover:bg-gray-200">
                  <div className="flex items-center overflow-hidden">
                    {/* <MusicNoteIcon className="h-4 w-4 text-black mr-1.5 flex-shrink-0" /> */}
                    <span className="text-black mr-1.5 flex-shrink-0" aria-hidden="true">♪</span>
                    <div className="truncate">
                      <p className="text-sm text-black font-normal truncate" title={file.name}>{file.name}</p>
                      <p className="text-xs text-gray-700">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(file)}
                    className="ml-1 p-0.5 text-red-700 hover:text-red-500" // Simpler remove button
                    aria-label={`Remove ${file.name}`}
                    title="Remove file"
                  >
                    {/* X icon or text */}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedFiles.length > 0 && (
          <Button
            onClick={handleScanClick}
            isLoading={isLoading}
            disabled={selectedFiles.length === 0 || isLoading}
            className="w-full mt-3"
            size="md"
          >
            {isLoading ? 'Scanning...' : `Scan ${selectedFiles.length} File(s)`}
          </Button>
        )}
      </div>
    </div>
  );
};

export default FileUpload;