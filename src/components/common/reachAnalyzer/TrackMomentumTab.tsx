

import React, { useEffect, useState } from 'react';
import { TrackScanLog } from '../../../types';

interface TrackMomentumTabProps {
  scanLogs: TrackScanLog[];
}

const TrackMomentumTab: React.FC<TrackMomentumTabProps> = ({ scanLogs }) => {
  const [trackMomentum, setTrackMomentum] = useState<Array<{ trackId: string; title: string; artist: string; velocity: number; acceleration: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBulkHistory() {
      setLoading(true);
      setError(null);
      try {
        // Get all unique track IDs and their meta
        const trackMeta: Record<string, { title: string; artist: string }> = {};
        scanLogs.forEach(log => {
          log.matches.forEach(match => {
            if (match.spotifyTrackId) {
              if (!trackMeta[match.spotifyTrackId]) {
                trackMeta[match.spotifyTrackId] = { title: match.title, artist: match.artist };
              }
            }
          });
        });
        const trackIds = Object.keys(trackMeta);
        if (trackIds.length === 0) {
          setTrackMomentum([]);
          setLoading(false);
          return;
        }
        // Fetch bulk history from backend
        const backendBase = import.meta.env.VITE_API_BASE_URL || '';
        const url = `${backendBase}/api/streamclout/tracks/history?track_ids=${trackIds.join(',')}&time_period=14d`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch stream history');
        const data: Record<string, Array<{ date: string; streams: number }>> = await res.json();
        // Calculate velocity and acceleration for each track
        const today = new Date();
        const days: string[] = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          days.push(d.toISOString().slice(0, 10));
        }
        const result: Array<{ trackId: string; title: string; artist: string; velocity: number; acceleration: number }> = [];
        Object.entries(data).forEach(([trackId, history]) => {
          // Build a map of date -> cumulative streams
          const dateToStreams: Record<string, number> = {};
          history.forEach(h => { dateToStreams[h.date] = h.streams; });
          // Build array of cumulative streams for each of the last 14 days (fill missing with previous day's value)
          let prev = 0;
          const totals = days.map(date => {
            if (dateToStreams[date] !== undefined) prev = dateToStreams[date];
            return prev;
          });
          // Calculate daily new streams
          const dailyNew = totals.map((val, i, arr) => i === 0 ? 0 : Math.max(0, val - arr[i - 1]));
          // Velocity: sum of last 7 days
          const velocity = dailyNew.slice(-7).reduce((a, b) => a + b, 0);
          // Previous week velocity
          const prevVelocity = dailyNew.slice(-14, -7).reduce((a, b) => a + b, 0);
          // Acceleration: difference between this week and previous week
          const acceleration = velocity - prevVelocity;
          result.push({
            trackId,
            title: trackMeta[trackId]?.title || trackId,
            artist: trackMeta[trackId]?.artist || '',
            velocity,
            acceleration
          });
        });
        // Sort by velocity desc, then acceleration desc
        setTrackMomentum(result.sort((a, b) => b.velocity - a.velocity || b.acceleration - a.acceleration).slice(0, 10));
      } catch (e: any) {
        setError(e.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchBulkHistory();
  }, [scanLogs]);

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading track momentum...</div>;
  }
  if (error) {
    return <div className="p-4 text-center text-red-700">{error}</div>;
  }

  return (
    <div className="p-2">
      <h4 className="font-bold mb-2">Track Momentum</h4>
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Track</th>
            <th>Artist</th>
            <th>Velocity (last 7d)</th>
            <th>Acceleration (Δ velocity vs prev week)</th>
          </tr>
        </thead>
        <tbody>
          {trackMomentum.map((t, i) => (
            <tr key={t.trackId}>
              <td>{i + 1}</td>
              <td>{t.title}</td>
              <td>{t.artist}</td>
              <td>{t.velocity.toLocaleString()}</td>
              <td className={t.acceleration > 0 ? 'text-green-700' : t.acceleration < 0 ? 'text-red-700' : ''}>
                {t.acceleration > 0 ? '+' : ''}{t.acceleration.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrackMomentumTab;
