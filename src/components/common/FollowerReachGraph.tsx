
import React, { useEffect, useState, useRef } from 'react';
import ProgressBar from './ProgressBar'; // For loading state inside the content area

interface FollowerReachMonitorProps {
  totalFollowers: number | null | undefined;
  isLoading: boolean;
  error?: string | null;
}

const VISIBLE_DATA_POINTS = 60; // Number of columns visible on the chart
const PIXEL_LINE_COLOR = '#34D399'; // Emerald-400 for a nice green
const CHART_BACKGROUND_COLOR = '#262626'; // neutral-800, dark gray
const GRID_COLOR = 'rgba(128, 128, 128, 0.2)'; // Lighter gray for grid lines
const CHART_HEIGHT_PX = 128; // Corresponds to h-32 in Tailwind (1 unit = 4px)

const FakeWindowIcon: React.FC = () => (
  <div className="w-4 h-4 bg-gray-300 border border-t-white border-l-white border-r-gray-500 border-b-gray-500 inline-flex items-center justify-center mr-1 align-middle">
    <div className="w-[7px] h-[7px] bg-[#000080]"></div>
  </div>
);

const FollowerReachMonitor: React.FC<FollowerReachMonitorProps> = ({ totalFollowers, isLoading, error }) => {
  const [chartData, setChartData] = useState<number[]>(() => Array(VISIBLE_DATA_POINTS).fill(0));
  const [currentMaxFollowers, setCurrentMaxFollowers] = useState<number>(1000); // Initial sensible default

  useEffect(() => {
    if (!isLoading && !error && typeof totalFollowers === 'number') {
      setChartData(prevData => {
        const newData = [...prevData];
        newData.shift(); // Remove the oldest point
        newData.push(totalFollowers); // Add the new point
        return newData;
      });
    } else if (!isLoading && !error && totalFollowers === null) { // Handle explicit null (N/A) as 0 for chart
       setChartData(prevData => {
        const newData = [...prevData];
        newData.shift();
        newData.push(0);
        return newData;
      });
    }
    // If loading or error, chartData remains as is, letting the loading/error UI take over.
    // If totalFollowers is undefined (initial loading), chartData also remains, waiting for first valid number.

  }, [totalFollowers, isLoading, error]);

  useEffect(() => {
    // Update currentMaxFollowers based on the current chartData
    const maxInChart = Math.max(...chartData.filter(v => typeof v === 'number'));
    setCurrentMaxFollowers(Math.max(1000, maxInChart)); // Ensure a minimum scaling factor, e.g., 1000 followers
  }, [chartData]);

  const formatFollowersDisplay = (count: number | null | undefined): string => {
    if (isLoading && typeof count === 'undefined') return "Loading...";
    if (typeof count === 'undefined') return "Loading...";
    if (count === null) return "N/A";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };
  const displayValue = formatFollowersDisplay(totalFollowers);

  const calculatePixelHeight = (value: number, max: number, chartHeight: number): number => {
    if (value <= 0) return 0;
    const proportion = value / Math.max(1, max); // Avoid division by zero if max is 0
    return Math.max(2, proportion * chartHeight); // Ensure minimum 2px height for visibility
  };

  return (
    <div className="win95-border-outset bg-[#C0C0C0] mb-4 text-black">
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

      <div className="tab-content-wrapper p-0.5 pt-0 bg-[#C0C0C0]">
        <div className="tab-content win95-border-inset bg-[#C0C0C0] p-3 min-h-[220px] flex flex-col">
          <h4 className="text-base font-semibold text-black mb-1 text-center">Total Estimated Spotify Reach</h4>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center flex-grow py-4">
               <ProgressBar text="Calculating reach..." />
            </div>
          ) : error ? (
            <div className="text-center text-red-700 text-sm py-8 h-full flex items-center justify-center flex-grow">
              <p>Error: {error}</p>
            </div>
          ) : (
            <>
              <p className="text-3xl text-black font-bold my-3 text-center">{displayValue}</p>
              <div
                className="pixel-chart-area win95-border-inset p-1 flex items-end space-x-px overflow-hidden relative h-32" // h-32 = 128px
                style={{
                  backgroundColor: CHART_BACKGROUND_COLOR,
                  backgroundImage: `
                    linear-gradient(to right, ${GRID_COLOR} 1px, transparent 1px),
                    linear-gradient(to bottom, ${GRID_COLOR} 1px, transparent 1px)
                  `,
                  backgroundSize: "10px 10px"
                }}
                role="img"
                aria-label={`Follower chart representing ${displayValue} followers`}
              >
                {chartData.map((value, i) => {
                  const pixelHeight = calculatePixelHeight(value, currentMaxFollowers, CHART_HEIGHT_PX - 4); // -4 for padding
                  return (
                    <div
                      key={i}
                      className="chart-column flex-1 h-full relative" // Each column takes equal width
                    >
                      <div
                        className="pixel-line absolute bottom-0 left-[1px] right-[1px]" // Small gap between lines
                        style={{
                          backgroundColor: PIXEL_LINE_COLOR,
                          height: `${pixelHeight}px`,
                          transition: 'height 0.3s ease-out',
                           boxShadow: pixelHeight > 0 ? `0 0 2px ${PIXEL_LINE_COLOR}, 0 0 5px ${PIXEL_LINE_COLOR}`: 'none', // Add a subtle glow
                        }}
                      ></div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-700 mt-2 text-center">Chart scrolls right to left. Max visual representation at {formatFollowersDisplay(currentMaxFollowers)}.</p>
            </>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar flex justify-between items-center px-1 py-0 border-t-2 border-t-[#808080] bg-[#C0C0C0] h-5 text-xs select-none">
        <span className="win95-border-inset px-2 py-0 h-[18px] flex items-center">Ready.</span>
        <div className="flex space-x-0.5 h-[18px]">
           <div className="win95-border-inset w-16 px-1 flex items-center justify-center">
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
