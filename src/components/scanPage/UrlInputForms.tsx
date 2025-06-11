
import React, { useState, useCallback } from 'react';
import Button from '../common/Button';
import { YouTubeUploadType } from '../../types';

interface UrlInputFormsProps {
  onProcessYouTubeUrl: (url: string, type: YouTubeUploadType) => void;
  onProcessSpotifyPlaylistUrl: (url: string) => void;
  onProcessSingleYouTubeVideoUrl: (url: string) => void; // New prop
  isLoading: boolean;
}

const UrlInputForms: React.FC<UrlInputFormsProps> = ({
  onProcessYouTubeUrl,
  onProcessSpotifyPlaylistUrl,
  onProcessSingleYouTubeVideoUrl, // New prop
  isLoading,
}) => {
  const [youtubeBatchUrl, setYoutubeBatchUrl] = useState('');
  const [youtubeType, setYoutubeType] = useState<YouTubeUploadType>('youtube_channel_instrumental_batch');
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState('');
  const [singleYoutubeVideoUrl, setSingleYoutubeVideoUrl] = useState(''); // New state

  const [youtubeBatchError, setYoutubeBatchError] = useState<string | null>(null);
  const [spotifyPlaylistError, setSpotifyPlaylistError] = useState<string | null>(null);
  const [singleYoutubeVideoError, setSingleYoutubeVideoError] = useState<string | null>(null); // New state

  const handleYouTubeBatchSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setYoutubeBatchError(null);
    if (!youtubeBatchUrl.trim()) {
      setYoutubeBatchError("Please enter a YouTube Channel or Playlist URL.");
      return;
    }
    try {
      const parsedUrl = new URL(youtubeBatchUrl);
      const hostname = parsedUrl.hostname;
      const pathname = parsedUrl.pathname;
      if (!hostname.includes("youtube.com") && !hostname.includes("youtu.be")) {
         throw new Error("Invalid YouTube URL hostname.");
      }
      // Basic check, backend does more thorough validation for channel/playlist type
      if (!pathname.includes("/channel/") && !pathname.includes("/playlist") && !pathname.includes("/@")) {
        if (pathname.includes("/watch") || hostname.includes("youtu.be")) {
             setYoutubeBatchError("This looks like a single video URL. Please use the 'Scan Single YouTube Video' form below for single videos. This form is for channels or playlists.");
             return;
        }
        // throw new Error("URL does not appear to be a channel or playlist.");
      }
    } catch (e: any) {
      setYoutubeBatchError(e.message || "Invalid YouTube Channel/Playlist URL format.");
      return;
    }
    onProcessYouTubeUrl(youtubeBatchUrl, youtubeType);
  }, [youtubeBatchUrl, youtubeType, onProcessYouTubeUrl]);

  const handleSingleYouTubeVideoSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSingleYoutubeVideoError(null);
    if (!singleYoutubeVideoUrl.trim()) {
      setSingleYoutubeVideoError("Please enter a YouTube video URL.");
      return;
    }
    try {
      const parsedUrl = new URL(singleYoutubeVideoUrl);
      const hostname = parsedUrl.hostname;
      const pathname = parsedUrl.pathname;
      if (!hostname.includes("youtube.com") && !hostname.includes("youtu.be")) {
         throw new Error("Invalid YouTube URL hostname.");
      }
      if (!pathname.includes("/watch") && !hostname.includes("youtu.be/")) {
          if(pathname.includes("/channel/") || pathname.includes("/playlist") || pathname.includes("/@")){
            setSingleYoutubeVideoError("This looks like a channel or playlist URL. Please use the 'Process YouTube Link (Batch Jobs)' form above for channels/playlists.");
            return;
          }
        throw new Error("URL does not appear to be a single video.");
      }
    } catch (e: any) {
      setSingleYoutubeVideoError(e.message || "Invalid YouTube video URL format.");
      return;
    }
    onProcessSingleYouTubeVideoUrl(singleYoutubeVideoUrl);
  }, [singleYoutubeVideoUrl, onProcessSingleYouTubeVideoUrl]);

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
      {/* YouTube Channel/Playlist Batch URL Processing */}
      <section className="p-0.5 win95-border-outset bg-[#C0C0C0]">
        <div className="p-3 bg-[#C0C0C0]">
          <h3 className="text-lg font-normal text-black mb-2">Process YouTube Link (Batch Jobs)</h3>
          <form onSubmit={handleYouTubeBatchSubmit} className="space-y-2">
            <div>
              <label htmlFor="youtubeBatchUrl" className="block text-sm text-black mb-0.5">YouTube Channel or Playlist URL:</label>
              <input
                id="youtubeBatchUrl"
                type="url"
                value={youtubeBatchUrl}
                onChange={(e) => { setYoutubeBatchUrl(e.target.value); setYoutubeBatchError(null); }}
                placeholder="Enter YouTube channel or playlist URL"
                className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                disabled={isLoading}
                aria-label="YouTube Channel or Playlist URL"
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
                <option value="youtube_channel_instrumental_batch">Channel - Instrumentals (Scan all videos)</option>
                <option value="youtube_playlist_instrumental_batch">Playlist - Instrumentals (Scan all videos)</option>
              </select>
            </div>
            {youtubeBatchError && <p className="text-xs text-red-700 mt-1">{youtubeBatchError}</p>}
            <Button type="submit" size="md" isLoading={isLoading} disabled={isLoading || !youtubeBatchUrl.trim()}>
              {isLoading ? 'Initiating Job...' : 'Create Batch YouTube Scan Job'}
            </Button>
          </form>
           <p className="text-xs text-gray-700 mt-1">
            Use this for scanning all videos from a channel or playlist.
          </p>
        </div>
      </section>

      {/* Single YouTube Video URL Processing */}
      <section className="p-0.5 win95-border-outset bg-[#C0C0C0]">
        <div className="p-3 bg-[#C0C0C0]">
          <h3 className="text-lg font-normal text-black mb-2">Scan Single YouTube Video</h3>
          <form onSubmit={handleSingleYouTubeVideoSubmit} className="space-y-2">
            <div>
              <label htmlFor="singleYoutubeVideoUrl" className="block text-sm text-black mb-0.5">YouTube Video URL:</label>
              <input
                id="singleYoutubeVideoUrl"
                type="url"
                value={singleYoutubeVideoUrl}
                onChange={(e) => { setSingleYoutubeVideoUrl(e.target.value); setSingleYoutubeVideoError(null); }}
                placeholder="e.g., https://www.youtube.com/watch?v=VIDEO_ID"
                className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                disabled={isLoading}
                aria-label="Single YouTube Video URL"
              />
            </div>
            {singleYoutubeVideoError && <p className="text-xs text-red-700 mt-1">{singleYoutubeVideoError}</p>}
            <Button type="submit" size="md" isLoading={isLoading} disabled={isLoading || !singleYoutubeVideoUrl.trim()}>
              {isLoading ? 'Initiating Job...' : 'Create Single Video Scan Job'}
            </Button>
          </form>
           <p className="text-xs text-gray-700 mt-1">
            Use this to scan an individual YouTube video.
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