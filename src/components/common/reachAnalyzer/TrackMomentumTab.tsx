
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

  // Calculate velocity (last 7 days - previous 7 days)
  const ranked = tracks.map(track => {
    const last14 = track.days.slice(-14);
    const prev7 = last14.slice(0, 7).reduce((sum, d) => sum + d.streams, 0);
    const last7 = last14.slice(7).reduce((sum, d) => sum + d.streams, 0);
    const velocity = last7 - prev7;
    // Acceleration: week-over-week change for last 4 weeks
    const weeks = [0, 1, 2, 3].map(i => {
      const week = track.days.slice(-(7 * (i + 1)), -(7 * i) || undefined);
      return week.reduce((sum, d) => sum + d.streams, 0);
    });
    const acceleration = weeks[0] - weeks[1]; // last week - week before
    return { ...track, velocity, acceleration, weeks };
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
            <th>Acceleration (last 4w)</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((track, i) => (
            <tr key={track.trackId}>
              <td>{i + 1}</td>
              <td>{track.title}</td>
              <td>{track.artist}</td>
              <td>{track.velocity.toLocaleString()}</td>
              <td>{track.acceleration.toLocaleString()} (4w trend: {track.weeks.map((w, idx) => `${4-idx}:${w}`).join(' | ')})</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrackMomentumTab;
