
// Manual type definition for import.meta.env to address issues if 'vite/client'
// types are not picked up automatically.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  // Add any other environment variables you use from import.meta.env here
  // e.g., readonly VITE_ANOTHER_VAR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Manual declaration of the Spotify namespace and its commonly used types.
// This is a workaround if the '@types/spotify-web-playback-sdk' are not correctly
// resolved by TypeScript in your environment.
declare namespace Spotify {
  interface Entity {
    name: string;
    uri: string;
    url?: string; // Optional as not always present/used
  }

  interface Image {
    height?: number | null;
    url: string;
    width?: number | null;
  }

  interface Album {
    uri: string;
    name: string;
    images: Image[];
  }

  interface Artist extends Entity {}

  interface Track {
    uri: string;
    id: string | null;
    type: 'track' | 'episode' | 'ad';
    media_type: 'audio' | 'video';
    name: string;
    is_playable: boolean;
    album: Album;
    artists: Artist[];
    duration_ms: number;
  }

  interface PlaybackRestrictions {
    disallow_seeking_reasons?: string[];
    disallow_skipping_prev_reasons?: string[];
    // Add other restriction reasons if needed
  }

  interface PlaybackDisallows {
    pausing?: boolean;
    resuming?: boolean;
    seeking?: boolean;
    skipping_next?: boolean;
    skipping_prev?: boolean;
    // Add other disallow reasons if needed
  }

  interface PlaybackContext {
    uri: string | null;
    metadata: Record<string, any> | null;
    // Add other context properties if needed
  }

  interface PlaybackTrackWindow {
    current_track: Track;
    previous_tracks: Track[];
    next_tracks: Track[];
  }

  interface PlaybackState {
    context: PlaybackContext;
    disallows: PlaybackDisallows;
    duration: number;
    paused: boolean;
    position: number;
    repeat_mode: 0 | 1 | 2; // 0: no-repeat, 1: context-repeat, 2: track-repeat
    shuffle: boolean;
    track_window: PlaybackTrackWindow;
    timestamp: number;
    restrictions: PlaybackRestrictions;
  }

  interface PlayerInit {
    name: string;
    getOAuthToken: (cb: (token: string) => void) => void;
    volume?: number;
  }

  // Error interface is distinct from ErrorTypes
  interface Error { // This 'Error' is for event payloads, not the type union below
    message: string;
  }

  // This 'ErrorTypes' is a union of strings for event names or error categories
  type ErrorTypes =
    | 'initialization_error'
    | 'authentication_error'
    | 'account_error'
    | 'playback_error';
    // Add other known error types if needed


  interface PlayerEventsMap {
    ready: (data: { device_id: string }) => void;
    not_ready: (data: { device_id: string }) => void;
    player_state_changed: (state: PlaybackState | null) => void;
    initialization_error: (error: Spotify.Error) => void; // Use Spotify.Error for clarity
    authentication_error: (error: Spotify.Error) => void;
    account_error: (error: Spotify.Error) => void;
    playback_error: (error: Spotify.Error) => void;
    // Define other events like 'autoplay_failed' if you handle them
  }

  // This 'Player' class is the SDK's player object
  class Player {
    constructor(options: PlayerInit);
    connect(): Promise<boolean>;
    disconnect(): void;
    activateElement(): Promise<void>;

    addListener<K extends keyof PlayerEventsMap>(event: K, cb: PlayerEventsMap[K]): boolean;
    on<K extends keyof PlayerEventsMap>(event: K, cb: PlayerEventsMap[K]): boolean; // Alias
    removeListener<K extends keyof PlayerEventsMap>(event: K, cb?: PlayerEventsMap[K]): boolean;

    getCurrentState(): Promise<PlaybackState | null>;
    getVolume(): Promise<number | null>;
    nextTrack(): Promise<void>;
    pause(): Promise<void>;
    previousTrack(): Promise<void>;
    resume(): Promise<void>;
    seek(position_ms: number): Promise<void>;
    setName(name: string): Promise<void>;
    setVolume(volume: number): Promise<void>;
    togglePlay(): Promise<void>;
  }
}
