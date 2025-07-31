
import React, {useState, useMemo, JSX} from 'react';
import { useWin95Modal } from './common/Win95ModalProvider';
import { TrackScanLog, AcrCloudMatch, SpotifyFollowerResult, PlatformSource, TrackScanLogStatus } from '../types';
import Button from './common/Button';
// import TrashIcon from './icons/TrashIcon';
import ArtistFollowers from './common/ArtistFollowers';
import { useSpotifyPlayer } from '../contexts/SpotifyContext';
// import UploadIcon from './icons/UploadIcon';
import MusicNoteIcon from './icons/MusicNoteIcon';
import SpotifyIcon from './icons/SpotifyIcon';
import Win95SpotifyIcon from './icons/Win95SpotifyIcon';


type SortableColumn =
  | 'title'
  | 'artist'
  | 'followers'
  | 'album'
  | 'releaseDate'
  | 'matchConfidence'
  | 'originalScanDate'
  | 'streamCount'
  | 'platformSource';

type SortDirection = 'asc' | 'desc';

interface PreviousScansProps {
  scanLogs: TrackScanLog[];
  followerResults: Map<string, SpotifyFollowerResult>;
  onDeleteScan: (logId: string) => void;
  onClearAllScans: () => void;
  isDeleting?: boolean;
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
  platformSource: PlatformSource;
  sourceUrl?: string;
}

const formatPlatformSource = (source: PlatformSource): string => {
  switch (source) {
    case 'file_upload_batch_item': return 'File Upload';
    case 'spotify_playlist_import_item': return 'Spotify Import';
    default:
      const _exhaustiveCheck: never = source;
      return "Unknown Source";
  }
};

