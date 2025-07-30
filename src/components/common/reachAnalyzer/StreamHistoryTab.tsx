
import React, { useEffect, useState } from 'react';
import { TrackScanLog } from '../../../types';
import ProgressBar from '../ProgressBar';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

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

const StreamHistoryTab: React.FC<StreamHistoryTabProps> = ({ scanLogs, isLoading, error }) => {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<{ date: string; total_streams: number }[]>([]);


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
      console.log('[StreamHistoryTab] trackIds:', trackIds);
      if (trackIds.length === 0) {
        setLoading(false);
        return;
      }
      // Use backend proxy endpoint to call StreamClout API with backend STREAMCLOUT_API_KEY
      try {
        const results = await Promise.all(
          trackIds.map(async (id) => {
            try {
              const url = `/api/streamclout/tracks/${id}/history?time_period=7d`;
              console.log('[StreamHistoryTab] Fetching:', url);
              const res = await fetch(url);
              if (!res.ok) {
                console.error('[StreamHistoryTab] Fetch failed:', url, res.status);
                return null;
              }
              const data = await res.json();
              return data;
            } catch (err) {
              console.error('[StreamHistoryTab] Fetch error:', err);
              return null;
            }
          })
        );
        const valid = results.filter(Boolean) as TrackHistory[];
        const agg = aggregateHistories(valid);
        if (!cancelled) setHistoryData(agg);
      } catch (e) {
        if (!cancelled) setApiError('Failed to fetch stream history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [scanLogs]);

  if (isLoading || loading) {
    return <div className="flex flex-col items-center justify-center flex-grow py-4"><ProgressBar text="Loading stream history..." /></div>;
  }
  if (error || apiError) {
    return <div className="text-center text-red-700 text-sm py-8 h-full flex items-center justify-center flex-grow"><p>{error || apiError}</p></div>;
  }
  if (!historyData.length) {
    return <div className="text-center text-gray-700 py-8">No stream history data available.</div>;
  }
  return (
    <div className="w-full h-full flex flex-col">
      <h4 className="text-base font-semibold text-black mb-2 text-center">Total Stream History</h4>
      <p className="text-xs text-gray-600 text-center mb-2">Aggregated daily Spotify streams for all your matched tracks.</p>
      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={historyData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => v.toLocaleString()} />
            <Line type="monotone" dataKey="total_streams" stroke="#1D9BF0" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StreamHistoryTab;
