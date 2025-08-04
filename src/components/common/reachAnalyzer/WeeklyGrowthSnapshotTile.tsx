

import React, { useMemo } from 'react';
import { TrackScanLog } from '../../../types';

interface WeeklyGrowthSnapshotTileProps {
  scanLogs: TrackScanLog[];
}

// Robustly aggregate daily new streams for all tracks
function getDailyNewStreams(scanLogs: TrackScanLog[]): { date: string; newStreams: number }[] {
  // Map: date -> set of trackId -> max streamCount for that day
  const dateTrackMap: Record<string, Record<string, number>> = {};
  scanLogs.forEach(log => {
    log.matches.forEach(match => {
      if (match.spotifyTrackId && match.streamCount && match.streamCountTimestamp) {
        const date = match.streamCountTimestamp.slice(0, 10);
        if (!dateTrackMap[date]) dateTrackMap[date] = {};
        // Use max streamCount for a track on a given day
        dateTrackMap[date][match.spotifyTrackId] = Math.max(
          dateTrackMap[date][match.spotifyTrackId] || 0,
          match.streamCount
        );
      }
    });
  });
  // For each date, sum all track streamCounts
  const dailyTotals = Object.entries(dateTrackMap)
    .map(([date, trackCounts]) => ({
      date,
      total: Object.values(trackCounts).reduce((a, b) => a + b, 0)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  // Calculate daily new streams (difference from previous day)
  const dailyNew = dailyTotals.map((d, i, arr) => ({
    date: d.date,
    newStreams: i === 0 ? 0 : Math.max(0, d.total - arr[i - 1].total)
  }));
  return dailyNew;
}

const WeeklyGrowthSnapshotTile: React.FC<WeeklyGrowthSnapshotTileProps> = ({ scanLogs }) => {
  const dailyNew = useMemo(() => getDailyNewStreams(scanLogs), [scanLogs]);
  const last14 = dailyNew.slice(-14);
  const week1 = last14.slice(-7);
  const week0 = last14.slice(-14, -7);
  const week1New = week1.reduce((sum, d) => sum + d.newStreams, 0);
  const week0New = week0.reduce((sum, d) => sum + d.newStreams, 0);
  const percent = week0New > 0 ? ((week1New - week0New) / week0New) * 100 : 0;

  return (
    <div className="p-2 bg-[#E0E0E0] win95-border-inset rounded">
      <h4 className="font-bold mb-1">Weekly Growth Snapshot</h4>
      <div>+{week1New.toLocaleString()} new streams this week</div>
      <div>Stream growth: {percent.toFixed(1)}%</div>
    </div>
  );
};

export default WeeklyGrowthSnapshotTile;
