
export const SNIPPET_DURATION_SECONDS = 21;
export const TARGET_SAMPLE_RATE = 44100;
export const TARGET_CHANNELS = 2; // Stereo
export const MAX_SNIPPETS_PER_FILE = 3;
const MIN_AUDIO_DURATION_FOR_ADDITIONAL_SNIPPETS = SNIPPET_DURATION_SECONDS * 1.5;

// Helper function to convert AudioBuffer to WAV Blob
export const audioBufferToWavBlob = (buffer: AudioBuffer): Blob => {
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
            console.warn(`[audioProcessing] Start time ${actualStartTime}s is beyond audio duration ${originalBuffer.duration}s for ${originalFileName}`);
            return null;
        }

        const durationToExtract = Math.min(SNIPPET_DURATION_SECONDS, originalBuffer.duration - actualStartTime);

        if (durationToExtract < 1) { // Avoid snippets shorter than 1 second
             console.warn(`[audioProcessing] Calculated duration too short (${durationToExtract}s) for ${originalFileName} at start ${actualStartTime}s`);
            return null;
        }

        // OfflineAudioContext will resample to TARGET_SAMPLE_RATE and mix to TARGET_CHANNELS
        const offlineCtx = new OfflineAudioContext(
            TARGET_CHANNELS,
            Math.ceil(durationToExtract * TARGET_SAMPLE_RATE),
            TARGET_SAMPLE_RATE
        );

        const sourceNode = offlineCtx.createBufferSource();
        sourceNode.buffer = originalBuffer;
        sourceNode.connect(offlineCtx.destination);
        sourceNode.start(0, actualStartTime, durationToExtract);

        const renderedSnippetBuffer = await offlineCtx.startRendering();
        const wavBlob = audioBufferToWavBlob(renderedSnippetBuffer);

        const originalNameWithoutExtension = originalFileName.substring(0, originalFileName.lastIndexOf('.')) || originalFileName;
        const sanitizedOriginalName = originalNameWithoutExtension.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const snippetFileName = `${sanitizedOriginalName}_S${segmentIndex}_${Math.round(actualStartTime)}s_T${Date.now()}.wav`; // Added timestamp for more uniqueness

        const snippetFile = new File([wavBlob], snippetFileName, { type: 'audio/wav' });
        console.log(`[audioProcessing] Created Snippet: ${snippetFile.name}, size: ${snippetFile.size}, type: ${snippetFile.type}`);
        return snippetFile;

    } catch (error) {
        console.error(`[audioProcessing] Error processing segment ${segmentIndex} for ${originalFileName} at ${startTimeInSeconds}s:`, error);
        return null;
    }
};

export const generateSnippetsForFile = async (file: File, numberOfSegmentsToScan: number): Promise<File[] | null> => {
    let mainAudioContext: AudioContext | null = null;
    try {
      mainAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const originalAudioBuffer = await mainAudioContext.decodeAudioData(arrayBuffer);

      const snippets: File[] = [];
      const processedStartTimes: number[] = [];

      // Segment 1: Start of the file (always generate if possible)
      const firstSnippet = await generateSingleSnippetFromBuffer(originalAudioBuffer, 0, file.name, 1);
      if (firstSnippet) {
        snippets.push(firstSnippet);
        processedStartTimes.push(0);
      } else {
        console.warn(`[audioProcessing] Could not generate first snippet for ${file.name}.`);
        return null; // If the first snippet fails, treat as an error for this file
      }

      const totalDuration = originalAudioBuffer.duration;
      let attempts = 0;
      const maxAttemptsPerRandomSnippet = 10;

      // Segment 2 (Random)
      if (numberOfSegmentsToScan >= 2 && snippets.length < numberOfSegmentsToScan && snippets.length < MAX_SNIPPETS_PER_FILE && totalDuration >= MIN_AUDIO_DURATION_FOR_ADDITIONAL_SNIPPETS) {
        attempts = 0;
        while(attempts < maxAttemptsPerRandomSnippet && snippets.length < Math.min(numberOfSegmentsToScan, MAX_SNIPPETS_PER_FILE)) {
          const proposedStartS2 = SNIPPET_DURATION_SECONDS * 0.5 + Math.random() * (totalDuration - SNIPPET_DURATION_SECONDS * 1.5);
          if (proposedStartS2 >= 0 && (totalDuration - proposedStartS2) >= SNIPPET_DURATION_SECONDS * 0.5) {
            if (Math.abs(proposedStartS2 - processedStartTimes[0]) > SNIPPET_DURATION_SECONDS * 0.75) {
                const secondSnippet = await generateSingleSnippetFromBuffer(originalAudioBuffer, proposedStartS2, file.name, snippets.length + 1);
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
      if (numberOfSegmentsToScan >= 3 && snippets.length < numberOfSegmentsToScan && snippets.length < MAX_SNIPPETS_PER_FILE && totalDuration >= SNIPPET_DURATION_SECONDS * 2.5) {
        attempts = 0;
        while(attempts < maxAttemptsPerRandomSnippet && snippets.length < Math.min(numberOfSegmentsToScan, MAX_SNIPPETS_PER_FILE)) {
            const proposedStartS3 = Math.random() * (totalDuration - SNIPPET_DURATION_SECONDS);
            let isDistinct = true;
            for(const prevStart of processedStartTimes) {
                if (Math.abs(proposedStartS3 - prevStart) < SNIPPET_DURATION_SECONDS * 0.75) {
                    isDistinct = false;
                    break;
                }
            }
            if (isDistinct && (totalDuration - proposedStartS3) >= SNIPPET_DURATION_SECONDS * 0.5) {
                 const thirdSnippet = await generateSingleSnippetFromBuffer(originalAudioBuffer, proposedStartS3, file.name, snippets.length + 1);
                 if (thirdSnippet) {
                    snippets.push(thirdSnippet);
                    // processedStartTimes.push(proposedStartS3); // Not strictly needed to store this if no further distinct segments
                    break;
                 }
            }
            attempts++;
        }
      }

      return snippets.length > 0 ? snippets : null;

    } catch (error) {
      console.error(`[audioProcessing] General error processing file ${file.name}:`, error);
      return null;
    } finally {
        if (mainAudioContext && mainAudioContext.state !== 'closed') {
            mainAudioContext.close().catch(e => console.warn("[audioProcessing] Error closing main AudioContext:", e));
        }
    }
};
