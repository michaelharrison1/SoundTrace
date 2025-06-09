
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import ProgressBar from './ProgressBar'; // For loading state inside the content area
import { TrackScanLog, AcrCloudMatch } from '../../types';
import { SpotifyFollowerResult } from '../DashboardViewPage';
import ArtistFollowers from './ArtistFollowers'; // Re-use for consistency

interface FollowerReachMonitorProps {
  totalFollowers: number | null | undefined;
  isLoading: boolean; // For total followers calculation
  error?: string | null; // For total followers calculation
  scanLogs: TrackScanLog[];
  followerResults: Map<string, SpotifyFollowerResult>;
}

const MAX_BAR_SLOTS = 30;
const ACTIVE_BAR_COLOR = '#34D399';
const CHART_BACKGROUND_COLOR = '#262626';
const GRID_COLOR = 'rgba(128, 128, 128, 0.2)';
const LINE_ANIMATION_DURATION_MS = 3750;

type MonitorTab = 'reach' | 'artistStats' | 'beatStats'; // Updated tab names
type ArtistSortableColumn = 'artistName' | 'matchedTracksCount' | 'spotifyFollowers' | 'mostRecentMatchDate' | 'spotifyPopularity';
type BeatSortableColumn = 'beatName' | 'totalMatches';
type SortDirection = 'asc' | 'desc';

interface ArtistLeaderboardEntry {
  artistName: string;
  matchedTracksCount: number;
  spotifyArtistId?: string;
  spotifyFollowers: number | null | undefined;
  isFollowersLoading: boolean;
  followersError?: string;
  followerBarPercent: number;
  mostRecentMatchDate: string | null;
  spotifyPopularity: number | null | undefined;
  genres: string[] | undefined;
  key: string;
}

interface BeatStatsEntry {
  beatName: string;
  totalMatches: number;
  matchedSongs: AcrCloudMatch[]; // All matches for this beat
  key: string;
}

const FakeWindowIcon: React.FC = () => (
  <div className="w-4 h-4 bg-gray-300 border border-t-white border-l-white border-r-gray-500 border-b-gray-500 inline-flex items-center justify-center mr-1 align-middle">
    <div className="w-[7px] h-[7px] bg-[#000080]"></div>
  </div>
);

interface BarConfig {
  barUnit: number;
  numberOfBarsToActivate: number;
  unitLabel: string;
}

const calculateBarConfig = (followers: number | null | undefined): BarConfig => {
  let barUnit = 1000;
  let unitLabel = '1K';

  if (typeof followers !== 'number' || followers === null || followers <= 0) {
    return { barUnit: 0, numberOfBarsToActivate: 0, unitLabel: '' };
  }

  if (followers < 10000) {
    barUnit = 1000;
    unitLabel = '1K';
  } else if (followers < 100000) {
    barUnit = 10000;
    unitLabel = '10K';
  } else if (followers < 1000000) {
    barUnit = 100000;
    unitLabel = '100K';
  } else {
    barUnit = 1000000;
    unitLabel = '1M';
  }

  const calculatedBars = Math.ceil(followers / barUnit);
  const numberOfBarsToActivate = Math.max(1, calculatedBars);

  return { barUnit, numberOfBarsToActivate, unitLabel };
};

const PopularityBar: React.FC<{ score: number | null | undefined }> = ({ score }) => {
  if (typeof score !== 'number' || score === null) return <span className="text-xs text-gray-500">-</span>;
  const percent = score; // score is 0-100
  let barColor = 'bg-green-500';
  if (score < 40) barColor = 'bg-red-500';
  else if (score < 70) barColor = 'bg-yellow-500';

  return (
    <div className="w-10 h-2.5 bg-gray-300 win95-border-inset relative inline-block ml-1 align-middle" title={`Popularity: ${score}`}>
      <div className={`${barColor} h-full`} style={{ width: `${percent}%` }}></div>
    </div>
  );
};

