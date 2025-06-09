
import React, { useEffect, useState, useCallback } from 'react';
import { useSpotifyPlayer } from '../../contexts/SpotifyContext';
import PlayIcon from '../icons/PlayIcon';
import PauseIcon from '../icons/PauseIcon';
import SkipNextIcon from '../icons/SkipNextIcon';
import SkipPreviousIcon from '../icons/SkipPreviousIcon'; // Assuming you might add this
import VolumeUpIcon from '../icons/VolumeUpIcon'; // Assuming you might add this
import VolumeOffIcon from '../icons/VolumeOffIcon'; // Assuming you might add this


interface SpotifyPlayerControlsProps {
  onSkipNextProvided?: () => void; // Optional: if PreviousScans handles playlist logic
  onSkipPreviousProvided?: () => void; // Optional
}

const SpotifyPlayerControls: React.FC<SpotifyPlayerControlsProps> = ({ onSkipNextProvided, onSkipPreviousProvided }) => {
  const {
    player,
    isReady,
    isActive,
    currentState,
    playTrack, // This is for playing a specific URI
    currentPlayingTrackInfo, // Track info set when playTrack is called or from SDK state
    isLoadingPlayback,
    playbackError
  } = useSpotifyPlayer();

  const [volume, setVolume] = useState(0.5); // Default volume
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolumeBeforeMute, setLastVolumeBeforeMute] = useState(0.5);

  useEffect(() => {
    if (player && isReady) {
      player.getVolume().then((currentVol: number | null) => {
        if (currentVol !== null) {
          setVolume(currentVol);
          if (currentVol === 0) setIsMuted(true);
          else setIsMuted(false);
        }
      });
    }
  }, [player, isReady]);

  const handlePlayPause = useCallback(() => {
    if (player && isReady) {
      player.togglePlay().catch((e: any) => console.error("Error toggling play:", e));
    }
  }, [player, isReady]);

  const handleSkipNext = useCallback(() => {
    if (onSkipNextProvided) {
        onSkipNextProvided();
    } else if (player && isReady && currentState && !currentState.disallows.skipping_next) {
      player.nextTrack().catch((e: any) => console.error("Error skipping next:", e));
    }
  }, [player, isReady, currentState, onSkipNextProvided]);

  const handleSkipPrevious = useCallback(() => {
    if (onSkipPreviousProvided) {
        onSkipPreviousProvided();
    } else if (player && isReady && currentState && !currentState.disallows.skipping_prev) {
      player.previousTrack().catch((e: any) => console.error("Error skipping previous:", e));
    }
  }, [player, isReady, currentState, onSkipPreviousProvided]);

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (player && isReady) {
      const newVolume = parseFloat(event.target.value);
      player.setVolume(newVolume).then(() => {
        setVolume(newVolume);
        if (newVolume > 0 && isMuted) setIsMuted(false);
        if (newVolume === 0 && !isMuted) setIsMuted(true);
      }).catch((e: any) => console.error("Error setting volume:", e));
    }
  };

  const toggleMute = useCallback(() => {
    if (player && isReady) {
      if (isMuted) { // Unmuting
        player.setVolume(lastVolumeBeforeMute).then(() => {
          setVolume(lastVolumeBeforeMute);
          setIsMuted(false);
        });
      } else { // Muting
        setLastVolumeBeforeMute(volume);
        player.setVolume(0).then(() => {
          setVolume(0);
          setIsMuted(true);
        });
      }
    }
  }, [player, isReady, isMuted, volume, lastVolumeBeforeMute]);

  const formatTime = (ms: number | undefined) => {
    if (typeof ms !== 'number' || isNaN(ms)) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const trackName = currentState?.track_window?.current_track?.name || currentPlayingTrackInfo?.name || "No track selected";
  const artistName = currentState?.track_window?.current_track?.artists[0]?.name || currentPlayingTrackInfo?.artist || "";
  const albumArtUrl = currentState?.track_window?.current_track?.album?.images[0]?.url;

  const durationMs = currentState?.duration ?? 0;
  const positionMs = currentState?.position ?? 0;
  const isPaused = currentState?.paused ?? true;

  const disableControls = !isReady || !isActive || !currentState;


  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#C0C0C0] p-0.5 win95-border-outset z-[100]"> {/* Increased z-index */}
      <div className="flex items-center p-1 bg-[#C0C0C0] space-x-2">
        {albumArtUrl && (
            <img src={albumArtUrl} alt="Album art" className="w-8 h-8 win95-border-inset object-cover"/>
        )}
        {!albumArtUrl && currentPlayingTrackInfo && (
             <div className="w-8 h-8 win95-border-inset bg-gray-500 flex items-center justify-center text-white text-xl">?</div>
        )}


        {/* Skip Previous Button (Optional) */}
         <button
          onClick={handleSkipPrevious}
          disabled={disableControls || currentState?.disallows.skipping_prev}
          className="p-1 win95-button-sm bg-[#C0C0C0] disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous track"
        >
          <SkipPreviousIcon className="w-4 h-4 text-black" />
        </button>

        <button
          onClick={handlePlayPause}
          disabled={disableControls || (isPaused && currentState?.disallows.resuming) || (!isPaused && currentState?.disallows.pausing)}
          className="p-1 win95-button-sm bg-[#C0C0C0] disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={isPaused ? "Play" : "Pause"}
        >
          {isPaused? <PlayIcon className="w-4 h-4 text-black" /> : <PauseIcon className="w-4 h-4 text-black" />}
        </button>

        <button
            onClick={handleSkipNext}
            disabled={disableControls || currentState?.disallows.skipping_next}
            className="p-1 win95-button-sm bg-[#C0C0C0] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next track"
        >
            <SkipNextIcon className="w-4 h-4 text-black" />
        </button>

        <div className="flex-grow overflow-hidden text-xs text-black min-w-0">
          {isLoadingPlayback ? (
            <p className="truncate" title={`Loading: ${currentPlayingTrackInfo?.name || 'track'}...`}>Loading: {currentPlayingTrackInfo?.name || 'track'}...</p>
          ) : playbackError ? (
            <p className="text-red-700 truncate" title={playbackError}>{playbackError}</p>
          ) : currentState && currentPlayingTrackInfo ? (
            <div className="truncate">
              <span className="font-semibold" title={trackName}>{trackName}</span>
              {artistName && <span title={artistName}> - {artistName}</span>}
            </div>
          ) : (
            <p>SoundTrace Player - Ready</p>
          )}
        </div>

        <div className="w-20 text-xs text-black text-center">
          {formatTime(positionMs)} / {formatTime(durationMs)}
        </div>

        <div className="flex items-center space-x-1 w-28">
            <button onClick={toggleMute} className="p-0.5 win95-button-sm bg-[#C0C0C0]" aria-label={isMuted ? "Unmute" : "Mute"}>
                {isMuted || volume === 0 ? <VolumeOffIcon className="w-3 h-3" /> : <VolumeUpIcon className="w-3 h-3" />}
            </button>
            <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-full h-2 appearance-none win95-border-inset bg-gray-500 p-0 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:bg-[#C0C0C0] [&::-webkit-slider-thumb]:win95-border-outset [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-1.5 [&::-moz-range-thumb]:bg-[#C0C0C0] [&::-moz-range-thumb]:win95-border-outset [&::-moz-range-thumb]:border-none"
                aria-label="Volume"
                disabled={!isReady || !player}
            />
        </div>
      </div>
    </div>
  );
};

export default SpotifyPlayerControls;