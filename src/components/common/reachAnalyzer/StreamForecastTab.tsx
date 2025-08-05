import React, { useEffect, useState } from 'react';
import { TrackScanLog } from '../../../types';
import ProgressBar from '../ProgressBar';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { generateLinearForecast, aggregateForecasts, type ForecastPoint, type HistoryPoint } from '../../../utils/forecastingUtils';

interface StreamForecastTabProps {
  scanLogs: TrackScanLog[];
  isLoading: boolean;
  error?: string | null;
}

interface TrackHistoryPoint {
  date: string;
  streams: number;
}

interface TrackHistory {
  track_id: string;
  track_name: string;
  artist_name: string;
  stream_history: TrackHistoryPoint[];
}

const TIME_PERIODS = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
];

// Win95 style button
function Win95Button({ active, children, ...props }: { active?: boolean; children: React.ReactNode; [key: string]: any }) {
  return (
    <button 
      className={`px-2 py-1 text-xs bg-[#C0C0C0] ${active 
        ? 'border border-t-[#808080] border-l-[#808080] border-b-white border-r-white shadow-inner' 
        : 'border border-t-white border-l-white border-b-gray-700 border-r-gray-700'}`}
      {...props}
    >
      {children}
    </button>
  );
}

const StreamForecastTab: React.FC<StreamForecastTabProps> = ({ scanLogs, isLoading, error }) => {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
  const [timePeriod, setTimePeriod] = useState<string>('30d'); // Default to 30 days

  useEffect(() => {
    let cancelled = false;
    
    async function load() {
      setLoading(true);
      setApiError(null);
      setForecastData([]);
      
      // Get all unique Spotify track IDs
      const trackIds = Array.from(new Set(
        scanLogs.flatMap(log =>
          log.matches.map(m => m.spotifyTrackId).filter(Boolean)
        )
      ));
      
      if (trackIds.length === 0) {
        setLoading(false);
        return;
      }
      
      try {
        // Get forecast days based on time period
        const daysToForecast = timePeriod === '7d' ? 7 : timePeriod === '30d' ? 30 : 90;
        
        // Fetch historical data for each track from StreamClout (same as Stream History Tab)
        const backendBase = import.meta.env.VITE_API_BASE_URL || '';
        const historyResults = await Promise.all(
          trackIds.map(async (id) => {
            try {
              const url = `${backendBase}/api/streamclout/tracks/${id}/history?time_period=90d`; // Get more history for better forecasting
              const res = await fetch(url);
              if (!res.ok) {
                return null;
              }
              const data = await res.json();
              return data;
            } catch (err) {
              return null;
            }
          })
        );
        
        // Filter valid results and generate forecasts for each track
        const validHistories = historyResults.filter(Boolean) as TrackHistory[];
        const trackForecasts: ForecastPoint[][] = [];
        
        validHistories.forEach(trackHistory => {
          if (trackHistory.stream_history && trackHistory.stream_history.length > 0) {
            // Convert to our expected format
            const historyPoints: HistoryPoint[] = trackHistory.stream_history.map(point => ({
              date: point.date,
              streams: point.streams
            }));
            
            // Generate forecast for this track
            const trackForecast = generateLinearForecast(historyPoints, daysToForecast);
            trackForecasts.push(trackForecast);
          }
        });
        
        // Aggregate all track forecasts
        const aggregatedForecast = aggregateForecasts(trackForecasts);
        
        if (!cancelled) {
          setForecastData(aggregatedForecast);
        }
      } catch (e) {
        if (!cancelled) setApiError('Failed to fetch stream forecast.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    load();
    return () => { cancelled = true; };
  }, [scanLogs, timePeriod]);

  if (isLoading || loading) {
    return <div className="flex flex-col items-center justify-center flex-grow py-4"><ProgressBar text="Loading stream forecast..." /></div>;
  }
  
  if (error || apiError) {
    return <div className="text-center text-red-700 text-sm py-8 h-full flex items-center justify-center flex-grow"><p>{error || apiError}</p></div>;
  }

  // Calculate average daily predicted streams
  const avgDailyForecast = forecastData.length > 0
    ? forecastData.reduce((sum, item) => sum + item.predictedStreams, 0) / forecastData.length
    : null;

  if (!forecastData.length) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base font-semibold text-black text-center flex-1">Stream Forecast</h4>
          <select
            className="ml-2 border rounded px-2 py-1 text-sm"
            value={timePeriod}
            onChange={e => setTimePeriod(e.target.value)}
            aria-label="Select forecast period"
          >
            {TIME_PERIODS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="text-center text-gray-700 py-8 flex-1">No stream forecast data available.</div>
      </div>
    );
  }

  // Format Y axis as 80M, 1.2M, 900K, etc.
  function formatYAxis(tick: number) {
    if (tick >= 1000000) {
      return `${(tick / 1000000).toFixed(1)}M`;
    } else if (tick >= 1000) {
      return `${(tick / 1000).toFixed(1)}K`;
    }
    return tick.toString();
  }

  // Format X axis as 'June 30', etc.
  function formatXAxis(date: string) {
    const d = new Date(date);
    const month = d.toLocaleString('default', { month: 'short' });
    const day = d.getDate();
    return `${month} ${day}`;
  }

  // Custom tooltip for recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const predicted = payload[0].payload.predictedStreams;
      // Format label as 'June 30'
      const d = new Date(label);
      const labelFmt = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
      
      return (
        <div className="bg-white border rounded shadow p-2 text-xs">
          <div><strong>{labelFmt}</strong></div>
          <div>Predicted Streams: <span className="font-semibold">{predicted.toLocaleString()}</span></div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-col items-center justify-center mb-2 relative">
        <h4 className="text-base font-semibold text-black text-center">Stream Forecast</h4>
        <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', gap: 0 }}>
          <Win95Button
            active={timePeriod === '7d'}
            onClick={() => setTimePeriod('7d')}
            aria-label="7 days"
          >7 days</Win95Button>
          <Win95Button
            active={timePeriod === '30d'}
            onClick={() => setTimePeriod('30d')}
            aria-label="30 days"
          >30 days</Win95Button>
          <Win95Button
            active={timePeriod === '90d'}
            onClick={() => setTimePeriod('90d')}
            aria-label="90 days"
          >90 days</Win95Button>
        </div>
        <p className="text-xs text-gray-600 text-center mt-1">Predicted daily Spotify streams for all your matched tracks.</p>
        {avgDailyForecast !== null && (
          <div className="text-xs text-center mt-1 text-orange-600 font-medium">
            Average predicted daily streams: {avgDailyForecast.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        )}
      </div>
      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={forecastData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={formatXAxis} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={formatYAxis} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="predictedStreams" stroke="#FFA500" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StreamForecastTab;
