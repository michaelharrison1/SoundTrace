
import React, { useState, useMemo } from 'react';
import ProgressBar from '../ProgressBar';
import Button from '../Button';
import { DailyAnalyticsSnapshot, HistoricalSongStreamEntry } from '../../../types';
import { formatFollowersDisplay } from './reachAnalyzerUtils'; // Keep using this for follower-like formatting
// Importing Recharts components. Ensure 'recharts' is installed or added to importmap if not already.
// For this exercise, assuming it's available or would be added.
// If using esm.sh, you might need to import specific modules like:
// import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'https://esm.sh/recharts?bundle';
// For simplicity, using a generic import path.
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush, Line } from 'recharts';


type TimeWindow = '30d' | '1y' | 'all';

interface TimeBasedAnalyticsGraphProps {
  data: (DailyAnalyticsSnapshot | HistoricalSongStreamEntry)[]; // Accepts either total or song-specific history
  dataKey: keyof DailyAnalyticsSnapshot | keyof HistoricalSongStreamEntry; // e.g., "cumulativeFollowers", "cumulativeStreams", "streams"
  isLoading: boolean;
  onDeleteHistory?: () => Promise<void>; // Make optional
  graphColor: string;
  valueLabel: string;
  title: string;
  description: string;
}

const TimeBasedAnalyticsGraph: React.FC<TimeBasedAnalyticsGraphProps> = ({
  data,
  dataKey,
  isLoading,
  onDeleteHistory, // Now optional
  graphColor,
  valueLabel,
  title,
  description,
}) => {
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<TimeWindow>('all');

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (selectedTimeWindow === 'all') {
      return sortedData; // For "All Time" with Brush, show all data
    }

    const mostRecentDate = new Date(sortedData[sortedData.length - 1].date);
    switch (selectedTimeWindow) {
      case '30d':
        const thirtyDaysAgo = new Date(mostRecentDate);
        thirtyDaysAgo.setDate(mostRecentDate.getDate() - 30);
        return sortedData.filter(d => new Date(d.date) >= thirtyDaysAgo);
      case '1y':
        const oneYearAgo = new Date(mostRecentDate);
        oneYearAgo.setFullYear(mostRecentDate.getFullYear() - 1);
        return sortedData.filter(d => new Date(d.date) >= oneYearAgo);
      default:
        return sortedData;
    }
  }, [data, selectedTimeWindow]);
  
  const dataToDisplay = filteredData;

  if (isLoading && dataToDisplay.length === 0 && data.length === 0) {
    return <div className="my-4"><ProgressBar text={`Loading ${valueLabel.toLowerCase()} data...`} /></div>;
  }
  if (dataToDisplay.length === 0 && data.length > 0 && !isLoading) {
     return (
        <div className="text-center text-gray-600 mt-4 py-4">
          <p>No historical {valueLabel.toLowerCase()} data available for the selected period ({selectedTimeWindow === '30d' ? 'Past 30 Days' : selectedTimeWindow === '1y' ? 'Past Year' : 'this range'}).</p>
          <p className="text-xs">Try a different time window or check back later.</p>
        </div>
    );
  }
   if (dataToDisplay.length === 0 && data.length === 0 && !isLoading) {
    return <p className="text-center text-gray-600 mt-4 py-4">No historical {valueLabel.toLowerCase()} data available to display graph.</p>;
  }

  const relevantDataValues = dataToDisplay.map(d => (d as any)[dataKey] || 0);
  const maxValueInPeriod = Math.max(...relevantDataValues, 1);

  const yAxisTicks = [];
  const numYTicks = 4;
  for (let i = 0; i <= numYTicks; i++) {
    const value = Math.round((maxValueInPeriod / numYTicks) * i);
    yAxisTicks.push({ value, label: formatFollowersDisplay(value) });
  }

  const timeWindowButtons: { label: string; value: TimeWindow }[] = [
    { label: '30 Days', value: '30d' },
    { label: '1 Year', value: '1y' },
    { label: 'All Time', value: 'all' },
  ];

  const CustomTooltip: React.FC<any> = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload && payload.length && label) {
      const date = new Date(label).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric'});
      return (
        <div className="win95-border-outset bg-[#FEFEE0] p-1.5 text-xs text-black shadow-md">
          <p className="font-semibold">{date}</p>
          <p>{`${valueLabel}: ${formatFollowersDisplay(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-4">
      <div className="flex flex-col sm:flex-row justify-center items-center mb-1 text-center">
        <h4 className="text-base font-semibold text-black mb-1 sm:mb-0 sm:mr-2">{title}</h4>
        <div className="flex space-x-1 mb-1 sm:mb-0">
          {timeWindowButtons.map(tw => (
            <Button
              key={tw.value}
              onClick={() => setSelectedTimeWindow(tw.value)}
              size="sm"
              className={`!text-xs !px-1.5 !py-0.5 ${selectedTimeWindow === tw.value ? '!shadow-none !translate-x-[0.5px] !translate-y-[0.5px] !border-t-[#808080] !border-l-[#808080] !border-b-white !border-r-white' : 'win95-border-outset'}`}
              disabled={isLoading}
              aria-pressed={selectedTimeWindow === tw.value}
            >
              {tw.label}
            </Button>
          ))}
        </div>
        {onDeleteHistory && data.length > 0 && ( // Conditionally render delete button
          <Button
            onClick={onDeleteHistory}
            size="sm"
            className="!text-xs !px-1 !py-0 sm:ml-2 win95-button-sm !bg-red-200 hover:!bg-red-300 !border-red-500 !shadow-[0.5px_0.5px_0px_#800000]"
            title={`Delete all ${valueLabel.toLowerCase()} history data. This action cannot be undone.`}
            disabled={isLoading}
          >
            Delete History
          </Button>
        )}
      </div>
      <p className="text-xs text-gray-600 text-center mb-2">{description} (showing {selectedTimeWindow === '30d' ? 'last 30 days' : selectedTimeWindow === '1y' ? 'last year' : `up to ${dataToDisplay.length} records`}).</p>
      
       {isLoading && dataToDisplay.length === 0 && data.length > 0 && (
         <div className="my-4"><ProgressBar text={`Processing ${valueLabel.toLowerCase()} data...`} /></div>
       )}

      <div className="p-0.5 border-transparent border-2" style={{ height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dataToDisplay} margin={{ top: 5, right: 5, left: -25, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#555555" />
            <XAxis 
                dataKey="date" 
                tickFormatter={(tick: string) => new Date(tick).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                tick={{ fontSize: 10, fill: '#000000' }}
                interval="preserveStartEnd"
                minTickGap={30}
            />
            <YAxis 
                tickFormatter={(tick: number) => formatFollowersDisplay(tick)}
                tick={{ fontSize: 10, fill: '#000000' }}
                domain={[0, 'dataMax + dataMax*0.1']} // Add some padding to max
            />
            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(200,200,200,0.2)'}}/>
            {/* <Legend wrapperStyle={{fontSize: "12px"}}/> */}
            <Bar dataKey={dataKey as string} name={valueLabel} barSize={20} fill={graphColor} shape={<Rectangle radius={[2, 2, 0, 0]}/>} />
            <Line type="monotone" dataKey={dataKey as string} stroke={graphColor} strokeWidth={1.5} dot={false} activeDot={{ r: 4, stroke: '#000000', strokeWidth: 1 }} name={valueLabel} />
            <Brush 
                dataKey="date" 
                height={25} 
                stroke="#808080" 
                fill="rgba(192,192,192,0.3)"
                tickFormatter={(tick: string) => new Date(tick).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                travellerWidth={10}
             />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Custom shape for Bar to allow top radius
const Rectangle = (props: any) => {
  const { x, y, width, height, radius } = props;
  if (height === 0) return null; // Don't render if height is 0

  const [r1, r2, r3, r4] = Array.isArray(radius) ? radius : [radius, radius, radius, radius];
  
  return (
    <path
      d={`M${x},${y + r1} 
         A${r1},${r1},0,0,1,${x + r1},${y} 
         L${x + width - r2},${y} 
         A${r2},${r2},0,0,1,${x + width},${y + r2} 
         L${x + width},${y + height - r3}
         A${r3},${r3},0,0,1,${x + width - r3},${y + height}
         L${x + r4},${y + height}
         A${r4},${r4},0,0,1,${x},${y + height - r4}
         Z`}
      fill={props.fill}
    />
  );
};

export default React.memo(TimeBasedAnalyticsGraph);
