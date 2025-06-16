import React, { useState, useCallback } from 'react';
import Button from '../common/Button';

interface AutoDetectInputFormsProps {
  onProcessYouTubeUrl: (url: string) => void;
  onProcessSpotifyUrl: (url: string) => void;
  isLoading: boolean;
}

const AutoDetectInputForms: React.FC<AutoDetectInputFormsProps> = ({
  onProcessYouTubeUrl,
  onProcessSpotifyUrl,
  isLoading,
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [youtubeDetectedType, setYoutubeDetectedType] = useState<string | null>(null);
  const [spotifyDetectedType, setSpotifyDetectedType] = useState<string | null>(null);

  // Function to detect YouTube URL type
  const detectYoutubeUrlType = useCallback((url: string): string => {
    // Check if it's multiple URLs (contains line breaks)
    if (url.includes('\n')) {
      const lines = url.split('\n').filter(line => line.trim().length > 0);
      if (lines.length > 1) {
        return 'multiple videos';
      }
    }

    try {
      const parsedUrl = new URL(url);
      
      // Check if it's a playlist
      if (parsedUrl.pathname.includes('/playlist') || parsedUrl.searchParams.has('list')) {
        return 'playlist';
      }
      
      // Check if it's a channel
      if (parsedUrl.pathname.startsWith('/@') || 
          parsedUrl.pathname.startsWith('/channel/') || 
          parsedUrl.pathname.startsWith('/user/')) {
        return 'channel';
      }
      
      // Check if it's a single video
      if (parsedUrl.pathname.includes('/watch') || 
          parsedUrl.hostname.includes('youtu.be') || 
          parsedUrl.searchParams.has('v')) {
        return 'single video';
      }
      
      return 'unknown';
    } catch (e) {
      return 'invalid URL';
    }
  }, []);

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

  // Handle YouTube URL input change
  const handleYoutubeUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setYoutubeUrl(url);
    setYoutubeError(null);
    
    if (url.trim()) {
      const type = detectYoutubeUrlType(url);
      setYoutubeDetectedType(type);
      
      if (type === 'invalid URL') {
        setYoutubeError('Invalid URL format');
      } else if (type === 'unknown') {
        setYoutubeError('Unrecognized YouTube URL format');
      }
    } else {
      setYoutubeDetectedType(null);
    }
  }, [detectYoutubeUrlType]);

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

  // Handle YouTube form submission
  const handleYoutubeSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setYoutubeError(null);
    
    if (!youtubeUrl.trim()) {
      setYoutubeError('Please enter a YouTube URL');
      return;
    }
    
    const type = detectYoutubeUrlType(youtubeUrl);
    
    if (type === 'invalid URL' || type === 'unknown') {
      setYoutubeError(`Invalid YouTube URL: ${type}`);
      return;
    }
    
    onProcessYouTubeUrl(youtubeUrl);
  }, [youtubeUrl, detectYoutubeUrlType, onProcessYouTubeUrl]);

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
          <h3 className="text-lg font-normal text-black mb-2">Scan from YouTube</h3>
          <form onSubmit={handleYoutubeSubmit} className="space-y-2">
            <div>
              <label htmlFor="youtubeUrl" className="block text-sm text-black mb-0.5">YouTube URL:</label>
              <input
                id="youtubeUrl"
                type="url"
                value={youtubeUrl}
                onChange={handleYoutubeUrlChange}
                placeholder="Paste any YouTube video, playlist, or channel URL"
                className="w-full px-2 py-1 bg-white text-black win95-border-inset focus:outline-none rounded-none"
                disabled={isLoading}
                aria-label="YouTube URL"
              />
            </div>
            {youtubeDetectedType && !youtubeError && (
              <p className="text-xs text-green-700 mt-1">
                Detected: <strong>{youtubeDetectedType}</strong>
              </p>
            )}
            {youtubeError && <p className="text-xs text-red-700 mt-1">{youtubeError}</p>}
            <Button 
              type="submit" 
              size="md" 
              isLoading={isLoading} 
              disabled={isLoading || !youtubeUrl.trim() || !!youtubeError}
            >
              {isLoading ? 'Processing...' : 'Scan YouTube Content'}
            </Button>
          </form>
          <p className="text-xs text-gray-700 mt-1">
            Auto-detects and processes YouTube videos, playlists, or channels. <strong className="text-black">Requires the SoundTrace Downloader desktop app to be running.</strong>
          </p>
        </div>
      </section>

      <section className="p-0.5 win95-border-outset bg-[#C0C0C0]">
        <div className="p-3 bg-[#C0C0C0]">
          <h3 className="text-lg font-normal text-black mb-2">Scan from Spotify</h3>
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
              {isLoading ? 'Processing...' : 'Scan Spotify Content'}
            </Button>
          </form>
          <p className="text-xs text-gray-700 mt-1">
            Auto-detects and processes Spotify tracks or playlists. Imports track details directly into your scan log.
          </p>
        </div>
      </section>
    </div>
  );
};

export default React.memo(AutoDetectInputForms);
