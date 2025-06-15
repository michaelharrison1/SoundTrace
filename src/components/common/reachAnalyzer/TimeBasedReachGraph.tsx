import React from 'react';
import ProgressBar from '../ProgressBar';
import Button from '../Button';
import { DailyAnalyticsSnapshot } from '../../../types'; // Using the combined type
import { formatFollowersDisplay } from './reachAnalyzerUtils'; // Keep using this for follower-like formatting

interface TimeBasedAnalyticsGraphProps {
  data: DailyAnalyticsSnapshot[]; // Expects data with date and either followers or streams
  dataKey: 'cumulativeFollowers' | 'cumulativeStreams'; // Key to plot on Y-axis
  isLoading: boolean;
  onDeleteHistory: () => Promise<void>;
  graphColor: string;
  valueLabel: string; // e.g., "Followers" or "Streams"
  title: string; // e.g., "Time-Based Follower Reach" or "Time-Based Stream Volume"
  description: string;
}

const TimeBasedAnalyticsGraph: React.FC<TimeBasedAnalyticsGraphProps> = ({
  data,
  dataKey,
  isLoading,
  onDeleteHistory,
  graphColor,
  valueLabel,
  title,
  description,
}) => {
  const dataToDisplay = data.slice(-60); // Show last 60 data points

  if (isLoading && dataToDisplay.length === 0) {
    return <div className="my-4"><ProgressBar text={`Loading ${valueLabel.toLowerCase()} data...`} /></div>;
  }
  if (dataToDisplay.length === 0) {
    return <p className="text-center text-gray-600 mt-4">No historical {valueLabel.toLowerCase()} data available to display graph.</p>;
  }

  const relevantData = dataToDisplay.map(d => d[dataKey] || 0); // Use dataKey, default to 0 if undefined
  const maxValueInPeriod = Math.max(...relevantData, 1); // Ensure at least 1 to avoid division by zero

  const yAxisTicks = [];
  const numYTicks = 4;
  for (let i = 0; i <= numYTicks; i++) {
    const value = Math.round((maxValueInPeriod / numYTicks) * i);
    yAxisTicks.push({ value, label: formatFollowersDisplay(value) }); // Using follower formatter for now
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
  const gapBetweenBars = 0.2; // Percentage gap
  const totalGapSpace = (numberOfBars - 1) * gapBetweenBars;
  const barWidthPercentage = numberOfBars > 0 ? (barContainerWidth - totalGapSpace) / numberOfBars : 0;

  return (
    <div className="mt-4">
      <div className="flex justify-center items-center mb-1">
        <h4 className="text-base font-semibold text-black text-center">{title}</h4>
        {data.length > 0 && (
          <Button
            onClick={onDeleteHistory}
            size="sm"
            className="!text-xs !px-1 !py-0 ml-2 win95-button-sm !bg-red-200 hover:!bg-red-300 !border-red-500 !shadow-[0.5px_0.5px_0px_#800000]"
            title={`Delete all ${valueLabel.toLowerCase()} history data. This action cannot be undone.`}
          >
            Delete History
          </Button>
        )}
      </div>
      <p className="text-xs text-gray-600 text-center mb-2">{description} (last {dataToDisplay.length} records).</p>
      <div className="p-0.5 border-transparent border-2">
        <div className="flex">
          <div className="flex flex-col justify-between items-end pr-1 text-xs text-black" style={{ height: '192px', minWidth: '30px' }}>
            {yAxisTicks.reverse().map(tick => <span key={tick.value}>{tick.label}</span>)}
          </div>
          <div className="win95-border-inset bg-gray-700 p-2 h-48 flex-grow flex items-end overflow-x-auto" style={{gap: `${gapBetweenBars}%`}}>
            {dataToDisplay.map((snapshot) => {
              const value = snapshot[dataKey] || 0;
              const barHeight = maxValueInPeriod > 0 ? (value / maxValueInPeriod) * 95 : 0; // Cap at 95% height for visual appeal
              const formattedDate = new Date(snapshot.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              return (
                <div
                  key={snapshot.date}
                  className="flex-shrink-0 win95-border-outset hover:opacity-80 relative group"
                  style={{
                    width: `${barWidthPercentage}%`,
                    height: `${Math.max(2, barHeight)}%`, // Min height of 2% for visibility
                    minWidth: '15px', // Ensure very small bars are still clickable
                    backgroundColor: graphColor,
                    boxShadow: `0 0 2px ${graphColor}`
                  }}
                  title={`${formattedDate}: ${formatFollowersDisplay(value)} ${valueLabel.toLowerCase()}`}
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
          {/* Display up to 3 X-axis ticks: start, middle, end */}
          {formattedXAxisTicks.map((label, index) => <span key={index}>{label}</span>)}
        </div>
      </div>
    </div>
  );
};

export default React.memo(TimeBasedAnalyticsGraph);