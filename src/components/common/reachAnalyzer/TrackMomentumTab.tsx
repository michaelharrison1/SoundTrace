
import React, { useMemo } from 'react';
import { TrackScanLog } from '../../../types';

interface TrackMomentumTabProps {
  scanLogs: TrackScanLog[];
}

// Aggregate per-track, per-day stream counts for all tracks
function getTrackHistories(scanLogs: TrackScanLog[]): Record<string, { title: string; artist: string; daily: Record<string, number> }> {
  const trackMap: Record<string, { title: string; artist: string; daily: Record<string, number> }> = {};
  scanLogs.forEach(log => {
    log.matches.forEach(match => {
      if (match.spotifyTrackId && match.streamCount && match.streamCountTimestamp) {
        const date = match.streamCountTimestamp.slice(0, 10);
        if (!trackMap[match.spotifyTrackId]) {
          trackMap[match.spotifyTrackId] = { title: match.title, artist: match.artist, daily: {} };
        }
        trackMap[match.spotifyTrackId].daily[date] = (trackMap[match.spotifyTrackId].daily[date] || 0) + match.streamCount;
      }
    });
  });
  return trackMap;
}

const TrackMomentumTab: React.FC<TrackMomentumTabProps> = ({ scanLogs }) => {
  // Build per-track, per-day stream history
  const trackData = useMemo(() => getTrackHistories(scanLogs), [scanLogs]);
  // For each track, build a sorted array of {date, streams} and daily new streams
  const tracks = Object.entries(trackData).map(([trackId, { title, artist, daily }]) => {
    const days = Object.entries(daily).map(([date, streams]) => ({ date, streams })).sort((a, b) => a.date.localeCompare(b.date));
    const dailyNew = days.map((d, i, arr) => i === 0 ? 0 : d.streams - arr[i - 1].streams);
    return { trackId, title, artist, days, dailyNew };
  });

  // Calculate velocity (sum of daily new streams for last 7 days)
  const ranked = tracks.map(track => {
    const last14New = track.dailyNew.slice(-14);
    // This week: last 7 days
    const week1New = last14New.slice(-7).reduce((sum, n) => sum + n, 0);
    // Last week: previous 7 days
    const week0New = last14New.slice(-14, -7).reduce((sum, n) => sum + n, 0);
    // Velocity: this week's new streams
    const velocity = week1New;
    // Acceleration: difference between this week and last week
    const acceleration = velocity - week0New;
    return { ...track, velocity, acceleration };
  });
  // Rank by velocity, assign 1-10
  const sorted = [...ranked].sort((a, b) => b.velocity - a.velocity).slice(0, 10);
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
          {sorted.map((track, i) => (
            <tr key={track.trackId}>
              <td>{i + 1}</td>
              <td>{track.title}</td>
              <td>{track.artist}</td>
              <td>{track.velocity.toLocaleString()}</td>
              <td>{track.acceleration.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrackMomentumTab;
