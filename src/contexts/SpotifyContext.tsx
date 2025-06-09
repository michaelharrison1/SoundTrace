
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SpotifyPlayerState, SpotifyPlayerContextType, SpotifyUserInfo } from '../types'; // Added SpotifyUserInfo
import { spotifyService } from '../services/spotifyService'; // Your new service

declare global {
  interface Window {
    Spotify: typeof Spotify;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

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
  // No direct token prop anymore, it's managed internally
}

// SpotifyUserInfo is now imported from types.ts

export const SpotifyProvider: React.FC<SpotifyProviderProps> = ({ children }) => {
  const [player, setPlayer] = useState<Spotify.Player | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isSdkReady, setIsSdkReady] = useState(false); // SDK script loaded
  const [isPlayerReady, setIsPlayerReady] = useState(false); // Player initialized and connected
  const [isActive, setIsActive] = useState(false); // Player is the active device
  const [currentState, setCurrentState] = useState<SpotifyPlayerState | null>(null);

  const [isLoadingSpotifyAuth, setIsLoadingSpotifyAuth] = useState(true);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [spotifyUser, setSpotifyUser] = useState<SpotifyUserInfo | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  const [isLoadingPlayback, setIsLoadingPlayback] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [currentPlayingTrackInfo, setCurrentPlayingTrackInfo] = useState<{trackId: string | null, name: string, artist: string, uri: string} | null>(null);

  const soundTraceAuthToken = localStorage.getItem('authToken'); // Main app auth token

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://soundtracebackend.onrender.com'; // Use Vite env var


  const initiateSpotifyLogin = () => {
    // Redirects to backend which then redirects to Spotify
    window.location.href = `${API_BASE_URL}/api/auth/spotify/login`;
  };

  const disconnectSpotify = useCallback(async () => {
    try {
      await spotifyService.disconnect();
      setIsSpotifyConnected(false);
      setSpotifyUser(null);
      if (player) {
        player.disconnect();
      }
      setPlayer(null);
      setIsPlayerReady(false);
      // Clear any Spotify related local storage if needed
    } catch (error) {
      console.error("Error disconnecting Spotify:", error);
      // Handle error display
    }
  }, [player]);

  const refreshAccessToken = useCallback(async () => {
    if (!soundTraceAuthToken) return null;
    console.log("Attempting to refresh Spotify token...");
    try {
      const { accessToken, expiresAt } = await spotifyService.refreshToken();
      setSpotifyUser(prev => prev ? { ...prev, accessToken, expiresAt } : null);
      setNeedsRefresh(false);
      console.log("Spotify token refreshed successfully.");
      return accessToken;
    } catch (error) {
      console.error("Failed to refresh Spotify token:", error);
      // If refresh fails (e.g., refresh token revoked), disconnect
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

  // Check status on mount and when main app auth token changes
  useEffect(() => {
    checkSpotifyStatus();
  }, [checkSpotifyStatus]);


  // Effect for Spotify Web Playback SDK Initialization
  useEffect(() => {
    if (!isSpotifyConnected || !spotifyUser?.accessToken || !isSdkReady) {
      if (player) {
        player.disconnect();
        setPlayer(null);
        setIsPlayerReady(false);
      }
      return;
    }

    if (player) return; // Player already initialized

    console.log("Spotify connected, user token available. Initializing Spotify Player SDK...");
    const spotifyPlayerInstance = new window.Spotify.Player({
      name: 'SoundTrace Player',
      getOAuthToken: async (cb: (token: string) => void) => {
        // Check if current token is expired or needs refresh
        if (spotifyUser && new Date(spotifyUser.expiresAt) < new Date(Date.now() - 5 * 60 * 1000)) { // 5 min buffer
          console.log("Spotify SDK requesting token, current one is expired or nearing expiry. Refreshing...");
          const newAccessToken = await refreshAccessToken();
          if (newAccessToken) {
            cb(newAccessToken);
          } else {
            // Handle failure to refresh, perhaps by disconnecting
            console.error("SDK: Failed to refresh token for playback.");
            // cb(''); // Provide empty token or handle error
            disconnectSpotify(); // Force disconnect if token cannot be refreshed
          }
        } else if (spotifyUser) {
          cb(spotifyUser.accessToken);
        } else {
           console.warn("SDK: No Spotify user or access token available for getOAuthToken.");
           // cb(''); // Should not happen if isSpotifyConnected is true
        }
      },
      volume: 0.5
    });

    spotifyPlayerInstance.addListener('ready', ({ device_id }: { device_id: string }) => {
      console.log('Spotify Player SDK ready with Device ID:', device_id);
      setDeviceId(device_id);
      setIsPlayerReady(true);
    });
    spotifyPlayerInstance.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.log('Device ID has gone offline:', device_id);
      setIsPlayerReady(false);
    });
    spotifyPlayerInstance.addListener('player_state_changed', (state: Spotify.PlaybackState | null) => {
       if (!state) {
        setIsActive(false);
        // setCurrentState(null); // Keep last state for a bit?
        console.warn("Spotify player_state_changed: state is null.");
        return;
      }
      setCurrentState(state as SpotifyPlayerState); // Cast, as our type is a subset
      setIsActive(true); // If we get a state, player is active on this device.
      const currentTrack = state.track_window.current_track;
      if (currentTrack) {
        setCurrentPlayingTrackInfo({
          trackId: currentTrack.id,
          name: currentTrack.name,
          artist: currentTrack.artists.map((a: Spotify.Artist) => a.name).join(', '),
          uri: currentTrack.uri,
        });
      }
      setIsLoadingPlayback(false); // Assume loading ends when state changes
      setPlaybackError(null);
    });

    const errorEventTypes: Spotify.ErrorTypes[] = ['initialization_error', 'authentication_error', 'account_error', 'playback_error'];
    errorEventTypes.forEach(errorType => {
        spotifyPlayerInstance.addListener(errorType, (e: Spotify.Error) => {
            console.error(`Spotify SDK Error - ${errorType}:`, e.message);
            setPlaybackError(e.message);
            if (errorType === 'authentication_error') {
                // Token might be invalid, try to refresh or disconnect
                console.log("Authentication error with SDK, attempting to refresh token or disconnect.");
                refreshAccessToken().catch(() => disconnectSpotify());
            }
            setIsLoadingPlayback(false);
        });
    });

    spotifyPlayerInstance.connect().then((success: boolean) => {
      if (success) {
        console.log('Spotify Player SDK connected successfully!');
        setPlayer(spotifyPlayerInstance);
      } else {
        console.error('Spotify Player SDK failed to connect.');
        setIsPlayerReady(false);
      }
    }).catch((error: Error) => {
      console.error('Error connecting Spotify Player SDK:', error);
      setIsPlayerReady(false);
    });

    return () => {
      if (spotifyPlayerInstance) {
        console.log("Disconnecting Spotify player SDK instance from context cleanup.");
        spotifyPlayerInstance.disconnect();
      }
    };
  }, [isSpotifyConnected, spotifyUser, isSdkReady, player, refreshAccessToken, disconnectSpotify]);


  // SDK Loader
  useEffect(() => {
    if (window.Spotify) {
      setIsSdkReady(true);
      return;
    }
    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log("Spotify SDK is ready via onSpotifyWebPlaybackSDKReady global callback.");
      setIsSdkReady(true);
    };
    // If the script is already loaded but onSpotifyWebPlaybackSDKReady hasn't fired (e.g. due to race condition or script error)
    // this won't re-trigger. Ensure the script tag for Spotify SDK exists in index.html.
    const script = document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]');
    if (script && window.Spotify) { // If script tag exists and Spotify global is already there
        setIsSdkReady(true);
    }

  }, []);

  const playTrack = useCallback(async (trackUri: string, spotifyTrackId?: string, initialTrackName: string = 'Track', initialArtistName: string = 'Artist') => {
    if (!player || !deviceId || !isPlayerReady || !spotifyUser?.accessToken) {
      console.warn('Spotify Player not ready or no access token.', { player, deviceId, isPlayerReady, tokenExists: !!spotifyUser?.accessToken });
      setPlaybackError('Spotify Player is not connected or ready.');
      return;
    }

    setCurrentPlayingTrackInfo({ trackId: spotifyTrackId || null, name: initialTrackName, artist: initialArtistName, uri: trackUri });
    setIsLoadingPlayback(true);
    setPlaybackError(null);

    try {
      // Activating element ensures SDK's iframe is ready for playback commands
      await player.activateElement();

      const currentAccessToken = (spotifyUser && new Date(spotifyUser.expiresAt) < new Date(Date.now() - 60 * 1000))
        ? await refreshAccessToken()
        : spotifyUser?.accessToken;

      if (!currentAccessToken) {
        throw new Error("Spotify access token is unavailable after refresh attempt.");
      }

      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: [trackUri] }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentAccessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to play track. Status: ${response.status}` }));
        console.error('Spotify API Play Error:', errorData);
        let specificError = errorData.message || `Failed to play track (Status: ${response.statusText})`;
        if (errorData.error?.reason === 'PREMIUM_REQUIRED') specificError = 'Spotify Premium is required for playback.';
        else if (errorData.error?.message) specificError = `Spotify Error: ${errorData.error.message}`;
        setPlaybackError(specificError);
        setIsLoadingPlayback(false);
        return;
      }
      // Playback successfully initiated, player_state_changed event will handle UI updates.
      // No need to setIsLoadingPlayback(false) here, player_state_changed will do it.
    } catch (err: any) {
      console.error('Error in playTrack function:', err);
      setPlaybackError(err.message || 'Could not start playback.');
      setIsLoadingPlayback(false);
    }
  }, [player, deviceId, isPlayerReady, spotifyUser, refreshAccessToken]);

  const value: SpotifyPlayerContextType = {
    player,
    deviceId,
    isReady: isPlayerReady && isSpotifyConnected,
    isActive,
    currentState,
    playTrack,
    currentPlayingTrackInfo,
    isLoadingPlayback,
    playbackError,
    // New additions for OAuth flow
    isSpotifyConnected,
    spotifyUser,
    isLoadingSpotifyAuth,
    initiateSpotifyLogin,
    disconnectSpotify,
    checkSpotifyStatus,
    needsRefresh,
    refreshSpotifyToken: refreshAccessToken,
  };

  return <SpotifyContext.Provider value={value}>{children}</SpotifyContext.Provider>;
};

// Component to handle the redirect from backend after Spotify OAuth
export const SpotifyCallbackReceiver: React.FC = () => {
  const { checkSpotifyStatus } = useSpotifyPlayer();
  const [message, setMessage] = useState("Processing Spotify login...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const errorMsg = params.get('message');

    if (status === 'success') {
      setMessage("Spotify connected successfully! Redirecting...");
      checkSpotifyStatus(true).then(() => {
         window.location.replace(window.location.pathname.split('/spotify-callback-receiver')[0] || '/'); // Redirect to home/dashboard
      });
    } else {
      setMessage(`Spotify connection failed: ${errorMsg || 'Unknown error'}. Please try again.`);
      // Optionally redirect to login or show a button to retry
      // For now, just displays message. User might need to manually navigate or retry.
      // setTimeout(() => window.location.replace('/'), 5000); // Redirect after a delay
    }
  }, [checkSpotifyStatus]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#C0C0C0] p-4">
      <div className="win95-border-outset bg-[#C0C0C0] p-4 text-center">
        <p className="text-black mb-2">{message}</p>
        {message.includes("failed") && (
            <button
                onClick={() => window.location.replace(window.location.pathname.split('/spotify-callback-receiver')[0] || '/')}
                className="px-3 py-1 text-base bg-[#C0C0C0] text-black border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] shadow-[1px_1px_0px_#000000]"
            >
                Go to App
            </button>
        )}
      </div>
    </div>
  );
};
