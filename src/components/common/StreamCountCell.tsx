import React, { useState, useEffect, useCallback } from 'react';
import Button from './Button';
import { spotifyStreamService, SpotifyStreamCountResponse } from '../../services/spotifyStreamService';

interface StreamCountCellProps {
  trackId?: string | null;
}

interface StreamFetchState {
  loading: boolean;
  count: number | null;
  error: string | null;
  status?: SpotifyStreamCountResponse['streamCountStatus'];
  message?: string;
}

const formatStreamCount = (count: number | null): string => {
  if (count === null || typeof count === 'undefined') return '-';
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return count.toString();
};

const StreamCountCell: React.FC<StreamCountCellProps> = ({ trackId }) => {
  const [streamState, setStreamState] = useState<StreamFetchState>({
    loading: false,
    count: null,
    error: null,
  });

  const fetchStreamCount = useCallback(async () => {
    if (!trackId) {
      setStreamState({ loading: false, count: null, error: 'No track ID provided', status: undefined, message: undefined });
      return;
    }
    setStreamState({ loading: true, count: null, error: null, status: undefined, message: undefined });
    try {
      const data = await spotifyStreamService.getTrackStreams(trackId);
      setStreamState({
        loading: false,
        count: data.streamCount,
        error: data.streamCountStatus !== 'available' ? (data.message || 'Failed to fetch streams') : null,
        status: data.streamCountStatus,
        message: data.message,
      });
    } catch (err: any) {
      console.error(`Error fetching streams for ${trackId}:`, err);
      setStreamState({
        loading: false,
        count: null,
        error: err.message || 'Error fetching streams',
        status: 'unavailable_api_error', // Changed from 'error_fetching'
        message: err.message || 'Client-side error fetching streams',
      });
    }
  }, [trackId]);

  // Optionally, auto-fetch when trackId changes or component mounts if desired
  // useEffect(() => {
  //   if (trackId) {
  //     fetchStreamCount();
  //   }
  // }, [trackId, fetchStreamCount]);


  if (!trackId) {
    return <span className="text-gray-400">-</span>;
  }

  if (streamState.loading) {
    return <span className="text-xs text-gray-500">Loading...</span>;
  }

  if (streamState.status && streamState.status !== 'available') {
    let titleText = streamState.message || 'Stream count unavailable';
    if (streamState.status === 'unavailable_token_error') titleText = 'Token error fetching streams.';
    else if (streamState.status === 'unavailable_data_missing') titleText = 'Stream data missing for this track.';
    else if (streamState.status === 'unavailable_api_error') titleText = `API error: ${streamState.error || 'Unknown'}`;
    
    return (
      <Button 
        size="sm" 
        className="!p-0.5 !text-[10px] !min-w-[50px] !h-[18px] hover:bg-gray-300" 
        onClick={fetchStreamCount} 
        title={titleText}
      >
        Retry
      </Button>
    );
  }

  if (streamState.count !== null && typeof streamState.count !== 'undefined') {
    return <span className="text-black">{formatStreamCount(streamState.count)}</span>;
  }

  return (
    <Button 
      size="sm" 
      className="!p-0.5 !text-[10px] !min-w-[50px] !h-[18px] hover:bg-gray-300" 
      onClick={fetchStreamCount}
      title="Fetch Spotify stream count"
    >
      Fetch
    </Button>
  );
};

export default React.memo(StreamCountCell);