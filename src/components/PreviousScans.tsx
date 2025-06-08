
import React from 'react';
import { TrackScanLog, AcrCloudMatch } from '../types'; // Uses TrackScanLog
import Button from './common/Button';
import TrashIcon from './icons/TrashIcon';

interface PreviousScansProps {
  scanLogs: TrackScanLog[]; // Renamed from scans to scanLogs, expects TrackScanLog[]
  onDeleteScan: (logId: string) => void; // Expects logId from TrackScanLog
  onClearAllScans: () => void;
}

interface DisplayableTableRow {
  isMatchRow: boolean; // True if this row represents an actual AcrCloudMatch
  logId: string; // ID of the parent TrackScanLog
  originalFileName: string;
  originalScanDate: string; // Date of the TrackScanLog

  // Fields for actual matches (if isMatchRow is true)
  matchDetails?: AcrCloudMatch;

  // For rows representing a log with no matches or an error
  statusMessage?: string; // e.g., "No Matches Found", "Error Processing"
}

const PreviousScans: React.FC<PreviousScansProps> = ({ scanLogs, onDeleteScan, onClearAllScans }) => {

  const tableRows: DisplayableTableRow[] = scanLogs.reduce((acc, log) => {
    if (log.status === 'matches_found' && log.matches.length > 0) {
      log.matches.forEach(match => {
        acc.push({
          isMatchRow: true,
          logId: log.logId,
          originalFileName: log.originalFileName,
          originalScanDate: log.scanDate,
          matchDetails: match,
        });
      });
    } else if (log.status === 'no_matches_found') {
      acc.push({
        isMatchRow: false,
        logId: log.logId,
        originalFileName: log.originalFileName,
        originalScanDate: log.scanDate,
        statusMessage: "No Matches Found",
      });
    } else if (log.status === 'error_processing') {
       acc.push({
        isMatchRow: false,
        logId: log.logId,
        originalFileName: log.originalFileName,
        originalScanDate: log.scanDate,
        statusMessage: "Error Processing Track",
      });
    } else if (log.status === 'partially_completed') {
         acc.push({
            isMatchRow: false, // Treat as a status row first
            logId: log.logId,
            originalFileName: log.originalFileName,
            originalScanDate: log.scanDate,
            statusMessage: "Partial Scan (some segments failed)",
         });
         // Optionally, also list any matches found during partial scan
         if (log.matches.length > 0) {
             log.matches.forEach(match => {
                acc.push({
                isMatchRow: true,
                logId: log.logId,
                originalFileName: log.originalFileName, // Keep original file context
                originalScanDate: log.scanDate,
                matchDetails: match,
                });
            });
         }
    }
    return acc;
  }, [] as DisplayableTableRow[]).sort((a, b) => {
    // Primary sort by original scan date (most recent first)
    const dateA = new Date(a.originalScanDate).getTime();
    const dateB = new Date(b.originalScanDate).getTime();
    if (dateB !== dateA) return dateB - dateA;

    // Secondary sort: logs with actual matches first, then status messages
    if (a.isMatchRow && !b.isMatchRow) return -1;
    if (!a.isMatchRow && b.isMatchRow) return 1;

    // Tertiary sort: alphabetically by original file name if dates and types are same
    return a.originalFileName.localeCompare(b.originalFileName);
  });


  const formatStreams = (count?: number): string => {
    if (typeof count === 'undefined') return 'N/A';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  const containerStyles = "p-0.5 win95-border-outset bg-[#C0C0C0]";
  const innerContainerStyles = "p-2 bg-[#C0C0C0]";

   if (scanLogs.length === 0) {
    // This case should be handled by DashboardViewPage
    return null;
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

        {tableRows.length === 0 ? (
           <p className="text-black text-center py-2 text-sm">No scan history to display.</p>
        ) : (
          <div className="overflow-x-auto win95-border-inset bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-[#C0C0C0] border-b-2 border-b-[#808080]">
                <tr>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black">Links</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black">Song Title / Status</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black">Artist</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black">Album</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black">Released</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black">Conf.</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black">Streams (S/Y)</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black">Original Upload</th>
                  <th scope="col" className="px-1 py-1 text-center font-normal text-black">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {tableRows.map((row, index) => (
                  <tr key={`${row.logId}-${row.isMatchRow ? row.matchDetails?.id : row.statusMessage}-${index}`}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {row.isMatchRow && row.matchDetails?.platformLinks?.spotify && (
                        <a href={row.matchDetails.platformLinks.spotify} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline mr-1" title="Spotify">SP</a>
                      )}
                      {row.isMatchRow && row.matchDetails?.platformLinks?.youtube && (
                        <a href={row.matchDetails.platformLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline" title="YouTube">YT</a>
                      )}
                      {!row.isMatchRow && <span className="text-gray-500">-</span>}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-black" title={row.isMatchRow ? row.matchDetails?.title : row.statusMessage}>
                      {row.isMatchRow ? row.matchDetails?.title : row.statusMessage}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-gray-700" title={row.isMatchRow ? row.matchDetails?.artist : "N/A"}>
                      {row.isMatchRow ? row.matchDetails?.artist : "N/A"}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-gray-700" title={row.isMatchRow ? row.matchDetails?.album : "N/A"}>
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
                      ) : "N/A"}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-gray-700">
                      {row.isMatchRow ? `${formatStreams(row.matchDetails?.streamCounts?.spotify)}/${formatStreams(row.matchDetails?.streamCounts?.youtube)}` : "N/A"}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-black" title={row.originalFileName}>
                      {row.originalFileName}
                    </td>
                    <td className="px-1 py-0.5 whitespace-nowrap text-center">
                      <Button
                        onClick={() => onDeleteScan(row.logId)} // Delete the entire log entry
                        size="sm"
                        className="p-0.5 !text-xs"
                        title={`Delete scan log for ${row.originalFileName}`}
                      >
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tableRows.length > 10 && <p className="mt-1 text-xs text-gray-700 text-center">{tableRows.length} items shown in history.</p>}
      </div>
    </div>
  );
};

export default PreviousScans;
