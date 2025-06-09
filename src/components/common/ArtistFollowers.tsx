
import React, { useState, useEffect } from 'react';

interface ArtistFollowersProps {
  artistId?: string;
}

const ArtistFollowers: React.FC<ArtistFollowersProps> = ({ artistId }) => {
  const [followers, setFollowers] = useState<number | null | undefined>(undefined); // undefined for loading, null for error/no data
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId) {
      setFollowers(null); // No ID, so no data (or explicitly means "not applicable")
      setError(null);
      return;
    }

    let isMounted = true;
    const fetchFollowers = async () => {
      if (!isMounted) return;
      setFollowers(undefined); // Set to loading state
      setError(null);
      try {
        const response = await fetch(`/api/spotify-artist-details?artistId=${artistId}`);
        if (!isMounted) return;

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: `Error: ${response.status}`}));
          throw new Error(errorData.message || `Failed to fetch followers (${response.status})`);
        }
        const data = await response.json();
        if (isMounted) {
          setFollowers(data.followers);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error(`Error fetching followers for artist ${artistId}:`, err);
          setError(err.message || 'Could not load followers.');
          setFollowers(null);
        }
      }
    };

    fetchFollowers();

    return () => {
      isMounted = false;
    };
  }, [artistId]);

  const formatFollowers = (count?: number | null): string => {
    if (typeof count === 'undefined') return '...'; // Loading
    if (count === null) return 'N/A'; // Error or no data state (e.g. artist not found, or no artistId provided)
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  // If there's an error, show "N/A" and make the error message available on hover (optional)
  if (error) {
    return <span className="text-xs text-red-600" title={error}>{formatFollowers(null)}</span>;
  }

  // If no artistId was provided from the start, display a dash or N/A.
  if (!artistId && followers === null) {
      return <span className="text-xs text-gray-500">-</span>;
  }

  return <span className="text-black">{formatFollowers(followers)}</span>;
};

export default ArtistFollowers;
