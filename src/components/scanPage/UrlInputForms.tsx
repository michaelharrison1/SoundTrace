import React, { useState, useCallback } from 'react';
import Button from '../common/Button';

interface UrlInputFormsProps {
  onProcessMultipleVideoUrls: (urlsString: string) => void; 
  onProcessSpotifyPlaylistUrl: (url: string) => void;
  onProcessSingleYouTubeVideoUrl: (url: string) => void;
  isLoading: boolean;
}

const UrlInputForms: React.FC<UrlInputFormsProps> = ({
  onProcessMultipleVideoUrls,
  onProcessSpotifyPlaylistUrl,
  onProcessSingleYouTubeVideoUrl,
  isLoading,
}) => {
  const [multipleYoutubeVideoUrls, setMultipleYoutubeVideoUrls] = useState('');
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState('');
  const [singleYoutubeVideoUrl, setSingleYoutubeVideoUrl] = useState('');

  const [multipleYoutubeError, setMultipleYoutubeError] = useState<string | null>(null);
  const [spotifyPlaylistError, setSpotifyPlaylistError] = useState<string | null>(null);
  const [singleYoutubeVideoError, setSingleYoutubeVideoError] = useState<string | null>(null);

  const handleMultipleYouTubeVideoSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMultipleYoutubeError(null);
    const urls = multipleYoutubeVideoUrls.split('\n').map(url => url.trim()).filter(url => url.length > 0);
    if (urls.length === 0) {
      setMultipleYoutubeError("Please enter at least one YouTube video URL.");
      return;
    }
    for (const url of urls) {
        try {
            new URL(url); 
            if (!url.includes("youtube.com/watch") && !url.includes("youtu.be/")) {
                 setMultipleYoutubeError(`Invalid YouTube video URL found: "${url.substring(0,30)}...". Please ensure all are direct video links.`);
                 return;
            }
        } catch (e) {
            setMultipleYoutubeError(`Invalid URL format found: "${url.substring(0,30)}...". Please check your list.`);
            return;
        }
    }
    onProcessMultipleVideoUrls(multipleYoutubeVideoUrls); 
  }, [multipleYoutubeVideoUrls, onProcessMultipleVideoUrls]);

  const handleSingleYouTubeVideoSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSingleYoutubeVideoError(null);
    if (!singleYoutubeVideoUrl.trim()) {
      setSingleYoutubeVideoError("Please enter a YouTube video URL.");
      return;
    }
    try {
      new URL(singleYoutubeVideoUrl);
      if (!singleYoutubeVideoUrl.includes("youtube.com/watch") && !singleYoutubeVideoUrl.includes("youtu.be/")) {
         throw new Error("URL does not appear to be a valid YouTube video link.");
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
      {/* Scan Multiple YouTube Video URLs */}
      <section className="p-0.5 win95-border-outset bg-[#C0C0C0]">
        <div className="p-3 bg-[#C0C0C0]">
          <h3 className="text-lg font-normal text-black mb-2">Scan Multiple YouTube Video URLs</h3>
          <form onSubmit={handleMultipleYouTubeVideoSubmit} className="space-y-2">
            <div>
              <label htmlFor="multipleYoutubeVideoUrls" className="block text-sm text-black mb-0.5">YouTube Video URLs (one per line):</label>
              <textarea
                id="multipleYoutubeVideoUrls"
                value={multipleYoutubeVideoUrls}
                onChange={(e) => { setMultipleYoutubeVideoUrls(e.target.value); setMultipleYoutubeError(null); }}
                placeholder="Paste YouTube video URLs here, one on each line. e.g.,&#10;https://www.youtube.com/watch?v=VIDEO_ID_1&#10;https://youtu.be/VIDEO_ID_2"
                className="w-full h-24 px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                disabled={isLoading}
                aria-label="Multiple YouTube Video URLs"
              />
            </div>
            {multipleYoutubeError && <p className="text-xs text-red-700 mt-1">{multipleYoutubeError}</p>}
            <Button type="submit" size="md" isLoading={isLoading} disabled={isLoading || !multipleYoutubeVideoUrls.trim()}>
              {isLoading ? 'Sending...' : 'Send to Local Downloader'}
            </Button>
          </form>
           <p className="text-xs text-gray-700 mt-1">
            Scans multiple YouTube videos. <strong className="text-black">Requires the SoundTrace Downloader desktop app to be running.</strong>
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
              {isLoading ? 'Sending...' : 'Send to Local Downloader'}
            </Button>
          </form>
           <p className="text-xs text-gray-700 mt-1">
            Scans an individual YouTube video. <strong className="text-black">Requires the SoundTrace Downloader desktop app to be running.</strong>
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
            This imports track details from a Spotify playlist directly into your scan log (no audio scanning).
          </p>
        </div>
      </section>
    </div>
  );
};

export default React.memo(UrlInputForms);