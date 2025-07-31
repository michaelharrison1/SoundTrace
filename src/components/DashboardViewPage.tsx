
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getDashboardCache, refreshDashboardCache, DashboardCache } from '../services/dashboardCacheService';
import { useWin95Modal } from './common/Win95ModalProvider';
import { User, TrackScanLog, AcrCloudMatch, SpotifyFollowerResult, DailyAnalyticsSnapshot, TrackScanLogStatus, ScanJob } from '../types';
import PreviousScans from './PreviousScans';
import ReachAnalyzer from './common/ReachAnalyzer';
import ProgressBar from './common/ProgressBar';
import { analyticsService } from '../services/analyticsService';
import { scanLogService } from '../services/scanLogService';
import { spotifyService } from '../services/spotifyService';
import fireIcon from './icons/fire.png';


interface DashboardViewPageProps {
  user: User;
  previousScans: TrackScanLog[];
  jobs: ScanJob[]; // Added jobs prop
  onDeleteScan: (logId?: string) => void;
  onClearAllScans: () => void;
}

const DashboardViewPage: React.FC<DashboardViewPageProps> = ({ user, previousScans, jobs, onDeleteScan: refreshDataAfterSingleDelete, onClearAllScans: refreshDataAfterClearAll }) => {
  // Dashboard cache state
  const [dashboardCache, setDashboardCache] = useState<DashboardCache | null>(null);
  const [isCacheLoading, setIsCacheLoading] = useState(false);
  const [cacheError, setCacheError] = useState<string | null>(null);
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);

  // Fetch dashboard cache on mount
  useEffect(() => {
    let isMounted = true;
    const fetchCache = async () => {
      setIsCacheLoading(true);
      setCacheError(null);
      try {
        const cache = await getDashboardCache();
        if (isMounted) setDashboardCache(cache);
      } catch (err: any) {
        if (isMounted) setCacheError(err.message || 'Failed to load dashboard cache.');
      } finally {
        if (isMounted) setIsCacheLoading(false);
      }
    };
    fetchCache();
    return () => { isMounted = false; };
  }, [user]);

  // Manual refresh handler removed (refresh is now backend-driven, weekly)
  const containerStyles = "p-4 win95-border-outset bg-[#C0C0C0] text-center";

  const [totalFollowers, setTotalFollowers] = useState<number | null | undefined>(undefined);
  const [totalStreams, setTotalStreams] = useState<number | null | undefined>(undefined);
  const [followerResults, setFollowerResults] = useState<Map<string, SpotifyFollowerResult>>(new Map());
  const [followerFetchError, setFollowerFetchError] = useState<string | null>(null);
  const [isFollowerLoading, setIsFollowerLoading] = useState<boolean>(false);
  const [historicalAnalyticsData, setHistoricalAnalyticsData] = useState<DailyAnalyticsSnapshot[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const completedScans = useMemo(() => {
    const completedJobIds = new Set(
      jobs.filter(job => job.status === 'completed' || job.status === 'completed_with_errors').map(job => job.id)
    );
    return previousScans.filter(scan => completedJobIds.has(scan.scanJobId));
  }, [previousScans, jobs]);

  const uniqueArtistIds = useMemo(() => {
    const ids = new Set<string>();
    completedScans.forEach(log => { // Use completedScans
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
  }, [completedScans]);

  useEffect(() => {
    const newTotalStreams = completedScans.reduce((sum, log) => { // Use completedScans
      const relevantMatchStatuses: TrackScanLogStatus[] = ['completed_match_found', 'scanned_match_found', 'imported_spotify_track'];
      if (log.matches && relevantMatchStatuses.includes(log.status)) {
        return sum + log.matches.reduce((matchSum, match) => matchSum + (match.streamCount || 0), 0);
      }
      return sum;
    }, 0);
    setTotalStreams(newTotalStreams);
  }, [completedScans]);

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
    let isMounted = true;

    const fetchAllFollowers = async () => {
      if (!isMounted || isFollowerLoading) return; // Prevent re-entrant calls

      if (uniqueArtistIds.length === 0) {
        if(isMounted) {
          setTotalFollowers(0);
          setFollowerResults(new Map());
          setFollowerFetchError(null);
          setIsFollowerLoading(false);
        }
        return;
      }

      setIsFollowerLoading(true);
      setFollowerFetchError(null);
      const initialResults = new Map<string, SpotifyFollowerResult>();
      uniqueArtistIds.forEach(id => initialResults.set(id, {status: 'loading', artistId: id}));
      if(isMounted) setFollowerResults(initialResults);

      const followerPromises: Promise<SpotifyFollowerResult>[] = uniqueArtistIds.map(artistId =>
        spotifyService.getArtistDetails(artistId)
          .then((data): SpotifyFollowerResult => {
            if (!isMounted) return { status: 'cancelled', artistId };
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
        if (errorsEncountered > 0 && successfulFetches === 0 && uniqueArtistIds.length > 0) setFollowerFetchError("Could not load any artist data.");
        else if (errorsEncountered > 0) setFollowerFetchError("Could not load data for some artists. Total might be inaccurate.");
        else setFollowerFetchError(null);
        setIsFollowerLoading(false);
      }
    };

    if (user) { // Only fetch if user is present
        fetchAllFollowers();
    } else { // Clear follower data if no user
        setTotalFollowers(undefined);
        setFollowerResults(new Map());
        setFollowerFetchError(null);
        setIsFollowerLoading(false);
    }

    return () => { isMounted = false; };
  }, [uniqueArtistIds, user]); // Removed totalStreams dependency


  // Separate useEffect for saving analytics snapshot
  useEffect(() => {
    let isMounted = true;
    if (user && typeof totalFollowers === 'number' && typeof totalStreams === 'number' && !isFollowerLoading && !isHistoryLoading) {
        analyticsService.saveAnalyticsSnapshot(totalFollowers, totalStreams)
        .then(savedSnapshot => {
            if (isMounted) {
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
            }
        })
        .catch(err => console.error("Failed to save analytics snapshot:", err));
    }
    return () => { isMounted = false; };
  }, [user, totalFollowers, totalStreams, isFollowerLoading, isHistoryLoading]);


  const isLoadingOverall = isFollowerLoading || isHistoryLoading;

  const { confirm, alert } = useWin95Modal();
  const handleDeleteAnalyticsHistory = useCallback(async () => {
    const shouldDelete = await confirm({
      title: 'Delete Analytics History',
      message: 'Are you sure you want to delete all your analytics history (followers and streams)? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (!shouldDelete) return;
    setIsHistoryLoading(true);
    try {
      await analyticsService.deleteAnalyticsHistory();
      setHistoricalAnalyticsData([]);
      await alert({
        title: 'Analytics History Deleted',
        message: 'Analytics history deleted successfully.',
        confirmText: 'OK',
      });
    } catch (error: any) {
      console.error("Failed to delete analytics history:", error);
      await alert({
        title: 'Error',
        message: `Error deleting history: ${error.message}`,
        confirmText: 'OK',
      });
    } finally {
      setIsHistoryLoading(false);
    }
  }, [confirm, alert]);

  const handleActualDeleteScan = useCallback(async (logId: string) => {
    setIsDeleting(true);
    try {
      await scanLogService.deleteScanLog(logId);
      refreshDataAfterSingleDelete(logId);
      await alert({
        title: 'Scan Log Deleted',
        message: 'Scan log deleted successfully.',
        confirmText: 'OK',
      });
    } catch (error: any) {
      console.error("Error deleting scan log:", error);
      await alert({
        title: 'Error',
        message: `Failed to delete scan log: ${error.message}`,
        confirmText: 'OK',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [refreshDataAfterSingleDelete, alert]);

  const handleActualClearAllScans = useCallback(async () => {
    setIsDeleting(true);
    try {
      await scanLogService.clearAllScanLogs();
      refreshDataAfterClearAll();
      await alert({
        title: 'Scan Logs Cleared',
        message: 'All scan logs cleared successfully.',
        confirmText: 'OK',
      });
    } catch (error: any) {
      console.error("Error clearing all scan logs:", error);
      await alert({
        title: 'Error',
        message: `Failed to clear all scan logs: ${error.message}`,
        confirmText: 'OK',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [refreshDataAfterClearAll, alert]);


  if (completedScans.length === 0 && !isLoadingOverall) { // Use completedScans
    return (
      <div className={containerStyles}>
        <div className="flex flex-col items-center mb-4">
          {isCacheLoading ? (
            <div className="mb-2"><ProgressBar text="Loading dashboard cache..." /></div>
          ) : dashboardCache ? (
            <div className="text-xs text-gray-700 mb-1">
              <span>Dashboard data cached</span>
              {dashboardCache.lastRefreshed && (
                <>
                  {" | Last refreshed: "}
                  {new Date(dashboardCache.lastRefreshed).toLocaleString()}
                </>
              )}
            </div>
          ) : null}
          {cacheError && <div className="text-xs text-red-700 mb-1">{cacheError}</div>}
        </div>
        <img src={fireIcon} alt="Fire Icon" className="w-12 h-12 mx-auto" aria-hidden="true"/>
        <h2 className="text-lg font-normal text-black mt-1">No Completed Scan Data Yet</h2>
        <p className="text-gray-700 mt-0.5 text-sm">Processed tracks from completed jobs and their matches will
            appear here.</p>
        <p className="text-gray-700 mt-0.5 text-sm">Go to "New Scan Job" to start, then check "Job Console" for
            progress.</p>
      </div>
    );
  }

    if (isLoadingOverall && historicalAnalyticsData.length === 0 && completedScans.length > 0) { // Use completedScans
     return (
      <div className="p-4 win95-border-outset bg-[#C0C0C0] text-center">
        <ProgressBar text="Loading dashboard data..." />
        <p className="text-xs text-gray-700 text-center mt-1">This may take up to a minute.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#C0C0C0] p-1"> {/* Main container with gray background */}
      <div className="flex flex-col items-center mb-4">
        {isCacheLoading ? (
          <div className="mb-2"><ProgressBar text="Loading dashboard cache..." /></div>
        ) : dashboardCache ? (
          <div className="text-xs text-gray-700 mb-1">
            <span>Dashboard data cached</span>
            {dashboardCache.lastRefreshed && (
              <>
                {" | Last refreshed: "}
                {new Date(dashboardCache.lastRefreshed).toLocaleString()}
              </>
            )}
          </div>
        ) : null}
        {cacheError && <div className="text-xs text-red-700 mb-1">{cacheError}</div>}
      </div>
      <ReachAnalyzer
        totalFollowers={totalFollowers}
        totalStreams={totalStreams}
        isLoading={isLoadingOverall}
        error={followerFetchError}
        scanLogs={completedScans} // Pass completedScans
        followerResults={followerResults}
        historicalAnalyticsData={historicalAnalyticsData}
        onDeleteAnalyticsHistory={handleDeleteAnalyticsHistory}
        note="Dashboard data is refreshed automatically once per week."
      />
      <PreviousScans
        scanLogs={completedScans} // Pass completedScans
        followerResults={followerResults}
        onDeleteScan={handleActualDeleteScan}
        onClearAllScans={handleActualClearAllScans}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default React.memo(DashboardViewPage);