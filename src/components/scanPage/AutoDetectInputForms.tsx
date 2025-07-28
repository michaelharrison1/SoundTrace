
import React, { useState, useCallback } from 'react';
import Button from '../common/Button';

interface AutoDetectInputFormsProps {
  onProcessSpotifyUrl: (url: string) => void;
  isLoading: boolean;
}

const AutoDetectInputForms: React.FC<AutoDetectInputFormsProps> = ({
  onProcessSpotifyUrl,
  isLoading,
}) => {
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [spotifyDetectedType, setSpotifyDetectedType] = useState<string | null>(null);

  // Function to detect Spotify URL type
  const detectSpotifyUrlType = useCallback((url: string): string => {
    try {
      const parsedUrl = new URL(url);

      if (!parsedUrl.hostname.includes('open.spotify.com')) {
        return 'not a Spotify URL';
      }

      // Check if it's a track
      if (parsedUrl.pathname.includes('/track/')) {
        return 'track';
      }

      // Check if it's a playlist
      if (parsedUrl.pathname.includes('/playlist/')) {
        return 'playlist';
      }

      return 'unknown Spotify URL';
    } catch (e) {
      return 'invalid URL';
    }
  }, []);

  // Handle Spotify URL input change
  const handleSpotifyUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setSpotifyUrl(url);
    setSpotifyError(null);

    if (url.trim()) {
      const type = detectSpotifyUrlType(url);
      setSpotifyDetectedType(type);

      if (type === 'invalid URL') {
        setSpotifyError('Invalid URL format');
      } else if (type === 'not a Spotify URL') {
        setSpotifyError('Not a valid Spotify URL');
      } else if (type === 'unknown Spotify URL') {
        setSpotifyError('Unrecognized Spotify URL format');
      }
    } else {
      setSpotifyDetectedType(null);
    }
  }, [detectSpotifyUrlType]);

  // Handle Spotify form submission
  const handleSpotifySubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSpotifyError(null);

    if (!spotifyUrl.trim()) {
      setSpotifyError('Please enter a Spotify URL');
      return;
    }

    const type = detectSpotifyUrlType(spotifyUrl);

    if (type === 'invalid URL' || type === 'not a Spotify URL' || type === 'unknown Spotify URL') {
      setSpotifyError(`Invalid Spotify URL: ${type}`);
      return;
    }

    onProcessSpotifyUrl(spotifyUrl);
  }, [spotifyUrl, detectSpotifyUrlType, onProcessSpotifyUrl]);

  return (
    <div className="space-y-3">
      <section className="p-0.5 win95-border-outset bg-[#C0C0C0]">
        <div className="p-3 bg-[#C0C0C0]">
          <h3 className="text-lg font-normal text-black mb-2">Import from Spotify</h3>
          <form onSubmit={handleSpotifySubmit} className="space-y-2">
            <div>
              <label htmlFor="spotifyUrl" className="block text-sm text-black mb-0.5">Spotify URL:</label>
              <input
                id="spotifyUrl"
                type="url"
                value={spotifyUrl}
                onChange={handleSpotifyUrlChange}
                placeholder="Paste any Spotify track or playlist URL"
                className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                disabled={isLoading}
                aria-label="Spotify URL"
              />
            </div>
            {spotifyDetectedType && !spotifyError && (
              <p className="text-xs text-green-700 mt-1">
                Detected: <strong>{spotifyDetectedType}</strong>
              </p>
            )}
            {spotifyError && <p className="text-xs text-red-700 mt-1">{spotifyError}</p>}
            <Button
              type="submit"
              size="md"
              isLoading={isLoading}
              disabled={isLoading || !spotifyUrl.trim() || !!spotifyError}
            >
              {isLoading ? 'Processing...' : 'Import from Spotify'}
            </Button>
          </form>
          <p className="text-xs text-gray-700 mt-1">
            Auto-detects and imports Spotify tracks or playlists directly into your scan log.
          </p>
        </div>
      </section>
    </div>
  );
};

export default React.memo(AutoDetectInputForms);