import React from 'react';
import ProgressBar from '../ProgressBar';
import Button from '../Button';
import { FollowerSnapshot } from '../../../types';
import { formatFollowersDisplay } from './reachAnalyzerUtils';

interface TimeBasedReachGraphProps {
  historicalFollowerData: FollowerSnapshot[];
  isLoadingHistory: boolean;
  onDeleteFollowerHistory: () => Promise<void>;
  activeBarAndLineColor: string;
}

const TimeBasedReachGraph: React.FC<TimeBasedReachGraphProps> = ({
  historicalFollowerData,
  isLoadingHistory,
  onDeleteFollowerHistory,
  activeBarAndLineColor,
}) => {
  const dataToDisplay = historicalFollowerData.slice(-60);

  if (isLoadingHistory && dataToDisplay.length === 0) {
    return <div className="my-4"><ProgressBar text="Loading time-based reach data..." /></div>;
  }
  if (dataToDisplay.length === 0) {
    return <p className="text-center text-gray-600 mt-4">No historical follower data available to display graph.</p>;
  }

  const maxFollowersInPeriod = Math.max(...dataToDisplay.map(d => d.cumulativeFollowers), 1);

  const yAxisTicks = [];
  const numYTicks = 4;
  for (let i = 0; i <= numYTicks; i++) {
    const value = Math.round((maxFollowersInPeriod / numYTicks) * i);
    yAxisTicks.push({ value, label: formatFollowersDisplay(value) });
  }

  const xAxisTicks = [];
  if (dataToDisplay.length > 0) {
    xAxisTicks.push(dataToDisplay[0].date);
    if (dataToDisplay.length > 2) xAxisTicks.push(dataToDisplay[Math.floor(dataToDisplay.length / 2)].date);
    if (dataToDisplay.length > 1) xAxisTicks.push(dataToDisplay[dataToDisplay.length - 1].date);
  }
  const formattedXAxisTicks = xAxisTicks.map(dateStr => new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

  const barContainerWidth = 100;
  const numberOfBars = dataToDisplay.length;
  const gapBetweenBars = 0.2;
  const totalGapSpace = (numberOfBars - 1) * gapBetweenBars;
  const barWidthPercentage = numberOfBars > 0 ? (barContainerWidth - totalGapSpace) / numberOfBars : 0;

  return (
    <div className="mt-4">
      <div className="flex justify-center items-center mb-1">
        <h4 className="text-base font-semibold text-black text-center">Time-Based Reach Graph</h4>
        {historicalFollowerData.length > 0 && (
          <Button
            onClick={onDeleteFollowerHistory}
            size="sm"
            className="!text-xs !px-1 !py-0 ml-2 win95-button-sm !bg-red-200 hover:!bg-red-300 !border-red-500 !shadow-[0.5px_0.5px_0px_#800000]"
            title="Delete all follower history data. This action cannot be undone."
          >
            Delete History
          </Button>
        )}
      </div>
      <p className="text-xs text-gray-600 text-center mb-2">Track follower growth over time (last {dataToDisplay.length} records), updates daily.</p>
      <div className="p-0.5 border-transparent border-2"> {/* Placeholder for potential pulse border from parent */}
        <div className="flex">
          <div className="flex flex-col justify-between items-end pr-1 text-xs text-black" style={{ height: '192px', minWidth: '30px' }}>
            {yAxisTicks.reverse().map(tick => <span key={tick.value}>{tick.label}</span>)}
          </div>
          <div className="win95-border-inset bg-gray-700 p-2 h-48 flex-grow flex items-end overflow-x-auto" style={{gap: `${gapBetweenBars}%`}}>
            {dataToDisplay.map((snapshot) => {
              const barHeight = maxFollowersInPeriod > 0 ? (snapshot.cumulativeFollowers / maxFollowersInPeriod) * 95 : 0;
              const formattedDate = new Date(snapshot.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              return (
                <div
                  key={snapshot.date}
                  className="flex-shrink-0 win95-border-outset hover:opacity-80 relative group"
                  style={{
                    width: `${barWidthPercentage}%`,
                    height: `${Math.max(2, barHeight)}%`,
                    minWidth: '15px',
                    backgroundColor: activeBarAndLineColor,
                    boxShadow: `0 0 2px ${activeBarAndLineColor}`
                  }}
                  title={`${formattedDate}: ${formatFollowersDisplay(snapshot.cumulativeFollowers)} followers`}
                >
                  <span className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-gray-100 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-70 px-1 py-0.5 rounded-sm">
                    {formattedDate}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex justify-between pl-[34px] text-xs text-black mt-1 pr-1">
          {formattedXAxisTicks.map((label, index) => <span key={index}>{label}</span>)}
        </div>
      </div>
    </div>
  );
};

export default React.memo(TimeBasedReachGraph);
