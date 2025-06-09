
import React, { useState, useMemo } from 'react';
import { TrackScanLog, AcrCloudMatch } from '../types'; // Uses TrackScanLog
import Button from './common/Button';
import TrashIcon from './icons/TrashIcon';
import ArtistFollowers from './common/ArtistFollowers';
import { SpotifyFollowerResult } from './DashboardViewPage'; // Import for follower data type

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
}

const PreviousScans: React.FC<PreviousScansProps> = ({ scanLogs, followerResults, onDeleteScan, onClearAllScans }) => {
  const [sortColumn, setSortColumn] = useState<SortableColumn | null>('originalScanDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
            rowKey: `${log.logId}-match-${match.id}-${matchIndex}`
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
          rowKey: `${log.logId}-status-${logIndex}`
        });
      }
      return acc;
    }, [] as DisplayableTableRow[]);
  }, [scanLogs]);


  const sortedTableRows = useMemo(() => {
    if (!sortColumn) return initialTableRows;

    const sorted = [...initialTableRows].sort((a, b) => {
      // Always keep non-match rows at the bottom, or sort them differently if needed
      if (a.isMatchRow && !b.isMatchRow) return -1;
      if (!a.isMatchRow && b.isMatchRow) return 1;
      if (!a.isMatchRow && !b.isMatchRow) {
         // Sort status rows by original scan date or filename
        const dateA = new Date(a.originalScanDate).getTime();
        const dateB = new Date(b.originalScanDate).getTime();
        if (dateA !== dateB) return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        return a.originalFileName.localeCompare(b.originalFileName);
      }

      // Main sorting for match rows
      let valA: any, valB: any;

      switch (sortColumn) {
        case 'title':
          valA = a.matchDetails?.title || '';
          valB = b.matchDetails?.title || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'artist':
          valA = a.matchDetails?.artist || '';
          valB = b.matchDetails?.artist || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'followers':
          const followerResultA = a.matchDetails?.spotifyArtistId ? followerResults.get(a.matchDetails.spotifyArtistId) : undefined;
          const followerResultB = b.matchDetails?.spotifyArtistId ? followerResults.get(b.matchDetails.spotifyArtistId) : undefined;
          valA = (followerResultA?.status === 'success' && typeof followerResultA.followers === 'number') ? followerResultA.followers : -1;
          valB = (followerResultB?.status === 'success' && typeof followerResultB.followers === 'number') ? followerResultB.followers : -1;
          break; // Numeric comparison below
        case 'album':
          valA = a.matchDetails?.album || '';
          valB = b.matchDetails?.album || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'releaseDate':
          valA = a.matchDetails?.releaseDate ? new Date(a.matchDetails.releaseDate).getTime() : 0;
          valB = b.matchDetails?.releaseDate ? new Date(b.matchDetails.releaseDate).getTime() : 0;
          if (isNaN(valA)) valA = sortDirection === 'asc' ? Infinity : -Infinity; // Handle invalid dates
          if (isNaN(valB)) valB = sortDirection === 'asc' ? Infinity : -Infinity;
          break;
        case 'matchConfidence':
          valA = a.matchDetails?.matchConfidence ?? 0;
          valB = b.matchDetails?.matchConfidence ?? 0;
          break;
        case 'originalScanDate':
          valA = new Date(a.originalScanDate).getTime();
          valB = new Date(b.originalScanDate).getTime();
          break;
        default:
          return 0;
      }

      // Numeric comparison for followers, releaseDate, confidence, originalScanDate
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
      setSortDirection('asc'); // Default to ascending for new column
    }
  };

  const renderSortArrow = (column: SortableColumn) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? ' ▲' : ' ▼';
    }
    return '';
  };

  const containerStyles = "p-0.5 win95-border-outset bg-[#C0C0C0] mt-4"; // Added mt-4
  const innerContainerStyles = "p-2 bg-[#C0C0C0]";

   if (scanLogs.length === 0) {
    return null; // DashboardViewPage handles the "No Scan History Yet" message
  }

  return (
    <div className={containerStyles}>
      <div className={innerContainerStyles}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-normal text-black">Scan History</h3>
          {scanLogs.length > 0 && (
            <Button
              onClick={onClearAllScans}
              size="sm"
              className="p-1"
              aria-label="Clear all scan history"
              title="Clear all scan history"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {sortedTableRows.length === 0 ? (
           <p className="text-black text-center py-2 text-sm">No items to display in history.</p>
        ) : (
          <div className="overflow-x-auto win95-border-inset bg-white">
            <table className="min-w-full text-sm" style={{tableLayout: 'fixed'}}>
              <colgroup>
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
                  let followersDisplay: number | null | undefined = undefined; // undefined for loading
                  let followerError: string | undefined = undefined;
                  let isArtistFollowerLoading = false;

                  if (followerInfo) {
                    if (followerInfo.status === 'success') followersDisplay = followerInfo.followers;
                    else if (followerInfo.status === 'error') { followersDisplay = null; followerError = followerInfo.reason; }
                    else if (followerInfo.status === 'loading') isArtistFollowerLoading = true;
                    else followersDisplay = null; // cancelled or other
                  } else if (row.isMatchRow && row.matchDetails?.spotifyArtistId) {
                    // If not in map yet, it's likely loading or ID just added
                     isArtistFollowerLoading = true;
                  }


                  return (
                    <tr key={row.rowKey}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-100'} ${!row.hasAnyMatchesInLog && row.isMatchRow === false ? 'opacity-75' : ''}`}>
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
                           <ArtistFollowers
                              followers={followersDisplay}
                              isLoading={isArtistFollowerLoading}
                              error={followerError}
                           />
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
                          size="sm"
                          className="p-0.5 !text-xs"
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
    </div>
  );
};

export default PreviousScans;
