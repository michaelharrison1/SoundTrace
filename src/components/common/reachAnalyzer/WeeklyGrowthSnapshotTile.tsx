
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
  // Calculate daily new streams (difference from previous day)
  const dailyNew = sorted.map((d, i, arr) => i === 0 ? 0 : d.streams - arr[i - 1].streams);
  // Get the most recent 14 days of daily new streams
  const last14New = dailyNew.slice(-14);
  // This week: last 7 days
  const week1New = last14New.slice(-7).reduce((sum, n) => sum + n, 0);
  // Last week: previous 7 days
  const week0New = last14New.slice(-14, -7).reduce((sum, n) => sum + n, 0);
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
