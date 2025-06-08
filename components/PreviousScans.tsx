import React from 'react';
import { ScanResult, AcrCloudMatch } from '../types';
import Button from './common/Button';
import TrashIcon from './icons/TrashIcon';

interface PreviousScansProps {
  scans: ScanResult[];
  onDeleteScan: (scanId: string) => void;
  onClearAllScans: () => void;
}

interface DisplayableMatch extends AcrCloudMatch {
  originalInstrumentalName: string;
  originalScanId: string;
  originalInstrumentalSize: number;
  originalScanDate: string;
}

const PreviousScans: React.FC<PreviousScansProps> = ({ scans, onDeleteScan, onClearAllScans }) => {
  
  const allMatches: DisplayableMatch[] = scans.reduce((acc, scan) => {
    const matchesWithSourceInfo = scan.matches.map(match => ({
      ...match,
      originalInstrumentalName: scan.instrumentalName,
      originalScanId: scan.scanId,
      originalInstrumentalSize: scan.instrumentalSize,
      originalScanDate: scan.scanDate,
    }));
    return acc.concat(matchesWithSourceInfo);
  }, [] as DisplayableMatch[]).sort((a,b) => new Date(b.originalScanDate).getTime() - new Date(a.originalScanDate).getTime() || new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());


  const formatStreams = (count?: number): string => {
    if (typeof count === 'undefined') return 'N/A';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`; // No decimal for K
    return count.toString();
  };
  
  const containerStyles = "p-0.5 win95-border-outset bg-[#C0C0C0]";
  const innerContainerStyles = "p-2 bg-[#C0C0C0]";

  if (allMatches.length === 0 && scans.length > 0) {
     return (
      <div className={containerStyles}>
        <div className={innerContainerStyles}>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-normal text-black">All Scan Records</h3>
            {scans.length > 0 && (
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
          <p className="text-black text-center py-2 text-sm">No matches found in your previous scans.</p>
          <p className="text-xs text-gray-700 text-center">{scans.length} scan record(s) without matches.</p>
        </div>
      </div>
    );
  }
  
   if (scans.length === 0) {
    return null; 
  }


  return (
    <div className={containerStyles}>
      <div className={innerContainerStyles}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-normal text-black">Matched Songs</h3>
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
                <th scope="col" className="px-2 py-1 text-left font-normal text-black">Streams</th>
                <th scope="col" className="px-2 py-1 text-left font-normal text-black">Uploaded File</th>
                <th scope="col" className="px-1 py-1 text-center font-normal text-black">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {allMatches.map((match, index) => (
                <tr key={match.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-100' /* Subtle striping if any */}>
                  <td className="px-2 py-1 whitespace-nowrap">
                    {match.platformLinks?.spotify && (
                      <a 
                        href={match.platformLinks.spotify} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-700 hover:underline mr-1"
                        title="Spotify"
                      >
                        SP
                      </a> 
                    )}
                    {match.platformLinks?.youtube && (
                      <a 
                        href={match.platformLinks.youtube} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-700 hover:underline"
                        title="YouTube"
                      >
                        YT
                      </a> 
                    )}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-black" title={match.title}>{match.title}</td>
                  <td className="px-2 py-1 whitespace-nowrap text-gray-700" title={match.artist}>{match.artist}</td>
                  <td className="px-2 py-1 whitespace-nowrap text-gray-700" title={match.album}>{match.album}</td>
                  <td className="px-2 py-1 whitespace-nowrap text-gray-700">{match.releaseDate}</td>
                  <td className="px-2 py-1 whitespace-nowrap text-gray-700">
                    <span className={`px-1 ${ // Basic confidence text color
                      match.matchConfidence > 80 ? 'text-green-700' : 
                      match.matchConfidence > 60 ? 'text-yellow-700' : 'text-red-700'
                    }`}>
                      {match.matchConfidence}%
                    </span>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-gray-700">
                    {formatStreams(match.streamCounts?.spotify)}/{formatStreams(match.streamCounts?.youtube)}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-black" title={match.originalInstrumentalName}>
                    {match.originalInstrumentalName}
                  </td>
                  <td className="px-1 py-0.5 whitespace-nowrap text-center">
                    <Button
                      onClick={() => onDeleteScan(match.originalScanId)}
                      size="sm"
                      className="p-0.5 !text-xs" // Extra small for table action
                      title={`Delete scan for ${match.originalInstrumentalName}`}
                    >
                      <TrashIcon className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {allMatches.length > 10 && <p className="mt-1 text-xs text-gray-700 text-center">{allMatches.length} matched songs shown.</p>}
      </div>
    </div>
  );
};

export default PreviousScans;