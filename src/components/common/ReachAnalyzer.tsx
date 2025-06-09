
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import ProgressBar from './ProgressBar';
import { TrackScanLog, AcrCloudMatch, SpotifyFollowerResult, FollowerSnapshot } from '../../types';
import ArtistFollowers from './ArtistFollowers';
import CollaborationRadarGraph from './CollaborationRadarGraph';

interface ReachAnalyzerProps {
  totalFollowers: number | null | undefined;
  isLoading: boolean;
  error?: string | null;
  scanLogs: TrackScanLog[];
  followerResults: Map<string, SpotifyFollowerResult>;
  historicalFollowerData: FollowerSnapshot[];
}

const MAX_BAR_SLOTS = 30;
const CHART_BACKGROUND_COLOR = '#262626'; // Neutral-800
const GRID_COLOR = 'rgba(128, 128, 128, 0.2)';
const LINE_ANIMATION_DURATION_MS = 3750;

const LEVEL_HEX_COLORS: { [key: number]: string } = {
  1: '#34D399', // Emerald-400 (Default)
  2: '#3B82F6', // Blue-500
  3: '#A855F7', // Purple-500
  4: '#EC4899', // Pink-500
  5: '#EF4444', // Red-500
  6: '#F97316', // Orange-500
  7: '#EAB308', // Yellow-500
  8: '#84CC16', // Lime-500
  9: '#10B981', // Emerald-500
  10: '#06B6D4', // Cyan-500
};
const DEFAULT_LEVEL_HEX_COLOR = '#6366F1'; // Indigo-500 as a fallback

const getActiveLevelHexColor = (level: number): string => {
  return LEVEL_HEX_COLORS[level] || DEFAULT_LEVEL_HEX_COLOR;
};


type MonitorTab = 'reach' | 'artistStats' | 'beatStats' | 'collaborationRadar';
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
  matchedSongs: AcrCloudMatch[];
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

const calculateBarConfig = (followers: number | null | undefined, level: number): BarConfig => {
  let baseUnit = 1000;
  if (level > 1) baseUnit = 1000 * Math.pow(1.5, level - 1);
  baseUnit = Math.max(100, Math.round(baseUnit / 100) * 100);

  let barUnit = baseUnit;
  let unitLabel = `${Math.round(baseUnit/1000)}K`;

  if (typeof followers !== 'number' || followers === null || followers <= 0) {
    return { barUnit: 0, numberOfBarsToActivate: 0, unitLabel: '' };
  }

  const dynamicThresholds = [10, 100, 1000];
  for(let i = 0; i < dynamicThresholds.length; i++){
      if (followers < baseUnit * dynamicThresholds[i]) {
          barUnit = baseUnit * (dynamicThresholds[i-1] || 1);
          break;
      }
      barUnit = baseUnit * dynamicThresholds[i];
  }
  barUnit = Math.max(baseUnit, barUnit);


  if (barUnit >= 1000000) unitLabel = `${(barUnit / 1000000).toFixed(barUnit % 1000000 === 0 ? 0 : 1)}M`;
  else if (barUnit >= 1000) unitLabel = `${(barUnit / 1000).toFixed(barUnit % 1000 === 0 ? 0 : 1)}K`;
  else unitLabel = `${barUnit}`;

  const calculatedBars = followers > 0 && barUnit > 0 ? Math.ceil(followers / barUnit) : 0;
  const numberOfBarsToActivate = Math.min(MAX_BAR_SLOTS, Math.max(0, calculatedBars));

  return { barUnit, numberOfBarsToActivate, unitLabel };
};


const PopularityBar: React.FC<{ score: number | null | undefined }> = ({ score }) => {
  if (typeof score !== 'number' || score === null) return <span className="text-xs text-gray-500">-</span>;
  const percent = score;
  let barColor = 'bg-green-500';
  if (score < 40) barColor = 'bg-red-500';
  else if (score < 70) barColor = 'bg-yellow-500';

  return (
    <div className="w-10 h-2.5 bg-gray-300 win95-border-inset relative inline-block ml-1 align-middle" title={`Popularity: ${score}`}>
      <div className={`${barColor} h-full`} style={{ width: `${percent}%` }}></div>
    </div>
  );
};

