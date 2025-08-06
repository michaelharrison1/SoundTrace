





import React, { useState, useEffect } from 'react';
import { TrackScanLog } from '../../../types';

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

        // Get current date and calculate rolling 7-day periods
        const now = new Date();
        // Exclude today since data is incomplete
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        yesterday.setHours(23, 59, 59, 999);
        
        // This week: Last 7 complete days (yesterday back 7 days)
        const thisWeekEnd = new Date(yesterday);
        const thisWeekStart = new Date(yesterday);
        thisWeekStart.setDate(yesterday.getDate() - 6); // 7 days including yesterday
        thisWeekStart.setHours(0, 0, 0, 0);

        // Last week: 7 days before this week
        const lastWeekEnd = new Date(thisWeekStart);
        lastWeekEnd.setMilliseconds(-1); // End of last week (just before this week starts)
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // 7 days before
        lastWeekStart.setHours(0, 0, 0, 0);

        console.log('Weekly periods:', {
          thisWeek: `${thisWeekStart.toISOString().split('T')[0]} to ${thisWeekEnd.toISOString().split('T')[0]}`,
          lastWeek: `${lastWeekStart.toISOString().split('T')[0]} to ${lastWeekEnd.toISOString().split('T')[0]}`
        });

        // Collect all unique tracks from scanLogs
        const trackIdentifiers = new Set<string>();
        scanLogs.forEach(log => {
          if (log.matches && log.matches.length > 0) {
            log.matches.forEach((match: any) => {
              if (match.platformLinks?.spotify) {
                trackIdentifiers.add(match.platformLinks.spotify);
              }
            });
          }
        });

        if (trackIdentifiers.size === 0) {
          setWeeklyData({
            thisWeekStreams: 0,
            lastWeekStreams: 0,
            percentageChange: 0,
            isLoading: false
          });
          return;
        }

        // Fetch stream data for all tracks
        const streamPromises = Array.from(trackIdentifiers).map(async (trackUrl) => {
          try {
            // Extract Spotify track ID from URL (e.g., "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" -> "4uLU6hMCjMI75M1A2tKUQC")
            const trackIdMatch = trackUrl.match(/\/track\/([a-zA-Z0-9]+)/);
            if (!trackIdMatch) {
              console.warn(`Could not extract track ID from URL: ${trackUrl}`);
              return null;
            }
            const trackId = trackIdMatch[1];
            
            // Use the correct API endpoint that matches the backend route
            const backendBase = import.meta.env.VITE_API_BASE_URL || '';
            const response = await fetch(`${backendBase}/api/streamclout/tracks/${trackId}/history?time_period=30d&use_cache=true`);
            if (!response.ok) return null;
            const data = await response.json();
            return data.stream_history || [];
          } catch (error) {
            console.warn(`Failed to fetch stream data for ${trackUrl}:`, error);
            return null;
          }
        });

        const allStreamResults = await Promise.all(streamPromises);
        const validStreamData = allStreamResults.filter(data => data !== null).flat();

        if (validStreamData.length === 0) {
          setWeeklyData({
            thisWeekStreams: 0,
            lastWeekStreams: 0,
            percentageChange: 0,
            isLoading: false
          });
          return;
        }

        // Convert cumulative streams to daily streams and calculate weekly totals
        // Group by track first, then convert cumulative to daily streams
        const trackStreamMap = new Map<string, Array<{date: Date, streams: number}>>();
        
        validStreamData.forEach(streamEntry => {
          const streamDate = new Date(streamEntry.date);
          const trackKey = `${streamEntry.track_id || 'unknown'}`;
          
          if (!trackStreamMap.has(trackKey)) {
            trackStreamMap.set(trackKey, []);
          }
          
          trackStreamMap.get(trackKey)!.push({
            date: streamDate,
            streams: streamEntry.streams || 0
          });
        });

        let thisWeekStreams = 0;
        let lastWeekStreams = 0;

        // Process each track separately to convert cumulative to daily streams
        trackStreamMap.forEach((trackData, trackKey) => {
          // Sort by date to ensure proper cumulative->daily conversion
          trackData.sort((a, b) => a.date.getTime() - b.date.getTime());
          
          // Convert cumulative streams to daily streams
          const dailyStreams: Array<{date: Date, dailyStreams: number}> = [];
          for (let i = 0; i < trackData.length; i++) {
            const current = trackData[i];
            const previous = i > 0 ? trackData[i - 1] : null;
            
            // Daily streams = current cumulative - previous cumulative
            // Skip first data point for weekly growth calculation (can't calculate daily change)
            const dailyStreamCount = previous 
              ? Math.max(0, current.streams - previous.streams) // Ensure non-negative
              : 0; // First data point, skip for weekly growth calculation
            
            // Debug extreme values
            if (dailyStreamCount > 1000000) {
              console.warn(`[WeeklyGrowth] Extreme daily streams detected for ${trackKey}:`, {
                date: current.date.toISOString().split('T')[0],
                currentStreams: current.streams,
                previousStreams: previous?.streams,
                calculatedDaily: dailyStreamCount
              });
            }
            
            // Only include in weekly calculation if we have a previous data point
            if (previous) {
              dailyStreams.push({
                date: current.date,
                dailyStreams: dailyStreamCount
              });
            }
          }
          
          // Sum daily streams for each week
          dailyStreams.forEach(({ date, dailyStreams: daily }) => {
            if (date >= thisWeekStart && date <= thisWeekEnd) {
              thisWeekStreams += daily;
            } else if (date >= lastWeekStart && date <= lastWeekEnd) {
              lastWeekStreams += daily;
            }
          });
        });

        // Calculate percentage change
        let percentageChange = 0;
        if (lastWeekStreams > 0) {
          percentageChange = ((thisWeekStreams - lastWeekStreams) / lastWeekStreams) * 100;
        } else if (thisWeekStreams > 0) {
          percentageChange = 100; // 100% increase from 0
        }

        console.log('Weekly growth calculation:', {
          thisWeekStreams,
          lastWeekStreams,
          percentageChange: percentageChange.toFixed(1),
          thisWeekRange: `${thisWeekStart.toISOString().split('T')[0]} to ${thisWeekEnd.toISOString().split('T')[0]}`,
          lastWeekRange: `${lastWeekStart.toISOString().split('T')[0]} to ${lastWeekEnd.toISOString().split('T')[0]}`,
          totalTracks: trackStreamMap.size,
          sampleDataPoints: validStreamData.slice(0, 3).map(d => ({
            date: d.date,
            streams: d.streams,
            track_id: d.track_id
          }))
        });

        setWeeklyData({
          thisWeekStreams,
          lastWeekStreams,
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
  }, [scanLogs]);

  const formatNumber = (num: number): string => {
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
        <div className="text-center py-4 text-sm text-gray-600">
          Loading weekly data...
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
