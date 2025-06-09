
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TrackScanLog, AcrCloudMatch, SpotifyTrackDetails, SpotifyFollowerResult } from '../types'; // Uses TrackScanLog
import Button from './common/Button';
import TrashIcon from './icons/TrashIcon';
import ArtistFollowers from './common/ArtistFollowers';
// import { SpotifyFollowerResult } from '../types'; // Import for follower data type from types.ts (already in first line)
import HeadphonesIcon from './icons/HeadphonesIcon';
import AudioPlayer from './common/AudioPlayer';
import PlayIcon from './icons/PlayIcon'; // For disabling button feedback
import PauseIcon from './icons/PauseIcon'; // Added import for PauseIcon
import ProgressBar from './common/ProgressBar';


type SortableColumn =
  | 'title'
  | 'artist'
  | 'followers'
  | 'album'
  | 'releaseDate'
  | 'matchConfidence'
  | 'originalScanDate';

type SortDirection = 'asc' | 'desc';

interface PreviousScansProps {
  scanLogs: TrackScanLog[];
  followerResults: Map<string, SpotifyFollowerResult>;
  onDeleteScan: (logId: string) => void;
  onClearAllScans: () => void;
}

interface DisplayableTableRow {
  isMatchRow: boolean;
  hasAnyMatchesInLog: boolean;
  logId: string;
  originalFileName: string;
  originalScanDate: string;
  matchDetails?: AcrCloudMatch;
  statusMessage?: string;
  rowKey: string;
  spotifyTrackIdToPlay?: string; // Added to easily identify playable tracks
}

