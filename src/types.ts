
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

// Result from a single snippet scan (client-side snippeting or backend item processing)
export interface SnippetScanResult {
  scanId: string; // Or an ID specific to this snippet's scan attempt
  instrumentalName: string; // Original file name or snippet identifier
  instrumentalSize: number; // Size of the snippet processed
  scanDate: string; // Date of this specific snippet scan
  matches: AcrCloudMatch[];
  errorMessage?: string; // If this specific snippet scan failed
}


export type PlatformSource =
  | 'file_upload_batch_item' // Item from a file upload batch job
  | 'youtube_channel_instrumental_batch_item' // Item from a YT channel job
  | 'youtube_playlist_instrumental_batch_item' // Item from a YT playlist job
  | 'spotify_playlist_import_item'; // Item from a Spotify playlist import job
  // Potentially older single types if data is migrated or specific single-item jobs are created:
  // | 'file_upload_single'
  // | 'youtube_instrumental_single' 
  // | 'youtube_song_single'         
  // | 'spotify_track_single';

export type TrackScanLogStatus =
  // Statuses for items within a file_upload_batch (after successful upload, during/after ACR processing)
  | 'pending_processing'    // File uploaded to job, awaiting ACR scan by backend
  | 'processing_acr_scan'   // File from job actively being scanned by ACR
  | 'completed_match_found' // File from job scanned by ACR, matches found
  | 'completed_no_match'    // File from job scanned by ACR, no matches
  | 'error_acr_scan'        // File from job failed ACR scan (not credit related)
  | 'error_acr_credits_item'// Specific item failed due to ACR credits (job might also be paused)

  // Statuses for items from YouTube jobs
  | 'pending_scan'          // Video identified, awaiting processing by backend
  | 'processing_scan'       // Video from batch is actively being scanned by backend
  | 'scanned_match_found'   // Video from batch scanned, matches found
  | 'scanned_no_match'      // Video from batch scanned, no matches
  | 'error_youtube_dl'      // Error downloading from YouTube for this video
  | 'error_ffmpeg'          // Error processing audio with FFmpeg for this video
  | 'skipped_previously_scanned' 

  // Statuses for items from Spotify Playlist Import
  | 'imported_spotify_track' // Track successfully imported from Spotify playlist

  // Generic/fallback for other items
  | 'aborted_item'           // Item processing aborted as part of job abort
  | 'error_processing_item';  // Generic error for an item not covered above


export interface TrackScanLog {
  logId: string;
  scanJobId: string; // Should always be present now
  originalFileName: string; 
  originalFileSize: number; 
  scanDate: string; // Date this log entry was created/finalized
  matches: AcrCloudMatch[];
  status: TrackScanLogStatus;
  platformSource: PlatformSource;
  youtubeVideoId?: string; // For YouTube items
  youtubeVideoTitle?: string; // For YouTube items
  sourceUrl?: string; // Original URL of the video/track if applicable
  acrResponseDetails?: string; // To store ACR Cloud error responses or other metadata for this item
  lastAttemptedAt?: string; // Timestamp of the last processing attempt for this item
}

export type YouTubeUploadType = 
  | 'youtube_channel_instrumental_batch' 
  | 'youtube_playlist_instrumental_batch';
  // Single types 'youtube_instrumental' and 'youtube_song' might be initiated as simpler jobs or deprecated.
  // For now, assuming batch types are the primary YouTube job initiators.


export interface SpotifyFollowerSuccess {
  status: 'success'; artistId: string; followers: number | undefined; popularity?: number; genres?: string[];
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

// --- New Job System Types ---
export type JobType = 
  | 'file_upload_batch' 
  | 'youtube_channel_instrumental_batch' 
  | 'youtube_playlist_instrumental_batch'
  | 'spotify_playlist_import'; 

export type JobStatus =
  | 'pending_setup'        // Job created, initial setup (e.g. preparing file list for YT)
  | 'pending_upload'       // For file_upload_batch, waiting for files to be uploaded
  | 'uploading_files'      // Actively receiving files for file_upload_batch
  | 'queued_for_processing'// All initial inputs received, ready for backend processing queue
  | 'in_progress_fetching' // Actively fetching items (e.g., YouTube video list)
  | 'in_progress_processing'// Actively processing items (e.g., scanning files/videos)
  | 'completed'              // All items processed successfully or skipped as appropriate
  | 'completed_with_errors'  // Some items failed, but job finished non-critical items
  | 'failed_acr_credits'   // Paused due to ACR Cloud credit limit - resumable
  | 'failed_youtube_api'   // Non-resumable error fetching video list from YouTube
  | 'failed_setup'         // Critical error during initial job setup (e.g. invalid input for YT)
  | 'failed_upload_incomplete' // File upload job where not all declared files were uploaded successfully - resumable
  | 'failed_other'           // Other critical, non-resumable errors
  | 'aborted';                 // User aborted the job

export interface JobFileState {
    originalFileName: string;
    originalFileSize: number;
    status: 'pending' | 'uploading' | 'uploaded' | 'processing' | 'completed_match' | 'completed_no_match' | 'error_upload' | 'error_processing' | 'error_acr_credits_item';
    errorMessage?: string;
    uploadedBytes?: number;
    matches?: string[]; // Array of TrackScanLog IDs related to this file's matches
}

export interface ScanJob {
  jobId: string;
  jobName: string; 
  jobType: JobType;
  status: JobStatus;
  originalInputUrl?: string; // For URL-based jobs
  
  totalItems: number;        // Files to upload, videos in playlist, etc.
  itemsProcessed: number;    // Items that have had a processing attempt
  itemsWithMatches: number;  // Items where matches were found
  itemsFailed: number;       // Items that failed processing (non-ACR credit errors)
  
  files?: JobFileState[]; // Only for 'file_upload_batch' type

  lastErrorMessage?: string; // General job error message
  lastProcessedItemInfo?: { 
    itemName?: string;       // e.g., file name, video title
    status?: TrackScanLogStatus | JobFileState['status']; // Status of that specific item's processing
  };
  
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// API Response Types for Jobs
export interface JobCreationResponse extends ScanJob {} // Response when a job is created
export interface AllJobsResponse { jobs: ScanJob[]; }    // Response for getting all jobs
export interface SingleJobResponse extends ScanJob {}   // Response for getting a single job
// For file uploads, the response might also include specific file state updates.
export interface FileUploadResponse { 
  message: string; 
  fileState: JobFileState; 
  jobUpdate?: ScanJob; // Optional: If the overall job status changed due to this upload
}
