
export interface User {
  id: string;
  username: string;
}

export interface AcrCloudMatch {
  id:string;
  title: string;
  artist: string;
  album: string;
  releaseDate: string; // Could be more specific like YYYY-MM-DD
  platformLinks?: {
    spotify?: string;
    youtube?: string;
    appleMusic?: string;
  };
  streamCounts?: {
    spotify?: number;
    youtube?: number;
  };
  matchConfidence: number; // 0-100
  spotifyArtistId?: string; // Added for Spotify artist ID
  spotifyTrackId?: string; // Added for Spotify track ID
}

// Represents the result from the backend for a single snippet
export interface SnippetScanResult {
  scanId: string; // Unique ID for the scan of a single snippet
  instrumentalName: string; // Name of the snippet file
  instrumentalSize: number; // in bytes
  scanDate: string; // ISO date string for the snippet scan
  matches: AcrCloudMatch[];
}

// Represents the consolidated log for an entire original track
export interface TrackScanLog {
  logId: string; // Unique ID for this log entry (e.g., for an original track)
  originalFileName: string;
  originalFileSize: number;
  scanDate: string; // ISO date string of when the scan process for this track completed
  matches: AcrCloudMatch[]; // Deduplicated matches from all its snippets
  status: 'matches_found' | 'no_matches_found' | 'error_processing' | 'partially_completed';
}

// Types for Spotify Follower Data Fetching moved from DashboardViewPage.tsx
export interface SpotifyFollowerSuccess {
  status: 'success';
  artistId: string;
  followers: number | undefined;
  popularity?: number;
  genres?: string[];
}

export interface SpotifyFollowerError {
  status: 'error';
  artistId: string;
  reason: string;
}

export interface SpotifyFollowerLoading {
    status: 'loading';
    artistId: string;
}

export interface SpotifyFollowerCancelled {
  status: 'cancelled';
  artistId: string;
}

export type SpotifyFollowerResult = SpotifyFollowerSuccess | SpotifyFollowerError | SpotifyFollowerLoading | SpotifyFollowerCancelled;

export interface SpotifyTrackDetails {
  previewUrl: string | null;
  trackName: string;
  artistName: string;
}

// Spotify User Info for Context
export interface SpotifyUserInfo {
  id: string;
  displayName: string;
  profileUrl?: string;
  avatarUrl?: string;
  accessToken: string;
  expiresAt: string;
}

// Removed SpotifyPlayerState as in-app playback is removed.

export interface SpotifyPlayerContextType {
  // Playback related properties removed
  // player: Spotify.Player | null;
  // deviceId: string | null;
  // isActive: boolean;
  // currentState: SpotifyPlayerState | null;
  // playTrack: (trackUri: string, spotifyTrackId?: string, initialTrackName?: string, initialArtistName?: string) => Promise<void>;
  // currentPlayingTrackInfo: { trackId: string | null; name: string; artist: string; uri: string } | null;
  // isLoadingPlayback: boolean;
  // playbackError: string | null;

  isReady: boolean; // Now signifies Spotify authentication readiness

  // Spotify auth and connection status
  isSpotifyConnected: boolean;
  spotifyUser: SpotifyUserInfo | null;
  isLoadingSpotifyAuth: boolean;
  initiateSpotifyLogin: () => void;
  disconnectSpotify: () => Promise<void>;
  checkSpotifyStatus: (isCallback?: boolean) => Promise<void>;
  needsRefresh: boolean;
  refreshSpotifyToken: () => Promise<string | null>;
  createPlaylistAndAddTracks: (playlistName: string, trackUris: string[], description?: string) => Promise<{playlistUrl?: string; error?: string}>;
}

// Spotify Playlist creation response type
export interface SpotifyPlaylist {
  id: string;
  name: string;
  external_urls: {
    spotify: string;
  };
  // other properties as needed
}
