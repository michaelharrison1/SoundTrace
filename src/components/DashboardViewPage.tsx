
import React, { useState, useEffect, useMemo } from 'react';
import { User, TrackScanLog, AcrCloudMatch } from '../types';
import PreviousScans from './PreviousScans';
import FollowerReachGraph from './common/FollowerReachGraph'; // This is FollowerReachMonitor

interface DashboardViewPageProps {
  user: User;
  previousScans: TrackScanLog[];
  onDeleteScan: (logId: string) => void;
  onClearAllScans: () => void;
}

export interface SpotifyFollowerSuccess {
  status: 'success';
  artistId: string;
  followers: number | undefined;
  popularity?: number; // Added optional popularity
  genres?: string[];   // Added optional genres
}

export interface SpotifyFollowerError {
  status: 'error';
  artistId: string;
  reason: string;
}

export interface SpotifyFollowerLoading {
    status: 'loading';
    artistId: string;
}

export interface SpotifyFollowerCancelled {
  status: 'cancelled';
  artistId: string;
}

export type SpotifyFollowerResult = SpotifyFollowerSuccess | SpotifyFollowerError | SpotifyFollowerLoading | SpotifyFollowerCancelled;


const DashboardViewPage: React.FC<DashboardViewPageProps> = ({ user, previousScans, onDeleteScan, onClearAllScans }) => {
  const containerStyles = "p-4 win95-border-outset bg-[#C0C0C0] text-center";

  const [totalFollowers, setTotalFollowers] = useState<number | null | undefined>(undefined);
  const [followerResults, setFollowerResults] = useState<Map<string, SpotifyFollowerResult>>(new Map());
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
      setFollowerResults(new Map());
      setFollowerFetchError(null);
      setIsFollowerLoading(false);
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
              console.warn(`Failed to fetch details for artist ${artistId}: ${response.status}`, errorBody.message || '');
              return { status: 'error', artistId, reason: errorBody.message || `Failed to fetch artist details (${response.status})` };
            }
            const data = await response.json();
            // Extract followers, popularity, and genres
            const followersData = typeof data.followers === 'number' ? data.followers : undefined;
            const popularityData = typeof data.popularity === 'number' ? data.popularity : undefined;
            const genresData = Array.isArray(data.genres) ? data.genres.filter((g: any) => typeof g === 'string') : undefined;

            return {
              status: 'success',
              artistId,
              followers: followersData,
              popularity: popularityData,
              genres: genresData
            };
          })
          .catch((err): SpotifyFollowerResult => {
            if (!isMounted) return { status: 'cancelled', artistId };
            console.warn(`Network error fetching details for artist ${artistId}:`, err);
            return { status: 'error', artistId, reason: err.message || 'Network error while fetching artist details' };
          })
      );

      const settledResults = await Promise.allSettled(followerPromises);

      if (!isMounted) return;

      const newFollowerResults = new Map<string, SpotifyFollowerResult>(followerResults);
      let sum = 0;
      let errorsEncountered = 0;
      let successfulFetches = 0;

      settledResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            const resValue = result.value;
            if (resValue.status === 'cancelled') return;

            newFollowerResults.set(resValue.artistId, resValue);

            if (resValue.status === 'success') {
                if (typeof resValue.followers === 'number') {
                    sum += resValue.followers;
                }
                successfulFetches++;
            } else if (resValue.status === 'error') {
                errorsEncountered++;
            }
        } else if (result.status === 'rejected') {
            console.error("A follower fetch promise was unexpectedly rejected:", result.reason);
            // Find the artistId for the rejected promise to update its status
            const rejectedPromiseIndex = followerPromises.findIndex(p =>
              (p as any) === (result as any)._promise // This is a bit hacky, relies on internal structure
            );
            if (rejectedPromiseIndex !== -1 && uniqueArtistIds[rejectedPromiseIndex]) {
                const artistId = uniqueArtistIds[rejectedPromiseIndex];
                newFollowerResults.set(artistId, { status: 'error', artistId, reason: 'Promise rejected unexpectedly' });
            }
            errorsEncountered++;
        }
      });

      if (isMounted) {
        setFollowerResults(newFollowerResults);
        setTotalFollowers(sum);

        if (errorsEncountered > 0 && successfulFetches === 0 && uniqueArtistIds.length > 0) {
            setFollowerFetchError("Could not load artist data for any artist.");
            setTotalFollowers(null);
        } else if (errorsEncountered > 0) {
             setFollowerFetchError("Could not load data for some artists. Total may be incomplete.");
        } else if (successfulFetches === 0 && uniqueArtistIds.length > 0 && errorsEncountered === 0) {
             // This case means successful calls but no countable followers (e.g., all artists had undefined followers)
            setFollowerFetchError(null);
        }
         else {
            setFollowerFetchError(null);
        }
        setIsFollowerLoading(false);
      }
    };

    fetchAllFollowers();
    return () => { isMounted = false; };
  }, [uniqueArtistIds]);


  if (previousScans.length === 0 && !isFollowerLoading) {
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
        scanLogs={previousScans}
        followerResults={followerResults}
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
