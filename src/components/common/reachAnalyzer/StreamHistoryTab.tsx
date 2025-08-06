import React, { useEffect, useState } from 'react';
import { TrackScanLog } from '../../../types';
import ProgressBar from '../ProgressBar';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useRef, useEffect as useEffectReact } from 'react';

interface StreamHistoryTabProps {
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


function aggregateHistories(histories: TrackHistory[]): { date: string; total_streams: number; daily_streams?: number }[] {
  // Get today's date to exclude incomplete data
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Group data by track first, then convert cumulative to daily per track
  const trackDataMap = new Map<string, Array<{date: string, streams: number}>>();
  
  histories.forEach(hist => {
    if (hist.stream_history && Array.isArray(hist.stream_history)) {
      const trackKey = hist.track_id || 'unknown';
      if (!trackDataMap.has(trackKey)) {
        trackDataMap.set(trackKey, []);
      }
      
      hist.stream_history.forEach(point => {
        const date = point.date.slice(0, 10); // YYYY-MM-DD
        // Skip today's data since it's incomplete
        if (date !== today) {
          trackDataMap.get(trackKey)!.push({
            date: date,
            streams: point.streams
          });
        }
      });
    }
  });
  
  // Calculate both daily streams (for new_streams) and cumulative totals (for total_streams display)
  const dailyAggregateMap = new Map<string, number>(); // For new_streams calculation
  const cumulativeAggregateMap = new Map<string, number>(); // For total_streams display
  
  trackDataMap.forEach((trackData, trackKey) => {
    // Sort by date for proper cumulative->daily conversion
    trackData.sort((a, b) => a.date.localeCompare(b.date));
    
    // Convert cumulative to daily for this track, skip first data point
    for (let i = 1; i < trackData.length; i++) { // Start from index 1 to skip first data point
      const current = trackData[i];
      const previous = trackData[i - 1];
      
      // Daily streams = current cumulative - previous cumulative
      const dailyStreams = Math.max(0, current.streams - previous.streams); // Ensure non-negative
      
      // Add to daily aggregate (for new_streams field)
      const existingDaily = dailyAggregateMap.get(current.date) || 0;
      dailyAggregateMap.set(current.date, existingDaily + dailyStreams);
      
      // Add cumulative streams to total aggregate (for chart display)
      const existingCumulative = cumulativeAggregateMap.get(current.date) || 0;
      cumulativeAggregateMap.set(current.date, existingCumulative + current.streams);
      
      // Debug logging for extreme values
      if (dailyStreams > 1000000) {
        console.warn(`[StreamHistory] Extreme daily streams detected:`, {
          trackKey,
          date: current.date,
          currentStreams: current.streams,
          previousStreams: previous.streams,
          calculatedDaily: dailyStreams
        });
      }
    }
  });
  
  // Convert to array and sort by date, using CUMULATIVE totals for display
  const result = Array.from(cumulativeAggregateMap.entries())
    .map(([date, total_streams]) => ({ 
      date, 
      total_streams,
      // Store daily streams for new_streams field later
      daily_streams: dailyAggregateMap.get(date) || 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
    
  // Debug logging for final results
  console.log(`[StreamHistory] Final aggregated streams:`, result.slice(-5)); // Show last 5 days
  
  return result;
}


const TIME_PERIODS = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
];


// Win95 style button
function Win95Button({ active, children, ...props }: { active?: boolean; children: React.ReactNode; [key: string]: any }) {
  return (
    <button
      style={{
        border: active ? '2px inset #808080' : '2px outset #fff',
        background: '#c3c7cb',
        boxShadow: active
          ? 'inset 1px 1px #fff, inset -1px -1px #808080'
          : 'inset 1px 1px #fff, inset -1px -1px #808080',
        color: '#222',
        fontFamily: 'inherit',
        fontSize: 14,
        padding: '2px 16px',
        marginLeft: 4,
        marginRight: 0,
        borderRadius: 2,
        minWidth: 60,
        height: 28,
        cursor: 'pointer',
        outline: 'none',
      }}
      {...props}
    >
      {children}
    </button>
  );
}

const StreamHistoryTab: React.FC<StreamHistoryTabProps> = ({ scanLogs, isLoading, error }) => {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<{ date: string; total_streams: number }[]>([]);
  const [timePeriod, setTimePeriod] = useState<string>('7d');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setApiError(null);
      setHistoryData([]);
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
        const backendBase = import.meta.env.VITE_API_BASE_URL || '';
        const results = await Promise.all(
          trackIds.map(async (id) => {
            try {
              const url = `${backendBase}/api/streamclout/tracks/${id}/history?time_period=${timePeriod}&use_cache=true`;
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
        const valid = results.filter(Boolean) as TrackHistory[];
        let agg = aggregateHistories(valid);
        // Use daily_streams for new_streams field, total_streams for chart display
        agg = agg.map((d) => ({
          ...d,
          new_streams: d.daily_streams || 0 // Use calculated daily streams
        }));
        if (!cancelled) setHistoryData(agg);
      } catch (e) {
        if (!cancelled) setApiError('Failed to fetch stream history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [scanLogs, timePeriod]);

  if (isLoading || loading) {
    return <div className="flex flex-col items-center justify-center flex-grow py-4"><ProgressBar text="Loading stream history..." /></div>;
  }
  if (error || apiError) {
    return <div className="text-center text-red-700 text-sm py-8 h-full flex items-center justify-center flex-grow"><p>{error || apiError}</p></div>;
  }
  // Calculate average daily streams for the period
  const avgDaily = historyData.length > 1
    ? (historyData[historyData.length - 1].total_streams - historyData[0].total_streams) / (historyData.length - 1)
    : null;

  if (!historyData.length) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base font-semibold text-black text-center flex-1">Total Stream History</h4>
          <select
            className="ml-2 border rounded px-2 py-1 text-sm"
            value={timePeriod}
            onChange={e => setTimePeriod(e.target.value)}
            aria-label="Select time period"
          >
            {TIME_PERIODS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="text-center text-gray-700 py-8 flex-1">No stream history data available.</div>
      </div>
    );
  }


  // Format Y axis as 80M, 1.2M, 900K, etc.
  function formatYAxis(tick: number) {
    if (tick >= 1e6) return (tick / 1e6).toFixed(tick % 1e6 === 0 ? 0 : 1) + 'M';
    if (tick >= 1e3) return (tick / 1e3).toFixed(tick % 1e3 === 0 ? 0 : 1) + 'K';
    return tick.toString();
  }

  // Format X axis as 'June 30', etc.
  function formatXAxis(date: string) {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  }

  // Custom tooltip for recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload[0].payload.total_streams;
      const newStreams = payload[0].payload.new_streams;
      // Format label as 'June 30'
      const d = new Date(label);
      const labelFmt = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
      return (
        <div className="bg-white border rounded shadow p-2 text-xs">
          <div><strong>{labelFmt}</strong></div>
          <div>Total Streams: <span className="font-semibold">{total.toLocaleString()}</span></div>
          {typeof newStreams === 'number' && (
            <div>Daily New Streams: <span className="font-semibold">{newStreams.toLocaleString()}</span></div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-col items-center justify-center mb-2 relative">
        <h4 className="text-base font-semibold text-black text-center">Total Stream History</h4>
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
        </div>
        <p className="text-xs text-gray-600 text-center mt-1">Aggregated daily Spotify streams for all your matched tracks.</p>
        {avgDaily !== null && (
          <div className="text-xs text-center mt-1 text-blue-700 font-medium">
            Average daily streams in this period: {avgDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        )}
      </div>
      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={historyData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={formatXAxis} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={formatYAxis} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="total_streams" stroke="#1D9BF0" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StreamHistoryTab;
