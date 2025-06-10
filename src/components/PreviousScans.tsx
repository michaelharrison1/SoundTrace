import React, { useState, useMemo } from 'react';
import { TrackScanLog, AcrCloudMatch, SpotifyFollowerResult } from '../types';
import Button from './common/Button';
import TrashIcon from './icons/TrashIcon';
import ArtistFollowers from './common/ArtistFollowers';
import { useSpotifyPlayer } from '../contexts/SpotifyContext';
import UploadIcon from './icons/UploadIcon';
import StreamCountCell from './common/StreamCountCell'; // Import new component

type SortableColumn =
  | 'title'
  | 'artist'
  | 'followers'
  | 'album'
  | 'releaseDate'
  | 'matchConfidence'
  | 'originalScanDate'
  | 'spotifyStreams';

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
  
  // Stream counts state is now managed by StreamCountCell, but we might need a way to reference them for sorting
  // For simplicity, this example will sort based on the current display of StreamCountCell if possible,
  // or requires StreamCountCell to update a shared context/state if more robust sorting is needed.
  // For now, sorting by 'spotifyStreams' might be less accurate or disabled until a shared state is implemented.

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

      if (!a.matchDetails || !b.matchDetails) {
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
        // Sorting by 'spotifyStreams' is tricky here as StreamCountCell manages its own state.
        // A more robust solution would involve lifting stream count state or using a context.
        // For now, this sorting might not be perfectly accurate if counts aren't fetched for all visible rows.
        case 'spotifyStreams':
          // This is a placeholder for how one might attempt to get the value if it were available directly.
          // In reality, this would require StreamCountCell to report its value back or use a shared state.
          valA = -1; // Placeholder
          valB = -1; // Placeholder
          break;
        default: return 0;
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
    return sorted;
  }, [initialTableRows, sortColumn, sortDirection, followerResults]);

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
      .filter((uri, index, self) => self.indexOf(uri) === index);

    if (trackUrisToExport.length === 0) {
      setExportMessage({type: 'error', text: "No Spotify tracks found in the current list to export."});
      return;
    }

    const defaultPlaylistName = `SoundTrace Export ${new Date().toLocaleDateString()}`;
    const playlistName = window.prompt("Enter a name for your new Spotify playlist:", defaultPlaylistName);

    if (playlistName === null) {
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

  const escapeCsvCell = (cellData: any): string => {
    if (cellData == null) return '';
    const stringData = String(cellData);
    if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) {
      return `"${stringData.replace(/"/g, '""')}"`;
    }
    return stringData;
  };

  const handleExportToCSV = () => {
    const headers = [
      "Original File Name", "Original Scan Date", "Status",
      "Matched Song Title", "Matched Artist", "Matched Album", "Release Date",
      "Confidence (%)", "Spotify Link", "YouTube Link",
      "Spotify Artist ID", "Spotify Track ID",
      "Fetched Artist Followers", "Fetched Artist Popularity"
      // "Fetched Spotify Streams" - Omitting as it's not directly available here without significant state changes
    ];
    const csvRows = [headers.join(',')];

    sortedTableRows.forEach(row => {
      const rowData = [
        escapeCsvCell(row.originalFileName),
        escapeCsvCell(new Date(row.originalScanDate).toLocaleString()),
        escapeCsvCell(row.isMatchRow ? (row.statusMessage || 'Match Found') : row.statusMessage || 'No Match')
      ];

      if (row.isMatchRow && row.matchDetails) {
        const match = row.matchDetails;
        const followerInfo = match.spotifyArtistId ? followerResults.get(match.spotifyArtistId) : undefined;

        rowData.push(
          escapeCsvCell(match.title),
          escapeCsvCell(match.artist),
          escapeCsvCell(match.album),
          escapeCsvCell(match.releaseDate),
          escapeCsvCell(match.matchConfidence),
          escapeCsvCell(match.platformLinks?.spotify),
          escapeCsvCell(match.platformLinks?.youtube),
          escapeCsvCell(match.spotifyArtistId),
          escapeCsvCell(match.spotifyTrackId),
          escapeCsvCell(followerInfo?.status === 'success' ? followerInfo.followers : (followerInfo?.status === 'loading' ? 'Loading...' : 'N/A')),
          escapeCsvCell(followerInfo?.status === 'success' ? followerInfo.popularity : (followerInfo?.status === 'loading' ? 'Loading...' : 'N/A'))
        );
      } else {
        rowData.push(...Array(headers.length - rowData.length).fill(''));
      }
      csvRows.push(rowData.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `soundtrace_scan_logs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  const HeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableHeaderCellElement> & {sortKey?: SortableColumn, width?: string}> = React.memo(({ children, sortKey, width, className, ...props }) => (
    <th
        scope="col"
        className={`px-2 py-1 text-left font-normal text-black win95-border-outset border-b-2 border-r-2 border-b-[#808080] border-r-[#808080] select-none whitespace-nowrap ${sortKey ? 'cursor-pointer hover:bg-gray-300' : ''} ${className || ''}`}
        style={{width: width}}
        onClick={sortKey ? () => handleSort(sortKey) : undefined}
        {...props}
    >
        {children}{sortKey && renderSortArrow(sortKey)}
    </th>
  ));
  HeaderCell.displayName = 'HeaderCell';


  const DataCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = React.memo(({ children, className, ...props }) => (
    <td className={`px-2 py-1 text-gray-800 truncate whitespace-nowrap ${className || ''}`} {...props}>
      {children}
    </td>
  ));
  DataCell.displayName = 'DataCell';

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
          <h3 className="text-lg font-normal text-black">Beat Matches & Scan Log</h3>
          <div className="flex items-center space-x-1">
            {hasAnyMatchesInAnyLog && (
               <Button
                onClick={handleExportPlaylist}
                size="sm"
                className="p-1 !text-xs hover:bg-gray-300"
                disabled={isLoadingExport || isLoadingSpotifyAuth || sortedTableRows.filter(row => row.isMatchRow && row.matchDetails?.spotifyTrackId).length === 0}
                isLoading={isLoadingExport}
                title="Export visible Spotify tracks to a new playlist"
              >
                Export to Spotify
              </Button>
            )}
            <Button
              onClick={handleExportToCSV}
              size="sm"
              className="p-1 !text-xs hover:bg-gray-300"
              title="Export current table view to CSV"
              icon={<UploadIcon className="w-3 h-3 transform rotate-180"/>}
            >
              Export Table CSV
            </Button>
            {scanLogs.length > 0 && (
              <Button
                onClick={onClearAllScans}
                size="sm"
                className="p-1 hover:bg-gray-300"
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
        <div className="text-xs text-gray-600 mb-1" title="Click column headers to sort.">
            ℹ️ Click column headers to sort.
        </div>

        {!hasAnyMatchesInAnyLog && scanLogs.length > 0 ? (
             <p className="text-black text-center py-2 text-sm">No song matches found in your scan history. {scanLogs.length} record(s) processed without matches or with errors.</p>
        ) : (
        <div className="overflow-x-auto win95-border-inset bg-white max-h-[calc(100vh-320px)]">
          <table className="min-w-full text-sm" style={{tableLayout: 'fixed'}}>
             <colgroup>
                <col style={{ width: '4%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '6%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '8%' }} />
            </colgroup>
            <thead className="bg-[#C0C0C0] border-b-2 border-b-[#808080] sticky top-0 z-10">
              <tr>
                <HeaderCell className="text-center">Links</HeaderCell>
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
                return (
                <tr
                    key={row.rowKey}
                    className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-100'}`}
                >
                  {row.isMatchRow && row.matchDetails ? (
                    <>
                      <DataCell className="text-center">
                        {row.matchDetails.platformLinks?.spotify && (
                          <a href={row.matchDetails.platformLinks.spotify} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-semibold" title={`Open ${row.matchDetails.title} on Spotify`}>SP</a>
                        )}
                         {row.matchDetails.platformLinks?.youtube && (
                            <a href={row.matchDetails.platformLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-semibold ml-1" title={`Search ${row.matchDetails.title} on YouTube`}>YT</a>
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
                       <DataCell className="text-center">
                        <StreamCountCell trackId={row.matchDetails.spotifyTrackId} />
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
                     <td colSpan={8} className="px-2 py-1 text-center text-gray-500 italic">
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
                      className="p-0.5 !text-xs hover:bg-gray-300"
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

export default React.memo(PreviousScans);
