



import React, { useEffect, useState } from 'react';
import { TrackScanLog } from '../../../types';

interface WeeklyGrowthSnapshotTileProps {
  scanLogs: TrackScanLog[];
}

const WeeklyGrowthSnapshotTile: React.FC<WeeklyGrowthSnapshotTileProps> = ({ scanLogs }) => {
  const [week1New, setWeek1New] = useState(0);
  const [week0New, setWeek0New] = useState(0);
  const [percent, setPercent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBulkHistory() {
      setLoading(true);
      setError(null);
      try {
        // Get all unique track IDs
        const trackIds = Array.from(new Set(
          scanLogs.flatMap(log => log.matches.map(m => m.spotifyTrackId).filter(Boolean))
        ));
        if (trackIds.length === 0) {
          setWeek1New(0);
          setWeek0New(0);
          setPercent(0);
          setLoading(false);
          return;
        }
        // Fetch bulk history from backend
        const backendBase = import.meta.env.VITE_API_BASE_URL || '';
        const url = `${backendBase}/api/streamclout/tracks/history?track_ids=${trackIds.join(',')}&time_period=14d`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch stream history');
        const data: Record<string, Array<{ date: string; streams: number }>> = await res.json();
        // Build daily totals for all tracks
        const today = new Date();
        const days: string[] = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          days.push(d.toISOString().slice(0, 10));
        }
        // For each date, sum all track streams
        let prevTotals: Record<string, number> = {};
        const dailyTotals = days.map(date => {
          let total = 0;
          Object.values(data).forEach(historyArr => {
            const found = historyArr.find(h => h.date === date);
            if (found) total += found.streams;
          });
          return { date, total };
        });
        // Calculate daily new streams
        const dailyNew = dailyTotals.map((d, i, arr) => ({
          date: d.date,
          newStreams: i === 0 ? 0 : Math.max(0, d.total - arr[i - 1].total)
        }));
        const last14 = dailyNew.slice(-14);
        const week1 = last14.slice(-7);
        const week0 = last14.slice(-14, -7);
        const week1Sum = week1.reduce((sum, d) => sum + d.newStreams, 0);
        const week0Sum = week0.reduce((sum, d) => sum + d.newStreams, 0);
        setWeek1New(week1Sum);
        setWeek0New(week0Sum);
        setPercent(week0Sum > 0 ? ((week1Sum - week0Sum) / week0Sum) * 100 : 0);
      } catch (e: any) {
        setError(e.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchBulkHistory();
  }, [scanLogs]);

  if (loading) {
    return <div className="p-2 text-center text-gray-500">Loading weekly growth...</div>;
  }
  if (error) {
    return <div className="p-2 text-center text-red-700">{error}</div>;
  }

  return (
    <div className="p-2 bg-[#E0E0E0] win95-border-inset rounded">
      <h4 className="font-bold mb-1">Weekly Growth Snapshot</h4>
      <div>+{week1New.toLocaleString()} new streams this week</div>
      <div>Stream growth: {percent.toFixed(1)}%</div>
    </div>
  );
};

export default WeeklyGrowthSnapshotTile;
