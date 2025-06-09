
import React from 'react';
import ProgressBar from './ProgressBar';

interface FollowerReachGraphProps {
  totalFollowers: number | null | undefined; // undefined: loading, null: error/no data, number: value
  isLoading: boolean;
  error?: string | null;
}

// Simple SVG for a pixelated person icon
const PixelPersonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    width="10"
    height="16"
    viewBox="0 0 10 16" // Adjusted viewBox for a more slender person
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className || ''}`}
    aria-hidden="true"
    preserveAspectRatio="xMidYMid meet"
  >
    {/* Head */}
    <rect x="4" y="0" width="2" height="2" fill="#0000AA" /> {/* Dark Blue */}
    {/* Neck */}
    <rect x="4" y="2" width="2" height="1" fill="#0000AA" />
    {/* Shoulders */}
    <rect x="2" y="3" width="6" height="1" fill="#0000AA" />
    {/* Body */}
    <rect x="3" y="4" width="4" height="4" fill="#0000AA" />
    {/* Legs */}
    <rect x="3" y="8" width="2" height="5" fill="#0000AA" /> {/* Left Leg */}
    <rect x="5" y="8" width="2" height="5" fill="#0000AA" /> {/* Right Leg */}
  </svg>
);


const FollowerReachGraph: React.FC<FollowerReachGraphProps> = ({ totalFollowers, isLoading, error }) => {
  const containerStyles = "p-0.5 win95-border-outset bg-[#C0C0C0] mb-4";
  const innerContainerStyles = "p-4 bg-[#C0C0C0]";
  const MAX_ICONS_TO_DISPLAY = 50; // Cap for visual clutter

  const formatFollowersDisplay = (count: number | null | undefined): string => {
    if (typeof count === 'undefined' || (isLoading && count === undefined)) return "Loading...";
    if (count === null) return "N/A";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  const displayValue = formatFollowersDisplay(totalFollowers);
  const peopleUnits = totalFollowers && totalFollowers > 0 ? Math.floor(totalFollowers / 10000) : 0;
  const displayIconCount = Math.min(peopleUnits, MAX_ICONS_TO_DISPLAY);

  return (
    <div className={containerStyles}>
      <div className={innerContainerStyles}>
        <h3 className="text-lg font-normal text-black mb-2 text-center">
          Total Estimated Reach
        </h3>

        {isLoading && <ProgressBar text="Calculating reach..." className="my-4" />}

        {!isLoading && error && (
          <p className="text-center text-red-600 text-sm py-2 min-h-[80px] flex items-center justify-center">{error}</p>
        )}

        {!isLoading && !error && (
          <>
            <div className="text-3xl text-[#084B8A] font-bold text-center my-2">
              {displayValue}
            </div>

            <div
              className="flex flex-wrap justify-center items-center my-2 p-2 min-h-[80px] win95-border-inset bg-black"
              role="figure"
              aria-label={`Follower representation: ${peopleUnits} groups of 10,000`}
            >
              {typeof totalFollowers === 'number' && totalFollowers >= 0 && displayIconCount > 0 && (
                Array.from({ length: displayIconCount }).map((_, i) => (
                  <PixelPersonIcon key={i} className="m-1" />
                ))
              )}
              {typeof totalFollowers === 'number' && peopleUnits > MAX_ICONS_TO_DISPLAY && (
                <span className="text-white text-lg ml-2 p-1">+{peopleUnits - MAX_ICONS_TO_DISPLAY} more groups</span>
              )}
              {typeof totalFollowers === 'number' && peopleUnits === 0 && totalFollowers > 0 && (
                 <span className="text-xs text-gray-400 italic p-1">Less than 10,000 (no full icon)</span>
              )}
               {typeof totalFollowers === 'number' && totalFollowers === 0 && (
                 <span className="text-xs text-gray-400 italic p-1">0 followers</span>
              )}
               {(totalFollowers === null || typeof totalFollowers === 'undefined') && ( // Show N/A if data is null after loading
                 <span className="text-xs text-gray-400 italic p-1">Data unavailable</span>
              )}
            </div>

            <p className="text-xs text-gray-700 text-center mt-1">
              Combined Spotify followers. Each
              <PixelPersonIcon className="inline align-middle mx-1 -mt-1" />
              represents 10,000 people.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default FollowerReachGraph;
