
import React, { useState, useEffect, useMemo } from 'react';
import { User, TrackScanLog, AcrCloudMatch } from '../types'; // Updated to TrackScanLog
import PreviousScans from './PreviousScans';
import FollowerReachGraph from './common/FollowerReachGraph.tsx'; // New import

interface DashboardViewPageProps {
  user: User;
  previousScans: TrackScanLog[]; // Expects TrackScanLog[]
  onDeleteScan: (logId: string) => void; // Expects logId from TrackScanLog
  onClearAllScans: () => void;
}

// Define explicit types for Spotify API call outcomes
interface SpotifyFollowerSuccess {
  status: 'success';
  artistId: string;
  followers: number | undefined; // Followers can be a number or undefined if not available
}

interface SpotifyFollowerError {
  status: 'error';
  artistId: string;
  reason: string;
}

interface SpotifyFollowerCancelled {
  status: 'cancelled';
}

type SpotifyFollowerResult = SpotifyFollowerSuccess | SpotifyFollowerError | SpotifyFollowerCancelled;


const DashboardViewPage: React.FC<DashboardViewPageProps> = ({ user, previousScans, onDeleteScan, onClearAllScans }) => {
  const containerStyles = "p-4 win95-border-outset bg-[#C0C0C0] text-center";

  const [totalFollowers, setTotalFollowers] = useState<number | null | undefined>(undefined);
  const [followerFetchError, setFollowerFetchError] = useState<string | null>(null);
  const [isFollowerLoading, setIsFollowerLoading] = useState<boolean>(false);

  const uniqueArtistIds = useMemo(() => {
    const ids = new Set<string>();
    previousScans.forEach(log => {
      if (log.status === 'matches_found' || log.status === 'partially_completed') {
        log.matches.forEach(match => {
          if (match.spotifyArtistId) {
            ids.add(match.spotifyArtistId);
          }
        });
      }
    });
    return Array.from(ids);
  }, [previousScans]);

  useEffect(() => {
    if (uniqueArtistIds.length === 0) {
      setTotalFollowers(0);
      setFollowerFetchError(null);
      setIsFollowerLoading(false);
      return;
    }

    let isMounted = true;
    const fetchAllFollowers = async () => {
      if (!isMounted) return;
      setIsFollowerLoading(true);
      setFollowerFetchError(null);
      let sum = 0;
      let errorsEncountered = 0;
      let successfulFetches = 0;

      const followerPromises: Promise<SpotifyFollowerResult>[] = uniqueArtistIds.map(artistId =>
        fetch(`/api/spotify-artist-details?artistId=${artistId}`)
          .then(async (response): Promise<SpotifyFollowerResult> => {
            if (!isMounted) return { status: 'cancelled' };
            if (!response.ok) {
              const errorBody = await response.json().catch(() => ({ message: `Status ${response.status}` }));
              console.warn(`Failed to fetch followers for artist ${artistId}: ${response.status}`, errorBody.message || '');
              return { status: 'error', artistId, reason: errorBody.message || `Status ${response.status}` };
            }
            const data = await response.json();
            // Ensure followers is a number or undefined
            const followersData = typeof data.followers === 'number' ? data.followers : undefined;
            return { status: 'success', artistId, followers: followersData };
          })
          .catch((err): SpotifyFollowerResult => {
            if (!isMounted) return { status: 'cancelled' };
            console.warn(`Network error fetching followers for artist ${artistId}:`, err);
            return { status: 'error', artistId, reason: err.message || 'Network error' };
          })
      );

      const results = await Promise.allSettled(followerPromises);

      if (!isMounted) return;

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            const resValue: SpotifyFollowerResult = result.value;

            if (resValue.status === 'success') {
                // resValue is SpotifyFollowerSuccess, resValue.followers is number | undefined
                if (typeof resValue.followers === 'number') {
                    sum += resValue.followers;
                    successfulFetches++;
                } else {
                    // Successfully fetched from API, but followers count wasn't a number (e.g. missing or null from Spotify)
                    console.warn(`Followers data undefined or not a number for artist ${resValue.artistId}`);
                    // Optionally count this as an error or a specific type of non-success.
                    // For now, let's treat it as if data wasn't available for this artist's sum.
                    // errorsEncountered++; // Or a different counter
                }
            } else if (resValue.status === 'error') {
                errorsEncountered++;
            }
            // 'cancelled' status is implicitly handled by not matching 'success' or 'error'
        } else if (result.status === 'rejected') {
            console.error("A follower fetch promise was unexpectedly rejected:", result.reason);
            errorsEncountered++;
        }
      });


      if (isMounted) {
        setTotalFollowers(sum);
        if (errorsEncountered > 0 && successfulFetches === 0 && uniqueArtistIds.length > 0) {
            setFollowerFetchError("Could not load follower data for any artist.");
            setTotalFollowers(null);
        } else if (errorsEncountered > 0) {
             setFollowerFetchError("Could not load data for some artists. Total may be incomplete.");
        } else if (successfulFetches === 0 && uniqueArtistIds.length > 0 && errorsEncountered === 0) {
            // This case means all fetches were successful but returned no follower numbers (e.g. all were undefined)
            setFollowerFetchError(null);
        } else {
            setFollowerFetchError(null);
        }
        setIsFollowerLoading(false);
      }
    };

    fetchAllFollowers();
    return () => { isMounted = false; };
  }, [uniqueArtistIds]);


  if (previousScans.length === 0) {
    return (
      <div className={containerStyles}>
        <span className="text-4xl text-gray-500" aria-hidden="true">♫</span>
        <h2 className="text-lg font-normal text-black mt-1">No Scan History Yet</h2>
        <p className="text-gray-700 mt-0.5 text-sm">Processed tracks and their matches will appear here.</p>
        <p className="text-gray-700 mt-0.5 text-sm">Go to "Scan Tracks" to start.</p>
      </div>
    );
  }

  return (
    <div>
      <FollowerReachGraph
        totalFollowers={totalFollowers}
        isLoading={isFollowerLoading}
        error={followerFetchError}
      />
      <PreviousScans
        scanLogs={previousScans}
        onDeleteScan={onDeleteScan}
        onClearAllScans={onClearAllScans}
      />
    </div>
  );
};

export default DashboardViewPage;
