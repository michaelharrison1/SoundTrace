
import React, { useState, useEffect } from 'react';

interface ArtistFollowersProps {
  artistId?: string;
}

const ArtistFollowers: React.FC<ArtistFollowersProps> = ({ artistId }) => {
  const [followers, setFollowers] = useState<number | null | undefined>(undefined); // undefined for loading, null for error/no data
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId) {
      setFollowers(null); // No ID, so no data
      return;
    }

    const fetchFollowers = async () => {
      setFollowers(undefined); // Set to loading state
      setError(null);
      try {
        const response = await fetch(`/api/spotify-artist-details?artistId=${artistId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Error: ${response.status}`}));
          throw new Error(errorData.message || `Failed to fetch followers (${response.status})`);
        }
        const data = await response.json();
        setFollowers(data.followers);
      } catch (err: any) {
        console.error(`Error fetching followers for artist ${artistId}:`, err);
        setError(err.message || 'Could not load followers.');
        setFollowers(null);
      }
    };

    fetchFollowers();
  }, [artistId]);

  const formatFollowers = (count?: number | null): string => {
    if (typeof count === 'undefined') return '...'; // Loading
    if (count === null) return 'N/A'; // Error or no data state
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  if (typeof followers === 'undefined') {
    return <span className="text-xs text-gray-500">...</span>;
  }

  if (error) {
    return <span className="text-xs text-red-600" title={error}>N/A</span>;
  }

  if (followers === null && !artistId) { // Explicitly no artist ID was passed
    return <span className="text-xs text-gray-500">-</span>;
  }


  return <span className="text-black">{formatFollowers(followers)}</span>;
};

export default ArtistFollowers;