const PreviousScans: React.FC<PreviousScansProps> = ({ scanLogs, followerResults, onDeleteScan, onClearAllScans, isDeleting }) => {
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

  const initialTableRows = useMemo((): DisplayableTableRow[] => {
    return scanLogs.reduce((acc, log: TrackScanLog, logIndex: number) => {
      const relevantMatchStatuses: TrackScanLogStatus[] = ['completed_match_found', 'scanned_match_found', 'imported_spotify_track'];
      const hasActualMatches = log.matches && log.matches.length > 0 && relevantMatchStatuses.includes(log.status);

      if (hasActualMatches) {
        log.matches.forEach((match: AcrCloudMatch, matchIndex: number) => {
          acc.push({
            isMatchRow: true,
            hasAnyMatchesInLog: true,
            logId: log.logId,
            originalFileName: log.originalFileName,
            originalScanDate: log.scanDate,
            matchDetails: match,
            statusMessage: undefined,
            rowKey: `${log.logId}-match-${match.id || matchIndex}`,
            platformSource: log.platformSource,
            sourceUrl: match.platformLinks?.spotify, // Only use Spotify link
          });
        });
      } else {
        let message = "No Matches Found";
        if (log.status === 'error_processing_item') message = "Error Processing Track";
        else if (log.status === 'error_acr_scan') message = "ACR Scan Error";
        else if (log.status === 'skipped_previously_scanned') message = "Skipped (Previously Scanned)";

        acc.push({
          isMatchRow: false,
          hasAnyMatchesInLog: false,
          logId: log.logId,
          originalFileName: log.originalFileName,
          originalScanDate: log.scanDate,
          statusMessage: message,
          rowKey: `${log.logId}-status-${logIndex}`,
          platformSource: log.platformSource,
          sourceUrl: undefined, // No Spotify link for error rows
        });
      }
      return acc;
    }, [] as DisplayableTableRow[]);
  }, [scanLogs]);


  const sortedTableRows = useMemo(() => {
    if (!sortColumn) return initialTableRows;
    return [...initialTableRows].sort((a, b) => {
      if (a.isMatchRow && !b.isMatchRow) return -1;
      if (!a.isMatchRow && b.isMatchRow) return 1;
      if (!a.isMatchRow && !b.isMatchRow) {
        const dateA = new Date(a.originalScanDate).getTime(); const dateB = new Date(b.originalScanDate).getTime();
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
        case 'title': valA = a.matchDetails.title || ''; valB = b.matchDetails.title || ''; return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'artist': valA = a.matchDetails.artist || ''; valB = b.matchDetails.artist || ''; return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'followers':
          const followerResultA = a.matchDetails.spotifyArtistId ? followerResults.get(a.matchDetails.spotifyArtistId) : undefined;
          const followerResultB = b.matchDetails.spotifyArtistId ? followerResults.get(b.matchDetails.spotifyArtistId) : undefined;
          valA = (followerResultA?.status === 'success' && typeof followerResultA.followers === 'number') ? followerResultA.followers : -1;
          valB = (followerResultB?.status === 'success' && typeof followerResultB.followers === 'number') ? followerResultB.followers : -1;
          break;
        case 'album': valA = a.matchDetails.album || ''; valB = b.matchDetails.album || ''; return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'releaseDate':
          valA = a.matchDetails.releaseDate ? new Date(a.matchDetails.releaseDate).getTime() : 0;
          valB = b.matchDetails.releaseDate ? new Date(b.matchDetails.releaseDate).getTime() : 0;
          if (isNaN(valA)) valA = sortDirection === 'asc' ? Infinity : -Infinity;
          if (isNaN(valB)) valB = sortDirection === 'asc' ? Infinity : -Infinity;
          break;
        case 'matchConfidence': valA = a.matchDetails.matchConfidence ?? 0; valB = b.matchDetails.matchConfidence ?? 0; break;
        case 'originalScanDate': valA = new Date(a.originalScanDate).getTime(); valB = new Date(b.originalScanDate).getTime(); break;
        case 'streamCount': valA = a.matchDetails.streamCount ?? -1; valB = b.matchDetails.streamCount ?? -1; break;
        case 'platformSource': valA = formatPlatformSource(a.platformSource); valB = formatPlatformSource(b.platformSource); return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        default: return 0;
      }
      if (typeof valA === 'number' && typeof valB === 'number') return sortDirection === 'asc' ? valA - valB : valB - valA;
      return 0;
    });
  }, [initialTableRows, sortColumn, sortDirection, followerResults]);

  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(column); setSortDirection('desc'); }
  };

  const renderSortArrow = (column: SortableColumn) => (sortColumn === column ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : '');

  const { confirm, prompt } = useWin95Modal();

  const handleExportPlaylist = async () => {
    setExportMessage(null);
    if (!isSpotifyConnected || !spotifyUser) {
      const shouldLogin = await confirm({
        title: 'Spotify Connection Required',
        message: 'You need to be connected to Spotify to export a playlist. Connect now?',
        confirmText: 'Connect',
        cancelText: 'Cancel',
      });
      if (shouldLogin) initiateSpotifyLogin();
      else setExportMessage({type: 'error', text: "Spotify connection required to export."});
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
    const playlistName = await prompt({
      title: 'Export Playlist',
      message: 'Enter a name for your new Spotify playlist:',
      defaultValue: defaultPlaylistName,
      confirmText: 'Export',
      cancelText: 'Cancel',
    });
    if (playlistName === null) { setExportMessage({type: 'error', text: "Playlist export cancelled."}); return; }
    const finalPlaylistName = playlistName.trim() === '' ? defaultPlaylistName : playlistName.trim();
    setIsLoadingExport(true);
    const result = await createPlaylistAndAddTracks(finalPlaylistName, trackUrisToExport, "Tracks exported from SoundTrace app.");
    setIsLoadingExport(false);
    if (result.playlistUrl) setExportMessage({type: 'success', text: `Playlist "${finalPlaylistName}" created! ${trackUrisToExport.length} track(s) added. View it on Spotify.`});
    else {
      let errorMessage = result.error || "Failed to export playlist. Please try again.";
      if (result.error && (result.error.toLowerCase().includes('insufficient client scope') || result.error.toLowerCase().includes('forbidden'))) errorMessage = "Error: SoundTrace doesn't have permission to create playlists. Please disconnect and reconnect Spotify in the header to grant access, then try again.";
      setExportMessage({type: 'error', text: errorMessage});
    }
  };

  const escapeCsvCell = (cellData: any): string => {
    if (cellData == null) return '';
    const stringData = String(cellData);
    if (stringData.includes(',') || stringData.includes('"') || stringData.includes('\n')) return `"${stringData.replace(/"/g, '""')}"`;
    return stringData;
  };
  const handleExportToCSV = async () => {
    setExportMessage(null);
    try {
      const defaultFileName = `soundtrace_scan_logs_${new Date().toISOString().split('T')[0]}.csv`;
      const fileName = await prompt({
        title: 'Export Table to CSV',
        message: 'Enter a file name for your CSV export:',
        defaultValue: defaultFileName,
        confirmText: 'Export',
        cancelText: 'Cancel',
      });
      if (fileName === null) {
        setExportMessage({ type: 'error', text: 'CSV export cancelled.' });
        return;
      }
      const trimmedFileName = fileName.trim() === '' ? defaultFileName : fileName.trim();
      const proceed = await confirm({
        title: 'Confirm Export',
        message: `Export the current table view to "${trimmedFileName}"?`,
        confirmText: 'Export',
        cancelText: 'Cancel',
      });
      if (!proceed) {
        setExportMessage({ type: 'error', text: 'CSV export cancelled.' });
        return;
      }
      const headers = [
        "Original File/Source Title", "Scan Date", "Platform Source", "Source URL", "Status",
        "Cover Art URL", "Matched Song Title", "Matched Artist", "Matched Album", "Release Date",
        "Confidence (%)", "Spotify Link",
        "Spotify Artist ID", "Spotify Track ID",
        "Fetched Artist Followers", "Fetched Artist Popularity",
        "StreamClout Stream Count", "StreamClout Timestamp"
      ];
      const csvRows = [headers.join(',')];
      sortedTableRows.forEach(row => {
        const rowData = [
          escapeCsvCell(row.originalFileName),
          escapeCsvCell(new Date(row.originalScanDate).toLocaleString()),
          escapeCsvCell(formatPlatformSource(row.platformSource)),
          escapeCsvCell(row.sourceUrl),
          escapeCsvCell(row.isMatchRow ? (row.statusMessage || 'Match Found') : row.statusMessage || 'No Match')
        ];
        if (row.isMatchRow && row.matchDetails) {
          const match = row.matchDetails;
          const followerInfo = match.spotifyArtistId ? followerResults.get(match.spotifyArtistId) : undefined;
          rowData.push(
            escapeCsvCell(match.coverArtUrl),
            escapeCsvCell(match.title), escapeCsvCell(match.artist), escapeCsvCell(match.album),
            escapeCsvCell(match.releaseDate), escapeCsvCell(match.matchConfidence),
            escapeCsvCell(match.platformLinks?.spotify),
            escapeCsvCell(match.spotifyArtistId), escapeCsvCell(match.spotifyTrackId),
            escapeCsvCell(followerInfo?.status === 'success' ? followerInfo.followers : (followerInfo?.status === 'loading' ? 'Loading...' : 'N/A')),
            escapeCsvCell(followerInfo?.status === 'success' ? followerInfo.popularity : (followerInfo?.status === 'loading' ? 'Loading...' : 'N/A')),
            escapeCsvCell(match.streamCount),
            escapeCsvCell(match.streamCountTimestamp ? new Date(match.streamCountTimestamp).toISOString() : '')
          );
        } else rowData.push(...Array(headers.length - rowData.length).fill(''));
        csvRows.push(rowData.join(','));
      });
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', trimmedFileName.endsWith('.csv') ? trimmedFileName : trimmedFileName + '.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setExportMessage({ type: 'success', text: `Exported table to "${trimmedFileName.endsWith('.csv') ? trimmedFileName : trimmedFileName + '.csv'}".` });
      }
    } catch (err: any) {
      setExportMessage({ type: 'error', text: `Failed to export CSV: ${err.message || err}` });
    }
  };

  const HeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableHeaderCellElement> & {sortKey?: SortableColumn, width?: string}> = React.memo(({ children, sortKey, width, className, ...props }) => (
    <th
      scope="col"
      className={`px-2 py-1 text-left font-normal text-black win95-border-outset select-none whitespace-nowrap ${sortKey ? 'cursor-pointer hover:bg-gray-300' : ''} ${className || ''}`}
      style={{
        width: width,
        borderBottom: '3px solid #808080',
        borderTop: '2px solid #fff',
        background: '#C0C0C0',
        boxSizing: 'border-box',
      }}
      onClick={sortKey ? () => handleSort(sortKey) : undefined}
      {...props}
    >
      {children}{sortKey && renderSortArrow(sortKey)}
    </th>
  ));
  HeaderCell.displayName = 'HeaderCell';
  const DataCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = React.memo(({ children, className, ...props }) => (
    <td
      className={`px-2 py-1 text-gray-800 truncate whitespace-nowrap ${className || ''}`}
      {...props}
    >
      {children}
    </td>
  ));
  DataCell.displayName = 'DataCell';


  const handleSingleDelete = async (logId: string, fileName: string) => {
    const { confirm } = useWin95Modal();
    const shouldDelete = await confirm({
      title: 'Delete Scan Log',
      message: `Are you sure you want to delete the scan log for "${fileName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (shouldDelete) {
      onDeleteScan(logId);
    }
  };

  const handleClearAllConfirm = async () => {
    setExportMessage(null);
    try {
      const shouldDelete = await confirm({
        title: 'Delete All Scan Logs',
        message: 'Are you sure you want to delete ALL scan logs? This action cannot be undone.',
        confirmText: 'Delete All',
        cancelText: 'Cancel',
      });
      if (!shouldDelete) {
        setExportMessage({ type: 'error', text: 'Delete all scan logs cancelled.' });
        return;
      }
      await onClearAllScans();
      await alert({
        title: 'Scan Logs Deleted',
        message: 'All scan logs have been deleted.',
        confirmText: 'OK',
      });
      setExportMessage({ type: 'success', text: 'All scan logs deleted.' });
    } catch (err: any) {
      setExportMessage({ type: 'error', text: `Failed to delete all scan logs: ${err.message || err}` });
    }
  };

  if (scanLogs.length === 0 && sortedTableRows.length === 0) return null;
  const hasAnyMatchesInAnyLog = scanLogs.some(log => log.matches.length > 0 && (log.status === 'completed_match_found' || log.status === 'scanned_match_found' || log.status === 'imported_spotify_track'));

  return (
    <div className="win95-border-outset bg-[#C0C0C0] p-0.5">
      <div className="p-2 bg-[#C0C0C0]">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-normal text-black">Beat Matches & Scan Log</h3>
          <div className="flex items-center space-x-1">
            {hasAnyMatchesInAnyLog && ( <Button onClick={handleExportPlaylist} size="sm" className="p-1 !text-xs hover:bg-gray-300 win95-button-sm" disabled={isDeleting || isLoadingExport || isLoadingSpotifyAuth || sortedTableRows.filter(row => row.isMatchRow && row.matchDetails?.spotifyTrackId).length === 0} isLoading={isLoadingExport} title="Export visible Spotify tracks to a new playlist">Export to Spotify</Button> )}
            <Button onClick={handleExportToCSV} size="sm" className="p-1 !text-xs hover:bg-gray-300 win95-button-sm" title="Export current table view to CSV" disabled={isDeleting}>
              Export Table CSV
            </Button>
            {scanLogs.length > 0 && (
              <Button onClick={handleClearAllConfirm} size="sm" className="p-1 !text-xs hover:bg-gray-300 win95-button-sm" aria-label="Clear all scan records" title="Delete Everything" disabled={isDeleting}>
                <img src="/icons/trash.png" alt="Delete Everything" className="h-4 w-4 inline-block align-middle" />
              </Button>
            )}
          </div>
        </div>
         {exportMessage && ( <div className={`mb-2 p-2 text-sm border ${exportMessage.type === 'success' ? 'bg-green-100 border-green-700 text-green-700' : 'bg-red-100 border-red-700 text-red-700'}`}>{exportMessage.text}</div> )}


        {!hasAnyMatchesInAnyLog && scanLogs.length > 0 ? ( <p className="text-black text-center py-2 text-sm">No song matches found in your scan history. {scanLogs.length} record(s) processed without matches or with errors.</p> ) : (
        <div className="overflow-x-auto win95-border-inset bg-white max-h-[calc(100vh-320px)]">
          <table className="min-w-full text-sm" style={{tableLayout: 'fixed'}}>
             <colgroup>
                <col style={{ width: '5%' }} />
                <col style={{ width: '5%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '6%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '6%' }} />
                <col style={{ width: '7%' }} />
            </colgroup>
            <thead className="bg-[#C0C0C0] border-b-2 border-b-[#808080] sticky top-0 z-10">
              <tr>
                <HeaderCell className="text-center">Links</HeaderCell>
                <HeaderCell className="text-center">Cover</HeaderCell>
                <HeaderCell sortKey="title">Song Title</HeaderCell>
                <HeaderCell sortKey="artist">Artist</HeaderCell>
                <HeaderCell sortKey="followers" className="text-center">Followers</HeaderCell>
                <HeaderCell sortKey="album">Album</HeaderCell>
                <HeaderCell sortKey="streamCount" className="text-center">Streams (SC)</HeaderCell>
                <HeaderCell sortKey="releaseDate" className="text-center">Released</HeaderCell>
                <HeaderCell sortKey="matchConfidence" className="text-center">Conf.</HeaderCell>
                <HeaderCell sortKey="originalScanDate">Your Upload/Source</HeaderCell>
                <HeaderCell className="text-center">Action</HeaderCell>
                <HeaderCell sortKey="platformSource" className="text-center">Source Type</HeaderCell>
              </tr>
            </thead>
            <tbody className="bg-white">
              {sortedTableRows.map((row, rowIndex) => {
                const followerInfo = row.matchDetails?.spotifyArtistId ? followerResults.get(row.matchDetails.spotifyArtistId) : undefined;
                const displayTitle = row.isMatchRow ? (row.matchDetails?.title) : (row.originalFileName);
                const displayArtist = row.isMatchRow ? row.matchDetails?.artist : "N/A";

                const iconsToRender: JSX.Element[] = [];

                if (row.isMatchRow && row.matchDetails?.platformLinks?.spotify) {
                  iconsToRender.push(
                    <a
                      key="spotify-track-link"
                      href={row.matchDetails.platformLinks.spotify}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block hover:opacity-75"
                      title={`Open ${row.matchDetails.title} on Spotify`}
                      style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <img src="/icons/Link.png" alt="Link" className="w-7 h-7 object-contain" style={{ display: 'block' }} />
                    </a>
                  );
                }

                return (
                <tr key={row.rowKey} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-100'} hover:bg-blue-100`}>
                    <DataCell className="text-center">
                    {row.isMatchRow && row.matchDetails?.platformLinks?.spotify ? (
                      <a
                        href={row.matchDetails.platformLinks.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block hover:opacity-75"
                        title={`Open ${row.matchDetails.title} on Spotify`}
                      >
                        <img src="/icons/Link.png" alt="Link" className="w-5 h-5 object-contain" style={{ display: 'block' }} />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </DataCell>
                  {row.isMatchRow && row.matchDetails ? (
                    <>
                       <DataCell className="text-center !p-0.5">
                        {row.matchDetails.coverArtUrl ? (
                            <img src={row.matchDetails.coverArtUrl} alt="Art" className="w-7 h-7 object-cover inline-block win95-border-inset" />
                        ) : <div className="w-7 h-7 bg-gray-200 inline-block win95-border-inset flex items-center justify-center text-gray-400 text-[9px]">N/A</div>}
                      </DataCell>
                      <DataCell title={displayTitle}>{displayTitle}</DataCell>
                      <DataCell title={displayArtist}>{displayArtist}</DataCell>
                      <DataCell className="text-center"> <ArtistFollowers followers={followerInfo?.status === 'success' ? followerInfo.followers : undefined} isLoading={followerInfo?.status === 'loading'} error={followerInfo?.status === 'error' ? followerInfo.reason : undefined} /> </DataCell>
                      <DataCell title={row.matchDetails.album}>{row.matchDetails.album}</DataCell>
                      <DataCell className="text-center">
                        {typeof row.matchDetails.streamCount === 'number' ? (
                            <>
                                {row.matchDetails.streamCount.toLocaleString()}
                                {row.matchDetails.streamCountTimestamp && (
                                    <div className="text-[10px] text-gray-500 leading-tight">
                                        {new Date(row.matchDetails.streamCountTimestamp).toLocaleDateString()}
                                    </div>
                                )}
                            </>
                        ) : <span className="text-xs text-gray-400">-</span>}
                      </DataCell>
                      <DataCell className="text-center">{row.matchDetails.releaseDate}</DataCell>
                      <DataCell className="text-center"> <span className={`px-1 ${ row.matchDetails.matchConfidence > 80 ? 'text-green-700' : row.matchDetails.matchConfidence > 60 ? 'text-yellow-700' : 'text-red-700' }`}> {row.matchDetails.matchConfidence}% </span> </DataCell>
                    </>
                  ) : ( <td colSpan={8} className="px-2 py-1.5 text-center text-gray-500 italic"> {row.statusMessage || "No match data"} {row.statusMessage && `for "${row.originalFileName}"`} </td> )}
                   <DataCell title={row.originalFileName}> {row.originalFileName} {row.statusMessage && row.isMatchRow && <div className="text-[10px] text-yellow-600 italic leading-tight">{row.statusMessage}</div>} </DataCell>
                  <DataCell className="text-center"> <Button onClick={() => handleSingleDelete(row.logId, row.originalFileName)} size="sm" className="p-0.5 !text-xs hover:bg-gray-300 win95-button-sm" title={`Delete scan record for ${row.originalFileName}`} disabled={isDeleting}> <img src="/icons/trash.png" alt="Delete" className="h-3 w-3 inline-block align-middle" /> </Button> </DataCell>
                  <DataCell className="text-center text-xs">{formatPlatformSource(row.platformSource)}</DataCell>
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