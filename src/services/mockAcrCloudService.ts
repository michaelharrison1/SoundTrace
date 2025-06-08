
import { AcrCloudMatch, ScanResult } from '../types';

const generateMockMatches = (instrumentalName: string): AcrCloudMatch[] => {
  const numMatches = Math.floor(Math.random() * 5); // 0 to 4 matches
  if (numMatches === 0 && Math.random() < 0.3) return []; // 30% chance of no matches if numMatches was 0

  const sampleArtists = ['DJ Groovy', 'Lofi Beatsmith', 'SynthWave Master', 'Chillhop King', 'Trap Lord'];
  const sampleAlbums = ['Vibes Vol. 1', 'Midnight Drive', 'Retro Dreams', 'Study Sessions', 'Beat Tape'];
  
  return Array.from({ length: numMatches }, (_, i) => {
    const artist = sampleArtists[Math.floor(Math.random() * sampleArtists.length)];
    const title = `${artist} - Track ${Math.floor(Math.random() * 100) + 1} (feat. You?)`;
    return {
      id: `match-${Date.now()}-${i}`,
      title: title,
      artist: artist,
      album: sampleAlbums[Math.floor(Math.random() * sampleAlbums.length)],
      releaseDate: `202${Math.floor(Math.random() * 4)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      matchConfidence: Math.floor(Math.random() * 50) + 50, // 50-99%
      platformLinks: {
        spotify: `https://open.spotify.com/search/${encodeURIComponent(title)}`,
        youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`,
      },
      streamCounts: {
        spotify: Math.floor(Math.random() * 1000000),
        youtube: Math.floor(Math.random() * 5000000),
      }
    };
  });
};

export const mockAcrCloudService = {
  scanInstrumental: async (file: File): Promise<ScanResult> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate potential API error
        if (Math.random() < 0.1) { // 10% chance of error
          reject(new Error('Simulated ACRCloud API error. Please try again.'));
          return;
        }

        const matches = generateMockMatches(file.name);
        const scanResult: ScanResult = {
          scanId: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          instrumentalName: file.name,
          instrumentalSize: file.size,
          scanDate: new Date().toISOString(),
          matches: matches,
        };
        resolve(scanResult);
      }, 2000 + Math.random() * 1500); // Simulate network delay (2s to 3.5s)
    });
  },
};