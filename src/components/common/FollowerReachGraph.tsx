
import React from 'react';
import ProgressBar from './ProgressBar';

interface FollowerReachGraphProps {
  totalFollowers: number | null | undefined; // undefined: loading, null: error/no data, number: value
  isLoading: boolean;
  error?: string | null;
}

const barColors = [
  'bg-[#00FFFF]', // Cyan
  'bg-[#FF00FF]', // Magenta
  'bg-[#FFFF00]', // Yellow
  'bg-[#00FF00]', // Green
  'bg-[#FF0000]', // Red
  'bg-[#008080]', // Teal
  'bg-[#FFA500]', // Orange
];

const FollowerReachGraph: React.FC<FollowerReachGraphProps> = ({ totalFollowers, isLoading, error }) => {
  const containerStyles = "p-0.5 win95-border-outset bg-[#C0C0C0] mb-4";
  const innerContainerStyles = "p-4 bg-[#C0C0C0]";

  const formatFollowersDisplay = (count: number | null | undefined): string => {
    if (typeof count === 'undefined' || isLoading) return "Loading..."; // Show loading if explicitly loading
    if (count === null) return "N/A";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  const displayValue = formatFollowersDisplay(totalFollowers);

  const numBars = 7; // Number of bars in the graph

  return (
    <div className={containerStyles}>
      <div className={innerContainerStyles}>
        <h3 className="text-lg font-normal text-black mb-2 text-center">
          Total Estimated Reach
        </h3>
        {isLoading && <ProgressBar text="Calculating reach..." className="my-4" />}
        {!isLoading && error && (
          <p className="text-center text-red-600 text-sm py-2">{error}</p>
        )}
        {!isLoading && !error && (
          <>
            <div className="text-3xl text-[#084B8A] font-bold text-center my-2">
              {displayValue}
            </div>
            {/* Graph Visualizer Area */}
            <div className="h-16 w-full flex justify-center items-end space-x-1 my-2 win95-border-inset p-1 bg-black" role="figure" aria-label="Follower reach visualizer">
              {(typeof totalFollowers === 'number' && totalFollowers > 0) ? (
                [...Array(numBars)].map((_, i) => (
                  <div
                    key={i}
                    className={`graph-bar ${barColors[i % barColors.length]}`}
                    style={{
                      height: '100%', // Max height, animation scales this
                      animationDelay: `${i * 0.15}s`, // Stagger animation
                    }}
                  />
                ))
              ) : (
                 <div className="h-full w-full flex items-center justify-center text-xs text-gray-400 italic">
                    { totalFollowers === 0 ? "No followers to display" : "Data unavailable for graph" }
                 </div>
              )}
            </div>
            <p className="text-xs text-gray-700 text-center mt-1">
              Combined Spotify followers from unique artists found in scans.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default FollowerReachGraph;