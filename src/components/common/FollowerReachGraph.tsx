
import React, { useEffect, useState, useRef, useCallback } from 'react';
import ProgressBar from './ProgressBar'; // For loading state inside the content area

interface FollowerReachMonitorProps {
  totalFollowers: number | null | undefined;
  isLoading: boolean;
  error?: string | null;
}

const MAX_BAR_SLOTS = 30; // Number of physical bar slots visible on the chart
const ACTIVE_BAR_COLOR = '#34D399'; // Green color for active bars and line glow
const CHART_BACKGROUND_COLOR = '#262626'; // neutral-800, dark gray
const GRID_COLOR = 'rgba(128, 128, 128, 0.2)';
const LINE_ANIMATION_DURATION_MS = 2500; // Duration for the line to sweep across

const FakeWindowIcon: React.FC = () => (
  <div className="w-4 h-4 bg-gray-300 border border-t-white border-l-white border-r-gray-500 border-b-gray-500 inline-flex items-center justify-center mr-1 align-middle">
    <div className="w-[7px] h-[7px] bg-[#000080]"></div>
  </div>
);

interface BarConfig {
  barUnit: number;
  numberOfBarsToActivate: number;
  unitLabel: string;
}

const calculateBarConfig = (followers: number | null | undefined): BarConfig => {
  let barUnit = 1000;
  let unitLabel = '1K';

  if (typeof followers !== 'number' || followers === null || followers <= 0) {
    return { barUnit: 0, numberOfBarsToActivate: 0, unitLabel: '' };
  }

  if (followers < 10000) {
    barUnit = 1000;
    unitLabel = '1K';
  } else if (followers < 100000) {
    barUnit = 10000;
    unitLabel = '10K';
  } else if (followers < 1000000) {
    barUnit = 100000;
    unitLabel = '100K';
  } else {
    barUnit = 1000000;
    unitLabel = '1M';
  }

  const calculatedBars = Math.ceil(followers / barUnit);
  const numberOfBarsToActivate = Math.max(1, calculatedBars);

  return { barUnit, numberOfBarsToActivate, unitLabel };
};


const FollowerReachMonitor: React.FC<FollowerReachMonitorProps> = ({ totalFollowers, isLoading, error }) => {
  const [lineProgress, setLineProgress] = useState(0); // 0 to 1
  const [barConfig, setBarConfig] = useState<BarConfig>(calculateBarConfig(totalFollowers));
  const animationFrameId = useRef<number | null>(null);
  const animationStartTime = useRef<number>(0);

  useEffect(() => {
    setBarConfig(calculateBarConfig(totalFollowers));
  }, [totalFollowers]);

  const animateLineCallback = useCallback((timestamp: number) => {
    if (animationStartTime.current === 0) {
      animationStartTime.current = timestamp;
    }

    const elapsedTime = timestamp - animationStartTime.current;
    let newProgress = elapsedTime / LINE_ANIMATION_DURATION_MS;

    if (newProgress >= 1.0) {
      newProgress = 0; // Reset for the loop
      animationStartTime.current = timestamp; // Restart the timer from the current frame
    }

    setLineProgress(newProgress);
    animationFrameId.current = requestAnimationFrame(animateLineCallback);
  }, [LINE_ANIMATION_DURATION_MS]);

  useEffect(() => {
    const shouldAnimate = !isLoading && !error && (totalFollowers ?? 0) > 0;

    if (shouldAnimate) {
      if (!animationFrameId.current) { // Only start if not already running
        animationStartTime.current = performance.now() - (lineProgress * LINE_ANIMATION_DURATION_MS); // Preserve current progress if animation was paused
        animationFrameId.current = requestAnimationFrame(animateLineCallback);
      }
    } else {
      // Stop animation
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      if (isLoading || error || (totalFollowers ?? 0) <= 0) {
         setLineProgress(0); // Reset line to start if not animating due to these conditions
      }
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null; // Ensure it's null on cleanup
      }
    };
  }, [isLoading, error, totalFollowers, animateLineCallback, lineProgress]);


  const formatFollowersDisplay = (count: number | null | undefined): string => {
    if (isLoading && typeof count === 'undefined') return "Loading...";
    if (typeof count === 'undefined') return "Loading...";
    if (count === null) return "N/A";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };
  const displayValue = formatFollowersDisplay(totalFollowers);

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
                className="performance-chart-area win95-border-inset p-1 flex items-end space-x-px overflow-hidden relative h-32"
                style={{
                  backgroundColor: CHART_BACKGROUND_COLOR,
                  backgroundImage: `
                    linear-gradient(to right, ${GRID_COLOR} 1px, transparent 1px),
                    linear-gradient(to bottom, ${GRID_COLOR} 1px, transparent 1px)
                  `,
                  backgroundSize: "10px 10px"
                }}
                role="img"
                aria-label={`Performance chart. Current total follower reach: ${displayValue}. ${barConfig.unitLabel ? 'Each bar segment represents ' + barConfig.unitLabel + ' followers.' : ''}`}
              >
                {/* Bars Area */}
                <div className="flex w-full h-full items-end">
                  {[...Array(MAX_BAR_SLOTS)].map((_, i) => {
                    const barIsActive = lineProgress * MAX_BAR_SLOTS > i && i < barConfig.numberOfBarsToActivate && (totalFollowers ?? 0) > 0;
                    const barHeight = barIsActive ? '100%' : '0%';

                    return (
                      <div
                        key={i}
                        className="chart-bar-slot flex-1 h-full mx-px relative flex items-end justify-center"
                      >
                        <div className="absolute bottom-0 left-0 right-0 h-full win95-border-inset bg-neutral-700 opacity-50"></div>
                        { (totalFollowers ?? 0) > 0 && (
                          <div
                            className="active-bar-fill relative win95-border-outset"
                            style={{
                              backgroundColor: barIsActive ? ACTIVE_BAR_COLOR : 'transparent',
                              height: barHeight,
                              width: '80%',
                              transition: 'height 0.1s linear',
                              boxShadow: barIsActive ? `0 0 3px ${ACTIVE_BAR_COLOR}, 0 0 6px ${ACTIVE_BAR_COLOR}` : 'none',
                            }}
                          ></div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Green Progress Line Overlay */}
                { (totalFollowers ?? 0) > 0 && !isLoading && !error && (
                    <div
                    className="progress-line absolute top-0 bottom-0 bg-green-400" // bg-green-400 for visibility if shadow fails
                    style={{
                        left: `${lineProgress * 100}%`,
                        width: '3px',
                        boxShadow: `0 0 5px 1px ${ACTIVE_BAR_COLOR}, 0 0 10px 2px ${ACTIVE_BAR_COLOR}`,
                        transform: 'translateX(-1.5px)',
                        backgroundColor: ACTIVE_BAR_COLOR, // Ensure line itself is green
                    }}
                    aria-hidden="true"
                    ></div>
                )}
              </div>
              <p className="text-xs text-gray-700 mt-2 text-center">
                {barConfig.unitLabel ? `Bars represent: ${barConfig.unitLabel} followers.` : "No follower data to display."}
                {' '}Max visual bars: {MAX_BAR_SLOTS}.
              </p>
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
