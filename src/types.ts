
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
  | 'file_upload_batch_item' 
  | 'youtube_channel_instrumental_batch_item' 
  | 'youtube_playlist_instrumental_batch_item' 
  | 'spotify_playlist_import_item'
  | 'youtube_video_instrumental_single_item' // For a single YouTube video scanned
  | 'youtube_video_manual_add_item';      // For a single YouTube video manually added

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
  
  // Statuses for manually added items
  | 'manually_added_youtube_video' // Single YouTube video manually added without scan

  // Generic/fallback for other items
  | 'manually_added' // Generic manual add, might be phased out
  | 'aborted_item'           // Item processing aborted as part of job abort
  | 'error_processing_item';  // Generic error for an item not covered above


export interface TrackScanLog {
  logId: string;
  scanJobId: string; 
  originalFileName: string; 
  originalFileSize: number; 
  scanDate: string; 
  matches: AcrCloudMatch[];
  status: TrackScanLogStatus;
  platformSource: PlatformSource;
  youtubeVideoId?: string; 
  youtubeVideoTitle?: string; 
  sourceUrl?: string; 
  acrResponseDetails?: string; 
  lastAttemptedAt?: string; 
}

export type YouTubeUploadType = 
  | 'youtube_channel_instrumental_batch' 
  | 'youtube_playlist_instrumental_batch';


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
  | 'spotify_playlist_import'
  | 'youtube_video_instrumental_single' // For scanning a single YouTube video
  | 'youtube_video_manual_add';      // For manually adding a single YouTube video

export type JobStatus =
  | 'pending_setup'        
  | 'pending_upload'       
  | 'uploading_files'      
  | 'queued_for_processing'
  | 'in_progress_fetching' 
  | 'in_progress_processing'
  | 'completed'              
  | 'completed_with_errors'  
  | 'failed_acr_credits'   
  | 'failed_youtube_api'   
  | 'failed_setup'         
  | 'failed_upload_incomplete' 
  | 'failed_other'           
  | 'aborted';                 

export interface JobFileState {
    originalFileName: string;
    originalFileSize: number;
    status: 'pending' | 'uploading' | 'uploaded' | 'processing' | 'completed_match' | 'completed_no_match' | 'error_upload' | 'error_processing' | 'error_acr_credits_item';
    errorMessage?: string;
    uploadedBytes?: number;
    matches?: string[]; 
}

export interface ScanJob {
  id: string; 
  jobName: string; 
  jobType: JobType;
  status: JobStatus;
  originalInputUrl?: string; 
  
  totalItems: number;        
  itemsProcessed: number;    
  itemsWithMatches: number;  
  itemsFailed: number;       
  
  files?: JobFileState[]; 

  lastErrorMessage?: string; 
  lastProcessedItemInfo?: { 
    itemName?: string;       
    status?: TrackScanLogStatus | JobFileState['status']; 
  };
  
  createdAt: string; 
  updatedAt: string; 
}

// API Response Types for Jobs
export interface JobCreationResponse extends ScanJob {} 
export interface AllJobsResponse { jobs: ScanJob[]; }    
export interface SingleJobResponse extends ScanJob {}   
export interface FileUploadResponse { 
  message: string; 
  fileState: JobFileState; 
  jobUpdate?: ScanJob; 
}