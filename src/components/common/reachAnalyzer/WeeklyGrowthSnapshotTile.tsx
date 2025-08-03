
import React, { useMemo } from 'react';
import { TrackScanLog, DailyAnalyticsSnapshot } from '../../../types';

interface WeeklyGrowthSnapshotTileProps {
  scanLogs: TrackScanLog[];
  historicalAnalyticsData?: DailyAnalyticsSnapshot[];
}

// Helper to aggregate total streams by date (YYYY-MM-DD)
function aggregateStreamsByDate(scanLogs: TrackScanLog[]): Record<string, number> {
  const dateMap: Record<string, number> = {};
  scanLogs.forEach(log => {
    if (log.status === 'completed_match_found' || log.status === 'scanned_match_found' || log.status === 'imported_spotify_track') {
      log.matches.forEach(match => {
        if (match.streamCount && match.streamCountTimestamp) {
          const date = match.streamCountTimestamp.slice(0, 10);
          dateMap[date] = (dateMap[date] || 0) + match.streamCount;
        }
      });
    }
  });
  return dateMap;
}

const WeeklyGrowthSnapshotTile: React.FC<WeeklyGrowthSnapshotTileProps> = ({ scanLogs, historicalAnalyticsData }) => {
  // Prefer historicalAnalyticsData if available, else aggregate from scanLogs
  const dailyData = useMemo(() => {
    if (historicalAnalyticsData && historicalAnalyticsData.length > 0) {
      return historicalAnalyticsData.map(d => ({ date: d.date, streams: d.cumulativeStreams ?? 0 }));
    }
    // fallback: aggregate from scanLogs
    const agg = aggregateStreamsByDate(scanLogs);
    return Object.entries(agg).map(([date, streams]) => ({ date, streams }));
  }, [scanLogs, historicalAnalyticsData]);

  // Sort by date ascending
  const sorted = [...dailyData].sort((a, b) => a.date.localeCompare(b.date));
  const lastDay = sorted[sorted.length - 1];
  // Find last Sunday (or today if Sunday)
  function getLastSunday(dateStr: string) {
    const d = new Date(dateStr);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d.toISOString().slice(0, 10);
  }
  // Get last 2 full weeks (Sun-Sat)
  const lastSunday = lastDay ? getLastSunday(lastDay.date) : null;
  const week1 = sorted.filter(d => d.date > lastSunday!);
  const week0 = sorted.filter(d => d.date <= lastSunday!).slice(-7);
  const week1Total = week1.reduce((sum, d) => sum + d.streams, 0);
  const week0Total = week0.reduce((sum, d) => sum + d.streams, 0);
  const delta = week1Total - week0Total;
  const percent = week0Total > 0 ? (delta / week0Total) * 100 : 0;

  return (
    <div className="p-2 bg-[#E0E0E0] win95-border-inset rounded">
      <h4 className="font-bold mb-1">Weekly Growth Snapshot</h4>
      <div>+{delta.toLocaleString()} streams this week ({percent.toFixed(1)}%)</div>
    </div>
  );
};

export default WeeklyGrowthSnapshotTile;
