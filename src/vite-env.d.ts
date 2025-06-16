/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  // Add any other environment variables you use from import.meta.env here
  // e.g., readonly VITE_ANOTHER_VAR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Manual declaration of the Spotify namespace and its commonly used types
// removed to prevent conflicts with potentially resolved official @types/spotify-web-playback-sdk types.
// If Spotify types are not found after this, ensure @types/spotify-web-playback-sdk is installed and correctly configured.