const PreviousScans: React.FC<PreviousScansProps> = ({ scanLogs, followerResults, onDeleteScan, onClearAllScans }) => {

  const [sortColumn, setSortColumn] = useState<SortableColumn | null>('originalScanDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Audio Player State
  const [currentPlayingInfo, setCurrentPlayingInfo] = useState<{
    trackId: string; // Spotify Track ID
    previewUrl: string | null;
    trackName: string;
    artistName: string;
    rowIndex: number; // Index in sortedTableRows for scrolling
  } | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLDivElement>(null); // For player visibility
  const tableRowRefs = useRef<(HTMLTableRowElement | null)[]>([]);


  const initialTableRows = useMemo(() => {
    return scanLogs.reduce((acc, log: TrackScanLog, logIndex: number) => {
      const hasMatches = log.matches.length > 0 && (log.status === 'matches_found' || log.status === 'partially_completed');
      if (hasMatches) {
        log.matches.forEach((match: AcrCloudMatch, matchIndex: number) => {
          acc.push({
            isMatchRow: true,
            hasAnyMatchesInLog: true,
            logId: log.logId,
            originalFileName: log.originalFileName,
            originalScanDate: log.scanDate,
            matchDetails: match,
            statusMessage: log.status === 'partially_completed' ? "Partial Scan (some segments failed)" : undefined,
            rowKey: `${log.logId}-match-${match.id}-${matchIndex}`,
            spotifyTrackIdToPlay: match.spotifyTrackId
          });
        });
      } else {
        let message = "No Matches Found";
        if (log.status === 'error_processing') message = "Error Processing Track";
        else if (log.status === 'partially_completed') message = "Partial Scan (no matches found)";
        acc.push({
          isMatchRow: false,
          hasAnyMatchesInLog: false,
          logId: log.logId,
          originalFileName: log.originalFileName,
          originalScanDate: log.scanDate,
          statusMessage: message,
          rowKey: `${log.logId}-status-${logIndex}`,
          spotifyTrackIdToPlay: undefined
        });
      }
      return acc;
    }, [] as DisplayableTableRow[]);
  }, [scanLogs]);


  const sortedTableRows = useMemo(() => {
    if (!sortColumn) return initialTableRows;

    const sorted = [...initialTableRows].sort((a, b) => {
      if (a.isMatchRow && !b.isMatchRow) return -1;
      if (!a.isMatchRow && b.isMatchRow) return 1;
      if (!a.isMatchRow && !b.isMatchRow) {
        const dateA = new Date(a.originalScanDate).getTime();
        const dateB = new Date(b.originalScanDate).getTime();
        if (dateA !== dateB) return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        return a.originalFileName.localeCompare(b.originalFileName);
      }

      let valA: any, valB: any;
      switch (sortColumn) {
        case 'title':
          valA = a.matchDetails?.title || ''; valB = b.matchDetails?.title || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'artist':
          valA = a.matchDetails?.artist || ''; valB = b.matchDetails?.artist || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'followers':
          const followerResultA = a.matchDetails?.spotifyArtistId ? followerResults.get(a.matchDetails.spotifyArtistId) : undefined;
          const followerResultB = b.matchDetails?.spotifyArtistId ? followerResults.get(b.matchDetails.spotifyArtistId) : undefined;
          valA = (followerResultA?.status === 'success' && typeof followerResultA.followers === 'number') ? followerResultA.followers : -1;
          valB = (followerResultB?.status === 'success' && typeof followerResultB.followers === 'number') ? followerResultB.followers : -1;
          break;
        case 'album':
          valA = a.matchDetails?.album || ''; valB = b.matchDetails?.album || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'releaseDate':
          valA = a.matchDetails?.releaseDate ? new Date(a.matchDetails.releaseDate).getTime() : 0;
          valB = b.matchDetails?.releaseDate ? new Date(b.matchDetails.releaseDate).getTime() : 0;
          if (isNaN(valA)) valA = sortDirection === 'asc' ? Infinity : -Infinity;
          if (isNaN(valB)) valB = sortDirection === 'asc' ? Infinity : -Infinity;
          break;
        case 'matchConfidence':
          valA = a.matchDetails?.matchConfidence ?? 0; valB = b.matchDetails?.matchConfidence ?? 0;
          break;
        case 'originalScanDate':
          valA = new Date(a.originalScanDate).getTime(); valB = new Date(b.originalScanDate).getTime();
          break;
        default: return 0;
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
    // Reset tableRowRefs size when sortedTableRows changes
    tableRowRefs.current = tableRowRefs.current.slice(0, sorted.length);
    return sorted;
  }, [initialTableRows, sortColumn, sortDirection, followerResults]);

  useEffect(() => {
    // Scroll to playing track
    if (currentPlayingInfo && currentPlayingInfo.rowIndex >= 0 && tableRowRefs.current[currentPlayingInfo.rowIndex]) {
      tableRowRefs.current[currentPlayingInfo.rowIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentPlayingInfo?.rowIndex, currentPlayingInfo?.trackId]);


  const handlePlayTrack = async (trackId: string, rowIndex: number, defaultTitle: string, defaultArtist: string) => {
    if (currentPlayingInfo?.trackId === trackId && isAudioPlaying) {
      setIsAudioPlaying(false); // Pause if playing the same track
      return;
    }
    if (currentPlayingInfo?.trackId === trackId && !isAudioPlaying && currentPlayingInfo.previewUrl) {
       setIsAudioPlaying(true); // Play if paused on the same track with a valid URL
       return;
    }

    setIsFetchingPreview(true);
    setAudioError(null);
    setCurrentPlayingInfo({ trackId, previewUrl: null, trackName: defaultTitle, artistName: defaultArtist, rowIndex});
    setIsAudioPlaying(false); // Ensure it's set to false initially

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/spotify-track-details?trackId=${trackId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({message: 'Failed to fetch preview info.'}));
        throw new Error(errData.message || `Error ${response.status}`);
      }
      const data: SpotifyTrackDetails = await response.json();
      if (data.previewUrl) {
        setCurrentPlayingInfo({ trackId, previewUrl: data.previewUrl, trackName: data.trackName, artistName: data.artistName, rowIndex });
        setIsAudioPlaying(true);
      } else {
        setAudioError(`No preview available for ${data.trackName}.`);
        setCurrentPlayingInfo(null);
        setIsAudioPlaying(false);
      }
    } catch (err: any) {
      setAudioError(err.message || "Could not load preview.");
      setCurrentPlayingInfo(null);
      setIsAudioPlaying(false);
    } finally {
      setIsFetchingPreview(false);
    }
  };

  const handlePlayPause = () => {
    if (currentPlayingInfo?.previewUrl) {
      setIsAudioPlaying(!isAudioPlaying);
    }
  };

  const playNextTrack = () => {
    if (!currentPlayingInfo) return;
    let nextPlayableIndex = -1;
    for (let i = currentPlayingInfo.rowIndex + 1; i < sortedTableRows.length; i++) {
      if (sortedTableRows[i].spotifyTrackIdToPlay) {
        nextPlayableIndex = i;
        break;
      }
    }
    // If no next track found, try from the beginning (loop)
    if (nextPlayableIndex === -1) {
      for (let i = 0; i < currentPlayingInfo.rowIndex; i++) {
         if (sortedTableRows[i].spotifyTrackIdToPlay) {
            nextPlayableIndex = i;
            break;
         }
      }
    }

    if (nextPlayableIndex !== -1) {
      const nextTrack = sortedTableRows[nextPlayableIndex];
      if (nextTrack.spotifyTrackIdToPlay) {
        handlePlayTrack(
            nextTrack.spotifyTrackIdToPlay,
            nextPlayableIndex,
            nextTrack.matchDetails?.title || 'Unknown Title',
            nextTrack.matchDetails?.artist || 'Unknown Artist'
        );
      }
    } else {
        // No other playable track found, stop player
        setCurrentPlayingInfo(null);
        setIsAudioPlaying(false);
    }
  };

  const handleAudioEnded = () => {
    playNextTrack();
  };

  const handleSkipNext = () => {
    playNextTrack();
  };

  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      if (column === 'title' || column === 'artist' || column === 'album') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc');
      }
    }
  };

  const renderSortArrow = (column: SortableColumn) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? ' ▲' : ' ▼';
    }
    return '';
  };

  const containerStyles = "p-0.5 win95-border-outset bg-[#C0C0C0] mt-4";
  const innerContainerStyles = "p-2 bg-[#C0C0C0]";

   if (scanLogs.length === 0) {
    return null;
  }

  return (
    <div className={containerStyles}>
      <div className={innerContainerStyles}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-normal text-black">Scan History</h3>
          {scanLogs.length > 0 && (
            <Button onClick={onClearAllScans} size="sm" className="p-1" aria-label="Clear all scan history" title="Clear all scan history">
              <TrashIcon className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {sortedTableRows.length === 0 ? (
           <p className="text-black text-center py-2 text-sm">No items to display in history.</p>
        ) : (
          <div className="overflow-x-auto win95-border-inset bg-white relative">
            {isFetchingPreview && !currentPlayingInfo?.previewUrl && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
                    <div className="w-48">
                        <ProgressBar text="Fetching preview..." />
                    </div>
                </div>
            )}
            <table className="min-w-full text-sm" style={{tableLayout: 'fixed'}}>
              <colgroup>
                <col style={{ width: '50px' }} /> {/* Preview Button */}
                <col style={{ width: '65px' }} /> {/* Links */}
                <col style={{ width: '20%' }} />  {/* Title / Status */}
                <col style={{ width: '15%' }} />  {/* Artist */}
                <col style={{ width: '100px' }} />{/* Followers */}
                <col style={{ width: '15%' }} />  {/* Album */}
                <col style={{ width: '110px' }} />{/* Released */}
                <col style={{ width: '70px' }} /> {/* Conf. */}
                <col style={{ width: '15%' }} />  {/* Original Upload */}
                <col style={{ width: '65px' }} /> {/* Action */}
              </colgroup>
              <thead className="bg-[#C0C0C0] border-b-2 border-b-[#808080]">
                <tr>
                  <th scope="col" className="px-1 py-1 text-left font-normal text-black truncate">Play</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black truncate">Links</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black truncate hover:bg-gray-300 cursor-pointer" onClick={() => handleSort('title')}>Title/Status{renderSortArrow('title')}</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black truncate hover:bg-gray-300 cursor-pointer" onClick={() => handleSort('artist')}>Artist{renderSortArrow('artist')}</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black truncate hover:bg-gray-300 cursor-pointer" onClick={() => handleSort('followers')}>Followers{renderSortArrow('followers')}</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black truncate hover:bg-gray-300 cursor-pointer" onClick={() => handleSort('album')}>Album{renderSortArrow('album')}</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black truncate hover:bg-gray-300 cursor-pointer" onClick={() => handleSort('releaseDate')}>Released{renderSortArrow('releaseDate')}</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black truncate hover:bg-gray-300 cursor-pointer" onClick={() => handleSort('matchConfidence')}>Conf.{renderSortArrow('matchConfidence')}</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black truncate hover:bg-gray-300 cursor-pointer" onClick={() => handleSort('originalScanDate')}>Original Upload{renderSortArrow('originalScanDate')}</th>
                  <th scope="col" className="px-1 py-1 text-center font-normal text-black truncate">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {sortedTableRows.map((row, index) => {
                  const followerInfo = row.isMatchRow && row.matchDetails?.spotifyArtistId ? followerResults.get(row.matchDetails.spotifyArtistId) : undefined;
                  let followersDisplay: number | null | undefined = undefined;
                  let followerError: string | undefined = undefined;
                  let isArtistFollowerLoading = false;

                  if (followerInfo) {
                    if (followerInfo.status === 'success') followersDisplay = followerInfo.followers;
                    else if (followerInfo.status === 'error') { followersDisplay = null; followerError = followerInfo.reason; }
                    else if (followerInfo.status === 'loading') isArtistFollowerLoading = true;
                    else followersDisplay = null;
                  } else if (row.isMatchRow && row.matchDetails?.spotifyArtistId) {
                     isArtistFollowerLoading = true;
                  }
                  const isCurrentlyPlayingThisRow = currentPlayingInfo?.trackId === row.spotifyTrackIdToPlay && currentPlayingInfo.rowIndex === index;

                  return (
                    <tr
                        key={row.rowKey}
                        ref={el => { tableRowRefs.current[index] = el; }}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-100'} ${!row.hasAnyMatchesInLog && row.isMatchRow === false ? 'opacity-75' : ''} ${isCurrentlyPlayingThisRow ? 'bg-blue-200' : ''}`}
                    >
                      <td className="px-1 py-0.5 text-center">
                        {row.spotifyTrackIdToPlay ? (
                          <button
                            onClick={() => handlePlayTrack(row.spotifyTrackIdToPlay!, index, row.matchDetails?.title || 'Unknown Title', row.matchDetails?.artist || 'Unknown Artist')}
                            disabled={isFetchingPreview && currentPlayingInfo?.trackId === row.spotifyTrackIdToPlay && !currentPlayingInfo?.previewUrl}
                            className="p-0.5 win95-button-sm bg-[#C0C0C0] disabled:opacity-50"
                            title={`Preview ${row.matchDetails?.title}`}
                          >
                            {isCurrentlyPlayingThisRow && isAudioPlaying ? <PauseIcon className="w-3 h-3 text-black"/> : <HeadphonesIcon className="w-3 h-3 text-black" />}
                          </button>
                        ) : (
                           <button className="p-0.5 win95-button-sm bg-[#C0C0C0] opacity-50 cursor-not-allowed" disabled title="No preview available">
                               <HeadphonesIcon className="w-3 h-3 text-gray-400"/>
                           </button>
                        )}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        {row.isMatchRow && row.matchDetails?.platformLinks?.spotify && (
                          <a href={row.matchDetails.platformLinks.spotify} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline mr-1" title="Spotify">SP</a>
                        )}
                        {row.isMatchRow && row.matchDetails?.platformLinks?.youtube && (
                          <a href={row.matchDetails.platformLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline" title="YouTube">YT</a>
                        )}
                        {(!row.isMatchRow || (!row.matchDetails?.platformLinks?.spotify && !row.matchDetails?.platformLinks?.youtube)) && <span className="text-gray-500">-</span>}
                      </td>
                      <td className="px-2 py-1 text-black truncate" title={row.isMatchRow ? row.matchDetails?.title : row.statusMessage}>
                        {row.isMatchRow ? row.matchDetails?.title : <span className="italic">{row.statusMessage}</span>}
                      </td>
                      <td className="px-2 py-1 text-gray-700 truncate" title={row.isMatchRow ? row.matchDetails?.artist : "N/A"}>
                        {row.isMatchRow ? row.matchDetails?.artist : "N/A"}
                      </td>
                      <td className="px-2 py-1 text-gray-700 truncate">
                        {row.isMatchRow && row.matchDetails?.spotifyArtistId ? (
                           <ArtistFollowers followers={followersDisplay} isLoading={isArtistFollowerLoading} error={followerError} />
                         ) : <span className="text-gray-500">-</span>}
                      </td>
                      <td className="px-2 py-1 text-gray-700 truncate" title={row.isMatchRow ? row.matchDetails?.album : "N/A"}>
                        {row.isMatchRow ? row.matchDetails?.album : "N/A"}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-gray-700">
                        {row.isMatchRow ? row.matchDetails?.releaseDate : "N/A"}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-gray-700">
                        {row.isMatchRow && typeof row.matchDetails?.matchConfidence !== 'undefined' ? (
                          <span className={`px-1 ${ 
                            row.matchDetails.matchConfidence > 80 ? 'text-green-700' : 
                            row.matchDetails.matchConfidence > 60 ? 'text-yellow-700' : 'text-red-700'
                          }`}>
                            {row.matchDetails.matchConfidence}%
                          </span>
                        ) : <span className="text-gray-500">-</span>}
                      </td>
                      <td className="px-2 py-1 text-black truncate" title={row.originalFileName}>
                        {row.originalFileName}
                         {row.statusMessage && row.isMatchRow && <span className="text-xs text-gray-500 italic ml-1">({row.statusMessage})</span>}
                      </td>
                      <td className="px-1 py-0.5 whitespace-nowrap text-center">
                        <Button
                          onClick={() => onDeleteScan(row.logId)}
                          size="sm" className="p-0.5 !text-xs"
                          title={`Delete scan log for ${row.originalFileName}`}
                        >
                          <TrashIcon className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {sortedTableRows.length > 10 && <p className="mt-1 text-xs text-gray-700 text-center">{sortedTableRows.length} items shown in history.</p>}
      </div>
      {currentPlayingInfo && (
        <AudioPlayer
            key={currentPlayingInfo.trackId}
            src={currentPlayingInfo.previewUrl}
            trackTitle={currentPlayingInfo.trackName}
            trackArtist={currentPlayingInfo.artistName}
            isPlaying={isAudioPlaying && !!currentPlayingInfo.previewUrl}
            isLoading={isFetchingPreview && !currentPlayingInfo.previewUrl}
            error={audioError}
            onPlayPause={handlePlayPause}
            onEnded={handleAudioEnded}
            onSkipNext={handleSkipNext}
        />
      )}
    </div>
  );
};

export default PreviousScans;
