
import React, { useEffect, useState } from 'react';
import ProgressBar from './ProgressBar'; // For loading state inside the content area

interface FollowerReachMonitorProps {
  totalFollowers: number | null | undefined;
  isLoading: boolean;
  error?: string | null;
}

const MAX_GRAPH_BARS = 30; // Number of segments in the graph
const BAR_COLORS = ['#008080', '#000080', '#800080', '#808000', '#008000', '#A9A9A9']; // Teal, DkBlue, Purple, Olive, DkGreen, DarkGray (instead of Silver for better contrast on C0C0C0)

const FakeWindowIcon: React.FC = () => (
  <div className="w-4 h-4 bg-gray-300 border border-t-white border-l-white border-r-gray-500 border-b-gray-500 inline-flex items-center justify-center mr-1 align-middle">
    <div className="w-[7px] h-[7px] bg-[#000080]"></div> {/* Tiny blue square inside */}
  </div>
);

const FollowerReachMonitor: React.FC<FollowerReachMonitorProps> = ({ totalFollowers, isLoading, error }) => {
  const [animatedBars, setAnimatedBars] = useState(0);

  const calculateFilledBars = (followers: number | null | undefined): number => {
    if (typeof followers !== 'number' || followers <= 0) return 0;
    const maxFollowersForFullGraph = 1000000; // Visual cap for 100% filled graph
    const minFollowersForOneBar = 1; // Even a small number of followers lights up one bar

    if (followers < minFollowersForOneBar) return 0;

    const proportion = Math.min(1, followers / maxFollowersForFullGraph);
    let barsToFill = Math.ceil(proportion * MAX_GRAPH_BARS);

    // Ensure at least one bar is shown if there are any followers
    if (followers > 0 && barsToFill === 0) {
      barsToFill = 1;
    }
    return barsToFill;
  };

  useEffect(() => {
    if (!isLoading) {
      const targetBars = calculateFilledBars(totalFollowers);
      setAnimatedBars(targetBars);
    } else {
      // While loading, we can either show 0 or keep previous state,
      // but ProgressBar handles the visual "loading" state.
      // Let's reset to 0 if loading starts, to ensure animation on new data.
       setAnimatedBars(0);
    }
  }, [totalFollowers, isLoading]);

  const formatFollowersDisplay = (count: number | null | undefined): string => {
    if (isLoading && typeof count === 'undefined') return "Loading..."; // Specifically when isLoading is true and count is undefined
    if (typeof count === 'undefined') return "Loading..."; // General undefined case (could be initial state before fetch)
    if (count === null) return "N/A"; // Error or explicitly no data
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };
  const displayValue = formatFollowersDisplay(totalFollowers);

  return (
    <div className="win95-border-outset bg-[#C0C0C0] mb-4 text-black"> {/* Window container */}
      {/* Title Bar */}
      <div className="title-bar flex items-center justify-between bg-[#000080] text-white px-1 py-0.5 h-6 select-none">
        <div className="flex items-center">
          <FakeWindowIcon />
          <span className="font-bold text-sm">Follower Reach Monitor</span>
        </div>
        <div className="flex space-x-0.5">
          <button className="win95-button-sm bg-[#C0C0C0] text-black font-mono w-4 h-4 leading-none text-xs" aria-label="Minimize">_</button>
          <button className="win95-button-sm bg-[#C0C0C0] text-black font-mono w-4 h-4 leading-none text-xs flex items-center justify-center" aria-label="Maximize">
            <div className="w-2 h-2 border border-black"></div>
          </button>
          <button className="win95-button-sm bg-[#C0C0C0] text-black font-bold font-mono w-4 h-4 leading-none text-xs" aria-label="Close">X</button>
        </div>
      </div>

      {/* Menu Bar */}
      <div className="menu-bar flex space-x-2 px-1 py-0.5 border-b border-t-white border-b-[#808080] select-none">
        <span className="text-sm hover:bg-black hover:text-white px-1 cursor-default"><u>F</u>ile</span>
        <span className="text-sm hover:bg-black hover:text-white px-1 cursor-default"><u>E</u>dit</span>
        <span className="text-sm hover:bg-black hover:text-white px-1 cursor-default"><u>V</u>iew</span>
        <span className="text-sm hover:bg-black hover:text-white px-1 cursor-default"><u>H</u>elp</span>
      </div>

      {/* Tabs */}
      <div className="tabs-container flex pl-1 pt-1 bg-[#C0C0C0] select-none">
        <div className="tab selected bg-[#C0C0C0] px-3 py-1 text-sm win95-border-outset border-b-[#C0C0C0] relative -mb-px z-10 cursor-default">
          Total Reach
        </div>
        <div className="tab bg-[#C0C0C0] px-3 py-1 text-sm win95-border-outset border-t-gray-400 border-l-gray-400 text-gray-600 ml-0.5 opacity-75 cursor-default">
          Artist Stats
        </div>
        <div className="tab bg-[#C0C0C0] px-3 py-1 text-sm win95-border-outset border-t-gray-400 border-l-gray-400 text-gray-600 ml-0.5 opacity-75 cursor-default">
          Settings
        </div>
      </div>

      {/* Content Area Wrapper - this helps manage the border appearance with the tab */}
      <div className="tab-content-wrapper p-0.5 pt-0 bg-[#C0C0C0]">
        <div className="tab-content win95-border-inset bg-[#C0C0C0] p-3 min-h-[220px]">
          <h4 className="text-base font-semibold text-black mb-1 text-center">Total Estimated Spotify Reach</h4>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full py-4">
               <ProgressBar text="Calculating reach..." />
            </div>
          ) : error ? (
            <div className="text-center text-red-700 text-sm py-8 h-full flex items-center justify-center">
              <p>Error: {error}</p>
            </div>
          ) : (
            <>
              <p className="text-3xl text-black font-bold my-3 text-center">{displayValue}</p>
              <div
                className="graph-area h-20 bg-[#B0B0B0] win95-border-inset p-1 flex items-end space-x-px overflow-hidden relative"
                style={{
                  backgroundImage: "repeating-linear-gradient(to right, #A0A0A0, #A0A0A0 1px, transparent 1px, transparent 19px), repeating-linear-gradient(to bottom, #A0A0A0, #A0A0A0 1px, transparent 1px, transparent 19px)",
                  backgroundSize: "20px 20px"
                }}
                role="img"
                aria-label={`Follower graph representing ${displayValue} followers`}
              >
                {Array.from({ length: MAX_GRAPH_BARS }).map((_, i) => (
                  <div
                    key={i}
                    className="graph-bar-segment flex-1 transition-all duration-300 ease-out"
                    style={{
                      backgroundColor: i < animatedBars ? BAR_COLORS[i % BAR_COLORS.length] : 'transparent',
                      borderTop: i < animatedBars ? '1px solid #DFDFDF' : '1px solid transparent', // Lighter top
                      borderLeft: i < animatedBars ? '1px solid #DFDFDF' : '1px solid transparent', // Lighter left
                      borderBottom: i < animatedBars ? '1px solid #555555' : '1px solid transparent', // Darker bottom
                      borderRight: i < animatedBars ? '1px solid #555555' : '1px solid transparent', // Darker right
                      height: i < animatedBars ? '100%' : '0%', // Animate height
                      transitionDelay: `${i * 25}ms`, // Staggered animation
                      alignSelf: 'flex-end', // Grow from bottom
                    }}
                  ></div>
                ))}
              </div>
              <p className="text-xs text-gray-700 mt-2 text-center">Graph visualizes follower count. Max visual representation at {formatFollowersDisplay(1000000)}.</p>
            </>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar flex justify-between items-center px-1 py-0 border-t-2 border-t-[#808080] bg-[#C0C0C0] h-5 text-xs select-none">
        <span className="win95-border-inset px-2 py-0 h-[18px] flex items-center">Ready.</span>
        <div className="flex space-x-0.5 h-[18px]">
           <div className="win95-border-inset w-16 px-1 flex items-center justify-center">
             {/* Could put a fake progress or icon here */}
             <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1 H9 V9 H1Z" fill="#008000" stroke="#000000" strokeWidth="0.5"/></svg>
           </div>
           <div className="win95-border-inset w-12 px-1 flex items-center justify-center">
             {new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit'})}
           </div>
        </div>
      </div>
    </div>
  );
};
export default FollowerReachMonitor;
