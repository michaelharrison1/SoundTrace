
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
  // Get the most recent 14 days
  const last14 = sorted.slice(-14);
  // This week: last 7 days
  const week1 = last14.slice(-7);
  // Last week: previous 7 days
  const week0 = last14.slice(-14, -7);
  // Calculate new streams for each week as difference between first and last day
  const week1New = week1.length >= 2 ? week1[week1.length - 1].streams - week1[0].streams : 0;
  const week0New = week0.length >= 2 ? week0[week0.length - 1].streams - week0[0].streams : 0;
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
