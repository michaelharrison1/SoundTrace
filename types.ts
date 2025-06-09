
export interface User {
  id: string;
  username: string;
}

export interface AcrCloudMatch {
  id: string;
  title: string;
  artist: string;
  album: string;
  releaseDate: string; // Could be more specific like YYYY-MM-DD
  platformLinks?: {
    spotify?: string;
    youtube?: string;
    appleMusic?: string;
  };
  streamCounts?: { // Example, actual data might vary
    spotify?: number;
    youtube?: number;
  };
  matchConfidence: number; // 0-100
  spotifyArtistId?: string; // Added for Spotify artist ID
  spotifyTrackId?: string; // Added for Spotify track ID
}

export interface ScanResult {
  scanId: string; // Unique ID for the scan
  instrumentalName: string;
  instrumentalSize: number; // in bytes
  scanDate: string; // ISO date string
  matches: AcrCloudMatch[];
}

// Added from src/types.ts
export interface SnippetScanResult {
  scanId: string; // Unique ID for the scan of a single snippet
  instrumentalName: string; // Name of the snippet file
  instrumentalSize: number; // in bytes
  scanDate: string; // ISO date string for the snippet scan
  matches: AcrCloudMatch[];
}

// Added from src/types.ts
export interface TrackScanLog {
  logId: string; // Unique ID for this log entry (e.g., for an original track)
  originalFileName: string;
  originalFileSize: number;
  scanDate: string; // ISO date string of when the scan process for this track completed
  matches: AcrCloudMatch[]; // Deduplicated matches from all its snippets
  status: 'matches_found' | 'no_matches_found' | 'error_processing' | 'partially_completed';
}
