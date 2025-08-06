





import React, { useState, useEffect } from 'react';
import { TrackScanLog } from '../../../types';
import ProgressBar from '../ProgressBar';

interface WeeklyGrowthSnapshotTileProps {
  scanLogs?: TrackScanLog[];
}

interface WeeklyGrowthData {
  thisWeekStreams: number;
  lastWeekStreams: number;
  percentageChange: number;
  isLoading: boolean;
  error?: string;
}

interface TrackHistoryPoint {
  date: string;
  streams: number;
}

interface TrackHistory {
  track_id?: string;
  track_name?: string;
  artist_name?: string;
  stream_history: TrackHistoryPoint[];
}

// Use the same aggregation logic as StreamHistoryTab
function aggregateHistories(histories: TrackHistory[]): { date: string; total_streams: number; daily_streams?: number }[] {
  const trackDataMap = new Map<string, { date: string; streams: number }[]>();
  
  // Today's date in YYYY-MM-DD format for filtering
  const today = new Date().toISOString().split('T')[0];
  
  histories.forEach((history) => {
    const trackKey = history.track_id || `${history.artist_name}-${history.track_name}`;
    if (!trackDataMap.has(trackKey)) {
      trackDataMap.set(trackKey, []);
    }
    
    if (history.stream_history && Array.isArray(history.stream_history)) {
      history.stream_history.forEach((point: TrackHistoryPoint) => {
        const date = point.date.split('T')[0]; // Normalize to YYYY-MM-DD
        
        // Skip today's data since it's incomplete
        if (date !== today) {
          trackDataMap.get(trackKey)!.push({
            date: date,
            streams: point.streams
          });
        }
      });
    }
  });
  
  // Calculate both daily streams (for new_streams) and cumulative totals (for total_streams display)
  const dailyAggregateMap = new Map<string, number>(); // For daily stream calculation
  
  trackDataMap.forEach((trackData, trackKey) => {
    // Sort by date for proper cumulative->daily conversion
    trackData.sort((a, b) => a.date.localeCompare(b.date));
    
    // Convert cumulative to daily for this track, skip first data point
    for (let i = 1; i < trackData.length; i++) { // Start from index 1 to skip first data point
      const current = trackData[i];
      const previous = trackData[i - 1];
      
      // Daily streams = current cumulative - previous cumulative
      const dailyStreams = Math.max(0, current.streams - previous.streams); // Ensure non-negative
      
      // Add to daily aggregate (for new_streams field)
      const existingDaily = dailyAggregateMap.get(current.date) || 0;
      dailyAggregateMap.set(current.date, existingDaily + dailyStreams);
    }
  });
  
  // For total_streams, we want to show the actual cumulative total from each track
  // Create a map of all dates and their all-time cumulative totals
  const allTimeCumulativeMap = new Map<string, number>();
  
  trackDataMap.forEach((trackData) => {
    trackData.sort((a, b) => a.date.localeCompare(b.date));
    
    trackData.forEach(point => {
      const existing = allTimeCumulativeMap.get(point.date) || 0;
      allTimeCumulativeMap.set(point.date, existing + point.streams);
    });
  });
  
  // Convert to result array with all-time totals and daily streams
  const sortedDates = Array.from(new Set([...dailyAggregateMap.keys(), ...allTimeCumulativeMap.keys()])).sort();
  
  const result = sortedDates.map(date => {
    return {
      date,
      total_streams: allTimeCumulativeMap.get(date) || 0, // All-time cumulative total
      daily_streams: dailyAggregateMap.get(date) || 0     // Daily new streams
    };
  }).filter(item => item.total_streams > 0 || item.daily_streams > 0); // Remove empty entries
    
  return result;
}

