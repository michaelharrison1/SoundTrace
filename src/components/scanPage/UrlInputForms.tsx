
import React, { useState, useCallback } from 'react';
import Button from '../common/Button';

interface UrlInputFormsProps {
  onProcessSpotifyPlaylistUrl: (url: string) => void;
  isLoading: boolean;
}

const UrlInputForms: React.FC<UrlInputFormsProps> = ({
  onProcessSpotifyPlaylistUrl,
  isLoading,
}) => {
  const [spotifyPlaylistUrl, setSpotifyPlaylistUrl] = useState('');
  const [spotifyPlaylistError, setSpotifyPlaylistError] = useState<string | null>(null);

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