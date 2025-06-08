
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
}

export interface ScanResult {
  scanId: string; // Unique ID for the scan
  instrumentalName: string;
  instrumentalSize: number; // in bytes
  scanDate: string; // ISO date string
  matches: AcrCloudMatch[];
}