const ARTIST_LEVEL_THRESHOLDS = [100, 500, 1000, 5000, 10000];

const calculateArtistLevel = (artistCount: number): number => {
    let level = 1;
    for (const threshold of ARTIST_LEVEL_THRESHOLDS) {
        if (artistCount >= threshold) {
            level++;
        } else {
            break;
        }
    }
    return level;
};


const ReachAnalyzer: React.FC<ReachAnalyzerProps> = ({
  totalFollowers,
  isLoading: isLoadingTotalFollowers,
  error: totalFollowersError,
  scanLogs,
  followerResults,
  historicalFollowerData
}) => {
  const [activeMonitorTab, setActiveMonitorTab] = useState<MonitorTab>('reach');
  const [lineProgress, setLineProgress] = useState(0);
  const animationFrameId = useRef<number | null>(null);
  const animationStartTime = useRef<number>(0);

  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelUpAvailable, setLevelUpAvailable] = useState(false);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [reachBarConfig, setReachBarConfig] = useState<BarConfig>(calculateBarConfig(totalFollowers, currentLevel));

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

  const handleLevelUp = () => {
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
  };

  const activeBarAndLineColor = getActiveLevelHexColor(currentLevel);

  const animateLineCallback = useCallback((timestamp: number) => {
    if (animationStartTime.current === 0) animationStartTime.current = timestamp;
    const elapsedTime = timestamp - animationStartTime.current;
    let newProgress = elapsedTime / LINE_ANIMATION_DURATION_MS;
    if (newProgress >= 1.0) { newProgress = 0; animationStartTime.current = timestamp; }
    setLineProgress(newProgress);
    animationFrameId.current = requestAnimationFrame(animateLineCallback);
  }, []);

  useEffect(() => {
    const shouldAnimate = activeMonitorTab === 'reach' && !isLoadingTotalFollowers && !totalFollowersError && (totalFollowers ?? 0) > 0 && !levelUpAvailable && !isLevelingUp;
    if (shouldAnimate) {
      if (!animationFrameId.current) {
        animationStartTime.current = performance.now() - (lineProgress * LINE_ANIMATION_DURATION_MS);
        animationFrameId.current = requestAnimationFrame(animateLineCallback);
      }
    } else {
      if (animationFrameId.current) { cancelAnimationFrame(animationFrameId.current); animationFrameId.current = null; }
      if (activeMonitorTab === 'reach' && (isLoadingTotalFollowers || totalFollowersError || (totalFollowers ?? 0) <= 0 || levelUpAvailable || isLevelingUp)) {
         setLineProgress(0);
      }
    }
    return () => { if (animationFrameId.current) { cancelAnimationFrame(animationFrameId.current); animationFrameId.current = null; }};
  }, [activeMonitorTab, isLoadingTotalFollowers, totalFollowersError, totalFollowers, animateLineCallback, lineProgress, levelUpAvailable, isLevelingUp]);

  const formatFollowersDisplay = (count: number | null | undefined): string => {
    if (isLoadingTotalFollowers && typeof count === 'undefined') return "Loading...";
    if (typeof count === 'undefined') return "Loading...";
    if (count === null) return "N/A";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };
  const displayTotalReachValue = formatFollowersDisplay(totalFollowers);

  const [artistSortColumn, setArtistSortColumn] = useState<ArtistSortableColumn>('matchedTracksCount');
  const [artistSortDirection, setArtistSortDirection] = useState<SortDirection>('desc');
  const [beatSortColumn, setBeatSortColumn] = useState<BeatSortableColumn>('totalMatches');
  const [beatSortDirection, setBeatSortDirection] = useState<SortDirection>('desc');
  const [expandedBeat, setExpandedBeat] = useState<string | null>(null);

  const aggregatedArtistData = useMemo(() => {
    const artistMap = new Map<string, { name: string, id?: string, matches: AcrCloudMatch[], scanDates: string[] }>();
    scanLogs.forEach(log => {
      log.matches.forEach(match => {
        const artistKey = match.spotifyArtistId || match.artist;
        if (!artistMap.has(artistKey)) artistMap.set(artistKey, { name: match.artist, id: match.spotifyArtistId, matches: [], scanDates: [] });
        const artistEntry = artistMap.get(artistKey)!;
        artistEntry.matches.push(match);
      });
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
          const validDates = data.matches
              .map(m => m.releaseDate ? new Date(m.releaseDate).getTime() : 0)
              .filter(ts => ts > 0 && !isNaN(ts));
          if(validDates.length > 0) {
            mostRecentMatchedReleaseDate = new Date(Math.max(...validDates)).toLocaleDateString();
          }
      }
      processedData.push({ artistName: data.name, spotifyArtistId: data.id, matchedTracksCount: data.matches.length, spotifyFollowers: followers, isFollowersLoading: isLoadingFollowers, followersError: errorFollowers, mostRecentMatchDate: mostRecentMatchedReleaseDate, spotifyPopularity: popularity, genres });
    });
    const maxFollowers = Math.max(0, ...processedData.map(a => a.spotifyFollowers ?? 0));
    return processedData.map((artist, index) => ({ ...artist, key: artist.spotifyArtistId || `${artist.artistName}-${index}`, followerBarPercent: maxFollowers > 0 && typeof artist.spotifyFollowers === 'number' ? (artist.spotifyFollowers / maxFollowers) * 100 : 0 }));
  }, [scanLogs, followerResults]);

  const sortedArtistData = useMemo(() => {
    return [...aggregatedArtistData].sort((a, b) => {
      let valA: any, valB: any;
      switch (artistSortColumn) {
        case 'artistName': valA = a.artistName; valB = b.artistName; return artistSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'matchedTracksCount': valA = a.matchedTracksCount; valB = b.matchedTracksCount; break;
        case 'spotifyFollowers': valA = a.spotifyFollowers ?? -1; valB = b.spotifyFollowers ?? -1; break;
        case 'mostRecentMatchDate':
            valA = a.mostRecentMatchDate ? new Date(a.mostRecentMatchDate).getTime() : 0;
            valB = b.mostRecentMatchDate ? new Date(b.mostRecentMatchDate).getTime() : 0;
            break;
        case 'spotifyPopularity': valA = a.spotifyPopularity ?? -1; valB = b.spotifyPopularity ?? -1; break;
        default: return 0;
      }
      return artistSortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [aggregatedArtistData, artistSortColumn, artistSortDirection]);

  const handleArtistSort = (column: ArtistSortableColumn) => {
    if (artistSortColumn === column) setArtistSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setArtistSortColumn(column); if (column === 'artistName') setArtistSortDirection('asc'); else setArtistSortDirection('desc'); }
  };
  const renderArtistSortArrow = (column: ArtistSortableColumn) => { if (artistSortColumn === column) return artistSortDirection === 'asc' ? ' ▲' : ' ▼'; return ''; };

  const aggregatedBeatData = useMemo(() => {
    const beatMap = new Map<string, { matchedSongs: AcrCloudMatch[] }>();
    scanLogs.forEach(log => {
      if (!beatMap.has(log.originalFileName)) beatMap.set(log.originalFileName, { matchedSongs: [] });
      const existingMatches = beatMap.get(log.originalFileName)!.matchedSongs;
      log.matches.forEach(newMatch => { if (!existingMatches.find(m => m.id === newMatch.id)) existingMatches.push(newMatch); });
    });
    return Array.from(beatMap.entries()).map(([beatName, data]) => ({ beatName, totalMatches: data.matchedSongs.length, matchedSongs: data.matchedSongs.sort((a,b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()), key: beatName }));
  }, [scanLogs]);

  const sortedBeatData = useMemo(() => {
    return [...aggregatedBeatData].sort((a,b) => {
        let valA: any, valB: any;
        switch(beatSortColumn) {
            case 'beatName': valA = a.beatName; valB = b.beatName; return beatSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            case 'totalMatches': valA = a.totalMatches; valB = b.totalMatches; break;
            default: return 0;
        }
        return beatSortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [aggregatedBeatData, beatSortColumn, beatSortDirection]);

  const handleBeatSort = (column: BeatSortableColumn) => {
    if (beatSortColumn === column) setBeatSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setBeatSortColumn(column); if (column === 'beatName') setArtistSortDirection('asc'); else setBeatSortDirection('desc'); }
  };
  const renderBeatSortArrow = (column: BeatSortableColumn) => { if (beatSortColumn === column) return beatSortDirection === 'asc' ? ' ▲' : ' ▼'; return ''; };
  const toggleExpandBeat = (beatName: string) => setExpandedBeat(prev => prev === beatName ? null : beatName);

  const currentArtistLevel = useMemo(() => calculateArtistLevel(aggregatedArtistData.length), [aggregatedArtistData.length]);

   const renderTimeBasedReachGraph = () => {
        const dataToDisplay = historicalFollowerData.slice(-60);

        if (isLoadingTotalFollowers && dataToDisplay.length === 0) {
            return <div className="my-4"><ProgressBar text="Loading time-based reach data..." /></div>;
        }
        if (dataToDisplay.length === 0) {
            return <p className="text-center text-gray-600 mt-4">No historical follower data available to display graph.</p>;
        }

        const maxFollowersInPeriod = Math.max(...dataToDisplay.map(d => d.cumulativeFollowers), 1);
        const barContainerWidth = 100;
        const numberOfBars = dataToDisplay.length;
        const gapBetweenBars = 0.2;
        const totalGapSpace = (numberOfBars -1) * gapBetweenBars;
        const barWidthPercentage = numberOfBars > 0 ? (barContainerWidth - totalGapSpace) / numberOfBars : 0;

        return (
            <div className="mt-4">
                <h4 className="text-base font-semibold text-black mb-1 text-center">Time-Based Reach Graph</h4>
                <p className="text-xs text-gray-600 text-center mb-2">Track follower growth over time (last {dataToDisplay.length} records), updates daily.</p>
                 <div className={`p-0.5 ${isLevelingUp ? 'animate-pulse !border-yellow-400' : 'border-transparent'} border-2`}>
                    <div className="win95-border-inset bg-gray-700 p-2 h-48 flex items-end overflow-x-auto" style={{gap: `${gapBetweenBars}%`}}>
                        {dataToDisplay.map((snapshot) => {
                            const barHeight = maxFollowersInPeriod > 0 ? (snapshot.cumulativeFollowers / maxFollowersInPeriod) * 95 : 0;
                            const formattedDate = new Date(snapshot.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                            return (
                                <div
                                    key={snapshot.date}
                                    className="flex-shrink-0 win95-border-outset hover:opacity-80 relative group"
                                    style={{
                                        width: `${barWidthPercentage}%`,
                                        height: `${Math.max(5, barHeight)}%`,
                                        minWidth: '15px',
                                        backgroundColor: activeBarAndLineColor, // Use the level-based color
                                        boxShadow: `0 0 2px ${activeBarAndLineColor}, 0 0 4px ${activeBarAndLineColor}`,
                                     }}
                                    title={`${formattedDate}: ${formatFollowersDisplay(snapshot.cumulativeFollowers)} followers`}
                                >
                                <span className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-gray-100 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-70 px-1.5 py-0.5 rounded-sm win95-border-outset border-gray-500">
                                    {formattedDate}
                                </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

  const crtElementBaseClass = "win95-border-inset p-1 flex items-end space-x-px overflow-hidden relative h-32";
  const crtLevelingUpClass = isLevelingUp ? "animate-pulse !border-yellow-400 border-2" : "border-transparent border-0";

  const renderTabContent = () => {
    if (activeMonitorTab === 'reach') {
      return (
        <>
          <h4 className="text-base font-semibold text-black mb-0 text-center">Estimated Spotify Artist Follower Reach</h4>
          <p className="text-xs text-gray-600 text-center mb-1">Total followers of Spotify artists that have used your beats.</p>
          {isLoadingTotalFollowers && typeof totalFollowers === 'undefined' ? (
            <div className="flex flex-col items-center justify-center flex-grow py-4"><ProgressBar text="Calculating reach..." /></div>
          ) : totalFollowersError ? (
            <div className="text-center text-red-700 text-sm py-8 h-full flex items-center justify-center flex-grow"><p>Error: {totalFollowersError}</p></div>
          ) : (
            <>
              <p className="text-3xl text-black font-bold my-1 text-center">{displayTotalReachValue} followers</p>
              <p className="text-sm text-gray-700 text-center mb-1">Reach Level: {currentLevel}</p>
              {levelUpAvailable && !isLevelingUp && (
                <div className="text-center my-1">
                    <button
                        onClick={handleLevelUp}
                        className="px-3 py-1 bg-yellow-400 text-black font-semibold win95-border-outset hover:bg-yellow-300 active:translate-y-px"
                    >
                        Level Up Available! ✨
                    </button>
                </div>
              )}
              {isLevelingUp && <ProgressBar text="Leveling Up! Please Wait..." className="my-1"/>}

              <div className={`p-0.5 ${crtLevelingUpClass}`}>
                <div
                  className={crtElementBaseClass}
                  style={{ backgroundColor: CHART_BACKGROUND_COLOR, backgroundImage: `linear-gradient(to right, ${GRID_COLOR} 1px, transparent 1px), linear-gradient(to bottom, ${GRID_COLOR} 1px, transparent 1px)`, backgroundSize: "10px 10px" }}
                  role="img"
                  aria-label={`Performance chart. Current total follower reach: ${displayTotalReachValue}. ${reachBarConfig.unitLabel ? 'Each bar segment represents ' + reachBarConfig.unitLabel + ' followers.' : ''}`}
                >
                  <div className="flex w-full h-full items-end">
                    {[...Array(MAX_BAR_SLOTS)].map((_, i) => {
                      const barIsActive = levelUpAvailable || (lineProgress * MAX_BAR_SLOTS > i && i < reachBarConfig.numberOfBarsToActivate && (totalFollowers ?? 0) > 0);
                      const barHeight = barIsActive ? '100%' : '0%';
                      return (
                        <div key={i} className="chart-bar-slot flex-1 h-full mx-px relative flex items-end justify-center">
                          <div className="absolute bottom-0 left-0 right-0 h-full win95-border-inset bg-neutral-700 opacity-50"></div>
                          {((totalFollowers ?? 0) > 0 || levelUpAvailable) && (
                            <div
                              className="active-bar-fill relative win95-border-outset"
                              style={{ backgroundColor: barIsActive ? activeBarAndLineColor : 'transparent', height: barHeight, width: '80%', transition: 'height 0.1s linear', boxShadow: barIsActive ? `0 0 3px ${activeBarAndLineColor}, 0 0 6px ${activeBarAndLineColor}` : 'none' }}
                            ></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {((totalFollowers ?? 0) > 0 && !isLoadingTotalFollowers && !totalFollowersError && !levelUpAvailable && !isLevelingUp) && (
                      <div
                        className="progress-line absolute top-0 bottom-0"
                        style={{ left: `${lineProgress * 100}%`, width: '3px', boxShadow: `0 0 5px 1px ${activeBarAndLineColor}, 0 0 10px 2px ${activeBarAndLineColor}`, transform: 'translateX(-1.5px)', backgroundColor: activeBarAndLineColor }}
                        aria-hidden="true"
                      ></div>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-700 mt-2 text-center">
                {reachBarConfig.unitLabel ? `Bars represent: ${reachBarConfig.unitLabel} followers each.` : ""}
              </p>
              {renderTimeBasedReachGraph()}
            </>
          )}
        </>
      );
    } else if (activeMonitorTab === 'artistStats') {
      if (isLoadingTotalFollowers && aggregatedArtistData.length === 0) return (<div className="flex flex-col items-center justify-center flex-grow py-4"><ProgressBar text="Loading artist data..." /></div>);
      if (aggregatedArtistData.length === 0) return <p className="text-center text-gray-700 py-8">No artist data available from current scans.</p>;
      return (
        <div className="artist-leaderboard flex flex-col h-full">
          <h4 className="text-base font-semibold text-black mb-0 text-center">Artist Statistics</h4>
          <p className="text-xs text-gray-600 text-center mb-1">Total Unique Artists: {aggregatedArtistData.length} &bull; Artist Level: {currentArtistLevel}</p>
          <div className="overflow-auto win95-border-inset bg-white flex-grow p-0.5">
            <table className="min-w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <colgroup><col style={{ width: '25%' }} /><col style={{ width: '12%' }} /><col style={{ width: '20%' }} /><col style={{ width: '15%' }} /><col style={{ width: '13%' }} /><col style={{ width: '15%' }} /></colgroup>
              <thead className="bg-[#C0C0C0] sticky top-0 z-10">
                <tr>
                  <HeaderCell onClick={() => handleArtistSort('artistName')} sortArrow={renderArtistSortArrow('artistName')}>Artist</HeaderCell>
                  <HeaderCell onClick={() => handleArtistSort('matchedTracksCount')} sortArrow={renderArtistSortArrow('matchedTracksCount')} className="text-center">Beat Matches</HeaderCell>
                  <HeaderCell onClick={() => handleArtistSort('spotifyFollowers')} sortArrow={renderArtistSortArrow('spotifyFollowers')} className="text-center">Followers</HeaderCell>
                  <HeaderCell onClick={() => handleArtistSort('spotifyPopularity')} sortArrow={renderArtistSortArrow('spotifyPopularity')} className="text-center">Popularity</HeaderCell>
                  <HeaderCell onClick={() => handleArtistSort('mostRecentMatchDate')} sortArrow={renderArtistSortArrow('mostRecentMatchDate')} className="text-center" title="Release date of the artist’s most recent track that used your beat.">Most Recent Match</HeaderCell>
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
                        <div className="w-12 h-2.5 bg-gray-300 win95-border-inset relative" title={`${artist.spotifyFollowers ?? 0} followers`}><div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500" style={{ width: `${artist.followerBarPercent}%`, boxShadow: artist.followerBarPercent > 0 ? '0.5px 0.5px 0px #404040' : 'none' }}></div></div>
                      </div>
                    </DataCell>
                    <DataCell className="text-center">{typeof artist.spotifyPopularity === 'number' ? artist.spotifyPopularity : (artist.isFollowersLoading && !artist.followersError ? '...' : '-')}<PopularityBar score={artist.spotifyPopularity} /></DataCell>
                    <DataCell className="text-center">{artist.mostRecentMatchDate || '-'}</DataCell>
                    <DataCell className="text-center"><div className="flex flex-wrap justify-center items-center gap-0.5">{(artist.genres && artist.genres.length > 0) ? artist.genres.slice(0,3).map(genre => (<span key={genre} className="text-xs px-1 py-0 bg-gray-200 group-hover:bg-gray-300 win95-border-inset text-gray-700 group-hover:text-black whitespace-nowrap">{genre}</span>)) : (artist.isFollowersLoading && !artist.followersError ? '...' : <span className="text-xs">-</span>)}</div></DataCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else if (activeMonitorTab === 'beatStats') {
      if (sortedBeatData.length === 0) return <p className="text-center text-gray-700 py-8">No beats have been scanned yet.</p>;
      return (
        <div className="beat-stats flex flex-col h-full">
          <h4 className="text-base font-semibold text-black mb-2 text-center">Beat Matches</h4>
          <div className="overflow-auto win95-border-inset bg-white flex-grow p-0.5">
            <table className="min-w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <colgroup><col style={{ width: '70%' }} /><col style={{ width: '30%' }} /></colgroup>
              <thead className="bg-[#C0C0C0] sticky top-0 z-10">
                <tr>
                  <HeaderCell onClick={() => handleBeatSort('beatName')} sortArrow={renderBeatSortArrow('beatName')}>Beat Name (Your Upload)</HeaderCell>
                  <HeaderCell onClick={() => handleBeatSort('totalMatches')} sortArrow={renderBeatSortArrow('totalMatches')} className="text-center">Total Unique Song Matches</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {sortedBeatData.map((beat) => (
                  <React.Fragment key={beat.key}>
                    <tr className="hover:bg-blue-200 hover:text-black group border-b border-gray-300 last:border-b-0 cursor-pointer" onClick={() => toggleExpandBeat(beat.beatName)} title={`Click to see matches for ${beat.beatName}`}>
                      <DataCell>{expandedBeat === beat.beatName ? '▼' : '►'} {beat.beatName}</DataCell><DataCell className="text-center">{beat.totalMatches}</DataCell>
                    </tr>
                    {expandedBeat === beat.beatName && beat.matchedSongs.length > 0 && (<tr className="bg-gray-50 group-hover:bg-blue-100"><td colSpan={2} className="p-0"><div className="p-2 m-1 win95-border-inset bg-white"><h5 className="text-xs font-semibold text-black mb-1">Matches for "{beat.beatName}":</h5><div className="max-h-32 overflow-y-auto"><table className="min-w-full text-xs"><thead className="bg-gray-200"><tr><th className="px-1 py-0.5 text-left font-normal text-black">Song Title</th><th className="px-1 py-0.5 text-left font-normal text-black">Artist</th><th className="px-1 py-0.5 text-center font-normal text-black">Confidence</th><th className="px-1 py-0.5 text-left font-normal text-black">Release</th><th className="px-1 py-0.5 text-left font-normal text-black">Links</th></tr></thead><tbody>{beat.matchedSongs.map(match => (<tr key={match.id} className="border-b border-gray-200 last:border-b-0"><td className="px-1 py-0.5 text-gray-700 truncate" title={match.title}>{match.title}</td><td className="px-1 py-0.5 text-gray-700 truncate" title={match.artist}>{match.artist}</td><td className="px-1 py-0.5 text-gray-700 text-center">{match.matchConfidence}%</td><td className="px-1 py-0.5 text-gray-700">{match.releaseDate}</td><td className="px-1 py-0.5">{match.platformLinks?.spotify && <a href={match.platformLinks.spotify} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mr-1">SP</a>}{match.platformLinks?.youtube && <a href={match.platformLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">YT</a>}</td></tr>))}</tbody></table></div></div></td></tr>)}
                     {expandedBeat === beat.beatName && beat.matchedSongs.length === 0 && (<tr className="bg-gray-50 group-hover:bg-blue-100"><td colSpan={2} className="p-0"><div className="p-2 m-1 win95-border-inset bg-white text-center text-xs text-gray-600">No specific song matches found for this beat in the logs.</div></td></tr>)}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else if (activeMonitorTab === 'collaborationRadar') {
        return <CollaborationRadarGraph scanLogs={scanLogs} />;
    }
    return null;
  };

  const HeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableHeaderCellElement> & {sortArrow?: string, width?: string}> = ({ children, sortArrow, width, className, ...props }) => (
    <th scope="col" className={`px-2 py-1 text-left font-normal text-black win95-border-outset border-b-2 border-r-2 border-b-[#808080] border-r-[#808080] cursor-pointer select-none whitespace-nowrap hover:bg-black hover:text-white ${className || ''}`} style={{width: width}} {...props}>
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
        <div className="flex items-center"><FakeWindowIcon /><span className="font-bold text-sm">Reach Analyzer</span></div>
        <div className="flex space-x-0.5">
          <button className="win95-button-sm bg-[#C0C0C0] text-black font-mono w-4 h-4 leading-none text-xs" aria-label="Minimize">_</button>
          <button className="win95-button-sm bg-[#C0C0C0] text-black font-mono w-4 h-4 leading-none text-xs flex items-center justify-center" aria-label="Maximize"><div className="w-2 h-2 border border-black"></div></button>
          <button className="win95-button-sm bg-[#C0C0C0] text-black font-bold font-mono w-4 h-4 leading-none text-xs" aria-label="Close">X</button>
        </div>
      </div>
      <div className="menu-bar flex space-x-0 select-none">
        {['File', 'Edit', 'View', 'Help'].map(item => (
            <span key={item} className="text-sm hover:bg-black hover:text-white px-2 py-0.5 cursor-default"><u>{item[0]}</u>{item.substring(1)}</span>
        ))}
      </div>
      <div className="tabs-container flex pl-1 pt-1 bg-[#C0C0C0] select-none">
        {(['reach', 'artistStats', 'beatStats', 'collaborationRadar'] as MonitorTab[]).map(tab => (
            <div
              key={tab}
              className={`tab px-3 py-1 text-sm cursor-default hover:bg-black hover:text-white ${activeMonitorTab === tab ? 'selected win95-border-outset border-b-[#C0C0C0] relative -mb-px z-10 bg-[#C0C0C0]' : 'win95-border-outset border-t-gray-400 border-l-gray-400 text-gray-600 opacity-75 ml-0.5 bg-gray-300'}`}
              onClick={() => setActiveMonitorTab(tab)}
              role="tab"
              aria-selected={activeMonitorTab === tab}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveMonitorTab(tab);}}
            >
              {tab === 'reach' && 'Total Reach'}
              {tab === 'artistStats' && 'Artist Stats'}
              {tab === 'beatStats' && 'Beat Matches'}
              {tab === 'collaborationRadar' && 'Collaboration Radar'}
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
export default ReachAnalyzer;
