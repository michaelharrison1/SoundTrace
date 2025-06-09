
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TrackScanLog, AcrCloudMatch, SpotifyFollowerResult } from '../types';
import Button from './common/Button';
import TrashIcon from './icons/TrashIcon';
import ArtistFollowers from './common/ArtistFollowers';
// HeadphonesIcon is removed as playback column is removed
// PlayIcon and PauseIcon are removed as playback is removed
import { useSpotifyPlayer } from '../contexts/SpotifyContext';
import SpotifyIcon from './icons/SpotifyIcon'; // Assuming a SpotifyIcon is created
import { spotifyStreamService } from '../services/spotifyStreamService'; // Import the new service

type SortableColumn =
  | 'title'
  | 'artist'
  | 'followers'
  | 'album'
  | 'releaseDate'
  | 'matchConfidence'
  | 'originalScanDate'
  | 'spotifyStreams'; // Added spotifyStreams

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
  // spotifyStreams specific state will be managed separately in component state
}

interface StreamFetchState {
  loading: boolean;
  count: number | null;
  error: string | null;
  status?: 'available' | 'unavailable_token_error' | 'unavailable_data_missing' | 'unavailable_api_error' | 'error_fetching';
  message?: string;
}

const PreviousScans: React.FC<PreviousScansProps> = ({ scanLogs, followerResults, onDeleteScan, onClearAllScans }) => {
  const {
    isSpotifyConnected,
    spotifyUser,
    initiateSpotifyLogin,
    createPlaylistAndAddTracks,
    isLoadingSpotifyAuth,
  } = useSpotifyPlayer();

  const [sortColumn, setSortColumn] = useState<SortableColumn | null>('originalScanDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isLoadingExport, setIsLoadingExport] = useState(false);
  const [exportMessage, setExportMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [streamCounts, setStreamCounts] = useState<Map<string, StreamFetchState>>(new Map());


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

      // Ensure matchDetails exist before accessing properties
      if (!a.matchDetails || !b.matchDetails) {
          // This case should ideally not be reached if isMatchRow logic is correct
          // but as a fallback, treat rows without matchDetails as equal or sort them to the end
          if (!a.matchDetails && b.matchDetails) return sortDirection === 'asc' ? 1 : -1;
          if (a.matchDetails && !b.matchDetails) return sortDirection === 'asc' ? -1 : 1;
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
        case 'spotifyStreams':
          const streamCountA = streamCounts.get(a.matchDetails.spotifyTrackId || '')?.count ?? -1;
          const streamCountB = streamCounts.get(b.matchDetails.spotifyTrackId || '')?.count ?? -1;
          valA = streamCountA; valB = streamCountB;
          break;
        default: return 0;
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
    return sorted;
  }, [initialTableRows, sortColumn, sortDirection, followerResults, streamCounts]);

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

  const handleFetchStreamCount = async (trackId: string) => {
    if (!trackId) return;
    setStreamCounts(prev => new Map(prev).set(trackId, { loading: true, count: null, error: null, status: undefined, message: undefined }));
    try {
      const data = await spotifyStreamService.getTrackStreams(trackId);
      setStreamCounts(prev => new Map(prev).set(trackId, {
        loading: false,
        count: data.streamCount,
        error: data.streamCountStatus !== 'available' ? (data.message || 'Failed to fetch streams') : null,
        status: data.streamCountStatus,
        message: data.message
      }));
    } catch (err: any) {
      console.error(`Error fetching streams for ${trackId}:`, err);
      setStreamCounts(prev => new Map(prev).set(trackId, {
        loading: false,
        count: null,
        error: err.message || 'Error fetching streams',
        status: 'error_fetching',
        message: err.message || 'Client-side error fetching streams'
      }));
    }
  };

  const formatStreamCount = (count: number | null): string => {
    if (count === null || typeof count === 'undefined') return '-'; // Use a dash for unavailable or null counts
    if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };


  const handleExportPlaylist = async () => {
    setExportMessage(null);
    if (!isSpotifyConnected || !spotifyUser) {
      const shouldLogin = window.confirm("You need to be connected to Spotify to export a playlist. Connect now?");
      if (shouldLogin) {
        initiateSpotifyLogin();
      } else {
        setExportMessage({type: 'error', text: "Spotify connection required to export."});
      }
      return;
    }

    const trackUrisToExport = sortedTableRows
      .filter(row => row.isMatchRow && row.matchDetails?.spotifyTrackId)
      .map(row => `spotify:track:${row.matchDetails!.spotifyTrackId!}`)
      .filter((uri, index, self) => self.indexOf(uri) === index); // Unique URIs

    if (trackUrisToExport.length === 0) {
      setExportMessage({type: 'error', text: "No Spotify tracks found in the current list to export."});
      return;
    }

    const defaultPlaylistName = `SoundTrace Export ${new Date().toLocaleDateString()}`;
    const playlistName = window.prompt("Enter a name for your new Spotify playlist:", defaultPlaylistName);

    if (playlistName === null) { // User cancelled prompt
      setExportMessage({type: 'error', text: "Playlist export cancelled."});
      return;
    }

    const finalPlaylistName = playlistName.trim() === '' ? defaultPlaylistName : playlistName.trim();

    setIsLoadingExport(true);
    const result = await createPlaylistAndAddTracks(finalPlaylistName, trackUrisToExport, "Tracks exported from SoundTrace app.");
    setIsLoadingExport(false);

    if (result.playlistUrl) {
      setExportMessage({type: 'success', text: `Playlist "${finalPlaylistName}" created! ${trackUrisToExport.length} track(s) added. View it on Spotify.`});
    } else {
      let errorMessage = result.error || "Failed to export playlist. Please try again.";
      if (result.error && (result.error.toLowerCase().includes('insufficient client scope') || result.error.toLowerCase().includes('forbidden'))) {
        errorMessage = "Error: SoundTrace doesn't have permission to create playlists. Please disconnect and reconnect Spotify in the header to grant access, then try again.";
      }
      setExportMessage({type: 'error', text: errorMessage});
    }
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

  return (
    <div className={containerStyles}>
      <div className={innerContainerStyles}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-normal text-black">Matched Songs & Scan Log</h3>
          <div className="flex items-center space-x-1">
            {hasAnyMatchesInAnyLog && (
               <Button
                onClick={handleExportPlaylist}
                size="sm"
                className="p-1 !text-xs"
                disabled={isLoadingExport || isLoadingSpotifyAuth || sortedTableRows.filter(row => row.isMatchRow && row.matchDetails?.spotifyTrackId).length === 0}
                isLoading={isLoadingExport}
                title="Export visible Spotify tracks to a new playlist"
              >
                Export to Spotify
              </Button>
            )}
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
        </div>
         {exportMessage && (
          <div className={`mb-2 p-2 text-sm border ${exportMessage.type === 'success' ? 'bg-green-100 border-green-700 text-green-700' : 'bg-red-100 border-red-700 text-red-700'}`}>
            {exportMessage.text}
          </div>
        )}

        {!hasAnyMatchesInAnyLog && scanLogs.length > 0 ? (
             <p className="text-black text-center py-2 text-sm">No song matches found in your scan history. {scanLogs.length} record(s) processed without matches or with errors.</p>
        ) : (
        <div className="overflow-x-auto win95-border-inset bg-white max-h-[calc(100vh-280px)]"> {/* Adjusted max-h */}
          <table className="min-w-full text-sm" style={{tableLayout: 'fixed'}}>
             <colgroup>
                <col style={{ width: '4%' }} /> {/* Spotify Link */}
                <col style={{ width: '16%' }} /> {/* Title */}
                <col style={{ width: '13%' }} /> {/* Artist */}
                <col style={{ width: '10%' }} /> {/* Followers */}
                <col style={{ width: '12%' }} /> {/* Spotify Streams */}
                <col style={{ width: '13%' }} /> {/* Album */}
                <col style={{ width: '8%' }} />  {/* Released */}
                <col style={{ width: '6%' }} />  {/* Confidence */}
                <col style={{ width: '10%' }} /> {/* Your Upload */}
                <col style={{ width: '8%' }} />  {/* Action */}
            </colgroup>
            <thead className="bg-[#C0C0C0] border-b-2 border-b-[#808080] sticky top-0 z-10">
              <tr>
                <HeaderCell className="text-center"><SpotifyIcon className="w-4 h-4 inline-block"/></HeaderCell>
                <HeaderCell sortKey="title">Song Title</HeaderCell>
                <HeaderCell sortKey="artist">Artist</HeaderCell>
                <HeaderCell sortKey="followers" className="text-center">Followers</HeaderCell>
                <HeaderCell sortKey="spotifyStreams" className="text-center">Streams</HeaderCell>
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
                const streamInfo = row.matchDetails?.spotifyTrackId ? streamCounts.get(row.matchDetails.spotifyTrackId) : undefined;

                let streamDisplayContent;
                if (streamInfo?.loading) {
                  streamDisplayContent = <span className="text-xs text-gray-500">Loading...</span>;
                } else if (streamInfo?.status && streamInfo.status !== 'available') {
                  let titleText = streamInfo.message || 'Stream count unavailable';
                  if (streamInfo.status === 'unavailable_token_error') titleText = 'Token error. Stream count unavailable.';
                  else if (streamInfo.status === 'unavailable_data_missing') titleText = 'Stream data missing from Spotify response.';
                  else if (streamInfo.status === 'unavailable_api_error') titleText = 'API error fetching streams.';
                  else if (streamInfo.status === 'error_fetching') titleText = `Client error: ${streamInfo.error || 'Unknown'}`;

                  streamDisplayContent = (
                    <Button size="sm" className="!p-0.5 !text-[10px] !min-w-[50px] !h-[18px]" onClick={() => row.matchDetails?.spotifyTrackId && handleFetchStreamCount(row.matchDetails.spotifyTrackId)} title={titleText}>
                      Retry
                    </Button>
                  );
                } else if (streamInfo?.count !== null && typeof streamInfo?.count !== 'undefined') {
                  streamDisplayContent = <span className="text-black">{formatStreamCount(streamInfo.count)}</span>;
                } else if (row.matchDetails?.spotifyTrackId) {
                  streamDisplayContent = <Button size="sm" className="!p-0.5 !text-[10px] !min-w-[50px] !h-[18px]" onClick={() => row.matchDetails?.spotifyTrackId && handleFetchStreamCount(row.matchDetails.spotifyTrackId)}>Fetch</Button>;
                } else {
                  streamDisplayContent = <span className="text-gray-400">-</span>;
                }

                return (
                <tr
                    key={row.rowKey}
                    className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-100'}`}
                >
                  {row.isMatchRow && row.matchDetails ? (
                    <>
                      <DataCell className="text-center">
                        {row.matchDetails.platformLinks?.spotify ? (
                          <a
                            href={row.matchDetails.platformLinks.spotify}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-semibold"
                            title={`Open ${row.matchDetails.title} on Spotify`}
                          >
                            SP
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
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
                      <DataCell className="text-center">{streamDisplayContent}</DataCell>
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
                     <td colSpan={8} className="px-2 py-1 text-center text-gray-500 italic"> {/* Adjusted colSpan */}
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
        )}
        {sortedTableRows.length > 10 && hasAnyMatchesInAnyLog && <p className="mt-1 text-xs text-gray-700 text-center">{sortedTableRows.length} rows shown.</p>}
      </div>
    </div>
  );
};

export default PreviousScans;
