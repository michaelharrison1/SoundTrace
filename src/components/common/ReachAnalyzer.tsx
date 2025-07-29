import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import ProgressBar from './ProgressBar';
import { User, TrackScanLog, AcrCloudMatch, SpotifyFollowerResult, DailyAnalyticsSnapshot, AggregatedSongData, TrackScanLogStatus } from '../../types';
import ArtistFollowers from './ArtistFollowers';
import CollaborationRadarGraph from './CollaborationRadarGraph';
import Button from '../common/Button';
import TotalReachDisplay from './reachAnalyzer/TotalReachDisplay';
import TimeBasedAnalyticsGraph from './reachAnalyzer/TimeBasedAnalyticsGraph';
import ArtistStatsTable from './reachAnalyzer/ArtistStatsTable';
import BeatStatsTable from './reachAnalyzer/BeatStatsTable';
import { calculateArtistLevel, ARTIST_LEVEL_THRESHOLDS, getActiveLevelHexColor, MAX_BAR_SLOTS, LINE_ANIMATION_DURATION_MS, calculateBarConfig, formatFollowersDisplay } from './reachAnalyzer/reachAnalyzerUtils';
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
  const [lineProgress, setLineProgress] = useState(0);
  const animationFrameId = useRef<number | null>(null);
  const animationStartTime = useRef<number>(0);

  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelUpAvailable, setLevelUpAvailable] = useState(false);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [reachBarConfig, setReachBarConfig] = useState(calculateBarConfig(totalFollowers, currentLevel));

  const [selectedSongForDetail, setSelectedSongForDetail] = useState<AggregatedSongData | null>(null);
  const visualizerContainerRef = useRef<HTMLDivElement>(null);
  const [visualizerDimensions, setVisualizerDimensions] = useState({ width: 0, height: 300 });

  useEffect(() => {
    const updateDimensions = () => {
      if (visualizerContainerRef.current && activeMonitorTab === 'streamHistory') {
        setVisualizerDimensions({
          width: visualizerContainerRef.current.offsetWidth,
          height: Math.max(250, visualizerContainerRef.current.offsetHeight || 300)
        });
      }
    };
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const debouncedUpdateDimensions = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateDimensions, 100);
    };

    if (activeMonitorTab === 'streamHistory') {
        const initialTimeout = setTimeout(updateDimensions, 50);
        window.addEventListener('resize', debouncedUpdateDimensions);
        return () => {
          clearTimeout(initialTimeout);
          clearTimeout(resizeTimeout);
          window.removeEventListener('resize', debouncedUpdateDimensions);
        };
    }
  }, [activeMonitorTab]);


  useEffect(() => {
    setReachBarConfig(calculateBarConfig(totalFollowers, currentLevel));
  }, [totalFollowers, currentLevel]);

  useEffect(() => {
    if (reachBarConfig.numberOfBarsToActivate >= MAX_BAR_SLOTS && (totalFollowers ?? 0) > 0 && !isLevelingUp) {
        setLevelUpAvailable(true);
    } else {
        setLevelUpAvailable(false);
    }
  }, [reachBarConfig.numberOfBarsToActivate, totalFollowers, isLevelingUp]);

  const handleLevelUp = useCallback(() => {
    if (!levelUpAvailable) return;
    setIsLevelingUp(true);
    setLevelUpAvailable(false);
    let flashes = 0;
    const flashInterval = setInterval(() => {
        flashes++;
        if (flashes >= 6) {
            clearInterval(flashInterval);
            const newLevel = currentLevel + 1;
            setCurrentLevel(newLevel);
            setIsLevelingUp(false);
            setLineProgress(0);
            setReachBarConfig(calculateBarConfig(totalFollowers, newLevel));
        }
    }, 200);
  }, [levelUpAvailable, currentLevel, totalFollowers]);

  const activeBarAndLineColor = useMemo(() => getActiveLevelHexColor(currentLevel), [currentLevel]);
  const streamGraphColor = '#1D9BF0';

  const animateLineCallback = useCallback((timestamp: number) => {
    if (animationStartTime.current === 0) animationStartTime.current = timestamp;
    const elapsedTime = timestamp - animationStartTime.current;
    let newProgress = elapsedTime / LINE_ANIMATION_DURATION_MS;
    if (newProgress >= 1.0) { newProgress = 0; animationStartTime.current = timestamp; }
    setLineProgress(newProgress);
    animationFrameId.current = requestAnimationFrame(animateLineCallback);
  }, []);

  useEffect(() => {
    const shouldAnimate = activeMonitorTab === 'reach' && !isLoadingOverall && !overallError && (totalFollowers ?? 0) > 0 && !levelUpAvailable && !isLevelingUp;
    if (shouldAnimate) {
      if (!animationFrameId.current) {
        animationStartTime.current = performance.now() - (lineProgress * LINE_ANIMATION_DURATION_MS);
        animationFrameId.current = requestAnimationFrame(animateLineCallback);
      }
    } else {
      if (animationFrameId.current) { cancelAnimationFrame(animationFrameId.current); animationFrameId.current = null; }
      if (activeMonitorTab === 'reach' && (isLoadingOverall || overallError || (totalFollowers ?? 0) <= 0 || levelUpAvailable || isLevelingUp)) {
         setLineProgress(0);
      }
    }
    return () => { if (animationFrameId.current) { cancelAnimationFrame(animationFrameId.current); animationFrameId.current = null; }};
  }, [activeMonitorTab, isLoadingOverall, overallError, totalFollowers, animateLineCallback, lineProgress, levelUpAvailable, isLevelingUp]);


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


  const currentArtistLevel = useMemo(() => calculateArtistLevel(aggregatedArtistData.length), [aggregatedArtistData.length]);

  const aggregatedBeatData: BeatStatsEntry[] = useMemo(() => {
    const beatMap = new Map<string, { matchedSongs: AcrCloudMatch[] }>();
    scanLogs.forEach(log => { // scanLogs is now the filtered list
      if (!beatMap.has(log.originalFileName)) beatMap.set(log.originalFileName, { matchedSongs: [] });
      const existingMatches = beatMap.get(log.originalFileName)!.matchedSongs;
      log.matches.forEach(newMatch => { if (!existingMatches.find(m => m.id === newMatch.id)) existingMatches.push(newMatch); });
    });
    return Array.from(beatMap.entries()).map(([beatName, data]) => ({ beatName, totalMatches: data.matchedSongs.length, matchedSongs: data.matchedSongs.sort((a,b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()), key: beatName }));
  }, [scanLogs]);


  const handleMatchSelect = useCallback((match: AcrCloudMatch, log: TrackScanLog) => {
    if (match.spotifyTrackId) {
        const songData: AggregatedSongData = {
            spotifyTrackId: match.spotifyTrackId,
            title: match.title,
            artist: match.artist,
            albumName: match.album,
            coverArtUrl: match.coverArtUrl,
            latestStreamCount: match.streamCount ?? 0,
            latestStreamCountTimestamp: match.streamCountTimestamp,
            spotifyArtistIdForAggregation: match.spotifyArtistId,
        };
        setSelectedSongForDetail(songData);
    } else {
        console.log("Selected non-Spotify track:", match.title);
        setSelectedSongForDetail(null);
    }
  }, []);

  const handleCloseSongDetail = useCallback(() => {
    setSelectedSongForDetail(null);
  }, []);





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
      case 'reach':
        return (
          <>
            <TotalReachDisplay
              totalFollowers={totalFollowers}
              isLoading={isLoadingOverall}
              error={overallError}
              currentLevel={currentLevel}
              levelUpAvailable={levelUpAvailable}
              isLevelingUp={isLevelingUp}
              onLevelUp={handleLevelUp}
              reachBarConfig={reachBarConfig}
              activeBarAndLineColor={activeBarAndLineColor}
              lineProgress={lineProgress}
            />
            {/* No time-based bar chart for reach tab, only CRT scan line remains */}
          </>
        );
       case 'streamHistory':
        return (
          <div ref={visualizerContainerRef} className="flex flex-col h-full">
            <div className="text-center mb-3">
              <h4 className="text-base font-semibold text-black mb-0">Total Estimated StreamClout Streams</h4>
              <p className="text-xs text-gray-600">Sum of all stream counts from matched tracks via StreamClout.</p>
              {isLoadingOverall && typeof totalStreams === 'undefined' ? (
                <ProgressBar text="Calculating total streams..." />
              ) : overallError ? (
                 <p className="text-2xl text-red-700 font-bold my-2">Error loading stream data</p>
              ) : (
                <p className="text-3xl text-black font-bold my-2">
                  {formatFollowersDisplay(totalStreams, isLoadingOverall && typeof totalStreams === 'undefined')} streams
                </p>
              )}
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={historicalAnalyticsData.map(d => ({
                    date: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                    streams: Math.round(d.cumulativeStreams || 0)
                  }))}
                  margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={v => v.toLocaleString()} />
                  <Bar dataKey="streams" fill={streamGraphColor} isAnimationActive={true} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {selectedSongForDetail && (
                <SongStreamDetail
                    song={selectedSongForDetail}
                    onClose={handleCloseSongDetail}
                />
            )}
          </div>
        );
      case 'artistStats':
        return (
          <ArtistStatsTable
            aggregatedArtistData={aggregatedArtistData}
            isLoading={isLoadingOverall && aggregatedArtistData.length === 0}
            currentArtistLevel={currentArtistLevel}
            sortColumn={artistSortColumn}
            sortDirection={artistSortDirection}
            onSort={setArtistSortColumn}
            onSortDirection={setArtistSortDirection}
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
    { id: 'streamHistory', label: 'Stream Stats' },
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
      <div className="menu-bar flex space-x-0 select-none">
        {['File', 'Edit', 'View', 'Help'].map(item => (
            <span key={item} className="text-sm hover:bg-black hover:text-white px-2 py-0.5 cursor-default"><u>{item[0]}</u>{item.substring(1)}</span>
        ))}
      </div>
      <div className="tabs-container flex pl-1 pt-1 bg-[#C0C0C0] select-none">
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
      <div className="status-bar flex justify-between items-center px-1 py-0 border-t-2 border-t-[#808080] bg-[#C0C0C0] h-5 text-xs select-none">
        <span className="win95-border-inset px-2 py-0 h-[18px] flex items-center">Level {currentLevel}</span>
        <div className="flex space-x-0.5 h-[18px]">
           <div className="win95-border-inset w-16 px-1 flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1 H9 V9 H1Z" fill="#008000" stroke="#000000" strokeWidth="0.5"/></svg></div>
           <div className="win95-border-inset w-12 px-1 flex items-center justify-center">{new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit'})}</div>
        </div>
      </div>
    </div>
  );
};
export default React.memo(ReachAnalyzer);