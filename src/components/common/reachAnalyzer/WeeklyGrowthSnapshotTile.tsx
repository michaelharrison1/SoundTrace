import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface WeeklySnapshot {
  streams: number;
  streamsDelta: number;
  countries: number;
  countriesDelta: number;
  topTracks: string[];
}

const WeeklyGrowthSnapshotTile: React.FC = () => {
  const [snapshot, setSnapshot] = useState<WeeklySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSnapshot() {
      setLoading(true);
      setError(null);
      try {
        const coverageRes = await axios.get('/api/v1/tasks/data-coverage');
        const metricsRes = await axios.get('/monitor/dashboard-metrics');
        setSnapshot({
          streams: metricsRes.data.streams,
          streamsDelta: metricsRes.data.streamsDelta,
          countries: coverageRes.data.countries,
          countriesDelta: coverageRes.data.countriesDelta,
          topTracks: metricsRes.data.topTracks || [],
        });
      } catch (err: any) {
        setError('Failed to load weekly snapshot.');
      } finally {
        setLoading(false);
      }
    }
    fetchSnapshot();
  }, []);

  if (loading) return <div>Loading weekly snapshot...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="p-2 bg-[#E0E0E0] win95-border-inset rounded">
      <h4 className="font-bold mb-1">Weekly Growth Snapshot</h4>
      <div>+{snapshot?.streamsDelta.toLocaleString()} streams this week ({((snapshot?.streamsDelta ?? 0) / Math.max(1, (snapshot?.streams ?? 1)) * 100).toFixed(1)}%)</div>
      <div>{snapshot?.countriesDelta} new countries discovered</div>
      <div>Top 3 tracks: {snapshot?.topTracks.slice(0, 3).join(', ')}</div>
    </div>
  );
};

export default WeeklyGrowthSnapshotTile;
