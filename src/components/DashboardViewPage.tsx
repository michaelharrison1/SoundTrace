
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, TrackScanLog, AcrCloudMatch, SpotifyFollowerResult, FollowerSnapshot } from '../types';
import PreviousScans from './PreviousScans';
import ReachAnalyzer from './common/ReachAnalyzer';
import ProgressBar from './common/ProgressBar';
// Removed useLocalStorage import
import { analyticsService } from '../services/analyticsService'; // Import analyticsService

interface DashboardViewPageProps {
  user: User;
  previousScans: TrackScanLog[];
  onDeleteScan: (logId: string) => void;
  onClearAllScans: () => void;
}

const DashboardViewPage: React.FC<DashboardViewPageProps> = ({ user, previousScans, onDeleteScan, onClearAllScans }) => {
  const containerStyles = "p-4 win95-border-outset bg-[#C0C0C0] text-center";

  const [totalFollowers, setTotalFollowers] = useState<number | null | undefined>(undefined);
  const [followerResults, setFollowerResults] = useState<Map<string, SpotifyFollowerResult>>(new Map());
  const [followerFetchError, setFollowerFetchError] = useState<string | null>(null);
  const [isFollowerLoading, setIsFollowerLoading] = useState<boolean>(false);
  const [historicalFollowerData, setHistoricalFollowerData] = useState<FollowerSnapshot[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(true);

  const uniqueArtistIds = useMemo(() => {
    const ids = new Set<string>();
    previousScans.forEach(log => {
      if (log.status === 'matches_found' || log.status === 'partially_completed') {
        log.matches.forEach((match: AcrCloudMatch) => {
          if (match.spotifyArtistId) {
            ids.add(match.spotifyArtistId);
          }
        });
      }
    });
    return Array.from(ids);
  }, [previousScans]);

  // Fetch full history on mount or when user changes
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
        if (isMounted) {
          // Optionally set an error state for history fetching
        }
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
      // Save 0 followers for today if no artists
      if (user) { // Ensure user is available before trying to save
          analyticsService.saveFollowerSnapshot(0)
            .then(savedSnapshot => {
                 setHistoricalFollowerData(prevHistory => {
                    const newHistory = [...prevHistory];
                    const entryIndex = newHistory.findIndex(entry => entry.date === savedSnapshot.date);
                    if (entryIndex > -1) {
                        if (newHistory[entryIndex].cumulativeFollowers !== savedSnapshot.cumulativeFollowers) {
                            newHistory[entryIndex] = savedSnapshot;
                        } else { return prevHistory; }
                    } else {
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

      const newFollowerResults = new Map<string, SpotifyFollowerResult>(followerResults);
      let sum = 0; let errorsEncountered = 0; let successfulFetches = 0;

      settledResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            const resValue = result.value;
            if (resValue.status === 'cancelled') return;
            newFollowerResults.set(resValue.artistId, resValue);
            if (resValue.status === 'success' && typeof resValue.followers === 'number') {
                sum += resValue.followers; successfulFetches++;
            } else if (resValue.status === 'error') errorsEncountered++;
        } else if (result.status === 'rejected') {
            const artistsWithLoading = Array.from(newFollowerResults.values()).filter(r => r.status === 'loading');
            if (artistsWithLoading.length > 0) newFollowerResults.set(artistsWithLoading[0].artistId, { status: 'error', artistId: artistsWithLoading[0].artistId, reason: 'Network or promise error' });
            errorsEncountered++;
        }
      });

      if (isMounted) {
        setFollowerResults(newFollowerResults);
        setTotalFollowers(sum);

        if (typeof sum === 'number' && !isNaN(sum) && user) { // Check user available for saving
          analyticsService.saveFollowerSnapshot(sum)
            .then(savedSnapshot => {
                // Optimistically update local history state
                setHistoricalFollowerData(prevHistory => {
                    const newHistory = [...prevHistory];
                    const entryIndex = newHistory.findIndex(entry => entry.date === savedSnapshot.date);
                    if (entryIndex > -1) { // Entry for today exists
                        if (newHistory[entryIndex].cumulativeFollowers !== savedSnapshot.cumulativeFollowers) {
                           newHistory[entryIndex] = savedSnapshot; // Update if different
                        } else { return prevHistory; } // No change needed
                    } else { // No entry for today, add new
                        newHistory.push(savedSnapshot);
                    }
                    return newHistory.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                });
            })
            .catch(err => console.error("Failed to save follower snapshot:", err));
        }

        if (errorsEncountered > 0 && successfulFetches === 0 && uniqueArtistIds.length > 0) setFollowerFetchError("Could not load artist data.");
        else if (errorsEncountered > 0) setFollowerFetchError("Could not load data for some artists.");
        else setFollowerFetchError(null);
        setIsFollowerLoading(false);
      }
    };

    fetchAllFollowers();
    return () => { isMounted = false; };
  }, [uniqueArtistIds, user]); // Removed setHistoricalFollowerData as it's managed via analyticsService now

  const isLoadingOverall = isFollowerLoading || isHistoryLoading;

  const handleDeleteFollowerHistory = async () => {
    if (window.confirm("Are you sure you want to delete all your follower history? This action cannot be undone.")) {
        setIsHistoryLoading(true); // Indicate loading during deletion
        try {
            await analyticsService.deleteFollowerHistory();
            setHistoricalFollowerData([]); // Clear local state immediately
            // If totalFollowers relies on history, you might need to re-evaluate or set it to 0/null
            // For now, just clearing history display.
            alert("Follower history deleted successfully.");
        } catch (error: any) {
            console.error("Failed to delete follower history:", error);
            alert(`Error deleting history: ${error.message}`);
        } finally {
            setIsHistoryLoading(false);
        }
    }
  };

  if (previousScans.length === 0 && !isLoadingOverall) {
    return (
      <div className={containerStyles}>
        <span className="text-4xl text-gray-500" aria-hidden="true">♫</span>
        <h2 className="text-lg font-normal text-black mt-1">No Scan History Yet</h2>
        <p className="text-gray-700 mt-0.5 text-sm">Processed tracks and their matches will appear here.</p>
        <p className="text-gray-700 mt-0.5 text-sm">Go to "Scan Tracks" to start.</p>
      </div>
    );
  }

  if (isLoadingOverall && historicalFollowerData.length === 0 && previousScans.length > 0) {
     return (
      <div className="p-4 win95-border-outset bg-[#C0C0C0] text-center">
        <ProgressBar text="Loading dashboard data..." />
      </div>
    );
  }


  return (
    <div>
      <ReachAnalyzer
        totalFollowers={totalFollowers}
        isLoading={isLoadingOverall} // Pass combined loading state
        error={followerFetchError}
        scanLogs={previousScans}
        followerResults={followerResults}
        historicalFollowerData={historicalFollowerData}
        onDeleteFollowerHistory={handleDeleteFollowerHistory}
      />
      <PreviousScans
        scanLogs={previousScans}
        followerResults={followerResults}
        onDeleteScan={onDeleteScan}
        onClearAllScans={onClearAllScans}
      />
    </div>
  );
};

export default DashboardViewPage;
