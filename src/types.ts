
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
  errorMessage?: string; 
}

export type PlatformSource =
  | 'file_upload_batch_item' 
  | 'youtube_channel_instrumental_batch_item' 
  | 'youtube_playlist_instrumental_batch_item' 
  | 'youtube_video_instrumental_single_item' 
  | 'spotify_playlist_import_item'; 

export type TrackScanLogStatus =
  | 'pending_processing'   
  | 'processing_acr_scan'   
  | 'completed_match_found' 
  | 'completed_no_match'    
  | 'error_acr_scan'        
  | 'error_acr_credits_item'
  | 'pending_scan'          
  | 'processing_scan'       
  | 'scanned_match_found'   
  | 'scanned_no_match'      
  | 'error_youtube_dl'      
  | 'error_ffmpeg'          
  | 'skipped_previously_scanned'
  | 'imported_spotify_track' 
  | 'aborted_item'           
  | 'error_processing_item';  

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

export interface SpotifyFollowerSuccess { status: 'success'; artistId: string; followers: number | undefined; popularity?: number; genres?: string[]; }
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
  | 'youtube_video_instrumental_single' 
  | 'spotify_playlist_import';

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

export interface JobCreationResponse extends ScanJob {} 
export interface AllJobsResponse { jobs: ScanJob[]; }    
export interface SingleJobResponse extends ScanJob {}   
export interface FileUploadResponse {
  message: string;
  fileState: JobFileState;
  jobUpdate?: ScanJob; 
}

// YouTube Channel Selection Types
export interface YouTubeChannel {
  id: string;
  title: string;
  thumbnailUrl?: string;
}

// Updated GoogleUserProfile to include selected channel details from backend
export interface GoogleUserProfile {
  googleId?: string;
  googleEmail?: string;
  googleDisplayName?: string;
  googleAvatarUrl?: string;
  selectedYouTubeChannelId?: string; // From backend if already selected
  selectedYouTubeChannelTitle?: string;
  selectedYouTubeChannelThumbnailUrl?: string;
}
