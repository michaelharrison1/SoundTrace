
import React from 'react';
import { ScanResult, AcrCloudMatch } from '../types';
import Button from './common/Button';
import TrashIcon from './icons/TrashIcon';

interface PreviousScansProps {
  scans: ScanResult[];
  onDeleteScan: (scanId: string) => void;
  onClearAllScans: () => void;
}

// Represents a single row in the table, can be a match or a no-match scan record
interface TableRowItem {
  isMatch: boolean;
  // Scan-level info (always present)
  originalScanId: string;
  originalInstrumentalName: string;
  originalInstrumentalSize: number;
  originalScanDate: string;
  // Match-level info (present if isMatch is true)
  matchId?: string; // This will be the AcrCloudMatch.id
  title?: string;
  artist?: string;
  album?: string;
  releaseDate?: string;
  platformLinks?: {
    spotify?: string;
    youtube?: string;
    appleMusic?: string;
  };
  streamCounts?: {
    spotify?: number;
    youtube?: number;
  };
  matchConfidence?: number;
}

const PreviousScans: React.FC<PreviousScansProps> = ({ scans, onDeleteScan, onClearAllScans }) => {

  const tableRows: TableRowItem[] = scans.reduce((acc, scan) => {
    if (scan.matches.length > 0) {
      const matchesWithSourceInfo: TableRowItem[] = scan.matches.map(match => ({
        isMatch: true,
        originalInstrumentalName: scan.instrumentalName,
        originalScanId: scan.scanId,
        originalInstrumentalSize: scan.instrumentalSize,
        originalScanDate: scan.scanDate,
        matchId: match.id,
        title: match.title,
        artist: match.artist,
        album: match.album,
        releaseDate: match.releaseDate,
        platformLinks: match.platformLinks,
        streamCounts: match.streamCounts,
        matchConfidence: match.matchConfidence,
      }));
      acc.push(...matchesWithSourceInfo);
    } else {
      // Add a row for scans with no matches
      acc.push({
        isMatch: false,
        originalScanId: scan.scanId,
        originalInstrumentalName: scan.instrumentalName,
        originalInstrumentalSize: scan.instrumentalSize,
        originalScanDate: scan.scanDate,
      });
    }
    return acc;
  }, [] as TableRowItem[]).sort((a, b) => {
    // Sort "no-match" items to the bottom
    if (a.isMatch && !b.isMatch) return -1;
    if (!a.isMatch && b.isMatch) return 1;

    // Both are matches or both are no-matches, sort by originalScanDate (most recent first)
    const dateComparison = new Date(b.originalScanDate).getTime() - new Date(a.originalScanDate).getTime();
    if (dateComparison !== 0) return dateComparison;

    // If originalScanDates are the same and both are matches, sort by releaseDate (most recent first)
    if (a.isMatch && b.isMatch && a.releaseDate && b.releaseDate) {
      return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
    }

    return 0; // Should ideally not happen if scanIds are unique for no-matches
  });


  const formatStreams = (count?: number): string => {
    if (typeof count === 'undefined') return 'N/A';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`; // No decimal for K
    return count.toString();
  };

  const containerStyles = "p-0.5 win95-border-outset bg-[#C0C0C0]";
  const innerContainerStyles = "p-2 bg-[#C0C0C0]";

   if (scans.length === 0) {
    // This case is handled by DashboardViewPage with "No Scans Yet"
    return null;
  }

  return (
    <div className={containerStyles}>
      <div className={innerContainerStyles}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-normal text-black">Scan History</h3>
          <Button
            onClick={onClearAllScans}
            size="sm"
            className="p-1"
            aria-label="Clear all scan records"
            title="Clear all scan records"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </div>

        {tableRows.length === 0 && scans.length > 0 ? (
          <p className="text-black text-center py-2 text-sm">No scan records available.</p>
        ) : (
          <div className="overflow-x-auto win95-border-inset bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-[#C0C0C0] border-b-2 border-b-[#808080]">
                <tr>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black">Links</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black">Song Title</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black">Artist</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black">Album</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black">Released</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black">Conf.</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black">Streams (S/Y)</th>
                  <th scope="col" className="px-2 py-1 text-left font-normal text-black">Uploaded File</th>
                  <th scope="col" className="px-1 py-1 text-center font-normal text-black">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {tableRows.map((item, index) => (
                  <tr key={item.originalScanId + (item.isMatch ? `-${item.matchId}` : '-no_match')}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {item.isMatch && item.platformLinks?.spotify && (
                        <a
                          href={item.platformLinks.spotify}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:underline mr-1"
                          title="Spotify"
                        >
                          SP
                        </a>
                      )}
                      {item.isMatch && item.platformLinks?.youtube && (
                        <a
                          href={item.platformLinks.youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:underline"
                          title="YouTube"
                        >
                          YT
                        </a>
                      )}
                      {!item.isMatch && <span className="text-gray-500">N/A</span>}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-black" title={item.isMatch ? item.title : "No Matches Found"}>
                      {item.isMatch ? item.title : "No Matches Found"}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-gray-700" title={item.isMatch ? item.artist : "N/A"}>
                      {item.isMatch ? item.artist : "N/A"}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-gray-700" title={item.isMatch ? item.album : "N/A"}>
                      {item.isMatch ? item.album : "N/A"}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-gray-700">
                      {item.isMatch ? item.releaseDate : "N/A"}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-gray-700">
                      {item.isMatch && typeof item.matchConfidence !== 'undefined' ? (
                        <span className={`px-1 ${
                          item.matchConfidence > 80 ? 'text-green-700' : 
                          item.matchConfidence > 60 ? 'text-yellow-700' : 'text-red-700'
                        }`}>
                          {item.matchConfidence}%
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-gray-700">
                      {item.isMatch ? `${formatStreams(item.streamCounts?.spotify)}/${formatStreams(item.streamCounts?.youtube)}` : "N/A"}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-black" title={item.originalInstrumentalName}>
                      {item.originalInstrumentalName}
                    </td>
                    <td className="px-1 py-0.5 whitespace-nowrap text-center">
                      <Button
                        onClick={() => onDeleteScan(item.originalScanId)}
                        size="sm"
                        className="p-0.5 !text-xs"
                        title={`Delete scan for ${item.originalInstrumentalName}`}
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
        {tableRows.length > 10 && <p className="mt-1 text-xs text-gray-700 text-center">{tableRows.length} records shown.</p>}
      </div>
    </div>
  );
};

export default PreviousScans;
