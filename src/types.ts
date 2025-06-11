export interface User {
  id: string;
  username: string;
}

export interface AcrCloudMatch {
  id:string; 
  title: string;
  artist: string;
  album: string;
  releaseDate: string; 
  platformLinks?: {
    spotify?: string;
    youtube?: string;
    appleMusic?: string;
  };
  streamCounts?: {
    spotify?: number;
    youtube?: number;
  };
  matchConfidence: number; 
  spotifyArtistId?: string;
  spotifyTrackId?: string;
  youtubeVideoId?: string;
  youtubeVideoTitle?: string;
}

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

export interface TrackScanLog {
  logId: string;
  scanJobId?: string; // ObjectId string from ScanJob
  originalFileName: string; 
  originalFileSize: number; 
  scanDate: string; 
  matches: AcrCloudMatch[];
  status: 
    | 'matches_found'           // File/single URL processed, matches found
    | 'no_matches_found'        // File/single URL processed, no matches
    | 'error_processing'        // Generic error during file/single URL processing
    | 'partially_completed'     // For multi-snippet files where some snippets failed
    | 'manually_added'          // Manually added (e.g., Spotify song, YT song)
    | 'aborted'                 // Processing aborted by user or system
    // New statuses for batch jobs:
    | 'pending_scan'            // Video identified in a batch, awaiting processing
    | 'processing_scan'         // Video from batch is actively being scanned
    | 'scanned_match_found'     // Video from batch scanned, matches found
    | 'scanned_no_match'        // Video from batch scanned, no matches
    | 'error_acr_credits'       // Video scan failed due to ACR Cloud credit limit
    | 'error_youtube_dl'        // Error downloading from YouTube for this video
    | 'error_ffmpeg'            // Error processing audio with FFmpeg for this video
    | 'skipped_previously_scanned' // Video in batch was already scanned and skipped
    | 'skipped_by_filter';       // Video in batch was skipped due to title/duration filters (future use)
  platformSource: PlatformSource;
  youtubeVideoId?: string;
  youtubeVideoTitle?: string; 
  sourceUrl?: string; 
  spotifyTrackInfo?: { 
    name: string;
    artists: string;
  };
  acrResponseDetails?: string;
  lastAttemptedAt?: string;
}

export type YouTubeUploadType = 
  | 'youtube_instrumental' // Corresponds to platformSource
  | 'youtube_song'         // Corresponds to platformSource
  | 'youtube_channel_instrumental_batch' // Corresponds to platformSource
  | 'youtube_playlist_instrumental_batch'; // Corresponds to platformSource


export interface SpotifyFollowerSuccess {
  status: 'success';
  artistId: string;
  followers: number | undefined;
  popularity?: number;
  genres?: string[];
}
export interface SpotifyFollowerError { status: 'error'; artistId: string; reason: string; }
export interface SpotifyFollowerLoading { status: 'loading'; artistId: string; }
export interface SpotifyFollowerCancelled { status: 'cancelled'; artistId: string; }
export type SpotifyFollowerResult = SpotifyFollowerSuccess | SpotifyFollowerError | SpotifyFollowerLoading | SpotifyFollowerCancelled;

export interface SpotifyTrackDetails { previewUrl: string | null; trackName: string; artistName: string; }

export interface SpotifyUserInfo {
  id: string; displayName: string; profileUrl?: string; avatarUrl?: string; accessToken: string; expiresAt: string;
}

export interface SpotifyPlayerContextType {
  isReady: boolean; isSpotifyConnected: boolean; spotifyUser: SpotifyUserInfo | null; isLoadingSpotifyAuth: boolean;
  initiateSpotifyLogin: () => void; disconnectSpotify: () => Promise<void>;
  checkSpotifyStatus: (isCallback?: boolean) => Promise<void>; needsRefresh: boolean;
  refreshSpotifyToken: () => Promise<string | null>;
  createPlaylistAndAddTracks: (playlistName: string, trackUris: string[], description?: string) => Promise<{playlistUrl?: string; error?: string}>;
}

export interface SpotifyPlaylist { id: string; name: string; external_urls: { spotify: string; }; }
export interface FollowerSnapshot { date: string; cumulativeFollowers: number; }

// Types for ScanJob (mirroring backend ScanJob model for frontend state)
export interface ScanJobState {
  jobId: string;
  status: 
    | 'pending_video_fetch' | 'fetching_videos' | 'processing_videos' | 'paused' 
    | 'completed' | 'error_youtube_api' | 'error_acr_credits' | 'error_partial' | 'aborted';
  jobType: YouTubeUploadType; // Simplified for frontend, maps to specific batch types
  originalInputUrl: string;
  totalVideosToScan: number;
  videosProcessed: number; // Successfully scanned, skipped, or errored (not ACR credit)
  videosWithMatches: number;
  videosFailed: number; // Errors not related to ACR credits
  pendingVideoCount?: number; // Optional: count of videos still in 'pending_scan'
  lastErrorMessage?: string;
  lastProcessedVideoInfo?: { videoId?: string; videoTitle?: string; };
  createdAt?: string;
  updatedAt?: string;
}

export interface ActiveScanJobResponse {
    activeJob: ScanJobState | null;
}

export interface InitiateBatchScanResponse {
    scanJobId: string;
    message: string;
    initialJobStatus: ScanJobState['status'];
    totalVideosToScan: number;
}