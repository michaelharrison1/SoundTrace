
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SpotifyPlayerContextType, SpotifyUserInfo, SpotifyPlaylist } from '../types';
import { spotifyService } from '../services/spotifyService';

// Remove global Spotify SDK type declarations as SDK is no longer used.

const SpotifyContext = createContext<SpotifyPlayerContextType | undefined>(undefined);

export const useSpotifyPlayer = (): SpotifyPlayerContextType => {
  const context = useContext(SpotifyContext);
  if (!context) {
    throw new Error('useSpotifyPlayer must be used within a SpotifyProvider');
  }
  return context;
};

interface SpotifyProviderProps {
  children: ReactNode;
}

export const SpotifyProvider: React.FC<SpotifyProviderProps> = ({ children }) => {
  // Removed state related to Web Playback SDK
  // const [player, setPlayer] = useState<Spotify.Player | null>(null);
  // const [deviceId, setDeviceId] = useState<string | null>(null);
  // const [isSdkReady, setIsSdkReady] = useState(false);
  // const [isPlayerReady, setIsPlayerReady] = useState(false);
  // const [isActive, setIsActive] = useState(false);
  // const [currentState, setCurrentState] = useState<SpotifyPlayerState | null>(null);
  // const [isLoadingPlayback, setIsLoadingPlayback] = useState(false);
  // const [playbackError, setPlaybackError] = useState<string | null>(null);
  // const [currentPlayingTrackInfo, setCurrentPlayingTrackInfo] = useState<{trackId: string | null, name: string, artist: string, uri: string} | null>(null);


  const [isLoadingSpotifyAuth, setIsLoadingSpotifyAuth] = useState(true);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [spotifyUser, setSpotifyUser] = useState<SpotifyUserInfo | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  const soundTraceAuthToken = localStorage.getItem('authToken');

  const defaultApiBaseUrl = 'https://api.soundtrace.uk';
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;

  const initiateSpotifyLogin = () => {
    window.location.href = `${API_BASE_URL}/api/auth/spotify/login`;
  };

  const disconnectSpotify = useCallback(async () => {
    try {
      await spotifyService.disconnect();
      setIsSpotifyConnected(false);
      setSpotifyUser(null);
      // No player to disconnect
    } catch (error) {
      console.error("Error disconnecting Spotify:", error);
    }
  }, []);

  const refreshAccessToken = useCallback(async () => {
    if (!soundTraceAuthToken) return null;
    try {
      const { accessToken, expiresAt } = await spotifyService.refreshToken();
      setSpotifyUser(prev => prev ? { ...prev, accessToken, expiresAt } : null);
      setNeedsRefresh(false);
      return accessToken;
    } catch (error) {
      console.error("Failed to refresh Spotify token:", error);
      await disconnectSpotify();
      return null;
    }
  }, [soundTraceAuthToken, disconnectSpotify]);


  const checkSpotifyStatus = useCallback(async (isCallback = false) => {
    if (!soundTraceAuthToken) {
      setIsLoadingSpotifyAuth(false);
      setIsSpotifyConnected(false);
      setSpotifyUser(null);
      return;
    }
    setIsLoadingSpotifyAuth(true);
    try {
      const status = await spotifyService.getConnectionStatus();
      if (status.isConnected && status.spotifyUser) {
        setIsSpotifyConnected(true);
        setSpotifyUser(status.spotifyUser);
        setNeedsRefresh(new Date(status.spotifyUser.expiresAt) < new Date());
      } else {
        setIsSpotifyConnected(false);
        setSpotifyUser(null);
        if (status.needsRefresh) {
          setNeedsRefresh(true);
        }
      }
    } catch (error) {
      console.error("Error checking Spotify status:", error);
      setIsSpotifyConnected(false);
      setSpotifyUser(null);
    } finally {
      setIsLoadingSpotifyAuth(false);
    }
  }, [soundTraceAuthToken]);

  useEffect(() => {
    checkSpotifyStatus();
  }, [checkSpotifyStatus]);

  // Removed SDK Loader and SDK Initialization effects

  const createPlaylistAndAddTracks = async (
    playlistName: string,
    trackUris: string[],
    description: string = "Exported from SoundTrace"
  ): Promise<{playlistUrl?: string; error?: string}> => {
    if (!isSpotifyConnected || !spotifyUser) {
      return { error: "Not connected to Spotify." };
    }

    // Ensure token is fresh before making API calls
    if (new Date(spotifyUser.expiresAt) < new Date(Date.now() - 5 * 60 * 1000)) { // 5 min buffer
      const newAccessToken = await refreshAccessToken();
      if (!newAccessToken) {
        return { error: "Failed to refresh Spotify token. Cannot create playlist."};
      }
    }

    try {
      const result = await spotifyService.createPlaylistAndAddTracks(playlistName, trackUris, description);
      return { playlistUrl: result.playlistUrl };
    } catch (err: any) {
      console.error("Error creating playlist and adding tracks:", err);
      return { error: err.message || "Failed to export playlist." };
    }
  };

  const value: SpotifyPlayerContextType = {
    isReady: isSpotifyConnected && !!spotifyUser, // Simplified readiness
    isSpotifyConnected,
    spotifyUser,
    isLoadingSpotifyAuth,
    initiateSpotifyLogin,
    disconnectSpotify,
    checkSpotifyStatus,
    needsRefresh,
    refreshSpotifyToken: refreshAccessToken,
    createPlaylistAndAddTracks,
  };

  return <SpotifyContext.Provider value={value}>{children}</SpotifyContext.Provider>;
};

export const SpotifyCallbackReceiver: React.FC = () => {
  const { checkSpotifyStatus } = useSpotifyPlayer();
  const [message, setMessage] = useState("Processing Spotify login...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const errorMsg = params.get('message');

    if (status === 'success') {
      setMessage("Spotify connected successfully! Redirecting to your dashboard...");
      checkSpotifyStatus(true).then(() => {
         window.location.replace(window.location.origin + (window.location.pathname.split('/spotify-callback-receiver')[0] || '/'));
      });
    } else {
      let displayError = 'Unknown error occurred during Spotify connection.';
      if (errorMsg) {
        if (errorMsg.toLowerCase().includes('statemismatch')) displayError = "Login session expired or was invalid. Please try connecting to Spotify again.";
        else if (errorMsg.toLowerCase().includes('accessdenied')) displayError = "Spotify connection was denied. Please try again and approve access.";
        else if (errorMsg.toLowerCase().includes('missingverifier')) displayError = "A technical issue occurred (missing verifier). Please try again.";
        else displayError = `Spotify connection failed: ${errorMsg}. Please try again.`;
      }
      setMessage(displayError);
    }
  }, [checkSpotifyStatus]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#C0C0C0] p-4">
      <div className="win95-border-outset bg-[#C0C0C0] p-6 text-center shadow-lg max-w-md">
        <h2 className="text-xl font-normal text-black mb-3">Spotify Connection</h2>
        <p className="text-black mb-4 text-sm">{message}</p>
        {(message.includes("failed") || message.includes("expired") || message.includes("denied") || message.includes("issue occurred")) && (
            <button
                onClick={() => window.location.replace(window.location.origin + (window.location.pathname.split('/spotify-callback-receiver')[0] || '/'))}
                className="px-4 py-1.5 text-base bg-[#C0C0C0] text-black border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] shadow-[1px_1px_0px_#000000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] active:border-t-[#808080] active:border-l-[#808080] active:border-b-white active:border-r-white"
            >
                Return to App
            </button>
        )}
      </div>
    </div>
  );
};
