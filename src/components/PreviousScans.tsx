
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TrackScanLog, AcrCloudMatch, SpotifyFollowerResult } from '../types';
import Button from './common/Button';
import TrashIcon from './icons/TrashIcon';
import ArtistFollowers from './common/ArtistFollowers';
import HeadphonesIcon from './icons/HeadphonesIcon';
import SpotifyPlayerControls from './common/AudioPlayer'; // Renamed to SpotifyPlayerControls
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import { useSpotifyPlayer } from '../contexts/SpotifyContext'; // Corrected import path


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
  spotifyTrackIdForPlayback?: string; // For identifying playable tracks from SDK
  spotifyTrackUri?: string; // e.g. spotify:track:TRACK_ID
}

const PreviousScans: React.FC<PreviousScansProps> = ({ scanLogs, followerResults, onDeleteScan, onClearAllScans }) => {
  const {
    player: spotifyPlayerInstance, // Renamed to avoid conflict with SDK's player object if any confusion
    playTrack: playSpotifyTrack,
    currentPlayingTrackInfo,
    currentState,
    isLoadingPlayback,
    // playbackError // Not directly used in this component's render, but available
  } = useSpotifyPlayer();

  const [sortColumn, setSortColumn] = useState<SortableColumn | null>('originalScanDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
            statusMessage: log.status === 'partially_completed' ? "Partial Scan" : undefined,
            rowKey: `${log.logId}-match-${match.id}-${matchIndex}`,
            spotifyTrackIdForPlayback: match.spotifyTrackId,
            spotifyTrackUri: match.spotifyTrackId ? `spotify:track:${match.spotifyTrackId}` : undefined
          });
        });
      } else {
        let message = "No Matches Found";
        if (log.status === 'error_processing') message = "Error Processing Track";
        else if (log.status === 'partially_completed') message = "Partial Scan (no matches)";
        acc.push({
          isMatchRow: false,
          hasAnyMatchesInLog: false,
          logId: log.logId,
          originalFileName: log.originalFileName,
          originalScanDate: log.scanDate,
          statusMessage: message,
          rowKey: `${log.logId}-status-${logIndex}`,
          spotifyTrackIdForPlayback: undefined,
          spotifyTrackUri: undefined
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

      // Both are match rows from here
      if (!a.matchDetails || !b.matchDetails) { // Should not happen if isMatchRow is true, but for type safety
          return 0;
      }

      let valA: any, valB: any;
      switch (sortColumn) {
        case 'title':
          valA = a.matchDetails.title || ''; valB = b.matchDetails.title || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'artist':
          valA = a.matchDetails.artist || ''; valB = b.matchDetails.artist || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'followers':
          const followerResultA = a.matchDetails.spotifyArtistId ? followerResults.get(a.matchDetails.spotifyArtistId) : undefined;
          const followerResultB = b.matchDetails.spotifyArtistId ? followerResults.get(b.matchDetails.spotifyArtistId) : undefined;
          valA = (followerResultA?.status === 'success' && typeof followerResultA.followers === 'number') ? followerResultA.followers : -1;
          valB = (followerResultB?.status === 'success' && typeof followerResultB.followers === 'number') ? followerResultB.followers : -1;
          break;
        case 'album':
          valA = a.matchDetails.album || ''; valB = b.matchDetails.album || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'releaseDate':
          valA = a.matchDetails.releaseDate ? new Date(a.matchDetails.releaseDate).getTime() : 0;
          valB = b.matchDetails.releaseDate ? new Date(b.matchDetails.releaseDate).getTime() : 0;
          if (isNaN(valA)) valA = sortDirection === 'asc' ? Infinity : -Infinity;
          if (isNaN(valB)) valB = sortDirection === 'asc' ? Infinity : -Infinity;
          break;
        case 'matchConfidence':
          valA = a.matchDetails.matchConfidence ?? 0; valB = b.matchDetails.matchConfidence ?? 0;
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
    tableRowRefs.current = tableRowRefs.current.slice(0, sorted.length);
    return sorted;
  }, [initialTableRows, sortColumn, sortDirection, followerResults]);

  const activePlayingTrackUri = currentState?.track_window.current_track?.uri;
  const isCurrentTrackPaused = currentState?.paused;

  useEffect(() => {
    if (activePlayingTrackUri && currentPlayingTrackInfo?.uri === activePlayingTrackUri) {
      const playingRowIndex = sortedTableRows.findIndex(row => row.spotifyTrackUri === activePlayingTrackUri);
      if (playingRowIndex !== -1 && tableRowRefs.current[playingRowIndex]) {
        tableRowRefs.current[playingRowIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activePlayingTrackUri, currentPlayingTrackInfo, sortedTableRows]);


  const handlePlaySpotifyTrack = (trackUri: string, trackId: string, title: string, artist: string) => {
     if (activePlayingTrackUri === trackUri && !isCurrentTrackPaused) {
        spotifyPlayerInstance?.pause();
     } else if (activePlayingTrackUri === trackUri && isCurrentTrackPaused) {
        spotifyPlayerInstance?.resume();
     }
     else {
        playSpotifyTrack(trackUri, trackId, title, artist);
     }
  };

  const playNextTrackInList = () => {
    if (!currentPlayingTrackInfo || !currentPlayingTrackInfo.uri) return;
    const currentIndex = sortedTableRows.findIndex(row => row.spotifyTrackUri === currentPlayingTrackInfo.uri);
    if (currentIndex === -1) return;

    let nextPlayableIndex = -1;
    for (let i = currentIndex + 1; i < sortedTableRows.length; i++) {
      if (sortedTableRows[i].spotifyTrackUri && sortedTableRows[i].spotifyTrackIdForPlayback) {
        nextPlayableIndex = i;
        break;
      }
    }
    if (nextPlayableIndex === -1) {
      for (let i = 0; i < currentIndex; i++) {
        if (sortedTableRows[i].spotifyTrackUri && sortedTableRows[i].spotifyTrackIdForPlayback) {
          nextPlayableIndex = i;
          break;
        }
      }
    }

    if (nextPlayableIndex !== -1) {
      const nextTrack = sortedTableRows[nextPlayableIndex];
      if (nextTrack.spotifyTrackUri && nextTrack.spotifyTrackIdForPlayback && nextTrack.matchDetails) {
         playSpotifyTrack(
            nextTrack.spotifyTrackUri,
            nextTrack.spotifyTrackIdForPlayback,
            nextTrack.matchDetails.title,
            nextTrack.matchDetails.artist
        );
      }
    }
  };

  const playPreviousTrackInList = () => {
    if (!currentPlayingTrackInfo || !currentPlayingTrackInfo.uri) return;
    const currentIndex = sortedTableRows.findIndex(row => row.spotifyTrackUri === currentPlayingTrackInfo.uri);
    if (currentIndex === -1) return;

    let prevPlayableIndex = -1;
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (sortedTableRows[i].spotifyTrackUri && sortedTableRows[i].spotifyTrackIdForPlayback) {
        prevPlayableIndex = i;
        break;
      }
    }
    if (prevPlayableIndex === -1) {
      for (let i = sortedTableRows.length - 1; i > currentIndex; i--) {
         if (sortedTableRows[i].spotifyTrackUri && sortedTableRows[i].spotifyTrackIdForPlayback) {
          prevPlayableIndex = i;
          break;
        }
      }
    }
    if (prevPlayableIndex !== -1) {
      const prevTrack = sortedTableRows[prevPlayableIndex];
      if (prevTrack.spotifyTrackUri && prevTrack.spotifyTrackIdForPlayback && prevTrack.matchDetails) {
        playSpotifyTrack(
            prevTrack.spotifyTrackUri,
            prevTrack.spotifyTrackIdForPlayback,
            prevTrack.matchDetails.title,
            prevTrack.matchDetails.artist
        );
      }
    }
  };


  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const renderSortArrow = (column: SortableColumn) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? ' ▲' : ' ▼';
    }
    return '';
  };


  const HeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableHeaderCellElement> & {sortKey?: SortableColumn, width?: string}> = ({ children, sortKey, width, className, ...props }) => (
    <th
        scope="col"
        className={`px-2 py-1 text-left font-normal text-black win95-border-outset border-b-2 border-r-2 border-b-[#808080] border-r-[#808080] select-none whitespace-nowrap ${sortKey ? 'cursor-pointer' : ''} ${className || ''}`}
        style={{width: width}}
        onClick={sortKey ? () => handleSort(sortKey) : undefined}
        {...props}
    >
        {children}{sortKey && renderSortArrow(sortKey)}
    </th>
);

  const DataCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ children, className, ...props }) => (
    <td className={`px-2 py-1 text-gray-800 truncate whitespace-nowrap ${className || ''}`} {...props}>
      {children}
    </td>
  );

  const containerStyles = "p-0.5 win95-border-outset bg-[#C0C0C0]";
  const innerContainerStyles = "p-2 bg-[#C0C0C0]";

  if (scanLogs.length === 0 && sortedTableRows.length === 0) {
    return null;
  }

  const hasAnyMatchesInAnyLog = scanLogs.some(log => log.matches.length > 0 && (log.status === 'matches_found' || log.status === 'partially_completed'));

  if (!hasAnyMatchesInAnyLog && scanLogs.length > 0) {
     return (
      <div className={containerStyles}>
        <div className={innerContainerStyles}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-normal text-black">All Scan Records</h3>
            {scanLogs.length > 0 && (
              <Button
                onClick={onClearAllScans}
                size="sm"
                className="p-1"
                aria-label="Clear all records"
                title="Clear all records"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <p className="text-black text-center py-2 text-sm">No song matches found in your scan history.</p>
          <p className="text-xs text-gray-700 text-center">{scanLogs.length} scan record(s) processed without finding song matches or with errors.</p>
        </div>
      </div>
    );
  }


  return (
    <div className={containerStyles}>
      <div className={innerContainerStyles}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-normal text-black">Matched Songs & Scan Log</h3>
          {scanLogs.length > 0 && (
            <Button
              onClick={onClearAllScans}
              size="sm"
              className="p-1"
              aria-label="Clear all scan records"
              title="Clear all scan records"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="overflow-x-auto win95-border-inset bg-white max-h-[calc(100vh-350px)]">
          <table className="min-w-full text-sm" style={{tableLayout: 'fixed'}}>
             <colgroup>
                <col style={{ width: '5%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '8%' }} />
            </colgroup>
            <thead className="bg-[#C0C0C0] border-b-2 border-b-[#808080] sticky top-0 z-10">
              <tr>
                <HeaderCell className="text-center"><HeadphonesIcon className="w-4 h-4 inline-block"/></HeaderCell>
                <HeaderCell sortKey="title">Song Title</HeaderCell>
                <HeaderCell sortKey="artist">Artist</HeaderCell>
                <HeaderCell sortKey="followers" className="text-center">Followers</HeaderCell>
                <HeaderCell sortKey="album">Album</HeaderCell>
                <HeaderCell sortKey="releaseDate" className="text-center">Released</HeaderCell>
                <HeaderCell sortKey="matchConfidence" className="text-center">Conf.</HeaderCell>
                <HeaderCell sortKey="originalScanDate">Your Upload</HeaderCell>
                <HeaderCell className="text-center">Action</HeaderCell>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedTableRows.map((row, rowIndex) => {
                const followerInfo = row.matchDetails?.spotifyArtistId ? followerResults.get(row.matchDetails.spotifyArtistId) : undefined;
                return (
                <tr
                    key={row.rowKey}
                    ref={el => { tableRowRefs.current[rowIndex] = el; }}
                    className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-100'} ${currentPlayingTrackInfo?.uri === row.spotifyTrackUri ? 'bg-blue-200 text-black' : ''}`}
                >
                  {row.isMatchRow && row.matchDetails ? (
                    <>
                      <DataCell className="text-center">
                        {row.spotifyTrackUri && (
                           <button
                            onClick={() => handlePlaySpotifyTrack(row.spotifyTrackUri!, row.matchDetails!.spotifyTrackId!, row.matchDetails!.title, row.matchDetails!.artist)}
                            className={`p-1 win95-button-sm disabled:opacity-50 ${currentPlayingTrackInfo?.uri === row.spotifyTrackUri && !isCurrentTrackPaused && !isLoadingPlayback ? 'bg-blue-300' : 'bg-[#C0C0C0]'}`}
                            disabled={isLoadingPlayback && currentPlayingTrackInfo?.uri !== row.spotifyTrackUri}
                            title={currentPlayingTrackInfo?.uri === row.spotifyTrackUri && !isCurrentTrackPaused ? `Pause ${row.matchDetails.title}` : `Play ${row.matchDetails.title}`}
                          >
                            {isLoadingPlayback && currentPlayingTrackInfo?.uri === row.spotifyTrackUri ? (
                                <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            ) : currentPlayingTrackInfo?.uri === row.spotifyTrackUri && !isCurrentTrackPaused ? (
                              <PauseIcon className="w-3 h-3" />
                            ) : (
                              <PlayIcon className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </DataCell>
                      <DataCell title={row.matchDetails.title}>{row.matchDetails.title}</DataCell>
                      <DataCell title={row.matchDetails.artist}>{row.matchDetails.artist}</DataCell>
                      <DataCell className="text-center">
                        <ArtistFollowers
                          followers={followerInfo?.status === 'success' ? followerInfo.followers : undefined}
                          isLoading={followerInfo?.status === 'loading'}
                          error={followerInfo?.status === 'error' ? followerInfo.reason : undefined}
                        />
                      </DataCell>
                      <DataCell title={row.matchDetails.album}>{row.matchDetails.album}</DataCell>
                      <DataCell className="text-center">{row.matchDetails.releaseDate}</DataCell>
                      <DataCell className="text-center">
                        <span className={`px-1 ${
                          row.matchDetails.matchConfidence > 80 ? 'text-green-700' : 
                          row.matchDetails.matchConfidence > 60 ? 'text-yellow-700' : 'text-red-700'
                        }`}>
                          {row.matchDetails.matchConfidence}%
                        </span>
                      </DataCell>
                    </>
                  ) : (
                     <td colSpan={7} className="px-2 py-1 text-center text-gray-500 italic">
                        {row.statusMessage || "No match data"} {row.statusMessage && `for "${row.originalFileName}"`}
                    </td>
                  )}
                   <DataCell title={row.originalFileName}>
                        {row.originalFileName}
                        {row.statusMessage && row.isMatchRow && <div className="text-[10px] text-yellow-600 italic leading-tight">{row.statusMessage}</div>}
                    </DataCell>
                  <DataCell className="text-center">
                    <Button
                      onClick={() => onDeleteScan(row.logId)}
                      size="sm"
                      className="p-0.5 !text-xs"
                      title={`Delete scan record for ${row.originalFileName}`}
                    >
                      <TrashIcon className="h-3 w-3" />
                    </Button>
                  </DataCell>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
        {sortedTableRows.length > 10 && <p className="mt-1 text-xs text-gray-700 text-center">{sortedTableRows.length} rows shown (matches and non-matches).</p>}
      </div>
      <SpotifyPlayerControls
        onSkipNextProvided={playNextTrackInList}
        onSkipPreviousProvided={playPreviousTrackInList}
      />
    </div>
  );
};

export default PreviousScans;