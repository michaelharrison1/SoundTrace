
import React, { useMemo } from 'react';
import { TrackScanLog } from '../../../types';

interface TrackMomentumTabProps {
  scanLogs: TrackScanLog[];
}

// Helper to aggregate daily stream counts for each track
function getTrackDailyStreams(scanLogs: TrackScanLog[]): Record<string, { title: string; artist: string; daily: { date: string; count: number }[] }> {
  const trackMap: Record<string, { title: string; artist: string; daily: { date: string; count: number }[] }> = {};
  // Map: trackId -> date -> max streamCount for that day
  const dateTrackMap: Record<string, Record<string, number>> = {};
  const trackMeta: Record<string, { title: string; artist: string }> = {};
  scanLogs.forEach(log => {
    log.matches.forEach(match => {
      if (match.spotifyTrackId && match.streamCount && match.streamCountTimestamp) {
        const date = match.streamCountTimestamp.slice(0, 10);
        if (!dateTrackMap[match.spotifyTrackId]) dateTrackMap[match.spotifyTrackId] = {};
        dateTrackMap[match.spotifyTrackId][date] = Math.max(
          dateTrackMap[match.spotifyTrackId][date] || 0,
          match.streamCount
        );
        if (!trackMeta[match.spotifyTrackId]) {
          trackMeta[match.spotifyTrackId] = { title: match.title, artist: match.artist };
        }
      }
    });
  });
  // Convert to sorted daily arrays
  Object.keys(dateTrackMap).forEach(trackId => {
    const daily = Object.entries(dateTrackMap[trackId])
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    trackMap[trackId] = { ...trackMeta[trackId], daily };
  });
  return trackMap;
}

const TrackMomentumTab: React.FC<TrackMomentumTabProps> = ({ scanLogs }) => {
  // Calculate per-track daily new streams, velocity, and acceleration
  const trackMomentum = useMemo(() => {
    const trackMap = getTrackDailyStreams(scanLogs);
    const today = new Date();
    // Get last 14 days (YYYY-MM-DD)
    const days: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const result: Array<{ trackId: string; title: string; artist: string; velocity: number; acceleration: number }> = [];
    Object.entries(trackMap).forEach(([trackId, { title, artist, daily }]) => {
      // Build a map of date -> count for this track
      const dateToCount: Record<string, number> = {};
      daily.forEach(d => { dateToCount[d.date] = d.count; });
      // Build array of total counts for each of the last 14 days (fill missing with previous day's count)
      let prev = 0;
      const totals = days.map(date => {
        if (dateToCount[date] !== undefined) prev = dateToCount[date];
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
      result.push({ trackId, title, artist, velocity, acceleration });
    });
    // Sort by velocity desc, then acceleration desc
    return result.sort((a, b) => b.velocity - a.velocity || b.acceleration - a.acceleration).slice(0, 10);
  }, [scanLogs]);

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
