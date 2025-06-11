
import React, { useState, useCallback } from 'react';
import Button from '../common/Button';
import { YouTubeUploadType } from '../../types';

interface UrlInputFormsProps {
  onProcessYouTubeUrl: (url: string, type: YouTubeUploadType) => void; // For batch jobs
  onProcessSpotifyPlaylistUrl: (url: string) => void;
  onProcessSingleYouTubeVideoScan: (url: string) => void; // New handler for single video scan
  onProcessSingleYouTubeVideoManualAdd: (url: string) => void; // New handler for single video manual add
  isLoading: boolean;
}

const UrlInputForms: React.FC<UrlInputFormsProps> = ({
  onProcessYouTubeUrl,
  onProcessSpotifyPlaylistUrl,
  onProcessSingleYouTubeVideoScan,
  onProcessSingleYouTubeVideoManualAdd,
  isLoading,
}) => {
  const [youtubeBatchUrl, setYoutubeBatchUrl] = useState('');
  const [youtubeBatchType, setYoutubeBatchType] = useState<YouTubeUploadType>('youtube_channel_instrumental_batch');
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState('');
  const [singleYouTubeVideoUrl, setSingleYouTubeVideoUrl] = useState('');

  const [youtubeBatchError, setYoutubeBatchError] = useState<string | null>(null);
  const [spotifyPlaylistError, setSpotifyPlaylistError] = useState<string | null>(null);
  const [singleYouTubeError, setSingleYouTubeError] = useState<string | null>(null);

  const validateYouTubeUrl = (url: string, allowPlaylistChannel: boolean, allowSingleVideo: boolean): string | null => {
    if (!url.trim()) return "Please enter a YouTube URL.";
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;
      const pathname = parsedUrl.pathname;

      if (!hostname.includes("youtube.com") && !hostname.includes("youtu.be")) {
         return "Invalid YouTube URL hostname.";
      }
      if (allowSingleVideo && (pathname === '/watch' || hostname === 'youtu.be')) return null; // Valid single video
      if (allowPlaylistChannel && (pathname.startsWith('/playlist') || pathname.startsWith('/channel/') || pathname.startsWith('/@'))) return null; // Valid playlist/channel/handle

      return "URL does not appear to be a valid YouTube video, playlist, or channel link.";

    } catch (e) {
      return "Invalid YouTube URL format.";
    }
  };


  const handleYouTubeBatchSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateYouTubeUrl(youtubeBatchUrl, true, false);
    setYoutubeBatchError(error);
    if (!error) onProcessYouTubeUrl(youtubeBatchUrl, youtubeBatchType);
  }, [youtubeBatchUrl, youtubeBatchType, onProcessYouTubeUrl]);

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

  const handleSingleYouTubeScanSubmit = useCallback(() => {
    const error = validateYouTubeUrl(singleYouTubeVideoUrl, false, true);
    setSingleYouTubeError(error);
    if (!error) onProcessSingleYouTubeVideoScan(singleYouTubeVideoUrl);
  }, [singleYouTubeVideoUrl, onProcessSingleYouTubeVideoScan]);

  const handleSingleYouTubeManualAddSubmit = useCallback(() => {
    const error = validateYouTubeUrl(singleYouTubeVideoUrl, false, true);
    setSingleYouTubeError(error);
    if (!error) onProcessSingleYouTubeVideoManualAdd(singleYouTubeVideoUrl);
  }, [singleYouTubeVideoUrl, onProcessSingleYouTubeVideoManualAdd]);


  return (
    <div className="space-y-3">
      {/* Single YouTube Video Processing */}
      <section className="p-0.5 win95-border-outset bg-[#C0C0C0]">
        <div className="p-3 bg-[#C0C0C0]">
          <h3 className="text-lg font-normal text-black mb-2">Process Single YouTube Video</h3>
          <div className="space-y-2">
            <div>
              <label htmlFor="singleYoutubeUrl" className="block text-sm text-black mb-0.5">YouTube Video URL:</label>
              <input
                id="singleYoutubeUrl"
                type="url"
                value={singleYouTubeVideoUrl}
                onChange={(e) => { setSingleYouTubeVideoUrl(e.target.value); setSingleYouTubeError(null); }}
                placeholder="Enter a single YouTube video URL"
                className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                disabled={isLoading}
                aria-label="Single YouTube Video URL"
              />
            </div>
            {singleYouTubeError && <p className="text-xs text-red-700 mt-1">{singleYouTubeError}</p>}
            <div className="flex space-x-2">
              <Button onClick={handleSingleYouTubeScanSubmit} size="md" isLoading={isLoading} disabled={isLoading || !singleYouTubeVideoUrl.trim()} className="flex-1">
                {isLoading ? 'Working...' : 'Scan This Video'}
              </Button>
              <Button onClick={handleSingleYouTubeManualAddSubmit} size="md" isLoading={isLoading} disabled={isLoading || !singleYouTubeVideoUrl.trim()} className="flex-1">
                {isLoading ? 'Working...' : 'Manually Add to Log'}
              </Button>
            </div>
          </div>
           <p className="text-xs text-gray-700 mt-1">
            "Scan" will identify music in the video. "Manual Add" logs it without scanning.
          </p>
        </div>
      </section>

      {/* YouTube URL Batch Processing */}
      <section className="p-0.5 win95-border-outset bg-[#C0C0C0]">
        <div className="p-3 bg-[#C0C0C0]">
          <h3 className="text-lg font-normal text-black mb-2">Process YouTube Channel/Playlist (Batch Scan)</h3>
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
                aria-label="YouTube Batch URL"
              />
            </div>
            <div>
              <label htmlFor="youtubeType" className="block text-sm text-black mb-0.5">Process As:</label>
              <select
                id="youtubeType"
                value={youtubeBatchType}
                onChange={(e) => setYoutubeBatchType(e.target.value as YouTubeUploadType)}
                className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                disabled={isLoading}
                aria-label="YouTube Batch Processing Type"
              >
                <option value="youtube_channel_instrumental_batch">Channel - Instrumentals (Scan all videos)</option>
                <option value="youtube_playlist_instrumental_batch">Playlist - Instrumentals (Scan all videos)</option>
              </select>
            </div>
            {youtubeBatchError && <p className="text-xs text-red-700 mt-1">{youtubeBatchError}</p>}
            <Button type="submit" size="md" isLoading={isLoading} disabled={isLoading || !youtubeBatchUrl.trim()}>
              {isLoading ? 'Initiating Job...' : 'Create YouTube Batch Scan Job'}
            </Button>
          </form>
           <p className="text-xs text-gray-700 mt-1">
            Note: Channel/Playlist scanning can take time. Backend processes videos to find matches.
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