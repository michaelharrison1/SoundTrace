import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import ProgressBar from './ProgressBar';
import { User, TrackScanLog, AcrCloudMatch, SpotifyFollowerResult, DailyAnalyticsSnapshot, AggregatedSongData, TrackScanLogStatus } from '../../types';
import ArtistFollowers from './ArtistFollowers';
import CollaborationRadarGraph from './CollaborationRadarGraph';
import Button from '../common/Button';
import TotalReachDisplay from './reachAnalyzer/TotalReachDisplay';
// TimeBasedAnalyticsGraph removed
import ArtistStatsTable from './reachAnalyzer/ArtistStatsTable';
import BeatStatsTable from './reachAnalyzer/BeatStatsTable';
import { MAX_BAR_SLOTS, LINE_ANIMATION_DURATION_MS, calculateBarConfig, formatFollowersDisplay } from './reachAnalyzer/reachAnalyzerUtils';
import SongStreamDetail from './reachAnalyzer/SongStreamDetail';
import EstimatedRevenueTab from './reachAnalyzer/EstimatedRevenueTab';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';


interface ReachAnalyzerProps {
  totalFollowers: number | null | undefined;
  totalStreams: number | null | undefined;
  isLoading: boolean;
  error?: string | null;
  scanLogs: TrackScanLog[]; // This will be the filtered list of scans from completed jobs
  followerResults: Map<string, SpotifyFollowerResult>;
  historicalAnalyticsData: DailyAnalyticsSnapshot[];
  onDeleteAnalyticsHistory: () => Promise<void>;
}

export type MonitorTab = 'reach' | 'streamHistory' | 'artistStats' | 'beatStats' | 'collaborationRadar' | 'estimatedRevenue';
export type ArtistSortableColumn = 'artistName' | 'matchedTracksCount' | 'spotifyFollowers' | 'totalArtistStreams' | 'mostRecentMatchDate' | 'spotifyPopularity';
export type BeatSortableColumn = 'beatName' | 'totalMatches';
export type SortDirection = 'asc' | 'desc';

export interface ArtistLeaderboardEntry {
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
  totalArtistStreams?: number;
  key: string;
}

export interface BeatStatsEntry {
  beatName: string;
  totalMatches: number;
  matchedSongs: AcrCloudMatch[];
  key: string;
}

const FakeWindowIcon: React.FC = React.memo(() => (
    <div className="w-4 h-4 bg-gray-300 border border-t-white border-l-white border-r-gray-500 border-b-gray-500 inline-flex items-center justify-center mr-1 align-middle">
      <div className="w-[7px] h-[7px] bg-[#000080]"></div>
    </div>
  ));
FakeWindowIcon.displayName = 'FakeWindowIcon';

