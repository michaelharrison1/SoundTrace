
import React, { useState, useCallback, useRef } from 'react';
import Button from './common/Button';
import UploadIcon from './icons/UploadIcon';

interface FileUploadProps {
  onScan: (files: File[]) => void;
  isLoading: boolean;
}

const MAX_ORIGINAL_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB for pre-processing
const MAX_ORIGINAL_FILE_SIZE_MB = MAX_ORIGINAL_FILE_SIZE_BYTES / (1024 * 1024);
const SNIPPET_DURATION_SECONDS = 21;
const TARGET_SAMPLE_RATE = 44100;
const TARGET_CHANNELS = 2;
const MAX_SNIPPETS_PER_FILE = 3;
const MIN_AUDIO_DURATION_FOR_ADDITIONAL_SNIPPETS = SNIPPET_DURATION_SECONDS * 1.5; // Need at least 1.5x snippet duration for a second meaningful segment

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

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16); // data size for PCM
  setUint16(1); // PCM - integer samples
  setUint16(numOfChan); // channels
  setUint32(buffer.sampleRate); // sample rate
  setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // 16-bit
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4); // data chunk length

  for (i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (offset < buffer.length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
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

const generateSingleSnippetFromBuffer = async (
    originalBuffer: AudioBuffer,
    startTimeInSeconds: number,
    originalFileName: string,
    segmentIndex: number
): Promise<File | null> => {
    try {
        const actualStartTime = Math.max(0, startTimeInSeconds);
        if (actualStartTime >= originalBuffer.duration) {
            console.warn(`[FileUpload.tsx generateSingleSnippet] Start time ${actualStartTime}s is beyond audio duration ${originalBuffer.duration}s for ${originalFileName}`);
            return null;
        }

        const durationToExtract = Math.min(SNIPPET_DURATION_SECONDS, originalBuffer.duration - actualStartTime);

        if (durationToExtract < 1) { // Avoid snippets shorter than 1 second
             console.warn(`[FileUpload.tsx generateSingleSnippet] Calculated duration too short (${durationToExtract}s) for ${originalFileName} at start ${actualStartTime}s`);
            return null;
        }

        const offlineCtx = new OfflineAudioContext(
            TARGET_CHANNELS,
            Math.ceil(durationToExtract * TARGET_SAMPLE_RATE),
            TARGET_SAMPLE_RATE
        );

        const sourceNode = offlineCtx.createBufferSource();
        sourceNode.buffer = originalBuffer;
        sourceNode.connect(offlineCtx.destination); // OfflineAudioContext handles channel mapping (mono to stereo if needed)
        sourceNode.start(0, actualStartTime, durationToExtract);

        const renderedSnippetBuffer = await offlineCtx.startRendering();
        const wavBlob = audioBufferToWavBlob(renderedSnippetBuffer);

        const originalNameWithoutExtension = originalFileName.substring(0, originalFileName.lastIndexOf('.')) || originalFileName;
        // Sanitize originalNameWithoutExtension to remove problematic characters for filenames if any (optional, basic shown)
        const sanitizedOriginalName = originalNameWithoutExtension.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const snippetFileName = `${sanitizedOriginalName}_S${segmentIndex}_${Math.round(actualStartTime)}s.wav`;

        const snippetFile = new File([wavBlob], snippetFileName, { type: 'audio/wav' });
        console.log(`[FileUpload.tsx generateSingleSnippet] Created: ${snippetFile.name}, size: ${snippetFile.size}, type: ${snippetFile.type}`);
        return snippetFile;

    } catch (error) {
        console.error(`[FileUpload.tsx generateSingleSnippet] Error processing segment ${segmentIndex} for ${originalFileName} at ${startTimeInSeconds}s:`, error);
        return null;
    }
};


const FileUpload: React.FC<FileUploadProps> = ({ onScan, isLoading }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File): Promise<File[] | null> => {
    if (!file.type.startsWith('audio/')) {
      // This alert might be redundant if addFiles filters first, but good as a fallback.
      // alert(`Skipped non-audio file: ${file.name}`);
      return null; // Will be filtered out by addFiles
    }
    if (file.size > MAX_ORIGINAL_FILE_SIZE_BYTES) {
      alert(`File "${file.name}" (${formatFileSize(file.size)}) exceeds the ${MAX_ORIGINAL_FILE_SIZE_MB}MB pre-processing limit and will be skipped.`);
      return null;
    }

    let mainAudioContext: AudioContext | null = null;
    try {
      mainAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const originalAudioBuffer = await mainAudioContext.decodeAudioData(arrayBuffer);

      const snippets: File[] = [];
      const processedStartTimes: number[] = []; // To help ensure distinct random snippets

      // Segment 1: Start of the file
      const firstSnippet = await generateSingleSnippetFromBuffer(originalAudioBuffer, 0, file.name, 1);
      if (firstSnippet) {
        snippets.push(firstSnippet);
        processedStartTimes.push(0);
      } else {
        // If the first snippet fails, likely the file is too short or problematic
        console.warn(`[FileUpload.tsx processFile] Could not generate first snippet for ${file.name}.`);
        // We might still want to alert or handle this. If first snippet fails, probably no point in others.
        // For now, if no first snippet, return empty or null to indicate failure for this file.
        if (snippets.length === 0) { // Double check if it was added
             alert(`Could not process file "${file.name}". It might be too short, corrupted, or an unsupported audio format.`);
             return null; // Indicate overall failure for this file
        }
      }

      // Attempt to generate up to two additional random snippets
      const totalDuration = originalAudioBuffer.duration;
      let attempts = 0;
      const maxAttemptsPerRandomSnippet = 10;

      // Segment 2 (Random)
      if (snippets.length < MAX_SNIPPETS_PER_FILE && totalDuration >= MIN_AUDIO_DURATION_FOR_ADDITIONAL_SNIPPETS) {
        attempts = 0;
        while(attempts < maxAttemptsPerRandomSnippet && snippets.length < 2) {
          // Propose a start time for S2 ensuring it's not overlapping S1 significantly
          // Random start anywhere in the "second half" or a part not covered by S1
          const proposedStartS2 = SNIPPET_DURATION_SECONDS * 0.5 + Math.random() * (totalDuration - SNIPPET_DURATION_SECONDS * 1.5);

          if (proposedStartS2 >= 0 && (totalDuration - proposedStartS2) >= SNIPPET_DURATION_SECONDS * 0.5) { // Min 0.5 snippet length remaining
             // Basic distinctness: check if it's not too close to S1's start
            if (Math.abs(proposedStartS2 - processedStartTimes[0]) > SNIPPET_DURATION_SECONDS * 0.75) { // Heuristic for "distinct enough"
                const secondSnippet = await generateSingleSnippetFromBuffer(originalAudioBuffer, proposedStartS2, file.name, 2);
                if (secondSnippet) {
                    snippets.push(secondSnippet);
                    processedStartTimes.push(proposedStartS2);
                    break;
                }
            }
          }
          attempts++;
        }
      }

      // Segment 3 (Random, distinct from S1 and S2)
      if (snippets.length < MAX_SNIPPETS_PER_FILE && totalDuration >= SNIPPET_DURATION_SECONDS * 2.5) { // Need more space for a distinct third
        attempts = 0;
        while(attempts < maxAttemptsPerRandomSnippet && snippets.length < 3) {
            const proposedStartS3 = Math.random() * (totalDuration - SNIPPET_DURATION_SECONDS);

            let isDistinct = true;
            for(const prevStart of processedStartTimes) {
                if (Math.abs(proposedStartS3 - prevStart) < SNIPPET_DURATION_SECONDS * 0.75) { // Heuristic for distinctness
                    isDistinct = false;
                    break;
                }
            }

            if (isDistinct && (totalDuration - proposedStartS3) >= SNIPPET_DURATION_SECONDS * 0.5) {
                 const thirdSnippet = await generateSingleSnippetFromBuffer(originalAudioBuffer, proposedStartS3, file.name, 3);
                 if (thirdSnippet) {
                    snippets.push(thirdSnippet);
                    // processedStartTimes.push(proposedStartS3); // Not strictly needed to store S3 start for further checks
                    break;
                 }
            }
            attempts++;
        }
      }

      if (snippets.length === 0) {
        // This implies even the first snippet failed, or the file was too short after all.
        // The alert might have already happened if firstSnippet generation failed.
        console.warn(`[FileUpload.tsx processFile] No valid snippets generated for ${file.name}.`);
        // Alert if no prior alert for this specific file was shown.
        if (!firstSnippet) { // if first snippet itself failed and alerted.
             // No new alert here to avoid double alerting for the same root cause.
        } else {
            // This case might be rare: first snippet ok, but then file deemed too short for more & no other snippets.
            // Or, first snippet was the *only* one possible due to duration.
        }
      }
      return snippets;

    } catch (error) {
      console.error(`[FileUpload.tsx processFile] General error processing file ${file.name}:`, error);
      alert(`Could not process file "${file.name}". It might be corrupted or an unsupported audio format. Error: ${(error as Error).message}`);
      return null; // Indicate failure for this original file
    } finally {
        if (mainAudioContext && mainAudioContext.state !== 'closed') {
            mainAudioContext.close().catch(e => console.warn("Error closing main AudioContext:", e));
        }
    }
  };

  const addFiles = async (newInputFiles: FileList | File[]) => {
    const originalFilesArray = Array.from(newInputFiles).filter(f => f.type.startsWith('audio/'));

    if (originalFilesArray.length !== Array.from(newInputFiles).length) {
        alert('Some selected files were not valid audio types and were ignored.');
    }
    if (originalFilesArray.length === 0 && Array.from(newInputFiles).length > 0) {
        return; // All were non-audio
    }
    if (originalFilesArray.length === 0) return;


    console.log('[FileUpload.tsx addFiles] Original audio files to process:', originalFilesArray.map(f => ({ name: f.name, size: f.size, type: f.type })));

    // Show processing indicator
    const tempProcessingMessage = `Processing ${originalFilesArray.length} file(s) into snippets...`;
    // You could set a state here to show this message in the UI if desired.
    console.log(tempProcessingMessage);


    const processedSnippetArrays = await Promise.all(originalFilesArray.map(processFile));
    const successfullyProcessedSnippets = processedSnippetArrays
        .filter(arr => arr !== null) // Filter out null results (file processing failure)
        .flat() as File[]; // Flatten arrays of snippets

    console.log('[FileUpload.tsx addFiles] Successfully processed snippets (all segments):', successfullyProcessedSnippets.map(f => ({ name: f.name, size: f.size, type: f.type })));

    if (successfullyProcessedSnippets.length > 0) {
      setSelectedFiles(prevSelectedFiles => {
        const updatedSelectedFiles = [...prevSelectedFiles];
        successfullyProcessedSnippets.forEach(newSnippet => {
          if (!updatedSelectedFiles.some(existingFile => existingFile.name === newSnippet.name && existingFile.size === newSnippet.size)) {
            updatedSelectedFiles.push(newSnippet);
          } else {
            console.log(`[FileUpload.tsx addFiles] Snippet ${newSnippet.name} is already in the list.`);
          }
        });
        console.log('[FileUpload.tsx addFiles] New selectedFiles state (all snippets):', updatedSelectedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));
        return updatedSelectedFiles;
      });
    } else {
      console.log('[FileUpload.tsx addFiles] No new snippets were generated from the selected files.');
      // Alert only if original audio files were provided but none yielded snippets.
      if (originalFilesArray.length > 0) {
        // Alerts for individual file failures are in processFile or generateSingleSnippetFromBuffer.
        // A general message here could be "No scannable snippets could be created from the selected files."
        // but it might be too much if individual alerts were clearer.
      }
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
      onScan(selectedFiles); // selectedFiles now contains all snippets
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
          <p className="text-xs text-black font-semibold mt-0.5">Note: Up to ${MAX_SNIPPETS_PER_FILE} segments (first ${SNIPPET_DURATION_SECONDS}s, and 2 random ${SNIPPET_DURATION_SECONDS}s portions, stereo, ${TARGET_SAMPLE_RATE / 1000}kHz) of each file will be processed for scanning.</p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-base font-normal text-black">Selected Snippets for Scanning ({selectedFiles.length}):</h4>
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
