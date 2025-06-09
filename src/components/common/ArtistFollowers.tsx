
import React from 'react';

interface ArtistFollowersProps {
  followers: number | null | undefined; // undefined for loading, null for error/no data
  isLoading: boolean;
  error?: string | null;
}

const ArtistFollowers: React.FC<ArtistFollowersProps> = ({ followers, isLoading, error }) => {
  const formatFollowers = (count?: number | null): string => {
    if (isLoading) return '...';
    if (error) return 'N/A';
    if (typeof count === 'undefined' || count === null) return 'N/A';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  const displayTitle = error ? error : (followers === null && !isLoading) ? "Follower data not available" : undefined;

  return (
    <span
      className={`text-xs ${error ? 'text-red-600' : isLoading ? 'text-gray-500' : 'text-black'}`}
      title={displayTitle}
    >
      {formatFollowers(followers)}
    </span>
  );
};

export default ArtistFollowers;
