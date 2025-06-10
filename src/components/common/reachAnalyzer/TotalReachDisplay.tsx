import React from 'react';
import ProgressBar from '../ProgressBar';
import { BarConfig, MAX_BAR_SLOTS, CHART_BACKGROUND_COLOR, GRID_COLOR, formatFollowersDisplay } from './reachAnalyzerUtils';

interface TotalReachDisplayProps {
  totalFollowers: number | null | undefined;
  isLoading: boolean;
  error?: string | null;
  currentLevel: number;
  levelUpAvailable: boolean;
  isLevelingUp: boolean;
  onLevelUp: () => void;
  reachBarConfig: BarConfig;
  activeBarAndLineColor: string;
  lineProgress: number;
}

const TotalReachDisplay: React.FC<TotalReachDisplayProps> = ({
  totalFollowers,
  isLoading,
  error,
  currentLevel,
  levelUpAvailable,
  isLevelingUp,
  onLevelUp,
  reachBarConfig,
  activeBarAndLineColor,
  lineProgress,
}) => {
  const displayTotalReachValue = formatFollowersDisplay(totalFollowers, isLoading);
  const crtElementBaseClass = "win95-border-inset p-1 flex items-end space-x-px overflow-hidden relative h-32";
  const crtLevelingUpClass = isLevelingUp ? "animate-pulse !border-yellow-400 border-2" : "border-transparent border-0";
  const barTransitionDuration = reachBarConfig.numberOfBarsToActivate < 4 ? '0.2s' : '0.5s';

  if (isLoading && typeof totalFollowers === 'undefined') {
    return <div className="flex flex-col items-center justify-center flex-grow py-4"><ProgressBar text="Calculating reach..." /></div>;
  }
  if (error) {
    return <div className="text-center text-red-700 text-sm py-8 h-full flex items-center justify-center flex-grow"><p>Error: {error}</p></div>;
  }

  return (
    <>
      <h4 className="text-base font-semibold text-black mb-0 text-center">Estimated Spotify Artist Follower Reach</h4>
      <p className="text-xs text-gray-600 text-center mb-1">Total followers of Spotify artists that have used your beats.</p>
      <p className="text-3xl text-black font-bold my-1 text-center">{displayTotalReachValue} followers</p>
      <p className="text-sm text-gray-700 text-center mb-1">Reach Level: {currentLevel}</p>
      {levelUpAvailable && !isLevelingUp && (
        <div className="text-center my-1">
          <button
            onClick={onLevelUp}
            className="px-3 py-1 bg-yellow-400 text-black font-semibold win95-border-outset hover:bg-yellow-300 active:translate-y-px"
          >
            Scanner Level Up available
          </button>
        </div>
      )}
      {isLevelingUp && <ProgressBar text="Leveling Up! Please Wait..." className="my-1"/>}

      <div className={`p-0.5 ${crtLevelingUpClass}`}>
        <div
          className={crtElementBaseClass}
          style={{
            backgroundColor: CHART_BACKGROUND_COLOR,
            backgroundImage: isLevelingUp ? 'none' : `linear-gradient(to right, ${GRID_COLOR} 1px, transparent 1px), linear-gradient(to bottom, ${GRID_COLOR} 1px, transparent 1px)`,
            backgroundSize: "10px 10px"
          }}
          role="img"
          aria-label={`Performance chart. Current total follower reach: ${displayTotalReachValue}. ${reachBarConfig.unitLabel ? 'Each bar segment represents ' + reachBarConfig.unitLabel + ' followers.' : ''}`}
        >
          <div className="flex w-full h-full items-end">
            {[...Array(MAX_BAR_SLOTS)].map((_, i) => {
              const barIsActive = levelUpAvailable || (lineProgress * MAX_BAR_SLOTS > i && i < reachBarConfig.numberOfBarsToActivate && (totalFollowers ?? 0) > 0);
              const barHeight = barIsActive ? '100%' : '0%';
              return (
                <div key={i} className="chart-bar-slot flex-1 h-full mx-px relative flex items-end justify-center">
                  <div className="absolute bottom-0 left-0 right-0 h-full win95-border-inset bg-neutral-700 opacity-50"></div>
                  {((totalFollowers ?? 0) > 0 || levelUpAvailable) && (
                    <div
                      className="active-bar-fill relative win95-border-outset"
                      style={{ backgroundColor: barIsActive ? activeBarAndLineColor : 'transparent', height: barHeight, width: '80%', transition: `height ${barTransitionDuration} ease-out`, boxShadow: barIsActive ? `0 0 3px ${activeBarAndLineColor}, 0 0 6px ${activeBarAndLineColor}` : 'none' }}
                    ></div>
                  )}
                </div>
              );
            })}
          </div>
          {((totalFollowers ?? 0) > 0 && !isLoading && !error && !levelUpAvailable && !isLevelingUp) && (
              <div
                className="progress-line absolute top-0 bottom-0"
                style={{ left: `${lineProgress * 100}%`, width: '3px', boxShadow: `0 0 5px 1px ${activeBarAndLineColor}, 0 0 10px 2px ${activeBarAndLineColor}`, transform: 'translateX(-1.5px)', backgroundColor: activeBarAndLineColor }}
                aria-hidden="true"
              ></div>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-700 mt-2 text-center">
        {reachBarConfig.unitLabel ? `Bars represent: ${reachBarConfig.unitLabel} followers each.` : ""}
      </p>
    </>
  );
};

export default React.memo(TotalReachDisplay);
