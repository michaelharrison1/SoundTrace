
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

  // Ensure VITE_API_BASE_URL is set in your environment for production.
  const defaultApiBaseUrl = 'https://api.soundtrace.uk';
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl;


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


  // SDK Loader
  useEffect(() => {
    // Ensure the global callback is defined.
    // This will be called by the Spotify SDK script once it's loaded and initialized.
    if (!window.onSpotifyWebPlaybackSDKReady) {
        window.onSpotifyWebPlaybackSDKReady = () => {
        console.log("Spotify SDK is ready via onSpotifyWebPlaybackSDKReady global callback.");
        setIsSdkReady(true);
        };
    }

    // If the Spotify SDK (window.Spotify) is already available, it means the script has loaded.
    // We can then set our SDK ready state to true.
    // This handles cases where the script loads before this effect runs or due to HMR.
    if (window.Spotify) {
        console.log("Spotify SDK (window.Spotify) already available on effect run.");
        setIsSdkReady(true);
    }

    // Check if the script tag itself is present, for debugging.
    const script = document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]');
    if (!script) {
        console.error("Spotify SDK script tag not found in document. Please ensure it's in index.html and has the 'defer' attribute.");
    }
  }, []);


  // Effect for Spotify Web Playback SDK Initialization (depends on isSdkReady and user auth)
  useEffect(() => {
    if (!isSpotifyConnected || !spotifyUser?.accessToken || !isSdkReady) {
      if (player) {
        console.log("SpotifyContext: Player exists, but prerequisites not met (connected, token, SDK ready). Disconnecting player.");
        player.disconnect();
        setPlayer(null);
        setIsPlayerReady(false);
      }
      return;
    }

    if (player) { // Player already initialized
        console.log("SpotifyContext: Player already initialized. Skipping re-initialization.");
        return;
    }

    console.log("SpotifyContext: Prerequisites met (Spotify connected, user token available, SDK script ready). Initializing Spotify Player SDK instance...");
    const spotifyPlayerInstance = new window.Spotify.Player({
      name: 'SoundTrace Player',
      getOAuthToken: async (cb: (token: string) => void) => {
        if (spotifyUser && new Date(spotifyUser.expiresAt) < new Date(Date.now() - 5 * 60 * 1000)) { // 5 min buffer
          console.log("SpotifyContext SDK: Token expired or nearing expiry. Refreshing...");
          const newAccessToken = await refreshAccessToken();
          if (newAccessToken) {
            cb(newAccessToken);
          } else {
            console.error("SpotifyContext SDK: Failed to refresh token for playback. Disconnecting.");
            disconnectSpotify();
          }
        } else if (spotifyUser?.accessToken) {
          cb(spotifyUser.accessToken);
        } else {
           console.warn("SpotifyContext SDK: No Spotify user or access token for getOAuthToken. Disconnecting.");
           disconnectSpotify(); // Force disconnect
        }
      },
      volume: 0.5
    });

    spotifyPlayerInstance.addListener('ready', ({ device_id }: { device_id: string }) => {
      console.log('SpotifyContext SDK: Player ready. Device ID:', device_id);
      setDeviceId(device_id);
      setIsPlayerReady(true); // This indicates the SDK player instance is ready
    });
    spotifyPlayerInstance.addListener('not_ready', ({ device_id }: { device_id: string }) => {
      console.log('SpotifyContext SDK: Device ID has gone offline:', device_id);
      setIsPlayerReady(false); // SDK player instance not ready
    });
    spotifyPlayerInstance.addListener('player_state_changed', (state: Spotify.PlaybackState | null) => {
       if (!state) {
        setIsActive(false); // Consider if player is still "active"
        console.warn("SpotifyContext SDK: player_state_changed: state is null.");
        return;
      }
      setCurrentState(state as SpotifyPlayerState);
      setIsActive(true); // Player is active and reporting state
      const currentTrack = state.track_window.current_track;
      if (currentTrack) {
        setCurrentPlayingTrackInfo({
          trackId: currentTrack.id,
          name: currentTrack.name,
          artist: currentTrack.artists.map((a: Spotify.Artist) => a.name).join(', '),
          uri: currentTrack.uri,
        });
      }
      setIsLoadingPlayback(false);
      setPlaybackError(null);
    });

    const errorEventTypes: Spotify.ErrorTypes[] = ['initialization_error', 'authentication_error', 'account_error', 'playback_error'];
    errorEventTypes.forEach(errorType => {
        spotifyPlayerInstance.addListener(errorType, (e: Spotify.Error) => {
            console.error(`SpotifyContext SDK Error - ${errorType}:`, e.message);
            setPlaybackError(e.message);
            if (errorType === 'authentication_error') {
                console.log("SpotifyContext SDK: Authentication error, attempting refresh or disconnect.");
                refreshAccessToken().catch(() => disconnectSpotify());
            }
             if (errorType === 'account_error' && (e.message.includes('premium') || e.message.includes('Premium'))) {
                setPlaybackError('Spotify Premium is required for playback control via this app.');
            }
            setIsLoadingPlayback(false);
        });
    });

    spotifyPlayerInstance.connect().then((success: boolean) => {
      if (success) {
        console.log('SpotifyContext SDK: Player connected successfully to Spotify backend!');
        setPlayer(spotifyPlayerInstance);
        // isPlayerReady will be set by the 'ready' event listener
      } else {
        console.error('SpotifyContext SDK: Player failed to connect to Spotify backend.');
        setIsPlayerReady(false);
      }
    }).catch((error: Error) => {
      console.error('SpotifyContext SDK: Error connecting player:', error);
      setIsPlayerReady(false);
    });

    return () => {
      if (spotifyPlayerInstance) {
        console.log("SpotifyContext: Cleaning up. Disconnecting Spotify player SDK instance.");
        spotifyPlayerInstance.disconnect();
      }
    };
  }, [isSpotifyConnected, spotifyUser, isSdkReady, player, refreshAccessToken, disconnectSpotify]);


  const playTrack = useCallback(async (trackUri: string, spotifyTrackId?: string, initialTrackName: string = 'Track', initialArtistName: string = 'Artist') => {
    if (!player || !deviceId || !isPlayerReady || !spotifyUser?.accessToken) {
      console.warn('SpotifyContext: Playback attempt failed. Player/Device/Token not ready.', {
         playerExists: !!player,
         hasDeviceId: !!deviceId,
         isPlayerReady, // This indicates SDK instance ready
         hasToken: !!spotifyUser?.accessToken,
         isSpotifyConnected // User is authenticated with our backend for Spotify
        });
      setPlaybackError('Spotify Player is not connected or ready.');
      if (!isSpotifyConnected) {
        setPlaybackError('Connect to Spotify first to enable playback.');
      } else if (!isPlayerReady) {
         setPlaybackError('SoundTrace Player is not ready. Try refreshing or selecting it in your Spotify app.');
      }
      return;
    }

    setCurrentPlayingTrackInfo({ trackId: spotifyTrackId || null, name: initialTrackName, artist: initialArtistName, uri: trackUri });
    setIsLoadingPlayback(true);
    setPlaybackError(null);

    try {
      // Attempt to activate the player instance. Browsers may require this for programmatic playback.
      await player.activateElement();
      console.log("SpotifyContext: Player element activated for playback.");


      let currentAccessToken = spotifyUser.accessToken;
      if (new Date(spotifyUser.expiresAt) < new Date(Date.now() - 60 * 1000)) { // 1 min buffer
        console.log("SpotifyContext: Access token for playback is stale, refreshing first...");
        const refreshedToken = await refreshAccessToken();
        if (!refreshedToken) {
          setPlaybackError("Spotify access token refresh failed. Cannot play.");
          setIsLoadingPlayback(false);
          throw new Error("Spotify access token is unavailable after refresh attempt.");
        }
        currentAccessToken = refreshedToken;
      }

      console.log(`SpotifyContext: Attempting to play URI: ${trackUri} on Device ID: ${deviceId}`);
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
        console.error('SpotifyContext: Spotify API Play Error:', errorData);
        let specificError = errorData.message || `Failed to play track (Status: ${response.statusText})`;

        if (errorData.error?.reason === 'PREMIUM_REQUIRED' || (errorData.error?.message && errorData.error.message.toLowerCase().includes('premium required'))) {
            specificError = 'Spotify Premium is required for playback.';
        } else if (errorData.error?.reason === 'NO_ACTIVE_DEVICE' || (errorData.error?.message && errorData.error.message.toLowerCase().includes('device not found'))) {
            specificError = "Spotify device not found. Please ensure SoundTrace Player is active in your Spotify app (check 'Connect to device' in Spotify).";
        }
         else if (errorData.error?.message) {
            specificError = `Spotify Error: ${errorData.error.message}`;
        }
        setPlaybackError(specificError);
        setIsLoadingPlayback(false);
        return;
      }
      console.log(`SpotifyContext: Play command for URI ${trackUri} sent successfully.`);
      // Playback successfully initiated, player_state_changed event will handle further UI updates.
    } catch (err: any) {
      console.error('SpotifyContext: Error in playTrack function:', err);
      setPlaybackError(err.message || 'Could not start playback.');
      setIsLoadingPlayback(false);
    }
  }, [player, deviceId, isPlayerReady, isSpotifyConnected, spotifyUser, refreshAccessToken]);

  const value: SpotifyPlayerContextType = {
    player,
    deviceId,
    isReady: isPlayerReady && isSpotifyConnected, // Combined readiness: SDK player + app connected to Spotify
    isActive,
    currentState,
    playTrack,
    currentPlayingTrackInfo,
    isLoadingPlayback,
    playbackError,
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
         // Redirect to the base path of the application
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
      // Consider automatically redirecting or offering a more prominent retry button.
      // setTimeout(() => window.location.replace(window.location.origin + (window.location.pathname.split('/spotify-callback-receiver')[0] || '/')), 7000);
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
