
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, TrackScanLog, AcrCloudMatch, SpotifyFollowerResult, FollowerSnapshot, TrackScanLogStatus } from '../types';
import PreviousScans from './PreviousScans';
import ReachAnalyzer from './common/ReachAnalyzer';
import ProgressBar from './common/ProgressBar';
import { analyticsService } from '../services/analyticsService';

interface DashboardViewPageProps {
  user: User;
  previousScans: TrackScanLog[];
  onDeleteScan: (logId: string) => void; // This should trigger a refresh of logs and possibly jobs
  onClearAllScans: () => void; // This should trigger a refresh of logs and jobs
}

const DashboardViewPage: React.FC<DashboardViewPageProps> = ({ user, previousScans, onDeleteScan, onClearAllScans }) => {
  const containerStyles = "p-4 win95-border-outset bg-[#C0C0C0] text-center";

  const [totalFollowers, setTotalFollowers] = useState<number | null | undefined>(undefined);
  const [followerResults, setFollowerResults] = useState<Map<string, SpotifyFollowerResult>>(new Map());
  const [followerFetchError, setFollowerFetchError] = useState<string | null>(null);
  const [isFollowerLoading, setIsFollowerLoading] = useState<boolean>(false); // For fetching artist follower counts
  const [historicalFollowerData, setHistoricalFollowerData] = useState<FollowerSnapshot[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(true); // For fetching historical follower data

  const uniqueArtistIds = useMemo(() => {
    const ids = new Set<string>();
    previousScans.forEach(log => {
      // Check if matches array exists and has items. Specific statuses can refine this if needed.
      // Valid statuses implying matches might be 'completed_match_found', 'scanned_match_found', 'imported_spotify_track'
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
    let isMounted = true;
    const fetchHistory = async () => {
      if (!user || !isMounted) return;
      setIsHistoryLoading(true);
      try {
        const history = await analyticsService.getFollowerHistory();
        if (isMounted) {
          setHistoricalFollowerData(history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        }
      } catch (error: any) {
        console.error("Failed to fetch follower history:", error);
        // Optionally set an error state for history fetching
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
    if (uniqueArtistIds.length === 0) {
      setTotalFollowers(0);
      setFollowerResults(new Map());
      setFollowerFetchError(null);
      setIsFollowerLoading(false);
      if (user) { // Save a zero snapshot if user is present and no artists
          analyticsService.saveFollowerSnapshot(0)
            .then(savedSnapshot => {
                 setHistoricalFollowerData(prevHistory => {
                    const newHistory = [...prevHistory];
                    const entryIndex = newHistory.findIndex(entry => entry.date === savedSnapshot.date);
                    if (entryIndex > -1) { // Update if exists for today
                        if (newHistory[entryIndex].cumulativeFollowers !== savedSnapshot.cumulativeFollowers) {
                           newHistory[entryIndex] = savedSnapshot;
                        } else { return prevHistory; } // No change needed
                    } else { // Add new entry
                        newHistory.push(savedSnapshot);
                    }
                    return newHistory.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                });
            })
            .catch(err => console.error("Failed to save zero follower snapshot:", err));
      }
      return;
    }

    let isMounted = true;
    const fetchAllFollowers = async () => {
      if (!isMounted) return;
      setIsFollowerLoading(true);
      setFollowerFetchError(null);

      const initialResults = new Map<string, SpotifyFollowerResult>();
      uniqueArtistIds.forEach(id => initialResults.set(id, {status: 'loading', artistId: id}));
      if(isMounted) setFollowerResults(initialResults);

      const followerPromises: Promise<SpotifyFollowerResult>[] = uniqueArtistIds.map(artistId =>
        fetch(`/api/spotify-artist-details?artistId=${artistId}`) // This endpoint still lives in frontend/api
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

      const newFollowerResults = new Map<string, SpotifyFollowerResult>(/* Initialize from existing if needed, or start fresh */);
      let sum = 0; let errorsEncountered = 0; let successfulFetches = 0;

      settledResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            const resValue = result.value;
            if (resValue.status === 'cancelled') return; // Skip cancelled
            newFollowerResults.set(resValue.artistId, resValue); // Update with the new result
            if (resValue.status === 'success' && typeof resValue.followers === 'number') {
                sum += resValue.followers; successfulFetches++;
            } else if (resValue.status === 'error') errorsEncountered++;
        } else if (result.status === 'rejected') {
            // Try to find which artistId this rejection belongs to if possible or handle generally
            // For simplicity, we'll just count it as an error
            errorsEncountered++;
        }
      });
      
      if (isMounted) {
        setFollowerResults(newFollowerResults);
        setTotalFollowers(sum);

        // Save snapshot of current total followers for the day
        if (typeof sum === 'number' && !isNaN(sum) && user) {
          analyticsService.saveFollowerSnapshot(sum)
            .then(savedSnapshot => {
                // Update local historical data state to reflect the new/updated snapshot
                setHistoricalFollowerData(prevHistory => {
                    const newHistory = [...prevHistory];
                    const entryIndex = newHistory.findIndex(entry => entry.date === savedSnapshot.date);
                    if (entryIndex > -1) { // Update if exists for today
                        if (newHistory[entryIndex].cumulativeFollowers !== savedSnapshot.cumulativeFollowers) {
                           newHistory[entryIndex] = savedSnapshot;
                        } else { return prevHistory; } // No change needed
                    } else { // Add new entry
                        newHistory.push(savedSnapshot);
                    }
                    return newHistory.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                });
            })
            .catch(err => console.error("Failed to save follower snapshot:", err));
        }

        if (errorsEncountered > 0 && successfulFetches === 0 && uniqueArtistIds.length > 0) setFollowerFetchError("Could not load any artist data.");
        else if (errorsEncountered > 0) setFollowerFetchError("Could not load data for some artists. Total might be inaccurate.");
        else setFollowerFetchError(null);
        setIsFollowerLoading(false);
      }
    };

    fetchAllFollowers();
    return () => { isMounted = false; };
  }, [uniqueArtistIds, user]); // Dependency on user to re-trigger if user changes

  const isLoadingOverall = isFollowerLoading || isHistoryLoading;


  const handleDeleteFollowerHistory = useCallback(async () => {
    if (window.confirm("Are you sure you want to delete all your follower history? This action cannot be undone.")) {
        setIsHistoryLoading(true); // Visually indicate loading
        try {
            await analyticsService.deleteFollowerHistory();
            setHistoricalFollowerData([]); // Clear local state
            alert("Follower history deleted successfully.");
        } catch (error: any) {
            console.error("Failed to delete follower history:", error);
            alert(`Error deleting history: ${error.message}`);
        } finally {
            setIsHistoryLoading(false);
        }
    }
  }, []);

  // This check is to show a message if there are no scan logs AT ALL.
  // isLoadingOverall refers to the data fetching within this component.
  // If parent component (MainAppLayout) is still loading previousScans, this component might not render yet.
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

  // Loading state for the dashboard content if previousScans exist but internal data is loading.
  if (isLoadingOverall && historicalFollowerData.length === 0 && previousScans.length > 0) {
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
        isLoading={isLoadingOverall} // Pass combined loading state
        error={followerFetchError}
        scanLogs={previousScans} // Pass all scan logs for ReachAnalyzer to derive its data
        followerResults={followerResults} // Pass fetched follower results
        historicalFollowerData={historicalFollowerData} // Pass historical data
        onDeleteFollowerHistory={handleDeleteFollowerHistory}
      />
      <PreviousScans
        scanLogs={previousScans}
        followerResults={followerResults}
        onDeleteScan={onDeleteScan} // Propagate deletion handler
        onClearAllScans={onClearAllScans} // Propagate clear all handler
      />
    </div>
  );
};

export default React.memo(DashboardViewPage);