const FollowerReachMonitor: React.FC<FollowerReachMonitorProps> = ({
  totalFollowers,
  isLoading: isLoadingTotalFollowers,
  error: totalFollowersError,
  scanLogs,
  followerResults
}) => {
  const [activeMonitorTab, setActiveMonitorTab] = useState<MonitorTab>('reach');

  // States for "Total Reach" tab
  const [lineProgress, setLineProgress] = useState(0);
  const [reachBarConfig, setReachBarConfig] = useState<BarConfig>(calculateBarConfig(totalFollowers));
  const animationFrameId = useRef<number | null>(null);
  const animationStartTime = useRef<number>(0);

  // States for "Artist Stats" tab
  const [artistSortColumn, setArtistSortColumn] = useState<ArtistSortableColumn>('matchedTracksCount');
  const [artistSortDirection, setArtistSortDirection] = useState<SortDirection>('desc');

  // States for "Beat Stats" tab
  const [beatSortColumn, setBeatSortColumn] = useState<BeatSortableColumn>('totalMatches');
  const [beatSortDirection, setBeatSortDirection] = useState<SortDirection>('desc');
  const [expandedBeat, setExpandedBeat] = useState<string | null>(null);


  useEffect(() => {
    setReachBarConfig(calculateBarConfig(totalFollowers));
  }, [totalFollowers]);

  const animateLineCallback = useCallback((timestamp: number) => {
    if (animationStartTime.current === 0) {
      animationStartTime.current = timestamp;
    }
    const elapsedTime = timestamp - animationStartTime.current;
    let newProgress = elapsedTime / LINE_ANIMATION_DURATION_MS;
    if (newProgress >= 1.0) {
      newProgress = 0;
      animationStartTime.current = timestamp;
    }
    setLineProgress(newProgress);
    animationFrameId.current = requestAnimationFrame(animateLineCallback);
  }, []);

  useEffect(() => {
    const shouldAnimate = activeMonitorTab === 'reach' && !isLoadingTotalFollowers && !totalFollowersError && (totalFollowers ?? 0) > 0;
    if (shouldAnimate) {
      if (!animationFrameId.current) {
        animationStartTime.current = performance.now() - (lineProgress * LINE_ANIMATION_DURATION_MS);
        animationFrameId.current = requestAnimationFrame(animateLineCallback);
      }
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      if (activeMonitorTab === 'reach' && (isLoadingTotalFollowers || totalFollowersError || (totalFollowers ?? 0) <= 0)) {
         setLineProgress(0);
      }
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [activeMonitorTab, isLoadingTotalFollowers, totalFollowersError, totalFollowers, animateLineCallback, lineProgress]);

  const formatFollowersDisplay = (count: number | null | undefined): string => {
    if (isLoadingTotalFollowers && typeof count === 'undefined') return "Loading...";
    if (typeof count === 'undefined') return "Loading...";
    if (count === null) return "N/A";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };
  const displayTotalReachValue = formatFollowersDisplay(totalFollowers);

  // --- Artist Stats Tab Logic ---
  const aggregatedArtistData = useMemo(() => {
    const artistMap = new Map<string, { name: string, id?: string, matches: AcrCloudMatch[], scanDates: string[] }>();

    scanLogs.forEach(log => {
      log.matches.forEach(match => {
        const artistKey = match.spotifyArtistId || match.artist;
        if (!artistMap.has(artistKey)) {
          artistMap.set(artistKey, { name: match.artist, id: match.spotifyArtistId, matches: [], scanDates: [] });
        }
        const artistEntry = artistMap.get(artistKey)!;
        artistEntry.matches.push(match);
        artistEntry.scanDates.push(log.scanDate);
      });
    });

    const processedData: Omit<ArtistLeaderboardEntry, 'followerBarPercent' | 'key'>[] = [];
    artistMap.forEach((data) => {
      const followerInfo = data.id ? followerResults.get(data.id) : undefined;
      let followers: number | null | undefined = undefined;
      let isLoadingFollowers = false;
      let errorFollowers: string | undefined = undefined;
      let popularity: number | null | undefined = undefined;
      let genres: string[] | undefined = undefined;

      if (followerInfo) {
        if (followerInfo.status === 'success') {
          followers = followerInfo.followers;
          popularity = followerInfo.popularity;
          genres = followerInfo.genres;
        } else if (followerInfo.status === 'error') {
          followers = null; errorFollowers = followerInfo.reason;
        } else if (followerInfo.status === 'loading') {
          isLoadingFollowers = true;
        } else {
          followers = null; // cancelled or other
        }
      } else if (data.id) {
         isLoadingFollowers = true;
      }

      const mostRecentMatchDate = data.scanDates.length > 0
        ? new Date(Math.max(...data.scanDates.map(date => new Date(date).getTime()))).toLocaleDateString()
        : null;

      processedData.push({
        artistName: data.name,
        spotifyArtistId: data.id,
        matchedTracksCount: data.matches.length,
        spotifyFollowers: followers,
        isFollowersLoading: isLoadingFollowers,
        followersError: errorFollowers,
        mostRecentMatchDate,
        spotifyPopularity: popularity,
        genres,
      });
    });

    const maxFollowers = Math.max(0, ...processedData.map(a => a.spotifyFollowers ?? 0));

    return processedData.map((artist, index) => ({
      ...artist,
      key: artist.spotifyArtistId || `${artist.artistName}-${index}`,
      followerBarPercent: maxFollowers > 0 && typeof artist.spotifyFollowers === 'number' ? (artist.spotifyFollowers / maxFollowers) * 100 : 0,
    }));

  }, [scanLogs, followerResults]);

  const sortedArtistData = useMemo(() => {
    return [...aggregatedArtistData].sort((a, b) => {
      let valA: any, valB: any;
      switch (artistSortColumn) {
        case 'artistName':
          valA = a.artistName; valB = b.artistName;
          return artistSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'matchedTracksCount':
          valA = a.matchedTracksCount; valB = b.matchedTracksCount;
          break;
        case 'spotifyFollowers':
          valA = a.spotifyFollowers ?? -1; valB = b.spotifyFollowers ?? -1;
          break;
        case 'mostRecentMatchDate':
          valA = a.mostRecentMatchDate ? new Date(a.mostRecentMatchDate).getTime() : 0;
          valB = b.mostRecentMatchDate ? new Date(b.mostRecentMatchDate).getTime() : 0;
          break;
        case 'spotifyPopularity':
          valA = a.spotifyPopularity ?? -1; valB = b.spotifyPopularity ?? -1;
          break;
        default: return 0;
      }
      return artistSortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [aggregatedArtistData, artistSortColumn, artistSortDirection]);

  const handleArtistSort = (column: ArtistSortableColumn) => {
    if (artistSortColumn === column) {
      setArtistSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setArtistSortColumn(column);
      if (column === 'artistName') setArtistSortDirection('asc');
      else setArtistSortDirection('desc');
    }
  };

  const renderArtistSortArrow = (column: ArtistSortableColumn) => {
    if (artistSortColumn === column) {
      return artistSortDirection === 'asc' ? ' ▲' : ' ▼';
    }
    return '';
  };

  // --- Beat Stats Tab Logic ---
  const aggregatedBeatData = useMemo(() => {
    const beatMap = new Map<string, { matchedSongs: AcrCloudMatch[] }>();
    scanLogs.forEach(log => {
      if (!beatMap.has(log.originalFileName)) {
        beatMap.set(log.originalFileName, { matchedSongs: [] });
      }
      // Consolidate matches for the same original file from potentially multiple snippet results (if that was the logic)
      // Current structure: TrackScanLog already has consolidated matches for an originalFile.
      // So, we just sum up the number of *unique* song matches for this beat.
      const existingMatches = beatMap.get(log.originalFileName)!.matchedSongs;
      log.matches.forEach(newMatch => {
        if (!existingMatches.find(m => m.id === newMatch.id)) {
          existingMatches.push(newMatch);
        }
      });
    });

    return Array.from(beatMap.entries()).map(([beatName, data]) => ({
      beatName,
      totalMatches: data.matchedSongs.length,
      matchedSongs: data.matchedSongs.sort((a,b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()), // Sort matches by release date
      key: beatName,
    }));
  }, [scanLogs]);

  const sortedBeatData = useMemo(() => {
    return [...aggregatedBeatData].sort((a,b) => {
        let valA: any, valB: any;
        switch(beatSortColumn) {
            case 'beatName':
                valA = a.beatName; valB = b.beatName;
                return beatSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            case 'totalMatches':
                valA = a.totalMatches; valB = b.totalMatches;
                break;
            default: return 0;
        }
        return beatSortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [aggregatedBeatData, beatSortColumn, beatSortDirection]);

  const handleBeatSort = (column: BeatSortableColumn) => {
    if (beatSortColumn === column) {
      setBeatSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setBeatSortColumn(column);
      if (column === 'beatName') setBeatSortDirection('asc');
      else setBeatSortDirection('desc');
    }
  };

    const renderBeatSortArrow = (column: BeatSortableColumn) => {
    if (beatSortColumn === column) {
      return beatSortDirection === 'asc' ? ' ▲' : ' ▼';
    }
    return '';
  };

  const toggleExpandBeat = (beatName: string) => {
    setExpandedBeat(prev => prev === beatName ? null : beatName);
  };

  // --- Tab Rendering ---
  const renderTabContent = () => {
    if (activeMonitorTab === 'reach') {
      return ( /* ... Total Reach JSX remains the same ... */
        <>
          <h4 className="text-base font-semibold text-black mb-1 text-center">Total Estimated Spotify Reach</h4>
          {isLoadingTotalFollowers ? (
            <div className="flex flex-col items-center justify-center flex-grow py-4">
               <ProgressBar text="Calculating reach..." />
            </div>
          ) : totalFollowersError ? (
            <div className="text-center text-red-700 text-sm py-8 h-full flex items-center justify-center flex-grow">
              <p>Error: {totalFollowersError}</p>
            </div>
          ) : (
            <>
              <p className="text-3xl text-black font-bold my-3 text-center">{displayTotalReachValue}</p>
              <div
                className="performance-chart-area win95-border-inset p-1 flex items-end space-x-px overflow-hidden relative h-32"
                style={{
                  backgroundColor: CHART_BACKGROUND_COLOR,
                  backgroundImage: `
                    linear-gradient(to right, ${GRID_COLOR} 1px, transparent 1px),
                    linear-gradient(to bottom, ${GRID_COLOR} 1px, transparent 1px)
                  `,
                  backgroundSize: "10px 10px"
                }}
                role="img"
                aria-label={`Performance chart. Current total follower reach: ${displayTotalReachValue}. ${reachBarConfig.unitLabel ? 'Each bar segment represents ' + reachBarConfig.unitLabel + ' followers.' : ''}`}
              >
                <div className="flex w-full h-full items-end">
                  {[...Array(MAX_BAR_SLOTS)].map((_, i) => {
                    const barIsActive = lineProgress * MAX_BAR_SLOTS > i && i < reachBarConfig.numberOfBarsToActivate && (totalFollowers ?? 0) > 0;
                    const barHeight = barIsActive ? '100%' : '0%';
                    return (
                      <div key={i} className="chart-bar-slot flex-1 h-full mx-px relative flex items-end justify-center">
                        <div className="absolute bottom-0 left-0 right-0 h-full win95-border-inset bg-neutral-700 opacity-50"></div>
                        {(totalFollowers ?? 0) > 0 && (
                          <div
                            className="active-bar-fill relative win95-border-outset"
                            style={{
                              backgroundColor: barIsActive ? ACTIVE_BAR_COLOR : 'transparent',
                              height: barHeight, width: '80%', transition: 'height 0.1s linear',
                              boxShadow: barIsActive ? `0 0 3px ${ACTIVE_BAR_COLOR}, 0 0 6px ${ACTIVE_BAR_COLOR}` : 'none',
                            }}
                          ></div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {(totalFollowers ?? 0) > 0 && !isLoadingTotalFollowers && !totalFollowersError && (
                    <div
                      className="progress-line absolute top-0 bottom-0"
                      style={{
                        left: `${lineProgress * 100}%`, width: '3px',
                        boxShadow: `0 0 5px 1px ${ACTIVE_BAR_COLOR}, 0 0 10px 2px ${ACTIVE_BAR_COLOR}`,
                        transform: 'translateX(-1.5px)', backgroundColor: ACTIVE_BAR_COLOR,
                      }}
                      aria-hidden="true"
                    ></div>
                )}
              </div>
              <p className="text-xs text-gray-700 mt-2 text-center">
                {reachBarConfig.unitLabel ? `Bars represent: ${reachBarConfig.unitLabel} followers.` : "No follower data to display."}
                {' '}Max visual bars: {MAX_BAR_SLOTS}.
              </p>
            </>
          )}
        </>
      );
    } else if (activeMonitorTab === 'artistStats') {
      if (isLoadingTotalFollowers && aggregatedArtistData.length === 0) {
         return (<div className="flex flex-col items-center justify-center flex-grow py-4"><ProgressBar text="Loading artist data..." /></div>);
      }
      if (aggregatedArtistData.length === 0) {
        return <p className="text-center text-gray-700 py-8">No artist data available from current scans.</p>;
      }
      return (
        <div className="artist-leaderboard flex flex-col h-full">
          <h4 className="text-base font-semibold text-black mb-2 text-center">Artist Statistics</h4>
          <div className="overflow-auto win95-border-inset bg-white flex-grow p-0.5">
            <table className="min-w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '25%' }} /> {/* Artist Name */}
                <col style={{ width: '12%' }} /> {/* Matched Tracks */}
                <col style={{ width: '20%' }} /> {/* Followers + Bar */}
                <col style={{ width: '15%' }} /> {/* Popularity + Bar */}
                <col style={{ width: '13%' }} /> {/* Recent Match */}
                <col style={{ width: '15%' }} /> {/* Genres */}
              </colgroup>
              <thead className="bg-[#C0C0C0] sticky top-0 z-10">
                <tr>
                  <HeaderCell onClick={() => handleArtistSort('artistName')} sortArrow={renderArtistSortArrow('artistName')}>Artist</HeaderCell>
                  <HeaderCell onClick={() => handleArtistSort('matchedTracksCount')} sortArrow={renderArtistSortArrow('matchedTracksCount')} className="text-center">Matches</HeaderCell>
                  <HeaderCell onClick={() => handleArtistSort('spotifyFollowers')} sortArrow={renderArtistSortArrow('spotifyFollowers')} className="text-center">Followers</HeaderCell>
                  <HeaderCell onClick={() => handleArtistSort('spotifyPopularity')} sortArrow={renderArtistSortArrow('spotifyPopularity')} className="text-center">Popularity</HeaderCell>
                  <HeaderCell onClick={() => handleArtistSort('mostRecentMatchDate')} sortArrow={renderArtistSortArrow('mostRecentMatchDate')} className="text-center">Recent Match</HeaderCell>
                  <HeaderCell className="text-center">Genres</HeaderCell>
                </tr>
              </thead>
              <tbody className="bg-white">
                {sortedArtistData.map((artist) => (
                  <tr key={artist.key} className="hover:bg-blue-200 hover:text-black group border-b border-gray-300 last:border-b-0">
                    <DataCell title={artist.artistName}>{artist.artistName}</DataCell>
                    <DataCell className="text-center">{artist.matchedTracksCount}</DataCell>
                    <DataCell className="text-center">
                      <div className="flex items-center justify-center space-x-2 h-full">
                        <ArtistFollowers followers={artist.spotifyFollowers} isLoading={artist.isFollowersLoading} error={artist.followersError} />
                        <div className="w-12 h-2.5 bg-gray-300 win95-border-inset relative" title={`${artist.spotifyFollowers ?? 0} followers`}>
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-teal-500"
                            style={{
                              width: `${artist.followerBarPercent}%`,
                              boxShadow: artist.followerBarPercent > 0 ? '0.5px 0.5px 0px #404040' : 'none'
                            }}
                          ></div>
                        </div>
                      </div>
                    </DataCell>
                    <DataCell className="text-center">
                        {typeof artist.spotifyPopularity === 'number' ? artist.spotifyPopularity : (artist.isFollowersLoading && !artist.followersError ? '...' : '-')}
                        <PopularityBar score={artist.spotifyPopularity} />
                    </DataCell>
                    <DataCell className="text-center">{artist.mostRecentMatchDate || '-'}</DataCell>
                    <DataCell className="text-center">
                      <div className="flex flex-wrap justify-center items-center gap-0.5">
                        {(artist.genres && artist.genres.length > 0) ? artist.genres.slice(0,3).map(genre => (
                          <span key={genre} className="text-xs px-1 py-0 bg-gray-200 group-hover:bg-gray-300 win95-border-inset text-gray-700 group-hover:text-black whitespace-nowrap">
                            {genre}
                          </span>
                        )) : (artist.isFollowersLoading && !artist.followersError ? '...' : <span className="text-xs">-</span>)}
                      </div>
                    </DataCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else if (activeMonitorTab === 'beatStats') {
      if (sortedBeatData.length === 0) {
        return <p className="text-center text-gray-700 py-8">No beats have been scanned yet.</p>;
      }
      return (
        <div className="beat-stats flex flex-col h-full">
          <h4 className="text-base font-semibold text-black mb-2 text-center">Beat Statistics</h4>
          <div className="overflow-auto win95-border-inset bg-white flex-grow p-0.5">
            <table className="min-w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '70%' }} /> {/* Beat Name */}
                <col style={{ width: '30%' }} /> {/* Total Matches */}
              </colgroup>
              <thead className="bg-[#C0C0C0] sticky top-0 z-10">
                <tr>
                  <HeaderCell onClick={() => handleBeatSort('beatName')} sortArrow={renderBeatSortArrow('beatName')}>Beat Name (Your Upload)</HeaderCell>
                  <HeaderCell onClick={() => handleBeatSort('totalMatches')} sortArrow={renderBeatSortArrow('totalMatches')} className="text-center">Total Unique Song Matches</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {sortedBeatData.map((beat) => (
                  <React.Fragment key={beat.key}>
                    <tr
                      className="hover:bg-blue-200 hover:text-black group border-b border-gray-300 last:border-b-0 cursor-pointer"
                      onClick={() => toggleExpandBeat(beat.beatName)}
                      title={`Click to see matches for ${beat.beatName}`}
                    >
                      <DataCell>{expandedBeat === beat.beatName ? '▼' : '►'} {beat.beatName}</DataCell>
                      <DataCell className="text-center">{beat.totalMatches}</DataCell>
                    </tr>
                    {expandedBeat === beat.beatName && beat.matchedSongs.length > 0 && (
                      <tr className="bg-gray-50 group-hover:bg-blue-100">
                        <td colSpan={2} className="p-0">
                          <div className="p-2 m-1 win95-border-inset bg-white">
                            <h5 className="text-xs font-semibold text-black mb-1">Matches for "{beat.beatName}":</h5>
                            <div className="max-h-32 overflow-y-auto">
                              <table className="min-w-full text-xs">
                                <thead className="bg-gray-200">
                                  <tr>
                                    <th className="px-1 py-0.5 text-left font-normal text-black">Song Title</th>
                                    <th className="px-1 py-0.5 text-left font-normal text-black">Artist</th>
                                    <th className="px-1 py-0.5 text-center font-normal text-black">Confidence</th>
                                    <th className="px-1 py-0.5 text-left font-normal text-black">Release</th>
                                    <th className="px-1 py-0.5 text-left font-normal text-black">Links</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {beat.matchedSongs.map(match => (
                                    <tr key={match.id} className="border-b border-gray-200 last:border-b-0">
                                      <td className="px-1 py-0.5 text-gray-700 truncate" title={match.title}>{match.title}</td>
                                      <td className="px-1 py-0.5 text-gray-700 truncate" title={match.artist}>{match.artist}</td>
                                      <td className="px-1 py-0.5 text-gray-700 text-center">{match.matchConfidence}%</td>
                                      <td className="px-1 py-0.5 text-gray-700">{match.releaseDate}</td>
                                      <td className="px-1 py-0.5">
                                        {match.platformLinks?.spotify && <a href={match.platformLinks.spotify} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mr-1">SP</a>}
                                        {match.platformLinks?.youtube && <a href={match.platformLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">YT</a>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                     {expandedBeat === beat.beatName && beat.matchedSongs.length === 0 && (
                        <tr className="bg-gray-50 group-hover:bg-blue-100">
                            <td colSpan={2} className="p-0">
                                <div className="p-2 m-1 win95-border-inset bg-white text-center text-xs text-gray-600">
                                    No specific song matches found for this beat in the logs.
                                </div>
                            </td>
                        </tr>
                     )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    return null;
  };

  const HeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableHeaderCellElement> & {sortArrow?: string, width?: string}> = ({ children, sortArrow, width, className, ...props }) => (
    <th
        scope="col"
        className={`px-2 py-1 text-left font-normal text-black win95-border-outset border-b-2 border-r-2 border-b-[#808080] border-r-[#808080] cursor-pointer select-none whitespace-nowrap ${className || ''}`}
        style={{width: width}}
        {...props}
    >
        {children}{sortArrow && <span className="ml-1">{sortArrow}</span>}
    </th>
  );

  const DataCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ children, className, ...props }) => (
    <td className={`px-2 py-1.5 text-gray-800 group-hover:text-black truncate whitespace-nowrap ${className || ''}`} {...props}>
      {children}
    </td>
  );


  return (
    <div className="win95-border-outset bg-[#C0C0C0] mb-4 text-black">
      <div className="title-bar flex items-center justify-between bg-[#000080] text-white px-1 py-0.5 h-6 select-none">
        <div className="flex items-center">
          <FakeWindowIcon />
          <span className="font-bold text-sm">Follower Reach Monitor</span>
        </div>
        <div className="flex space-x-0.5">
          <button className="win95-button-sm bg-[#C0C0C0] text-black font-mono w-4 h-4 leading-none text-xs" aria-label="Minimize">_</button>
          <button className="win95-button-sm bg-[#C0C0C0] text-black font-mono w-4 h-4 leading-none text-xs flex items-center justify-center" aria-label="Maximize"><div className="w-2 h-2 border border-black"></div></button>
          <button className="win95-button-sm bg-[#C0C0C0] text-black font-bold font-mono w-4 h-4 leading-none text-xs" aria-label="Close">X</button>
        </div>
      </div>
      <div className="menu-bar flex space-x-2 px-1 py-0.5 border-b border-t-white border-b-[#808080] select-none">
        <span className="text-sm hover:bg-black hover:text-white px-1 cursor-default"><u>F</u>ile</span>
        <span className="text-sm hover:bg-black hover:text-white px-1 cursor-default"><u>E</u>dit</span>
        <span className="text-sm hover:bg-black hover:text-white px-1 cursor-default"><u>V</u>iew</span>
        <span className="text-sm hover:bg-black hover:text-white px-1 cursor-default"><u>H</u>elp</span>
      </div>
      <div className="tabs-container flex pl-1 pt-1 bg-[#C0C0C0] select-none">
        <div
          className={`tab px-3 py-1 text-sm cursor-default ${activeMonitorTab === 'reach' ? 'selected win95-border-outset border-b-[#C0C0C0] relative -mb-px z-10' : 'win95-border-outset border-t-gray-400 border-l-gray-400 text-gray-600 opacity-75 ml-0.5'}`}
          onClick={() => setActiveMonitorTab('reach')}
        >
          Total Reach
        </div>
        <div
          className={`tab px-3 py-1 text-sm cursor-default ${activeMonitorTab === 'artistStats' ? 'selected win95-border-outset border-b-[#C0C0C0] relative -mb-px z-10' : 'win95-border-outset border-t-gray-400 border-l-gray-400 text-gray-600 opacity-75 ml-0.5'}`}
          onClick={() => setActiveMonitorTab('artistStats')}
        >
          Artist Stats
        </div>
        <div
           className={`tab px-3 py-1 text-sm cursor-default ${activeMonitorTab === 'beatStats' ? 'selected win95-border-outset border-b-[#C0C0C0] relative -mb-px z-10' : 'win95-border-outset border-t-gray-400 border-l-gray-400 text-gray-600 opacity-75 ml-0.5'}`}
           onClick={() => setActiveMonitorTab('beatStats')}
        >
          Beat Stats
        </div>
      </div>
      <div className="tab-content-wrapper p-0.5 pt-0 bg-[#C0C0C0]">
        <div className="tab-content win95-border-inset bg-[#C0C0C0] p-3 min-h-[300px] flex flex-col"> {/* Increased min-h */}
          {renderTabContent()}
        </div>
      </div>
      <div className="status-bar flex justify-between items-center px-1 py-0 border-t-2 border-t-[#808080] bg-[#C0C0C0] h-5 text-xs select-none">
        <span className="win95-border-inset px-2 py-0 h-[18px] flex items-center">Ready.</span>
        <div className="flex space-x-0.5 h-[18px]">
           <div className="win95-border-inset w-16 px-1 flex items-center justify-center">
             <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1 H9 V9 H1Z" fill="#008000" stroke="#000000" strokeWidth="0.5"/></svg>
           </div>
           <div className="win95-border-inset w-12 px-1 flex items-center justify-center">
             {new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit'})}
           </div>
        </div>
      </div>
    </div>
  );
};
export default FollowerReachMonitor;
