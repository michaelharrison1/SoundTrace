
import React, { useState, useCallback, useRef } from 'react';
import Button from './common/Button';
import UploadIcon from './icons/UploadIcon';

interface FileUploadProps {
  onScan: (files: File[]) => void;
  isLoading: boolean;
}

const MAX_ORIGINAL_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB for pre-processing
const MAX_ORIGINAL_FILE_SIZE_MB = MAX_ORIGINAL_FILE_SIZE_BYTES / (1024 * 1024);
const SNIPPET_DURATION_SECONDS = 20;
const TARGET_SAMPLE_RATE = 44100; // Resample to 44.1kHz
const TARGET_CHANNELS = 1; // Convert to Mono

// Helper function to convert AudioBuffer to WAV Blob
const audioBufferToWavBlob = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44; // 2 bytes per sample (16-bit)
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  const channels: Float32Array[] = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // Write WAV container
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  // Write FMT chunk
  setUint32(0x20746d66); // "fmt "
  setUint32(16); // data size for PCM
  setUint16(1); // PCM - integer samples
  setUint16(numOfChan); // channels
  setUint32(buffer.sampleRate); // sample rate
  setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate (SampleRate * BitsPerSample * Channels) / 8
  setUint16(numOfChan * 2); // block align (Channels * BitsPerSample) / 8
  setUint16(16); // 16-bit
  // Write Data chunk
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4); // data chunk length

  // Write interleaved PCM samples
  for (i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      // Interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // Clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // Scale to 16-bit signed int
      view.setInt16(pos, sample, true); // Write 16-bit sample
      pos += 2;
    }
    offset++; // Next source sample
    if (offset >= buffer.length) break;
  }

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
  return new Blob([view], { type: 'audio/wav' });
};


const FileUpload: React.FC<FileUploadProps> = ({ onScan, isLoading }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // No need for audioContextRef here as OfflineAudioContext is created per file

  const processFile = async (file: File): Promise<File | null> => {
    if (!file.type.startsWith('audio/')) {
      alert(`Skipped non-audio file: ${file.name}`);
      return null;
    }
    if (file.size > MAX_ORIGINAL_FILE_SIZE_BYTES) {
      alert(`File "${file.name}" (${formatFileSize(file.size)}) exceeds the ${MAX_ORIGINAL_FILE_SIZE_MB}MB pre-processing limit and will be skipped.`);
      return null;
    }

    try {
      const mainAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const originalAudioBuffer = await mainAudioContext.decodeAudioData(arrayBuffer);
      await mainAudioContext.close(); // Close context after decoding

      const durationToProcess = Math.min(originalAudioBuffer.duration, SNIPPET_DURATION_SECONDS);

      // Create OfflineAudioContext for resampling and mono conversion
      const offlineCtx = new OfflineAudioContext(
        TARGET_CHANNELS,
        durationToProcess * TARGET_SAMPLE_RATE,
        TARGET_SAMPLE_RATE
      );

      const sourceNode = offlineCtx.createBufferSource();
      sourceNode.buffer = originalAudioBuffer;
      sourceNode.connect(offlineCtx.destination);
      sourceNode.start(0, 0, durationToProcess); // Start from beginning, play for durationToProcess

      const resampledMonoBuffer = await offlineCtx.startRendering();

      const wavBlob = audioBufferToWavBlob(resampledMonoBuffer);
      const originalNameWithoutExtension = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const snippetFile = new File([wavBlob], `${originalNameWithoutExtension}_${SNIPPET_DURATION_SECONDS}s_mono.wav`, { type: 'audio/wav' });

      return snippetFile;

    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      alert(`Could not process file "${file.name}". It might be corrupted or an unsupported audio format. Error: ${(error as Error).message}`);
      return null;
    }
  };


  const addFiles = async (newFiles: FileList | File[]) => {
    const filesArray = Array.from(newFiles);
    const processedFilesPromises = filesArray.map(processFile);
    const processedFiles = (await Promise.all(processedFilesPromises)).filter(f => f !== null) as File[];

    if (processedFiles.length > 0) {
      setSelectedFiles(prevFiles => {
        const updatedFiles = [...prevFiles];
        processedFiles.forEach(newFile => {
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
  }, []); // Empty dependency array is fine as addFiles recreates needed resources or uses refs

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
    setSelectedFiles(prevFiles => prevFiles.filter(file => file.name !== fileToRemove.name || file.size !== fileToRemove.size));
  };

  const handleClearAllFiles = () => {
    setSelectedFiles([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0)) + ' ' + sizes[i];
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
          <p className="text-xs text-black font-semibold mt-0.5">Note: Only the first ${SNIPPET_DURATION_SECONDS} seconds (mono, 44.1kHz) of each file will be scanned.</p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-base font-normal text-black">Selected Snippets ({selectedFiles.length}):</h4>
              <Button onClick={handleClearAllFiles} size="sm" className="px-2 py-0.5">
                Clear All
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto win95-border-inset bg-white p-1 space-y-0.5">
              {selectedFiles.map((file, index) => (
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

        {selectedFiles.length > 0 && (
          <Button
            onClick={handleScanClick}
            isLoading={isLoading}
            disabled={selectedFiles.length === 0 || isLoading}
            className="w-full mt-3"
            size="md"
          >
            {isLoading ? 'Scanning...' : `Scan ${selectedFiles.length} Snippet(s)`}
          </Button>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
