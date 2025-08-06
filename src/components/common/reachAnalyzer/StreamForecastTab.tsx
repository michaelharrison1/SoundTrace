import React, { useEffect, useState } from 'react';
import { TrackScanLog } from '../../../types';
import ProgressBar from '../ProgressBar';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { analyticsService, PredictedStreamEntry } from '../../../services/analyticsService';

interface StreamForecastTabProps {
  scanLogs: TrackScanLog[];
  isLoading: boolean;
  error?: string | null;
}

const TIME_PERIODS = [
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
  const [forecastData, setForecastData] = useState<PredictedStreamEntry[]>([]);
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
        
        // First, ensure we have historical data by calling the stream history for each track
        // This will populate the MongoDB with StreamClout data if not already cached
        const backendBase = import.meta.env.VITE_API_BASE_URL || '';
        
        // Pre-load historical data with appropriate time period for forecasting
        const historyTimePeriod = daysToForecast <= 7 ? '30d' : daysToForecast <= 30 ? '90d' : '180d';
        
        await Promise.all(
          trackIds.map(async (id) => {
            try {
              const url = `${backendBase}/api/streamclout/tracks/${id}/history?time_period=${historyTimePeriod}&use_cache=true`;
              await fetch(url);
            } catch (err) {
              // Silently fail - forecasting will handle missing data gracefully
            }
          })
        );
        
        // Now fetch forecasts using the analytics service (which uses the populated MongoDB data)
        const forecasts = await Promise.all(
          trackIds.map(async (id) => {
            try {
              return await analyticsService.getSongStreamForecast(id as string, daysToForecast);
            } catch (err) {
              console.warn(`[StreamForecastTab] Failed to get forecast for track ${id}:`, err);
              return [];
            }
          })
        );
        
        // Aggregate forecasts by date
        const dateMap = new Map<string, number>();
        forecasts.forEach((trackForecast: PredictedStreamEntry[]) => {
          trackForecast.forEach((point: PredictedStreamEntry) => {
            const date = point.date;
            dateMap.set(date, (dateMap.get(date) || 0) + point.predictedStreams);
          });
        });
        
        // Convert to array and sort by date
        let aggregatedForecast = Array.from(dateMap.entries())
          .map(([date, predictedStreams]) => ({ date, predictedStreams }))
          .sort((a, b) => a.date.localeCompare(b.date));
        
        console.log('[StreamForecast] Raw aggregated forecast:', aggregatedForecast.slice(0, 5));
        
        // Filter out past dates and zero values, but be less strict about zero values
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const beforeFilter = aggregatedForecast.length;
        
        aggregatedForecast = aggregatedForecast.filter(point => {
          const pointDate = new Date(point.date);
          return pointDate >= today && point.predictedStreams >= 0; // Allow small positive values, not just > 0
        });
        
        console.log(`[StreamForecast] Filtered forecast: ${beforeFilter} -> ${aggregatedForecast.length} points`);
        
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
