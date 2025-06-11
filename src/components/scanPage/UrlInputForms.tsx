
import React, { useState, useCallback } from 'react';
import Button from '../common/Button';
import { YouTubeUploadType } from '../../types';

interface UrlInputFormsProps {
  onProcessYouTubeUrl: (url: string, type: YouTubeUploadType) => void;
  onProcessSpotifyPlaylistUrl: (url: string) => void;
  isLoading: boolean;
}

const UrlInputForms: React.FC<UrlInputFormsProps> = ({
  onProcessYouTubeUrl,
  onProcessSpotifyPlaylistUrl,
  isLoading,
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeType, setYoutubeType] = useState<YouTubeUploadType>('youtube_video_single');
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState('');

  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [spotifyPlaylistError, setSpotifyPlaylistError] = useState<string | null>(null);

  const handleYouTubeSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setYoutubeError(null);
    if (!youtubeUrl.trim()) {
      setYoutubeError("Please enter a YouTube URL.");
      return;
    }
    try {
      const parsedUrl = new URL(youtubeUrl);
      const hostname = parsedUrl.hostname.toLowerCase();
      const pathname = parsedUrl.pathname.toLowerCase();

      if (!hostname.includes("youtube.com") && !hostname.includes("youtu.be")) {
         throw new Error("Invalid YouTube URL hostname.");
      }

      if (youtubeType === 'youtube_video_single') {
        if (!((hostname.includes("youtube.com") && pathname.startsWith("/watch")) || hostname.includes("youtu.be"))) {
          throw new Error("For single video scan, please provide a valid video URL (e.g., youtube.com/watch?v=... or youtu.be/...).");
        }
      } else if (youtubeType === 'youtube_channel_instrumental_batch') {
        if (!((hostname.includes("youtube.com") && (pathname.startsWith("/channel/") || pathname.startsWith("/c/") || pathname.startsWith("/@"))))) {
            throw new Error("For channel scan, please provide a valid channel URL (e.g., youtube.com/channel/... or youtube.com/@handle).");
        }
      } else if (youtubeType === 'youtube_playlist_instrumental_batch') {
         if (!(hostname.includes("youtube.com") && pathname.startsWith("/playlist"))) {
            throw new Error("For playlist scan, please provide a valid playlist URL (e.g., youtube.com/playlist?list=...).");
         }
      }

    } catch (e: any) {
      setYoutubeError(e.message || "Invalid YouTube URL format.");
      return;
    }
    onProcessYouTubeUrl(youtubeUrl, youtubeType);
  }, [youtubeUrl, youtubeType, onProcessYouTubeUrl]);

  const handleSpotifyPlaylistSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSpotifyPlaylistError(null);
    if (!spotifyPlaylistUrl.trim()) {
      setSpotifyPlaylistError("Please enter a Spotify Playlist URL.");
      return;
    }
     try {
      const parsedUrl = new URL(spotifyPlaylistUrl);
      if (!parsedUrl.hostname.includes("open.spotify.com") || !parsedUrl.pathname.includes("/playlist/")) {
         throw new Error("Invalid Spotify Playlist URL.");
      }
    } catch (e) {
      setSpotifyPlaylistError("Invalid Spotify Playlist URL format. Must be like https://open.spotify.com/playlist/...");
      return;
    }
    onProcessSpotifyPlaylistUrl(spotifyPlaylistUrl);
  }, [spotifyPlaylistUrl, onProcessSpotifyPlaylistUrl]);

  return (
    <div className="space-y-3">
      {/* YouTube URL Processing */}
      <section className="p-0.5 win95-border-outset bg-[#C0C0C0]">
        <div className="p-3 bg-[#C0C0C0]">
          <h3 className="text-lg font-normal text-black mb-2">Process YouTube Link</h3>
          <form onSubmit={handleYouTubeSubmit} className="space-y-2">
            <div>
              <label htmlFor="youtubeUrl" className="block text-sm text-black mb-0.5">YouTube URL:</label>
              <input
                id="youtubeUrl"
                type="url"
                value={youtubeUrl}
                onChange={(e) => { setYoutubeUrl(e.target.value); setYoutubeError(null); }}
                placeholder={
                    youtubeType === 'youtube_video_single'
                    ? "Enter a single YouTube video URL (e.g., youtube.com/watch?v=...)"
                    : youtubeType === 'youtube_channel_instrumental_batch'
                    ? "Enter YouTube channel URL (e.g., youtube.com/channel/... or youtube.com/@handle)"
                    : "Enter YouTube playlist URL (e.g., youtube.com/playlist?list=...)"
                }
                className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                disabled={isLoading}
                aria-label="YouTube URL"
              />
            </div>
            <div>
              <label htmlFor="youtubeType" className="block text-sm text-black mb-0.5">Process As:</label>
              <select
                id="youtubeType"
                value={youtubeType}
                onChange={(e) => {
                  setYoutubeType(e.target.value as YouTubeUploadType);
                  setYoutubeError(null); // Clear error when type changes as validation might differ
                }}
                className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                disabled={isLoading}
                aria-label="YouTube Processing Type"
              >
                <option value="youtube_video_single">Single Video - Scan this video</option>
                <option value="youtube_channel_instrumental_batch">Channel - Scan all videos</option>
                <option value="youtube_playlist_instrumental_batch">Playlist - Scan all videos</option>
              </select>
            </div>
            {youtubeError && <p className="text-xs text-red-700 mt-1">{youtubeError}</p>}
            <Button type="submit" size="md" isLoading={isLoading} disabled={isLoading || !youtubeUrl.trim()}>
              {isLoading ? 'Initiating Job...' : 'Create YouTube Scan Job'}
            </Button>
          </form>
           <p className="text-xs text-gray-700 mt-1">
            Note: Channel/Playlist scanning can take time. Single video scans are faster. Backend processes videos to find matches.
          </p>
        </div>
      </section>

      {/* Spotify Playlist URL Processing */}
      <section className="p-0.5 win95-border-outset bg-[#C0C0C0]">
        <div className="p-3 bg-[#C0C0C0]">
          <h3 className="text-lg font-normal text-black mb-2">Import Spotify Playlist Tracks</h3>
          <form onSubmit={handleSpotifyPlaylistSubmit} className="space-y-2">
            <div>
              <label htmlFor="spotifyPlaylistUrl" className="block text-sm text-black mb-0.5">Spotify Playlist URL:</label>
              <input
                id="spotifyPlaylistUrl"
                type="url"
                value={spotifyPlaylistUrl}
                onChange={(e) => { setSpotifyPlaylistUrl(e.target.value); setSpotifyPlaylistError(null); }}
                placeholder="https://open.spotify.com/playlist/..."
                className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                disabled={isLoading}
                aria-label="Spotify Playlist URL"
              />
            </div>
            {spotifyPlaylistError && <p className="text-xs text-red-700 mt-1">{spotifyPlaylistError}</p>}
            <Button type="submit" size="md" isLoading={isLoading} disabled={isLoading || !spotifyPlaylistUrl.trim()}>
              {isLoading ? 'Initiating Job...' : 'Create Playlist Import Job'}
            </Button>
          </form>
           <p className="text-xs text-gray-700 mt-1">
            Note: This creates a job to import all tracks from the playlist into your scan log.
          </p>
        </div>
      </section>
    </div>
  );
};

export default React.memo(UrlInputForms);