const WeeklyGrowthSnapshotTile: React.FC<WeeklyGrowthSnapshotTileProps> = ({ scanLogs = [] }) => {
  const [weeklyData, setWeeklyData] = useState<WeeklyGrowthData>({
    thisWeekStreams: 0,
    lastWeekStreams: 0,
    percentageChange: 0,
    isLoading: true
  });

  useEffect(() => {
    const fetchWeeklyGrowthData = async () => {
      if (scanLogs.length === 0) {
        setWeeklyData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        setWeeklyData(prev => ({ ...prev, isLoading: true, error: undefined }));

        // Get all unique Spotify track IDs (same approach as StreamHistoryTab)
        const trackIds = Array.from(new Set(
          scanLogs.flatMap(log =>
            log.matches.map(m => m.spotifyTrackId).filter(Boolean)
          )
        ));

        if (trackIds.length === 0) {
          setWeeklyData({
            thisWeekStreams: 0,
            lastWeekStreams: 0,
            percentageChange: 0,
            isLoading: false
          });
          return;
        }

        // Fetch stream data for all tracks (same as StreamHistoryTab)
        const backendBase = import.meta.env.VITE_API_BASE_URL || '';
        const results = await Promise.all(
          trackIds.map(async (id) => {
            try {
              const url = `${backendBase}/api/streamclout/tracks/${id}/history?time_period=30d&use_cache=true`;
              const res = await fetch(url);
              if (!res.ok) {
                return null;
              }
              const data = await res.json();
              return data;
            } catch (err) {
              return null;
            }
          })
        );

        const validHistories = results.filter(Boolean) as TrackHistory[];
        
        // Use the same aggregation logic as StreamHistoryTab
        let aggregatedData = aggregateHistories(validHistories);
        
        // Apply the same fix as StreamHistoryTab: hide the first data point if daily streams equals total streams
        // This indicates it's the problematic first data point from StreamClout
        if (aggregatedData.length > 0 && aggregatedData[0].daily_streams === aggregatedData[0].total_streams && aggregatedData[0].total_streams > 0) {
          aggregatedData = aggregatedData.slice(1); // Remove the first data point
        }
        
        // For "Last 7 Days", use EXACTLY the same filtering logic as StreamHistoryTab 7d view
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); // True 7 days - same as StreamHistoryTab
        const streamHistoryCutoffDate = sevenDaysAgo.toISOString().split('T')[0];
        const last7DaysData = aggregatedData.filter(d => d.date >= streamHistoryCutoffDate);
        
        // For "Previous 7 Days", get the 7 days before that
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const previous7DaysCutoffDate = fourteenDaysAgo.toISOString().split('T')[0];
        const previous7DaysData = aggregatedData.filter(d => d.date >= previous7DaysCutoffDate && d.date < streamHistoryCutoffDate);
        
        console.log('Weekly data processing:', {
          totalDataPoints: aggregatedData.length,
          last7DaysPoints: last7DaysData.length,
          previous7DaysPoints: previous7DaysData.length,
          last7DaysDateRange: last7DaysData.length > 0 ? `${last7DaysData[0].date} to ${last7DaysData[last7DaysData.length - 1].date}` : 'none',
          previous7DaysDateRange: previous7DaysData.length > 0 ? `${previous7DaysData[0].date} to ${previous7DaysData[previous7DaysData.length - 1].date}` : 'none'
        });
        
        // Calculate weekly totals using daily_streams (which contains the daily increments)
        const thisWeekTotal = last7DaysData.reduce((sum, { daily_streams }) => sum + (daily_streams || 0), 0);
        const lastWeekTotal = previous7DaysData.reduce((sum, { daily_streams }) => sum + (daily_streams || 0), 0);

        console.log('Weekly totals:', {
          thisWeekStreams: thisWeekTotal.toLocaleString(),
          lastWeekStreams: lastWeekTotal.toLocaleString()
        });

        // Calculate percentage change
        let percentageChange = 0;
        if (lastWeekTotal > 0) {
          percentageChange = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
        } else if (thisWeekTotal > 0) {
          percentageChange = 100; // 100% increase from 0
        }

        setWeeklyData({
          thisWeekStreams: thisWeekTotal,
          lastWeekStreams: lastWeekTotal,
          percentageChange,
          isLoading: false
        });

      } catch (error) {
        console.error('Error fetching weekly growth data:', error);
        setWeeklyData(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load weekly data'
        }));
      }
    };

    fetchWeeklyGrowthData();
  }, [scanLogs]);  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return '#008000'; // Green for positive
    if (change < 0) return '#FF0000'; // Red for negative
    return '#000000'; // Black for no change
  };

  const getChangeIcon = (change: number): string => {
    if (change > 0) return '↗';
    if (change < 0) return '↘';
    return '→';
  };

  return (
    <div className="bg-[#C0C0C0] win95-border-outset p-2 mb-2">
      <div className="bg-[#000080] text-white px-2 py-1 mb-2 text-sm font-bold">
        Weekly Growth Snapshot
      </div>
      
      {weeklyData.isLoading ? (
        <div className="py-2">
          <ProgressBar text="Loading weekly data..." />
        </div>
      ) : weeklyData.error ? (
        <div className="text-center py-4 text-sm text-red-600">
          {weeklyData.error}
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="bg-[#E0E0E0] win95-border-inset p-2">
            <div className="text-xs text-gray-600 mb-1">Last 7 Days</div>
            <div className="font-bold">
              {formatNumber(weeklyData.thisWeekStreams)} streams
            </div>
          </div>
          
          <div className="bg-[#E0E0E0] win95-border-inset p-2">
            <div className="text-xs text-gray-600 mb-1">Previous 7 Days</div>
            <div className="font-bold">
              {formatNumber(weeklyData.lastWeekStreams)} streams
            </div>
          </div>
          
          <div className="bg-[#E0E0E0] win95-border-inset p-2">
            <div className="text-xs text-gray-600 mb-1">Change</div>
            <div 
              className="font-bold flex items-center"
              style={{ color: getChangeColor(weeklyData.percentageChange) }}
            >
              <span className="mr-1">{getChangeIcon(weeklyData.percentageChange)}</span>
              {Math.abs(weeklyData.percentageChange).toFixed(1)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyGrowthSnapshotTile;
