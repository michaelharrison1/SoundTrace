
import React, { useMemo } from 'react';
import { TrackScanLog } from '../../../types';

interface TrackMomentumTabProps {
  scanLogs: TrackScanLog[];
}


// Robustly aggregate daily new streams per track
function getTrackMomentum(scanLogs: TrackScanLog[]) {
  // Map: trackId -> date -> max streamCount for that day
  const trackDateMap: Record<string, { title: string; artist: string; daily: Record<string, number> }> = {};
  scanLogs.forEach(log => {
    log.matches.forEach(match => {
      if (match.spotifyTrackId && match.streamCount && match.streamCountTimestamp) {
        const date = match.streamCountTimestamp.slice(0, 10);
        if (!trackDateMap[match.spotifyTrackId]) {
          trackDateMap[match.spotifyTrackId] = { title: match.title, artist: match.artist, daily: {} };
        }
        // Use max streamCount for a track on a given day
        trackDateMap[match.spotifyTrackId].daily[date] = Math.max(
          trackDateMap[match.spotifyTrackId].daily[date] || 0,
          match.streamCount
        );
      }
    });
  });
  // For each track, build sorted array of {date, streams} and daily new streams
  return Object.entries(trackDateMap).map(([trackId, { title, artist, daily }]) => {
    const days = Object.entries(daily).map(([date, streams]) => ({ date, streams })).sort((a, b) => a.date.localeCompare(b.date));
    const dailyNew = days.map((d, i, arr) => i === 0 ? 0 : Math.max(0, d.streams - arr[i - 1].streams));
    return { trackId, title, artist, days, dailyNew };
  });
}

const TrackMomentumTab: React.FC<TrackMomentumTabProps> = ({ scanLogs }) => {
  const tracks = useMemo(() => getTrackMomentum(scanLogs), [scanLogs]);
  // Calculate velocity and acceleration for each track
  const ranked = tracks.map(track => {
    const last14 = track.dailyNew.slice(-14);
    const week1 = last14.slice(-7);
    const week0 = last14.slice(-14, -7);
    const velocity = week1.reduce((sum, n) => sum + n, 0);
    const acceleration = velocity - week0.reduce((sum, n) => sum + n, 0);
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
