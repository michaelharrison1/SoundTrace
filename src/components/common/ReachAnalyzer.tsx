
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import ProgressBar from './ProgressBar';
import { TrackScanLog, AcrCloudMatch, SpotifyFollowerResult, FollowerSnapshot } from '../../types';
import ArtistFollowers from './ArtistFollowers';
import CollaborationRadarGraph from './CollaborationRadarGraph';
import Button from './Button';
import TotalReachDisplay from './reachAnalyzer/TotalReachDisplay';
import TimeBasedReachGraph from './reachAnalyzer/TimeBasedReachGraph';
import ArtistStatsTable from './reachAnalyzer/ArtistStatsTable';
import BeatStatsTable from './reachAnalyzer/BeatStatsTable';
import { calculateArtistLevel, ARTIST_LEVEL_THRESHOLDS, getActiveLevelHexColor, MAX_BAR_SLOTS, LINE_ANIMATION_DURATION_MS, calculateBarConfig } from './reachAnalyzer/reachAnalyzerUtils';


interface ReachAnalyzerProps {
  totalFollowers: number | null | undefined;
  isLoading: boolean;
  error?: string | null;
  scanLogs: TrackScanLog[];
  followerResults: Map<string, SpotifyFollowerResult>;
  historicalFollowerData: FollowerSnapshot[];
  onDeleteFollowerHistory: () => Promise<void>;
}

export type MonitorTab = 'reach' | 'artistStats' | 'beatStats' | 'collaborationRadar';
export type ArtistSortableColumn = 'artistName' | 'matchedTracksCount' | 'spotifyFollowers' | 'mostRecentMatchDate' | 'spotifyPopularity';
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


const ReachAnalyzer: React.FC<ReachAnalyzerProps> = ({
  totalFollowers,
  isLoading: isLoadingTotalFollowers,
  error: totalFollowersError,
  scanLogs,
  followerResults,
  historicalFollowerData,
  onDeleteFollowerHistory
}) => {
  const [activeMonitorTab, setActiveMonitorTab] = useState<MonitorTab>('reach');
  const [lineProgress, setLineProgress] = useState(0);
  const animationFrameId = useRef<number | null>(null);
  const animationStartTime = useRef<number>(0);

  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelUpAvailable, setLevelUpAvailable] = useState(false);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [reachBarConfig, setReachBarConfig] = useState(calculateBarConfig(totalFollowers, currentLevel));

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


  const [artistSortColumn, setArtistSortColumn] = useState<ArtistSortableColumn>('matchedTracksCount');
  const [artistSortDirection, setArtistSortDirection] = useState<SortDirection>('desc');
  const [beatSortColumn, setBeatSortColumn] = useState<BeatSortableColumn>('totalMatches');
  const [beatSortDirection, setBeatSortDirection] = useState<SortDirection>('desc');


  const aggregatedArtistData: ArtistLeaderboardEntry[] = useMemo(() => {
    const artistMap = new Map<string, { name: string, id?: string, matches: AcrCloudMatch[], scanDates: string[] }>();
    scanLogs.forEach(log => {
      log.matches.forEach(match => {
        const artistKey = match.spotifyArtistId || match.artist;
        if (!artistMap.has(artistKey)) artistMap.set(artistKey, { name: match.artist, id: match.spotifyArtistId, matches: [], scanDates: [] });
        artistMap.get(artistKey)!.matches.push(match);
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
          const validDates = data.matches.map(m => m.releaseDate ? new Date(m.releaseDate).getTime() : 0).filter(ts => ts > 0 && !isNaN(ts));
          if(validDates.length > 0) mostRecentMatchedReleaseDate = new Date(Math.max(...validDates)).toLocaleDateString();
      }
      processedData.push({ artistName: data.name, spotifyArtistId: data.id, matchedTracksCount: data.matches.length, spotifyFollowers: followers, isFollowersLoading: isLoadingFollowers, followersError: errorFollowers, mostRecentMatchDate: mostRecentMatchedReleaseDate, spotifyPopularity: popularity, genres });
    });
    const maxFollowers = Math.max(0, ...processedData.map(a => a.spotifyFollowers ?? 0));
    return processedData.map((artist, index) => ({ ...artist, key: artist.spotifyArtistId || `${artist.artistName}-${index}`, followerBarPercent: maxFollowers > 0 && typeof artist.spotifyFollowers === 'number' ? (artist.spotifyFollowers / maxFollowers) * 100 : 0 }));
  }, [scanLogs, followerResults]);

  const currentArtistLevel = useMemo(() => calculateArtistLevel(aggregatedArtistData.length), [aggregatedArtistData.length]);

  const aggregatedBeatData: BeatStatsEntry[] = useMemo(() => {
    const beatMap = new Map<string, { matchedSongs: AcrCloudMatch[] }>();
    scanLogs.forEach(log => {
      if (!beatMap.has(log.originalFileName)) beatMap.set(log.originalFileName, { matchedSongs: [] });
      const existingMatches = beatMap.get(log.originalFileName)!.matchedSongs;
      log.matches.forEach(newMatch => { if (!existingMatches.find(m => m.id === newMatch.id)) existingMatches.push(newMatch); });
    });
    return Array.from(beatMap.entries()).map(([beatName, data]) => ({ beatName, totalMatches: data.matchedSongs.length, matchedSongs: data.matchedSongs.sort((a,b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()), key: beatName }));
  }, [scanLogs]);


  const renderTabContent = () => {
    if (isLoadingTotalFollowers && activeMonitorTab !== 'collaborationRadar' && activeMonitorTab !== 'beatStats' && aggregatedArtistData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center flex-grow py-4">
                <ProgressBar text={`Loading ${activeMonitorTab === 'reach' ? 'reach data' : 'artist statistics'}...`} />
                <p className="text-xs text-gray-700 text-center mt-1">This may take up to a minute.</p>
            </div>
        );
    }

    switch (activeMonitorTab) {
      case 'reach':
        return (
          <>
            <TotalReachDisplay
              totalFollowers={totalFollowers}
              isLoading={isLoadingTotalFollowers}
              error={totalFollowersError}
              currentLevel={currentLevel}
              levelUpAvailable={levelUpAvailable}
              isLevelingUp={isLevelingUp}
              onLevelUp={handleLevelUp}
              reachBarConfig={reachBarConfig}
              activeBarAndLineColor={activeBarAndLineColor}
              lineProgress={lineProgress}
            />
            <TimeBasedReachGraph
              historicalFollowerData={historicalFollowerData}
              isLoadingHistory={isLoadingTotalFollowers && historicalFollowerData.length === 0}
              onDeleteFollowerHistory={onDeleteFollowerHistory}
              activeBarAndLineColor={activeBarAndLineColor}
            />
          </>
        );
      case 'artistStats':
        return (
          <ArtistStatsTable
            aggregatedArtistData={aggregatedArtistData}
            isLoading={isLoadingTotalFollowers && aggregatedArtistData.length === 0}
            currentArtistLevel={currentArtistLevel}
            sortColumn={artistSortColumn}
            sortDirection={artistSortDirection}
            onSort={setArtistSortColumn}
            onSortDirection={setArtistSortDirection}
          />
        );
      case 'beatStats':
        // Beat stats don't directly depend on isLoadingTotalFollowers, so they show if data is present.
        if (aggregatedBeatData.length === 0 && scanLogs.length > 0) {
            return <p className="text-center text-gray-700 py-8">No beat data available from current scans.</p>;
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
      default:
        return null;
    }
  };

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
export default React.memo(ReachAnalyzer);
