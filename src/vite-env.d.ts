
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  // add other env vars here
  // e.g., readonly VITE_ANOTHER_VAR: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Manual declaration of the Spotify namespace and its commonly used types
// removed for @types/spotify-web-playback-sdk compatibility
// install @types/spotify-web-playback-sdk if missing