const ReachAnalyzer: React.FC<ReachAnalyzerProps> = ({
  totalFollowers,
  totalStreams,
  isLoading: isLoadingOverall,
  error: overallError,
  scanLogs, // Will receive filtered scans
  followerResults,
  historicalAnalyticsData,
  onDeleteAnalyticsHistory
}) => {


  const [activeMonitorTab, setActiveMonitorTab] = useState<MonitorTab>('reach');
  // Classic colors: green for reach, blue for streams
  const reachBarColor = '#00C800'; // classic green
  const streamBarColor = '#1D9BF0'; // classic blue
  const activeBarAndLineColor = reachBarColor;

  // Use same bar config logic as streaming data for reach
  const [reachBarConfig, setReachBarConfig] = useState(() => {
    const minBarUnit = 1000000;
    const maxBars = 30;
    const barUnit = Math.max(minBarUnit, Math.ceil((totalFollowers ?? 1) / (maxBars - 2)));
    return {
      barUnit,
      numberOfBarsToActivate: Math.min(maxBars - 1, Math.floor((totalFollowers ?? 0) / barUnit)),
      unitLabel: barUnit >= 1000000 ? `${(barUnit / 1000000).toFixed(0)}M` : `${barUnit}`
    };
  });

  // Reach bar animation state and refs (single source of truth)
  const [reachLineProgress, setReachLineProgress] = React.useState(0);
  const [reachBarStates, setReachBarStates] = React.useState<Array<'active' | 'falling' | 'inactive'>>(Array(30).fill('inactive'));
  const [reachPhase, setReachPhase] = React.useState<'scan' | 'fall' | 'pause'>("scan");
  const reachAnimationFrameId = React.useRef<number | null>(null);
  const reachAnimationStartTime = React.useRef<number>(0);
  const reachPauseTimeout = React.useRef<NodeJS.Timeout | null>(null);
  const reachBarsToActivate = reachBarConfig.numberOfBarsToActivate;
  useEffect(() => {
    const minBarUnit = 1000000;
    const maxBars = 30;
    const barUnit = Math.max(minBarUnit, Math.ceil((totalFollowers ?? 1) / (maxBars - 2)));
    setReachBarConfig({
      barUnit,
      numberOfBarsToActivate: Math.min(maxBars - 1, Math.floor((totalFollowers ?? 0) / barUnit)),
      unitLabel: barUnit >= 1000000 ? `${(barUnit / 1000000).toFixed(0)}M` : `${barUnit}`
    });
  }, [totalFollowers]);

  // Follower reach scan line animation state with descending bar fall
  React.useEffect(() => {
    const shouldAnimate = !isLoadingOverall && !overallError && (totalFollowers ?? 0) > 0 && activeMonitorTab === 'reach';
    function animateReach(timestamp: number) {
      if (reachPhase === 'scan') {
        if (reachAnimationStartTime.current === 0) reachAnimationStartTime.current = timestamp;
        let elapsed = timestamp - reachAnimationStartTime.current;
        let progress = Math.min(1, elapsed / LINE_ANIMATION_DURATION_MS);
        setReachLineProgress(progress);
        setReachBarStates(prev => prev.map((_, i) => (progress * 30 > i && reachBarsToActivate > i) ? 'active' : 'inactive'));
        if (progress >= 1) {
          setReachLineProgress(1);
        }
      }
    }
    // (Old reach bar animation logic removed; new logic is above)
    // --- REMOVE DUPLICATE/OLD reach bar animation state/logic below this line (if present) ---
    // Clean up on unmount
    return () => {
      if (reachAnimationFrameId.current) { cancelAnimationFrame(reachAnimationFrameId.current); reachAnimationFrameId.current = null; }
      if (reachPauseTimeout.current) { clearTimeout(reachPauseTimeout.current); reachPauseTimeout.current = null; }
    };
    // eslint-disable-next-line
  }, [isLoadingOverall, overallError, totalFollowers, activeMonitorTab, reachPhase, reachBarConfig]);

  const [artistSortColumn, setArtistSortColumn] = useState<ArtistSortableColumn>('matchedTracksCount');
  const [artistSortDirection, setArtistSortDirection] = useState<SortDirection>('desc');
  const [beatSortColumn, setBeatSortColumn] = useState<BeatSortableColumn>('totalMatches');
  const [beatSortDirection, setBeatSortDirection] = useState<SortDirection>('desc');


  const uniqueSongsWithStreamCounts: AggregatedSongData[] = useMemo(() => {
    const songMap = new Map<string, AggregatedSongData>();
    scanLogs.forEach(log => { // scanLogs is now the filtered list (completedScans)
        if (log.status === 'completed_match_found' || log.status === 'scanned_match_found' || log.status === 'imported_spotify_track') {
            log.matches.forEach(match => {
                if (match.spotifyTrackId) {
                    const existing = songMap.get(match.spotifyTrackId);
                    const currentTimestamp = match.streamCountTimestamp ? new Date(match.streamCountTimestamp).getTime() : 0;
                    const existingTimestamp = existing?.latestStreamCountTimestamp ? new Date(existing.latestStreamCountTimestamp).getTime() : 0;

                    if (!existing || currentTimestamp > existingTimestamp) {
                        songMap.set(match.spotifyTrackId, {
                            spotifyTrackId: match.spotifyTrackId,
                            title: match.title,
                            artist: match.artist,
                            albumName: match.album,
                            coverArtUrl: match.coverArtUrl,
                            latestStreamCount: match.streamCount || 0,
                            latestStreamCountTimestamp: match.streamCountTimestamp,
                            spotifyArtistIdForAggregation: match.spotifyArtistId,
                        });
                    } else if (currentTimestamp === existingTimestamp && (match.streamCount || 0) > (existing.latestStreamCount || 0)) {
                        songMap.set(match.spotifyTrackId, {
                           ...existing,
                           latestStreamCount: match.streamCount || 0,
                           coverArtUrl: match.coverArtUrl || existing.coverArtUrl,
                           spotifyArtistIdForAggregation: match.spotifyArtistId || existing.spotifyArtistIdForAggregation,
                        });
                    }
                }
            });
        }
    });
    return Array.from(songMap.values()).sort((a,b) => b.latestStreamCount - a.latestStreamCount);
  }, [scanLogs]);

  const aggregatedArtistData: ArtistLeaderboardEntry[] = useMemo(() => {
    const artistMap = new Map<string, { name: string, id?: string, matches: AcrCloudMatch[], scanDates: string[] }>();
    scanLogs.forEach(log => { // scanLogs is now the filtered list
      log.matches.forEach(match => {
        const artistKey = match.spotifyArtistId || match.artist;
        if (!artistMap.has(artistKey)) artistMap.set(artistKey, { name: match.artist, id: match.spotifyArtistId, matches: [], scanDates: [] });
        artistMap.get(artistKey)!.matches.push(match);
      });
    });

    const artistStreamTotals = new Map<string, number>();
    uniqueSongsWithStreamCounts.forEach(song => {
        const artistKey = song.spotifyArtistIdForAggregation || song.artist;
        artistStreamTotals.set(artistKey, (artistStreamTotals.get(artistKey) || 0) + song.latestStreamCount);
    });

    const processedData: Omit<ArtistLeaderboardEntry, 'followerBarPercent' | 'key'>[] = [];
    artistMap.forEach((data) => {
      const followerInfo = data.id ? followerResults.get(data.id) : undefined;
      let followers: number | null | undefined = undefined, isLoadingFollowers = false, errorFollowers: string | undefined = undefined, popularity: number | null | undefined = undefined, genres: string[] | undefined = undefined;
      if (followerInfo) {
        if (followerInfo.status === 'success') { followers = followerInfo.followers; popularity = followerInfo.popularity; genres = followerInfo.genres; }
        else if (followerInfo.status === 'error') { followers = null; errorFollowers = followerInfo.reason; }
        else if (followerInfo.status === 'loading') isLoadingFollowers = true; else followers = null;
      } else if (data.id) isLoadingFollowers = true;

      let mostRecentMatchedReleaseDate: string | null = null;
      if(data.matches.length > 0){
          const validDates = data.matches.map(m => m.releaseDate ? new Date(m.releaseDate).getTime() : 0).filter(ts => ts > 0 && !isNaN(ts));
          if(validDates.length > 0) mostRecentMatchedReleaseDate = new Date(Math.max(...validDates)).toLocaleDateString();
      }

      const artistKeyForStreamTotal = data.id || data.name;
      const artistTotalStreams = artistStreamTotals.get(artistKeyForStreamTotal) || 0;

      processedData.push({
        artistName: data.name,
        spotifyArtistId: data.id,
        matchedTracksCount: data.matches.length,
        spotifyFollowers: followers,
        isFollowersLoading: isLoadingFollowers,
        followersError: errorFollowers,
        mostRecentMatchDate: mostRecentMatchedReleaseDate,
        spotifyPopularity: popularity,
        genres,
        totalArtistStreams: artistTotalStreams
      });
    });

    const maxFollowers = Math.max(0, ...processedData.map(a => a.spotifyFollowers ?? 0));
    return processedData.map((artist, index) => ({ ...artist, key: artist.spotifyArtistId || `${artist.artistName}-${index}`, followerBarPercent: maxFollowers > 0 && typeof artist.spotifyFollowers === 'number' ? (artist.spotifyFollowers / maxFollowers) * 100 : 0 }));
  }, [scanLogs, followerResults, uniqueSongsWithStreamCounts]);




  // Only include user-uploaded files (exclude imported_spotify_track)
  const aggregatedBeatData: BeatStatsEntry[] = useMemo(() => {
    const beatMap = new Map<string, { matchedSongs: AcrCloudMatch[] }>();
    scanLogs.forEach(log => {
      if (log.status === 'imported_spotify_track') return; // skip Spotify imports
      if (!beatMap.has(log.originalFileName)) beatMap.set(log.originalFileName, { matchedSongs: [] });
      const existingMatches = beatMap.get(log.originalFileName)!.matchedSongs;
      log.matches.forEach(newMatch => { if (!existingMatches.find(m => m.id === newMatch.id)) existingMatches.push(newMatch); });
    });
    return Array.from(beatMap.entries()).map(([beatName, data]) => ({ beatName, totalMatches: data.matchedSongs.length, matchedSongs: data.matchedSongs.sort((a,b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()), key: beatName }));
  }, [scanLogs]);


  // Song detail logic removed (not used in UI)





  // --- Move scan line animation hooks to top level (before renderTabContent) ---
  // Stream scan line animation state
  const [streamLineProgress, setStreamLineProgress] = React.useState(0);
  const [streamBarRetract, setStreamBarRetract] = React.useState(false);
  const streamAnimationFrameId = React.useRef<number | null>(null);
  const streamAnimationStartTime = React.useRef<number>(0);
  const streamPauseTimeout = React.useRef<NodeJS.Timeout | null>(null);
  React.useEffect(() => {
    const shouldAnimate = !isLoadingOverall && !overallError && (totalStreams ?? 0) > 0 && activeMonitorTab === 'reach';
    function animateStreamLine(timestamp: number) {
      if (streamAnimationStartTime.current === 0) streamAnimationStartTime.current = timestamp;
      let elapsed = timestamp - streamAnimationStartTime.current;
      let progress = elapsed / LINE_ANIMATION_DURATION_MS;
      if (progress >= 1.0) {
        setStreamLineProgress(1);
        if (streamAnimationFrameId.current) { cancelAnimationFrame(streamAnimationFrameId.current); streamAnimationFrameId.current = null; }
        // Pause for 4 seconds, then retract bars, then restart
        streamPauseTimeout.current = setTimeout(() => {
          setStreamBarRetract(true);
          setTimeout(() => {
            setStreamBarRetract(false);
            setStreamLineProgress(0);
            streamAnimationStartTime.current = performance.now();
            streamAnimationFrameId.current = requestAnimationFrame(animateStreamLine);
          }, 1000); // 1s retract
        }, 4000); // 4s pause
        return;
      }
      setStreamLineProgress(progress);
      streamAnimationFrameId.current = requestAnimationFrame(animateStreamLine);
    }
    if (shouldAnimate) {
      if (!streamAnimationFrameId.current && !streamBarRetract) {
        streamAnimationStartTime.current = performance.now() - (streamLineProgress * LINE_ANIMATION_DURATION_MS);
        streamAnimationFrameId.current = requestAnimationFrame(animateStreamLine);
      }
    } else {
      if (streamAnimationFrameId.current) { cancelAnimationFrame(streamAnimationFrameId.current); streamAnimationFrameId.current = null; }
      if (streamPauseTimeout.current) { clearTimeout(streamPauseTimeout.current); streamPauseTimeout.current = null; }
      setStreamLineProgress(0);
      setStreamBarRetract(false);
    }
    return () => {
      if (streamAnimationFrameId.current) { cancelAnimationFrame(streamAnimationFrameId.current); streamAnimationFrameId.current = null; }
      if (streamPauseTimeout.current) { clearTimeout(streamPauseTimeout.current); streamPauseTimeout.current = null; }
    };
  }, [isLoadingOverall, overallError, totalStreams, streamBarRetract, activeMonitorTab]);

  // Follower reach scan line animation state
  React.useEffect(() => {
    const shouldAnimate = !isLoadingOverall && !overallError && (totalFollowers ?? 0) > 0 && activeMonitorTab === 'reach';
    function animateReach(timestamp: number) {
      if (reachPhase === 'scan') {
        if (reachAnimationStartTime.current === 0) reachAnimationStartTime.current = timestamp;
        let elapsed = timestamp - reachAnimationStartTime.current;
        let progress = Math.min(1, elapsed / LINE_ANIMATION_DURATION_MS);
        setReachLineProgress(progress);
        setReachBarStates(prev => prev.map((_, i) => (progress * 30 > i && reachBarsToActivate > i) ? 'active' : 'inactive'));
        if (progress >= 1) {
          setReachLineProgress(1);
          setReachPhase('fall');
          reachAnimationStartTime.current = performance.now();
          reachAnimationFrameId.current = requestAnimationFrame(animateReach);
          return;
        }
        reachAnimationFrameId.current = requestAnimationFrame(animateReach);
      } else if (reachPhase === 'fall') {
        if (reachAnimationStartTime.current === 0) reachAnimationStartTime.current = timestamp;
        let elapsed = timestamp - reachAnimationStartTime.current;
        const totalFallTime = 4000; // ms
        let newStates = Array(30).fill('inactive');
        for (let i = 0; i < reachBarsToActivate; i++) {
          const barIndex = reachBarsToActivate - 1 - i;
          const fallStep = totalFallTime / Math.max(1, reachBarsToActivate);
          if (elapsed < i * fallStep) {
            newStates[barIndex] = 'active';
          } else if (elapsed < (i + 1) * fallStep) {
            newStates[barIndex] = 'falling';
          } else {
            newStates[barIndex] = 'inactive';
          }
        }
        setReachBarStates(newStates);
        if (elapsed >= totalFallTime) {
          setReachBarStates(Array(30).fill('inactive'));
          setReachPhase('pause');
          reachPauseTimeout.current = setTimeout(() => {
            setReachPhase('scan');
            setReachLineProgress(0);
            reachAnimationStartTime.current = 0;
            reachAnimationFrameId.current = requestAnimationFrame(animateReach);
          }, 1000); // 1s pause after fall
          return;
        }
        reachAnimationFrameId.current = requestAnimationFrame(animateReach);
      }
    }
    if (shouldAnimate) {
      if (!reachAnimationFrameId.current && reachPhase !== 'pause') {
        reachAnimationStartTime.current = performance.now() - (reachPhase === 'scan' ? reachLineProgress * LINE_ANIMATION_DURATION_MS : 0);
        reachAnimationFrameId.current = requestAnimationFrame(animateReach);
      }
    } else {
      if (reachAnimationFrameId.current) { cancelAnimationFrame(reachAnimationFrameId.current); reachAnimationFrameId.current = null; }
      if (reachPauseTimeout.current) { clearTimeout(reachPauseTimeout.current); reachPauseTimeout.current = null; }
      setReachLineProgress(0);
      setReachBarStates(Array(30).fill('inactive'));
      setReachPhase('scan');
    }
    return () => {
      if (reachAnimationFrameId.current) { cancelAnimationFrame(reachAnimationFrameId.current); reachAnimationFrameId.current = null; }
      if (reachPauseTimeout.current) { clearTimeout(reachPauseTimeout.current); reachPauseTimeout.current = null; }
    };
  }, [isLoadingOverall, overallError, totalFollowers, activeMonitorTab, reachPhase, reachBarConfig]);

  const renderTabContent = () => {
    if (isLoadingOverall && activeMonitorTab !== 'collaborationRadar' && activeMonitorTab !== 'beatStats' && activeMonitorTab !== 'estimatedRevenue' && aggregatedArtistData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center flex-grow py-4">
          <ProgressBar text={`Loading ${activeMonitorTab === 'reach' ? 'reach data' : (activeMonitorTab === 'streamHistory' ? 'stream history' : 'artist statistics')}...`} />
          <p className="text-xs text-gray-700 text-center mt-1">This may take up to a minute.</p>
        </div>
      );
    }
    if (overallError && (activeMonitorTab === 'reach' || activeMonitorTab === 'streamHistory' || activeMonitorTab === 'artistStats' || activeMonitorTab === 'estimatedRevenue')) {
      return <div className="text-center text-red-700 text-sm py-8 h-full flex items-center justify-center flex-grow"><p>Error loading data: {overallError}</p></div>;
    }

    switch (activeMonitorTab) {
      case 'reach': {
        // Calculate stream bar config and color, force 1M per bar and never fill all bars
        const minBarUnit = 1000000;
        const maxBars = 30;
        const streamBarUnit = Math.max(minBarUnit, Math.ceil((totalStreams ?? 1) / (maxBars - 2)));
        const streamBarConfig = {
          barUnit: streamBarUnit,
          numberOfBarsToActivate: Math.min(maxBars - 1, Math.floor((totalStreams ?? 0) / streamBarUnit)),
          unitLabel: streamBarUnit >= 1000000 ? `${(streamBarUnit / 1000000).toFixed(0)}M` : `${streamBarUnit}`
        };
        const streamBarColor = '#1D9BF0';
        return (
          <>
            {/* Custom follower reach bar visualizer, same logic as stream bar */}
            <div className="mb-3">
              <h4 className="text-base font-semibold text-black mb-0 text-center">Estimated Spotify Follower Reach</h4>
              <p className="text-xs text-gray-600 text-center mb-1">Sum of all Spotify followers for matched artists.</p>
              <p className="text-3xl text-black font-bold my-1 text-center">{formatFollowersDisplay(totalFollowers, isLoadingOverall && typeof totalFollowers === 'undefined')} followers</p>
              <div className="p-0.5">
                <div
                  className="win95-border-inset p-1 flex items-end space-x-px overflow-hidden relative h-32"
                  style={{
                    backgroundColor: '#262626',
                    backgroundImage: `linear-gradient(to right, rgba(128,128,128,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.2) 1px, transparent 1px)`,
                    backgroundSize: '10px 10px',
                  }}
                  role="img"
                  aria-label={`Performance chart. Current total follower count: ${formatFollowersDisplay(totalFollowers, isLoadingOverall && typeof totalFollowers === 'undefined')}. Each bar segment represents ${reachBarConfig.unitLabel} followers.`}
                >
                  <div className="flex w-full h-full items-end">
                    {[...Array(30)].map((_, i) => {
                      let barIsActive = reachBarStates[i] === 'active';
                      let barIsFalling = reachBarStates[i] === 'falling';
                      let barHeight = barIsActive ? '100%' : (barIsFalling ? '100%' : '0%');
                      let barOpacity = barIsFalling ? 0.3 : 1;
                      return (
                        <div key={i} className="chart-bar-slot flex-1 h-full mx-px relative flex items-end justify-center">
                          <div className="absolute bottom-0 left-0 right-0 h-full win95-border-inset bg-neutral-700 opacity-50"></div>
                          {((totalFollowers ?? 0) > 0) && (
                            <div
                              className="active-bar-fill relative win95-border-outset"
                              style={{ backgroundColor: barIsActive || barIsFalling ? reachBarColor : 'transparent', height: barHeight, width: '80%', transition: barIsFalling ? 'opacity 0.4s linear, height 0.4s linear' : 'height 0.5s ease-out', opacity: barOpacity, boxShadow: barIsActive || barIsFalling ? `0 0 3px ${reachBarColor}, 0 0 6px ${reachBarColor}` : 'none' }}
                            ></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {((totalFollowers ?? 0) > 0 && !isLoadingOverall && !overallError) && (
                    <div
                      className="progress-line absolute top-0 bottom-0"
                      style={{ left: `${reachLineProgress * 100}%`, width: '3px', boxShadow: `0 0 5px 1px ${reachBarColor}, 0 0 10px 2px ${reachBarColor}`, transform: 'translateX(-1.5px)', backgroundColor: reachBarColor }}
                      aria-hidden="true"
                    ></div>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-700 mt-2 text-center">
                {reachBarConfig.unitLabel ? `Bars represent: ${reachBarConfig.unitLabel} followers each.` : ""}
              </p>
            </div>
          </>
        );
      }
      case 'streamHistory':
        return <div className="text-center text-gray-700 py-8">Stream history is not currently available.</div>;
      case 'artistStats':
        return (
          <ArtistStatsTable
            aggregatedArtistData={aggregatedArtistData}
            isLoading={isLoadingOverall && aggregatedArtistData.length === 0}
            sortColumn={artistSortColumn}
            sortDirection={artistSortDirection}
            onSort={setArtistSortColumn}
            onSortDirection={setArtistSortDirection}
            currentArtistLevel={0}
          />
        );
      case 'beatStats':
        if (aggregatedBeatData.length === 0 && scanLogs.length > 0 && !isLoadingOverall) {
          return <p className="text-center text-gray-700 py-8">No beat data available from current scans.</p>;
        }
        if (isLoadingOverall && aggregatedBeatData.length === 0) {
          return <div className="flex flex-col items-center justify-center flex-grow py-4"><ProgressBar text="Loading beat statistics..." /></div>;
        }
        return (
          <BeatStatsTable
            aggregatedBeatData={aggregatedBeatData}
            sortColumn={beatSortColumn}
            sortDirection={beatSortDirection}
            onSort={setBeatSortColumn}
            onSortDirection={setBeatSortDirection}
          />
        );
      case 'collaborationRadar':
        return <CollaborationRadarGraph scanLogs={scanLogs} />;
      case 'estimatedRevenue':
        return (
          <EstimatedRevenueTab
            uniqueSongsWithStreamCounts={uniqueSongsWithStreamCounts}
            totalStreams={totalStreams}
            isLoading={isLoadingOverall}
          />
        );
      default:
        return null;
    }
  };

  const monitorTabs: {id: MonitorTab, label: string}[] = [
    { id: 'reach', label: 'Total Reach' },
    { id: 'estimatedRevenue', label: 'Est. Revenue' },
    { id: 'artistStats', label: 'Artist Stats' },
    { id: 'beatStats', label: 'Beat Matches' },
    { id: 'collaborationRadar', label: 'Collab Radar'}
  ];


  return (
    <div className="win95-border-outset bg-[#C0C0C0] mb-4 text-black">
      <div className="title-bar flex items-center justify-between bg-[#000080] text-white px-1 py-0.5 h-6 select-none">
        <div className="flex items-center"><FakeWindowIcon /><span className="font-bold text-sm">Reach Analyzer</span></div>
        <div className="flex space-x-0.5">
          {/* Placeholder for window controls; functionality removed for tabbed layout */}
          <button className="win95-button-sm bg-[#C0C0C0] text-black font-mono w-4 h-4 leading-none text-xs" aria-label="Minimize" disabled>_</button>
          <button className="win95-button-sm bg-[#C0C0C0] text-black font-mono w-4 h-4 leading-none text-xs flex items-center justify-center" aria-label="Maximize" disabled><div className="w-2 h-2 border border-black"></div></button>
          <button className="win95-button-sm bg-[#C0C0C0] text-black font-bold font-mono w-4 h-4 leading-none text-xs" aria-label="Close" disabled>X</button>
        </div>
      </div>
      {/* Top menu removed as per TODO. Adjusted layout below. */}
      <div className="tabs-container flex pl-1 pt-2 bg-[#C0C0C0] select-none">
        {monitorTabs.map(tab => (
            <div
              key={tab.id}
              className={`tab px-3 py-1 text-sm cursor-default hover:bg-black hover:text-white ${activeMonitorTab === tab.id ? 'selected win95-border-outset border-b-[#C0C0C0] relative -mb-px z-10 bg-[#C0C0C0]' : 'win95-border-outset border-t-gray-400 border-l-gray-400 text-gray-600 opacity-75 ml-0.5 bg-gray-300'}`}
              onClick={() => setActiveMonitorTab(tab.id)}
              role="tab"
              aria-selected={activeMonitorTab === tab.id}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveMonitorTab(tab.id);}}
            >
              {tab.label}
            </div>
        ))}
      </div>
      <div className="tab-content-wrapper p-0.5 pt-0 bg-[#C0C0C0]">
        <div className="tab-content win95-border-inset bg-[#C0C0C0] p-3 min-h-[350px] flex flex-col" role="tabpanel" aria-labelledby={`tab-${activeMonitorTab}`}>
          {renderTabContent()}
        </div>
      </div>
      <div className="status-bar flex justify-end items-center px-1 py-0 border-t-2 border-t-[#808080] bg-[#C0C0C0] h-5 text-xs select-none">
        <div className="flex space-x-0.5 h-[18px]">
           <div className="win95-border-inset w-16 px-1 flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1 H9 V9 H1Z" fill="#008000" stroke="#000000" strokeWidth="0.5"/></svg></div>
           <div className="win95-border-inset w-12 px-1 flex items-center justify-center">{new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit'})}</div>
        </div>
      </div>
    </div>
  );
};
export default React.memo(ReachAnalyzer);