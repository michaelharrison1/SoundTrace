
import React, { useMemo } from 'react';
import { TrackScanLog } from '../../../types';

interface TrackMomentumTabProps {
  scanLogs: TrackScanLog[];
}

// Helper: get per-track, per-day stream counts for last 30 days
function getTrackHistories(scanLogs: TrackScanLog[]) {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - 30);
  const trackMap: Record<string, { title: string; artist: string; daily: Record<string, number> }> = {};
  scanLogs.forEach(log => {
    if (log.status === 'completed_match_found' || log.status === 'scanned_match_found' || log.status === 'imported_spotify_track') {
      log.matches.forEach(match => {
        if (match.spotifyTrackId && match.streamCount && match.streamCountTimestamp) {
          const date = match.streamCountTimestamp.slice(0, 10);
          if (new Date(date) < cutoff) return;
          if (!trackMap[match.spotifyTrackId]) {
            trackMap[match.spotifyTrackId] = { title: match.title, artist: match.artist, daily: {} };
          }
          trackMap[match.spotifyTrackId].daily[date] = (trackMap[match.spotifyTrackId].daily[date] || 0) + match.streamCount;
        }
      });
    }
  });
  return trackMap;
}

const TrackMomentumTab: React.FC<TrackMomentumTabProps> = ({ scanLogs }) => {
  // Build per-track, per-day stream history for last 30 days
  const trackData = useMemo(() => getTrackHistories(scanLogs), [scanLogs]);
  // For each track, build a sorted array of {date, streams}
  const tracks = Object.entries(trackData).map(([trackId, { title, artist, daily }]) => {
    const days = Object.entries(daily).map(([date, streams]) => ({ date, streams })).sort((a, b) => a.date.localeCompare(b.date));
    return { trackId, title, artist, days };
  });

  // Calculate velocity (difference between first and last day of most recent 7 days)
  const ranked = tracks.map(track => {
    const last14 = track.days.slice(-14);
    // This week: last 7 days
    const week1 = last14.slice(-7);
    // Last week: previous 7 days
    const week0 = last14.slice(-14, -7);
    // Velocity: difference between first and last day of this week
    const velocity = week1.length >= 2 ? week1[week1.length - 1].streams - week1[0].streams : 0;
    // Last week's velocity
    const prevVelocity = week0.length >= 2 ? week0[week0.length - 1].streams - week0[0].streams : 0;
    // Acceleration: difference between this week's and last week's velocity
    const acceleration = velocity - prevVelocity;
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
