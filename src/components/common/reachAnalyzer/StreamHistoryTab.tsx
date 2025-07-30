
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


function aggregateHistories(histories: TrackHistory[]): { date: string; total_streams: number }[] {
  // Aggregate by date
  const dateMap = new Map<string, number>();
  histories.forEach(hist => {
    hist.stream_history.forEach(point => {
      const date = point.date.slice(0, 10); // YYYY-MM-DD
      dateMap.set(date, (dateMap.get(date) || 0) + point.streams);
    });
  });
  // Sort by date
  return Array.from(dateMap.entries())
    .map(([date, total_streams]) => ({ date, total_streams }))
    .sort((a, b) => a.date.localeCompare(b.date));
}


const TIME_PERIODS = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
];

// Win95 style dropdown
function Win95Dropdown({ value, onChange, options, ...props }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { label: string; value: string }[];
  [key: string]: any;
}) {
  return (
    <div style={{
      border: '2px outset #fff',
      background: '#c3c7cb',
      boxShadow: 'inset 1px 1px #fff, inset -1px -1px #808080',
      padding: 0,
      display: 'inline-block',
      borderRadius: 2,
      minWidth: 100,
      height: 28,
    }}>
      <select
        value={value}
        onChange={onChange}
        style={{
          background: '#c3c7cb',
          border: 'none',
          outline: 'none',
          fontFamily: 'inherit',
          fontSize: 14,
          height: 24,
          padding: '2px 24px 2px 6px',
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          color: '#222',
          width: '100%',
          cursor: 'pointer',
        }}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <span style={{
        position: 'absolute',
        right: 8,
        top: 7,
        pointerEvents: 'none',
        fontSize: 10,
        color: '#222',
      }}>▼</span>
    </div>
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
              const url = `${backendBase}/api/streamclout/tracks/${id}/history?time_period=${timePeriod}`;
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
        // Add daily new streams (difference from previous day)
        agg = agg.map((d, i, arr) => ({
          ...d,
          new_streams: i === 0 ? null : d.total_streams - arr[i - 1].total_streams
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
      <div className="flex flex-col items-center justify-center mb-2">
        <div className="flex items-center justify-center gap-2">
          <h4 className="text-base font-semibold text-black text-center">Total Stream History</h4>
          <Win95Dropdown
            value={timePeriod}
            onChange={e => setTimePeriod(e.target.value)}
            options={TIME_PERIODS}
            aria-label="Select time period"
          />
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
