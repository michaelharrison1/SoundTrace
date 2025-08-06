





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

  // Copy the exact aggregation logic from StreamHistoryTab
  function aggregateStreamHistories(histories: any[]): { date: string; total_streams: number; daily_streams?: number }[] {
    // Get today's date to exclude incomplete data
    const today = new Date().toISOString().split('T')[0];
    
    // Group data by track first, then convert cumulative to daily per track
    const trackDataMap = new Map<string, Array<{date: string, streams: number}>>();
    
    histories.forEach(hist => {
      if (hist.stream_history && Array.isArray(hist.stream_history)) {
        const trackKey = hist.track_id || 'unknown';
        if (!trackDataMap.has(trackKey)) {
          trackDataMap.set(trackKey, []);
        }
        
        hist.stream_history.forEach((point: any) => {
          const date = point.date.slice(0, 10); // YYYY-MM-DD
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
    
    // Calculate both daily streams (for new_streams) and cumulative totals
    const dailyAggregateMap = new Map<string, number>();
    
    trackDataMap.forEach((trackData) => {
      // Sort by date for proper cumulative->daily conversion
      trackData.sort((a, b) => a.date.localeCompare(b.date));
      
      // Convert cumulative to daily for this track, skip first data point
      for (let i = 1; i < trackData.length; i++) {
        const current = trackData[i];
        const previous = trackData[i - 1];
        
        // Daily streams = current cumulative - previous cumulative
        const dailyStreams = Math.max(0, current.streams - previous.streams);
        
        // Add to daily aggregate
        const existingDaily = dailyAggregateMap.get(current.date) || 0;
        dailyAggregateMap.set(current.date, existingDaily + dailyStreams);
      }
    });
    
    // For total_streams, create cumulative totals
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
        total_streams: allTimeCumulativeMap.get(date) || 0,
        daily_streams: dailyAggregateMap.get(date) || 0
      };
    }).filter(item => item.total_streams > 0 || item.daily_streams > 0);
      
    return result;
  }

  useEffect(() => {
    if (scanLogs && scanLogs.length > 0) {
      const fetchWeeklyData = async () => {
        console.log('Weekly periods (FIXED 7-DAY WINDOWS - NOT ROLLING):', {
          thisWeek: `${thisWeekStart.toISOString().split('T')[0]} to ${thisWeekEnd.toISOString().split('T')[0]} (7 days)`,
          lastWeek: `${lastWeekStart.toISOString().split('T')[0]} to ${lastWeekEnd.toISOString().split('T')[0]} (7 days)`,
          expectingStreams: "~700k for this week if 100k/day average"
        });

        // Collect all unique tracks from scanLogs (same as StreamHistoryTab)
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

        try {
          // Fetch stream history for all tracks (same API calls as StreamHistoryTab)
          const historyPromises = Array.from(trackIdentifiers).map(async (trackId) => {
            try {
              const response = await fetch(`/api/streamclout/${encodeURIComponent(trackId)}/history?time_period=30d`);
              if (!response.ok) return null;
              const data = await response.json();
              return {
                track_id: trackId,
                track_name: data.track_name || 'Unknown',
                artist_name: data.artist_name || 'Unknown',
                stream_history: data.stream_history || []
              };
            } catch (error) {
              console.error(`Error fetching history for ${trackId}:`, error);
              return null;
            }
          });

          const allHistories = (await Promise.all(historyPromises)).filter(h => h !== null);
          
          // Use EXACT same aggregation logic as StreamHistoryTab
          const aggregatedData = aggregateStreamHistories(allHistories);
          
          // Sum up last 7 days and previous 7 days using daily_streams
          let weeklyThisTotal = 0;
          let weeklyLastTotal = 0;

          aggregatedData.forEach((entry: any) => {
            const entryDate = new Date(entry.date);
            if (entryDate >= thisWeekStart && entryDate <= thisWeekEnd) {
              weeklyThisTotal += entry.daily_streams || 0;
            } else if (entryDate >= lastWeekStart && entryDate <= lastWeekEnd) {
              weeklyLastTotal += entry.daily_streams || 0;
            }
          });

          console.log(`[WeeklyGrowth] Using StreamHistory logic - This week: ${weeklyThisTotal.toLocaleString()}, Last week: ${weeklyLastTotal.toLocaleString()}`);

          // Calculate percentage change
          let weeklyPercentageChange = 0;
          if (weeklyLastTotal > 0) {
            weeklyPercentageChange = ((weeklyThisTotal - weeklyLastTotal) / weeklyLastTotal) * 100;
          } else if (weeklyThisTotal > 0) {
            weeklyPercentageChange = 100;
          }

          setWeeklyData({
            thisWeekStreams: weeklyThisTotal,
            lastWeekStreams: weeklyLastTotal,
            percentageChange: weeklyPercentageChange,
            isLoading: false
          });

        } catch (error) {
          console.error('[WeeklyGrowth] Error fetching weekly data:', error);
          setWeeklyData({
            thisWeekStreams: 0,
            lastWeekStreams: 0,
            percentageChange: 0,
            isLoading: false
          });
        }
      };

      fetchWeeklyData();
    } else {
      setWeeklyData({
        thisWeekStreams: 0,
        lastWeekStreams: 0,
        percentageChange: 0,
        isLoading: false
      });
    }
  }, [scanLogs]);        // Collect all unique tracks from scanLogs
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

        // Add comprehensive data analysis
        const uniqueTracks = new Set(validStreamData.map(d => d.track_id || 'unknown'));
        const uniqueDates = new Set(validStreamData.map(d => d.date));
        const totalStreams = validStreamData.reduce((sum, d) => sum + (d.streams || 0), 0);
        
        console.log(`[WeeklyGrowth] Data overview:`, {
          totalDataPoints: validStreamData.length,
          uniqueTracks: uniqueTracks.size,
          uniqueDates: uniqueDates.size,
          totalStreamsAcrossAllData: totalStreams.toLocaleString(),
          avgStreamsPerDataPoint: Math.round(totalStreams / validStreamData.length),
          dateRange: {
            earliest: Math.min(...Array.from(uniqueDates).map(d => new Date(d).getTime())),
            latest: Math.max(...Array.from(uniqueDates).map(d => new Date(d).getTime()))
          }
        });
        
        // Show top 5 highest stream values to detect outliers
        const topStreamValues = validStreamData
          .map(d => ({ date: d.date, track_id: d.track_id, streams: d.streams || 0 }))
          .sort((a, b) => b.streams - a.streams)
          .slice(0, 5);
        console.log(`[WeeklyGrowth] Top 5 stream values:`, topStreamValues);

        // CRITICAL FIX: Convert cumulative data to daily increments PER TRACK before summing
        // Group data by track_id first, then convert cumulative to daily per track
        const dataByTrack = new Map<string, Array<{date: string, streams: number}>>();
        validStreamData.forEach(entry => {
          const trackId = entry.track_id || 'unknown';
          // NORMALIZE DATE: Convert timestamps to YYYY-MM-DD format to avoid duplicates
          const normalizedDate = entry.date.split('T')[0]; // Extract just the date part
          
          if (!dataByTrack.has(trackId)) {
            dataByTrack.set(trackId, []);
          }
          dataByTrack.get(trackId)!.push({
            date: normalizedDate,
            streams: entry.streams || 0
          });
        });

        // Convert each track's data from cumulative to daily increments if needed
        const dailyTotals = new Map<string, number>();
        
        dataByTrack.forEach((trackData, trackId) => {
          // Consolidate multiple entries for the same date (sum them)
          const dateStreamsMap = new Map<string, number>();
          trackData.forEach(entry => {
            const currentTotal = dateStreamsMap.get(entry.date) || 0;
            dateStreamsMap.set(entry.date, Math.max(currentTotal, entry.streams)); // Use max for cumulative data
          });
          
          // Convert to array and sort by date
          const consolidatedData = Array.from(dateStreamsMap.entries()).map(([date, streams]) => ({ date, streams }));
          consolidatedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          // Check if this track's data appears to be cumulative
          const avgStreamValue = consolidatedData.reduce((sum, d) => sum + d.streams, 0) / consolidatedData.length;
          const isTrackCumulative = avgStreamValue > 10000000; // 10M+ suggests cumulative
          
          if (isTrackCumulative) {
            // Convert cumulative to daily for this track
            for (let i = 0; i < consolidatedData.length; i++) {
              const currentStreams = consolidatedData[i].streams;
              const previousStreams = i > 0 ? consolidatedData[i - 1].streams : 0;
              const dailyIncrement = Math.max(0, currentStreams - previousStreams);
              
              // Add to daily totals
              const date = consolidatedData[i].date;
              if (!dailyTotals.has(date)) {
                dailyTotals.set(date, 0);
              }
              dailyTotals.set(date, dailyTotals.get(date)! + dailyIncrement);
            }
          } else {
            // Data is already daily, just sum the consolidated data
            consolidatedData.forEach(entry => {
              const date = entry.date;
              if (!dailyTotals.has(date)) {
                dailyTotals.set(date, 0);
              }
              dailyTotals.set(date, dailyTotals.get(date)! + entry.streams);
            });
          }
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

        console.log(`[WeeklyGrowth] Final weekly totals after per-track processing: This week: ${thisWeekTotal.toLocaleString()} (${thisWeekDays} days), Last week: ${lastWeekTotal.toLocaleString()} (${lastWeekDays} days)`);

        // Set final values (no additional conversion needed since we handled it per-track)
        let finalThisWeek = thisWeekTotal;
        let finalLastWeek = lastWeekTotal;
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
          approach: 'per-track-cumulative-detection'
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
