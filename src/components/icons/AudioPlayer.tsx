
import React, { useRef, useEffect, useState } from 'react';
import PlayIcon from '../icons/PlayIcon';
import PauseIcon from '../icons/PauseIcon';
import SkipNextIcon from '../icons/SkipNextIcon';

interface AudioPlayerProps {
  src: string | null;
  trackTitle: string;
  trackArtist: string;
  isPlaying: boolean;
  isLoading: boolean;
  onPlayPause: () => void;
  onEnded: () => void;
  onSkipNext: () => void;
  error?: string | null;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  trackTitle,
  trackArtist,
  isPlaying,
  isLoading,
  onPlayPause,
  onEnded,
  onSkipNext,
  error
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (audioRef.current) {
      if (src && isPlaying) {
        audioRef.current.src = src;
        audioRef.current.play().catch(e => console.error("Error playing audio:", e));
      } else if (!isPlaying) {
        audioRef.current.pause();
      } else if (!src && audioRef.current.src) { // if src becomes null (e.g. error or no preview)
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load(); // Reset audio element
        setProgress(0);
        setDuration(0);
      }
    }
  }, [src, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      onEnded(); // This might trigger skip to next
      setProgress(0); // Reset progress for the current player display
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onEnded]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#C0C0C0] p-0.5 win95-border-outset z-50">
      <div className="flex items-center p-1 bg-[#C0C0C0] space-x-2">
        <audio ref={audioRef} className="hidden" />

        <button
          onClick={onPlayPause}
          disabled={isLoading || !src || !!error}
          className="p-1 win95-button-sm bg-[#C0C0C0] disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={isPlaying ? "Pause preview" : "Play preview"}
        >
          {isPlaying ? <PauseIcon className="w-4 h-4 text-black" /> : <PlayIcon className="w-4 h-4 text-black" />}
        </button>

        <button
            onClick={onSkipNext}
            disabled={isLoading}
            className="p-1 win95-button-sm bg-[#C0C0C0] disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Skip to next preview"
        >
            <SkipNextIcon className="w-4 h-4 text-black" />
        </button>

        <div className="flex-grow overflow-hidden text-xs text-black">
          {isLoading ? (
            <p>Loading preview...</p>
          ) : error ? (
            <p className="text-red-700 truncate" title={error}>{error}</p>
          ) : src ? (
            <div className="truncate">
              <span className="font-semibold" title={trackTitle}>{trackTitle}</span> - <span title={trackArtist}>{trackArtist}</span>
            </div>
          ) : (
            <p>No preview selected or available.</p>
          )}
        </div>

        <div className="w-24 text-xs text-black text-center">
          {formatTime(progress)} / {formatTime(duration > 0 ? duration : 0)}
        </div>

        <div className="w-1/3 win95-border-inset bg-gray-500 h-3 p-0.5">
          <div
            className="h-full bg-[#084B8A]"
            style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : '0%' }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
