
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
  previewUrl: string | null; // This might become less relevant if playing full tracks
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

// Spotify Web Playback SDK types (simplified, as it's a subset of Spotify.PlaybackState)
export interface SpotifyPlayerState {
  context: {
    uri: string | null;
    metadata: Record<string, any> | null;
  };
  disallows: {
    pausing?: boolean;
    resuming?: boolean;
    seeking?: boolean;
    skipping_next?: boolean;
    skipping_prev?: boolean;
  };
  duration: number;
  paused: boolean;
  position: number;
  repeat_mode: 0 | 1 | 2;
  shuffle: boolean;
  track_window: {
    current_track: Spotify.Track;
    previous_tracks: Spotify.Track[];
    next_tracks: Spotify.Track[];
  };
  timestamp: number;
  restrictions: {
    disallow_seeking_reasons?: string[];
    disallow_skipping_prev_reasons?: string[];
  }
}

// This interface was an attempt to redefine Spotify.Track.
// It's better to use Spotify.Track directly from the SDK types if available.
// If `Spotify.Track` is not resolving due to type setup issues, this might be a fallback,
// but the goal is to have `@types/spotify-web-playback-sdk` correctly set up.
// export interface SpotifySdkTrack {
//   album: {
//     album_type: string;
//     artists: { name: string; uri: string }[];
//     images: { height: number; url: string; width: number }[];
//     name: string;
//     uri: string;
//   };
//   artists: { name: string; uri: string }[];
//   duration_ms: number;
//   id: string | null;
//   is_playable: boolean;
//   name: string;
//   uri: string;
//   media_type: 'audio' | 'video';
//   type: 'track' | 'episode' | 'ad';
//   uid: string;
// }


export interface SpotifyPlayerContextType {
  player: Spotify.Player | null;
  deviceId: string | null;
  isReady: boolean;
  isActive: boolean;
  currentState: SpotifyPlayerState | null; // This uses our subset
  playTrack: (trackUri: string, spotifyTrackId?: string, initialTrackName?: string, initialArtistName?: string) => Promise<void>;
  currentPlayingTrackInfo: { trackId: string | null; name: string; artist: string; uri: string } | null;
  isLoadingPlayback: boolean;
  playbackError: string | null;

  // Added properties for Spotify auth and connection status
  isSpotifyConnected: boolean;
  spotifyUser: SpotifyUserInfo | null;
  isLoadingSpotifyAuth: boolean;
  initiateSpotifyLogin: () => void;
  disconnectSpotify: () => Promise<void>;
  checkSpotifyStatus: (isCallback?: boolean) => Promise<void>;
  needsRefresh: boolean;
  refreshSpotifyToken: () => Promise<string | null>;
}