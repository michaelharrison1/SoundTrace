
export interface User {
  id: string;
  username: string;
}

export interface AcrCloudMatch {
  id:string; // For ACRCloud matches, this is acrid. For manual adds, could be Spotify ID or YouTube Video ID.
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
  matchConfidence: number; // 0-100. For manual adds (songs), this will be 100.
  spotifyArtistId?: string;
  spotifyTrackId?: string;
  youtubeVideoId?: string;
  youtubeVideoTitle?: string;
}

// Represents the result from the backend for a single snippet from ACRCloud
export interface SnippetScanResult {
  scanId: string;
  instrumentalName: string;
  instrumentalSize: number;
  scanDate: string;
  matches: AcrCloudMatch[];
}

export type PlatformSource =
  | 'file_upload'
  | 'youtube_instrumental'
  | 'youtube_song'
  | 'spotify_track'
  | 'spotify_playlist_track'
  | 'youtube_channel_instrumental_batch'
  | 'youtube_playlist_instrumental_batch';

// Represents the consolidated log for an entire original track or a manually added item
export interface TrackScanLog {
  logId: string;
  originalFileName: string; // For file uploads, the name. For URLs, a derived name (e.g., "YT: Video Title", "SP Playlist: Track Name")
  originalFileSize: number; // Relevant for file uploads
  scanDate: string; // ISO date string of when the log entry was created
  matches: AcrCloudMatch[]; // For scanned items, ACRCloud matches. For manual adds, a single entry representing the item.
  status: 'matches_found' | 'no_matches_found' | 'error_processing' | 'partially_completed' | 'manually_added' | 'aborted';
  platformSource: PlatformSource;
  youtubeVideoId?: string;
  youtubeVideoTitle?: string; // Can be the same as originalFileName if derived
  sourceUrl?: string; // The original YouTube/Spotify link processed
  spotifyTrackInfo?: { // Specifically for Spotify tracks if needed beyond AcrCloudMatch structure
    name: string;
    artists: string;
  };
  scanJobId?: string; // Added for potential abort functionality
}

export type YouTubeUploadType = 'instrumental_single' | 'song_single' | 'instrumental_channel' | 'instrumental_playlist';


// Types for Spotify Follower Data Fetching
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

export interface SpotifyPlayerContextType {
  isReady: boolean;
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

export interface SpotifyPlaylist {
  id: string;
  name: string;
  external_urls: {
    spotify: string;
  };
}

// For Time-Based Reach Graph
export interface FollowerSnapshot {
    date: string; // YYYY-MM-DD
    cumulativeFollowers: number;
}
