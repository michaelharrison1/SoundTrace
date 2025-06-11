
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
  const [youtubeType, setYoutubeType] = useState<YouTubeUploadType>('instrumental_single');
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
      if (!parsedUrl.hostname.includes("youtube.com") && !parsedUrl.hostname.includes("youtu.be")) {
         throw new Error("Invalid YouTube URL hostname.");
      }
    } catch (e) {
      setYoutubeError("Invalid YouTube URL format. Please enter a valid URL (e.g., https://www.youtube.com/watch?v=...).");
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
                placeholder="Enter YouTube video, channel, or playlist URL"
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
                onChange={(e) => setYoutubeType(e.target.value as YouTubeUploadType)}
                className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                disabled={isLoading}
                aria-label="YouTube Processing Type"
              >
                <option value="instrumental_single">Single Instrumental (Scan for matches)</option>
                <option value="song_single">Single Song (Add to log)</option>
                <option value="instrumental_channel">Channel - Instrumentals (Scan all videos)</option>
                <option value="instrumental_playlist">Playlist - Instrumentals (Scan all videos)</option>
              </select>
            </div>
            {youtubeError && <p className="text-xs text-red-700 mt-1">{youtubeError}</p>}
            <Button type="submit" size="md" isLoading={isLoading} disabled={isLoading || !youtubeUrl.trim()}>
              {isLoading ? 'Processing...' : 'Process YouTube Link'}
            </Button>
          </form>
           <p className="text-xs text-gray-700 mt-1">
            Note: For 'Instrumental' types, audio will be scanned. For 'Song', it's added directly to your log.
            Channel/Playlist scanning can take time. Scans first 20s of audio for instrumentals.
          </p>
        </div>
      </section>

      {/* Spotify Playlist URL Processing */}
      <section className="p-0.5 win95-border-outset bg-[#C0C0C0]">
        <div className="p-3 bg-[#C0C0C0]">
          <h3 className="text-lg font-normal text-black mb-2">Add Spotify Playlist Tracks</h3>
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
              {isLoading ? 'Processing...' : 'Add Playlist Tracks to Log'}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default React.memo(UrlInputForms);
