
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, TrackScanLog, AcrCloudMatch, SpotifyFollowerResult, DailyAnalyticsSnapshot, TrackScanLogStatus } from '../types'; // Updated import
import PreviousScans from './PreviousScans';
import ReachAnalyzer from './common/ReachAnalyzer';
import ProgressBar from './common/ProgressBar';
import { analyticsService } from '../services/analyticsService';
import { scanLogService } from '../services/scanLogService'; // Import scanLogService

interface DashboardViewPageProps {
  user: User;
  previousScans: TrackScanLog[];
  onDeleteScan: (logId?: string) => void; // Callback to refresh data after single delete (MainAppLayout's handleIndividualLogUpdate)
  onClearAllScans: () => void; // Callback to refresh data after clearing all (MainAppLayout's refreshAllData)
}

const DashboardViewPage: React.FC<DashboardViewPageProps> = ({ user, previousScans, onDeleteScan: refreshDataAfterSingleDelete, onClearAllScans: refreshDataAfterClearAll }) => {
  const containerStyles = "p-4 win95-border-outset bg-[#C0C0C0] text-center";

  const [totalFollowers, setTotalFollowers] = useState<number | null | undefined>(undefined);
  const [totalStreams, setTotalStreams] = useState<number | null | undefined>(undefined);
  const [followerResults, setFollowerResults] = useState<Map<string, SpotifyFollowerResult>>(new Map());
  const [followerFetchError, setFollowerFetchError] = useState<string | null>(null);
  const [isFollowerLoading, setIsFollowerLoading] = useState<boolean>(false);
  const [historicalAnalyticsData, setHistoricalAnalyticsData] = useState<DailyAnalyticsSnapshot[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false); // For delete operations

  const uniqueArtistIds = useMemo(() => {
    const ids = new Set<string>();
    previousScans.forEach(log => {
      const relevantMatchStatuses: TrackScanLogStatus[] = ['completed_match_found', 'scanned_match_found', 'imported_spotify_track'];
      if (log.matches && log.matches.length > 0 && relevantMatchStatuses.includes(log.status)) {
        log.matches.forEach((match: AcrCloudMatch) => {
          if (match.spotifyArtistId) {
            ids.add(match.spotifyArtistId);
          }
        });
      }
    });
    return Array.from(ids);
  }, [previousScans]);

  useEffect(() => {
    const newTotalStreams = previousScans.reduce((sum, log) => {
      const relevantMatchStatuses: TrackScanLogStatus[] = ['completed_match_found', 'scanned_match_found', 'imported_spotify_track'];
      if (log.matches && relevantMatchStatuses.includes(log.status)) {
        return sum + log.matches.reduce((matchSum, match) => matchSum + (match.streamCount || 0), 0);
      }
      return sum;
    }, 0);
    setTotalStreams(newTotalStreams);
  }, [previousScans]);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      if (!user || !isMounted) return;
      setIsHistoryLoading(true);
      try {
        const history = await analyticsService.getAnalyticsHistory();
        if (isMounted) {
          setHistoricalAnalyticsData(history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        }
      } catch (error: any) {
        console.error("Failed to fetch analytics history:", error);
      } finally {
        if (isMounted) {
          setIsHistoryLoading(false);
        }
      }
    };
    fetchHistory();
    return () => { isMounted = false; };
  }, [user]);

  useEffect(() => {
    if (uniqueArtistIds.length === 0 && typeof totalStreams === 'number') {
      setTotalFollowers(0);
      setFollowerResults(new Map());
      setFollowerFetchError(null);
      setIsFollowerLoading(false);
      if (user) {
          analyticsService.saveAnalyticsSnapshot(0, totalStreams)
            .then(savedSnapshot => {
                 setHistoricalAnalyticsData(prevHistory => {
                    const newHistory = [...prevHistory];
                    const entryIndex = newHistory.findIndex(entry => entry.date === savedSnapshot.date);
                    if (entryIndex > -1) {
                        if (newHistory[entryIndex].cumulativeFollowers !== savedSnapshot.cumulativeFollowers || newHistory[entryIndex].cumulativeStreams !== savedSnapshot.cumulativeStreams) {
                           newHistory[entryIndex] = savedSnapshot;
                        } else { return prevHistory; }
                    } else {
                        newHistory.push(savedSnapshot);
                    }
                    return newHistory.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                });
            })
            .catch(err => console.error("Failed to save zero follower/stream snapshot:", err));
      }
      return;
    }
    if (uniqueArtistIds.length === 0) return;

    let isMounted = true;
    const fetchAllFollowers = async () => {
      if (!isMounted) return;
      setIsFollowerLoading(true);
      setFollowerFetchError(null);
      const initialResults = new Map<string, SpotifyFollowerResult>();
      uniqueArtistIds.forEach(id => initialResults.set(id, {status: 'loading', artistId: id}));
      if(isMounted) setFollowerResults(initialResults);
      const followerPromises: Promise<SpotifyFollowerResult>[] = uniqueArtistIds.map(artistId =>
        fetch(`/api/spotify-artist-details?artistId=${artistId}`)
          .then(async (response): Promise<SpotifyFollowerResult> => {
            if (!isMounted) return { status: 'cancelled', artistId };
            if (!response.ok) {
              const errorBody = await response.json().catch(() => ({ message: `Status ${response.status}` }));
              return { status: 'error', artistId, reason: errorBody.message || `Failed to fetch artist details (${response.status})` };
            }
            const data = await response.json();
            return { status: 'success', artistId, followers: data.followers, popularity: data.popularity, genres: data.genres };
          })
          .catch((err): SpotifyFollowerResult => {
            if (!isMounted) return { status: 'cancelled', artistId };
            return { status: 'error', artistId, reason: err.message || 'Network error' };
          })
      );
      const settledResults = await Promise.allSettled(followerPromises);
      if (!isMounted) return;
      const newFollowerResults = new Map<string, SpotifyFollowerResult>();
      let sumFollowers = 0; let errorsEncountered = 0; let successfulFetches = 0;
      settledResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            const resValue = result.value;
            if (resValue.status === 'cancelled') return;
            newFollowerResults.set(resValue.artistId, resValue);
            if (resValue.status === 'success' && typeof resValue.followers === 'number') {
                sumFollowers += resValue.followers; successfulFetches++;
            } else if (resValue.status === 'error') errorsEncountered++;
        } else if (result.status === 'rejected') {
            errorsEncountered++;
        }
      });
      if (isMounted) {
        setFollowerResults(newFollowerResults);
        setTotalFollowers(sumFollowers);
        if (typeof sumFollowers === 'number' && !isNaN(sumFollowers) && typeof totalStreams === 'number' && !isNaN(totalStreams) && user) {
          analyticsService.saveAnalyticsSnapshot(sumFollowers, totalStreams)
            .then(savedSnapshot => {
                setHistoricalAnalyticsData(prevHistory => {
                    const newHistory = [...prevHistory];
                    const entryIndex = newHistory.findIndex(entry => entry.date === savedSnapshot.date);
                    if (entryIndex > -1) {
                         if (newHistory[entryIndex].cumulativeFollowers !== savedSnapshot.cumulativeFollowers || newHistory[entryIndex].cumulativeStreams !== savedSnapshot.cumulativeStreams) {
                           newHistory[entryIndex] = savedSnapshot;
                        } else { return prevHistory; }
                    } else {
                        newHistory.push(savedSnapshot);
                    }
                    return newHistory.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                });
            })
            .catch(err => console.error("Failed to save analytics snapshot:", err));
        }
        if (errorsEncountered > 0 && successfulFetches === 0 && uniqueArtistIds.length > 0) setFollowerFetchError("Could not load any artist data.");
        else if (errorsEncountered > 0) setFollowerFetchError("Could not load data for some artists. Total might be inaccurate.");
        else setFollowerFetchError(null);
        setIsFollowerLoading(false);
      }
    };
    if (typeof totalStreams === 'number') {
        fetchAllFollowers();
    }
    return () => { isMounted = false; };
  }, [uniqueArtistIds, user, totalStreams]);

  const isLoadingOverall = isFollowerLoading || isHistoryLoading;

  const handleDeleteAnalyticsHistory = useCallback(async () => {
    if (window.confirm("Are you sure you want to delete all your analytics history (followers and streams)? This action cannot be undone.")) {
        setIsHistoryLoading(true);
        try {
            await analyticsService.deleteAnalyticsHistory();
            setHistoricalAnalyticsData([]);
            alert("Analytics history deleted successfully.");
        } catch (error: any) {
            console.error("Failed to delete analytics history:", error);
            alert(`Error deleting history: ${error.message}`);
        } finally {
            setIsHistoryLoading(false);
        }
    }
  }, []);

  const handleActualDeleteScan = useCallback(async (logId: string) => {
    setIsDeleting(true);
    try {
      await scanLogService.deleteScanLog(logId);
      refreshDataAfterSingleDelete(logId); // Trigger refresh in parent
      alert('Scan log deleted successfully.');
    } catch (error: any) {
      console.error("Error deleting scan log:", error);
      alert(`Failed to delete scan log: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  }, [refreshDataAfterSingleDelete]);

  const handleActualClearAllScans = useCallback(async () => {
    setIsDeleting(true);
    try {
      await scanLogService.clearAllScanLogs();
      refreshDataAfterClearAll(); // Trigger refresh in parent
      alert('All scan logs cleared successfully.');
    } catch (error: any) {
      console.error("Error clearing all scan logs:", error);
      alert(`Failed to clear all scan logs: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  }, [refreshDataAfterClearAll]);


  if (previousScans.length === 0 && !isLoadingOverall) {
    return (
      <div className={containerStyles}>
        <span className="text-4xl text-gray-500" aria-hidden="true">♫</span>
        <h2 className="text-lg font-normal text-black mt-1">No Scan History Yet</h2>
        <p className="text-gray-700 mt-0.5 text-sm">Processed tracks and their matches will appear here.</p>
        <p className="text-gray-700 mt-0.5 text-sm">Go to "New Scan Job" to start.</p>
      </div>
    );
  }

  if (isLoadingOverall && historicalAnalyticsData.length === 0 && previousScans.length > 0) {
     return (
      <div className="p-4 win95-border-outset bg-[#C0C0C0] text-center">
        <ProgressBar text="Loading dashboard data..." />
        <p className="text-xs text-gray-700 text-center mt-1">This may take up to a minute.</p>
      </div>
    );
  }

  return (
    <div>
      <ReachAnalyzer
        totalFollowers={totalFollowers}
        totalStreams={totalStreams}
        isLoading={isLoadingOverall}
        error={followerFetchError}
        scanLogs={previousScans}
        followerResults={followerResults}
        historicalAnalyticsData={historicalAnalyticsData}
        onDeleteAnalyticsHistory={handleDeleteAnalyticsHistory}
      />
      <PreviousScans
        scanLogs={previousScans}
        followerResults={followerResults}
        onDeleteScan={handleActualDeleteScan}
        onClearAllScans={handleActualClearAllScans}
        isDeleting={isDeleting} // Pass deleting state
      />
    </div>
  );
};

export default React.memo(DashboardViewPage);
