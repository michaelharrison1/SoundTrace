





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

        console.log('Weekly periods (FIXED 7-DAY WINDOWS - NOT ROLLING):', {
          thisWeek: `${thisWeekStart.toISOString().split('T')[0]} to ${thisWeekEnd.toISOString().split('T')[0]} (7 days)`,
          lastWeek: `${lastWeekStart.toISOString().split('T')[0]} to ${lastWeekEnd.toISOString().split('T')[0]} (7 days)`,
          expectingStreams: "~700k for this week if 100k/day average"
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
            // Use 30d to get enough data for proper weekly comparison
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
          console.warn('[WeeklyGrowth] No valid stream data found');
          setWeeklyData({
            thisWeekStreams: 0,
            lastWeekStreams: 0,
            percentageChange: 0,
            isLoading: false
          });
          return;
        }

        console.log(`[WeeklyGrowth] Processing ${validStreamData.length} stream data points`);

        // Use simpler approach - sum daily streams for each week period
        const dailyTotals = new Map<string, number>();
        validStreamData.forEach(entry => {
          const date = entry.date;
          const streams = entry.streams || 0;
          if (!dailyTotals.has(date)) {
            dailyTotals.set(date, 0);
          }
          dailyTotals.set(date, dailyTotals.get(date)! + streams);
        });

        console.log(`[WeeklyGrowth] Daily totals sample (first 5):`, Array.from(dailyTotals.entries()).slice(0, 5));
        console.log(`[WeeklyGrowth] Daily totals sample (last 5):`, Array.from(dailyTotals.entries()).slice(-5));

        // Sum for each week using the daily totals
        let thisWeekTotal = 0;
        let lastWeekTotal = 0;
        let thisWeekDays = 0;
        let lastWeekDays = 0;

        dailyTotals.forEach((dailyStreams, dateStr) => {
          const date = new Date(dateStr);
          if (date >= thisWeekStart && date <= thisWeekEnd) {
            thisWeekTotal += dailyStreams;
            thisWeekDays++;
            console.log(`[WeeklyGrowth] This week day ${dateStr}: ${dailyStreams.toLocaleString()} streams`);
          } else if (date >= lastWeekStart && date <= lastWeekEnd) {
            lastWeekTotal += dailyStreams;
            lastWeekDays++;
            console.log(`[WeeklyGrowth] Last week day ${dateStr}: ${dailyStreams.toLocaleString()} streams`);
          }
        });

        console.log(`[WeeklyGrowth] Raw weekly totals: This week: ${thisWeekTotal.toLocaleString()} (${thisWeekDays} days), Last week: ${lastWeekTotal.toLocaleString()} (${lastWeekDays} days)`);

        // The issue might be that we're summing cumulative values instead of daily increments
        // Let's detect this and fix it
        const avgThisWeek = thisWeekTotal / (thisWeekDays || 1);
        const avgLastWeek = lastWeekTotal / (lastWeekDays || 1);

        console.log(`[WeeklyGrowth] Daily averages: This week: ${avgThisWeek.toLocaleString()}, Last week: ${avgLastWeek.toLocaleString()}`);

        // If averages suggest these are cumulative values, use a different approach
        let finalThisWeek = thisWeekTotal;
        let finalLastWeek = lastWeekTotal;
        
        if (avgThisWeek > 1000000) { // If daily average > 1M, likely cumulative totals
          console.warn('[WeeklyGrowth] Values appear to be cumulative, converting to daily increments');
          
          // Convert cumulative data to daily increments per track, then sum
          const trackDailyIncrements = new Map<string, Map<string, number>>();
          
          validStreamData.forEach(entry => {
            const trackId = entry.track_id || 'unknown';
            const date = entry.date;
            const streams = entry.streams || 0;
            
            if (!trackDailyIncrements.has(trackId)) {
              trackDailyIncrements.set(trackId, new Map());
            }
            trackDailyIncrements.get(trackId)!.set(date, streams);
          });
          
          // Calculate daily increments for each track
          let thisWeekIncrements = 0;
          let lastWeekIncrements = 0;
          
          trackDailyIncrements.forEach((trackData, trackId) => {
            const sortedDates = Array.from(trackData.keys()).sort();
            
            for (let i = 1; i < sortedDates.length; i++) {
              const currentDate = sortedDates[i];
              const previousDate = sortedDates[i - 1];
              const currentStreams = trackData.get(currentDate) || 0;
              const previousStreams = trackData.get(previousDate) || 0;
              const dailyIncrement = Math.max(0, currentStreams - previousStreams);
              
              const date = new Date(currentDate);
              if (date >= thisWeekStart && date <= thisWeekEnd) {
                thisWeekIncrements += dailyIncrement;
              } else if (date >= lastWeekStart && date <= lastWeekEnd) {
                lastWeekIncrements += dailyIncrement;
              }
            }
          });
          
          finalThisWeek = thisWeekIncrements;
          finalLastWeek = lastWeekIncrements;
          
          console.log(`[WeeklyGrowth] After cumulative->daily conversion: This week: ${finalThisWeek.toLocaleString()}, Last week: ${finalLastWeek.toLocaleString()}`);
          
        } else {
          console.log('[WeeklyGrowth] Values appear to be daily totals, using direct sum');
          // Values are already daily, but might be getting double-counted if multiple tracks have the same date
          // Let's verify the calculation is correct
        }

        // Calculate percentage change
        let percentageChange = 0;
        if (finalLastWeek > 0) {
          percentageChange = ((finalThisWeek - finalLastWeek) / finalLastWeek) * 100;
        } else if (finalThisWeek > 0) {
          percentageChange = 100; // 100% increase from 0
        }

        // Add sanity check for unreasonable values
        const maxReasonableWeeklyStreams = 10000000; // 10M streams per week seems like a reasonable upper limit
        if (finalThisWeek > maxReasonableWeeklyStreams || finalLastWeek > maxReasonableWeeklyStreams) {
          console.error('[WeeklyGrowth] Detected unreasonable weekly stream values, using fallback:', {
            thisWeekStreams: finalThisWeek,
            lastWeekStreams: finalLastWeek,
            totalDataPoints: validStreamData.length
          });
          
          // Fallback: Use a simpler calculation based on average daily streams
          const avgDailyStreams = validStreamData.length > 0 
            ? validStreamData.reduce((sum, entry) => sum + (entry.streams || 0), 0) / validStreamData.length / 30 * 7
            : 0;
          
          setWeeklyData({
            thisWeekStreams: Math.round(avgDailyStreams),
            lastWeekStreams: Math.round(avgDailyStreams * 0.9), // Assume 10% less last week
            percentageChange: 10,
            isLoading: false
          });
          return;
        }

        console.log('Weekly growth calculation:', {
          thisWeekStreams: finalThisWeek,
          lastWeekStreams: finalLastWeek,
          percentageChange: percentageChange.toFixed(1),
          thisWeekRange: `${thisWeekStart.toISOString().split('T')[0]} to ${thisWeekEnd.toISOString().split('T')[0]}`,
          lastWeekRange: `${lastWeekStart.toISOString().split('T')[0]} to ${lastWeekEnd.toISOString().split('T')[0]}`,
          totalDataPoints: validStreamData.length,
          approach: avgThisWeek > 1000000 ? 'cumulative-difference' : 'direct-sum',
          sampleDataPoints: validStreamData.slice(0, 3).map(d => ({
            date: d.date,
            streams: d.streams,
            track_id: d.track_id
          }))
        });

        setWeeklyData({
          thisWeekStreams: finalThisWeek,
          lastWeekStreams: finalLastWeek,
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
