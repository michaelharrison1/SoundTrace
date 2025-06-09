
import React from 'react';
import ProgressBar from './ProgressBar';

interface FollowerReachGraphProps {
  totalFollowers: number | null | undefined; // undefined: loading, null: error/no data, number: value
  isLoading: boolean;
  error?: string | null;
}

const FollowerReachGraph: React.FC<FollowerReachGraphProps> = ({ totalFollowers, isLoading, error }) => {
  const containerStyles = "p-0.5 win95-border-outset bg-[#C0C0C0] mb-4";
  const innerContainerStyles = "p-4 bg-[#C0C0C0]";

  const formatFollowersDisplay = (count: number | null | undefined): string => {
    if (typeof count === 'undefined') return "Loading...";
    if (count === null) return "Error"; // Error state
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  const displayValue = formatFollowersDisplay(totalFollowers);


  // Max possible followers for styling the bar, e.g., 10 million for 100%
  // This helps give a sense of scale to the bar.
  const MAX_REACH_FOR_BAR = 10000000; // 10 Million

  // Calculate barPercentage safely
  const barPercentage = (typeof totalFollowers === 'number' && totalFollowers > 0 && !isLoading && !error)
    ? Math.min((totalFollowers / MAX_REACH_FOR_BAR) * 100, 100)
    : 0;

  const barTitle = (typeof totalFollowers === 'number' && totalFollowers > 0)
    ? `Approximately ${totalFollowers.toLocaleString()} followers`
    : "Follower data unavailable";

  return (
    <div className={containerStyles}>
      <div className={innerContainerStyles}>
        <h3 className="text-lg font-normal text-black mb-2 text-center">
          <span role="img" aria-label="headphone emoji" className="mr-1">🎧</span>
          Total Estimated Reach
        </h3>
        {isLoading && <ProgressBar text="Calculating reach..." />}
        {!isLoading && error && (
          <p className="text-center text-red-600 text-sm py-2">{error}</p>
        )}
        {!isLoading && !error && (
          <>
            <div className="text-3xl text-[#084B8A] font-bold text-center my-2">
              {displayValue}
            </div>
            <div className="h-6 bg-white win95-border-inset p-0.5 my-1" title={barTitle}>
              {barPercentage > 0 && (
                <div
                  className="h-full bg-[#084B8A] win95-border-outset flex items-center justify-center"
                  style={{ width: `${barPercentage}%` }}
                >
                  {/* Optional: text inside bar if it's wide enough */}
                   {/* <span className="text-white text-xs px-1 truncate">{formatFollowersDisplay(totalFollowers)}</span> */}
                </div>
              )}
              {barPercentage === 0 && (
                 <div className="h-full flex items-center justify-center text-xs text-gray-500">
                    No follower data available or total is zero.
                 </div>
              )}
            </div>
            <p className="text-xs text-gray-700 text-center">
              Combined Spotify followers from unique artists found in scans.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default FollowerReachGraph;