import React, { useState, useMemo, useCallback } from 'react';
import { BeatStatsEntry, BeatSortableColumn, SortDirection } from '../ReachAnalyzer'; // Import shared types

interface BeatStatsTableProps {
  aggregatedBeatData: BeatStatsEntry[];
  sortColumn: BeatSortableColumn;
  sortDirection: SortDirection;
  onSort: (column: BeatSortableColumn) => void;
  onSortDirection: (direction: SortDirection) => void; // Not directly used here, but parent might need it
}

const HeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableHeaderCellElement> & {
  sortKey?: BeatSortableColumn;
  currentSortColumn: BeatSortableColumn;
  currentSortDirection: SortDirection;
  onSortClick: (column: BeatSortableColumn) => void;
}> = React.memo(({ children, sortKey, currentSortColumn, currentSortDirection, onSortClick, className, ...props }) => {
  const sortArrow = sortKey === currentSortColumn ? (currentSortDirection === 'asc' ? ' ▲' : ' ▼') : '';
  return (
    <th
      scope="col"
      className={`px-2 py-1 text-left font-normal text-black win95-border-outset border-b-2 border-r-2 border-b-[#808080] border-r-[#808080] cursor-pointer select-none whitespace-nowrap hover:bg-black hover:text-white ${className || ''}`}
      onClick={sortKey ? () => onSortClick(sortKey) : undefined}
      {...props}
    >
      {children}{sortArrow && <span className="ml-1">{sortArrow}</span>}
    </th>
  );
});
HeaderCell.displayName = 'HeaderCell';

const DataCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = React.memo(({ children, className, ...props }) => (
  <td className={`px-2 py-1.5 text-gray-800 group-hover:text-black truncate whitespace-nowrap ${className || ''}`} {...props}>
    {children}
  </td>
));
DataCell.displayName = 'DataCell';

const BeatStatsTable: React.FC<BeatStatsTableProps> = ({
  aggregatedBeatData,
  sortColumn,
  sortDirection,
  onSort,
}) => {
  const [expandedBeat, setExpandedBeat] = useState<string | null>(null);

  const handleSort = (column: BeatSortableColumn) => {
    onSort(column);
  };
  
  const toggleExpandBeat = useCallback((beatName: string) => {
    setExpandedBeat(prev => prev === beatName ? null : beatName);
  }, []);

  const sortedData = useMemo(() => {
    return [...aggregatedBeatData].sort((a,b) => {
        let valA: any, valB: any;
        switch(sortColumn) {
            case 'beatName': valA = a.beatName; valB = b.beatName; return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            case 'totalMatches': valA = a.totalMatches; valB = b.totalMatches; break;
            default: return 0;
        }
        return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [aggregatedBeatData, sortColumn, sortDirection]);

  if (sortedData.length === 0) {
    return <p className="text-center text-gray-700 py-8">No beats have been scanned yet.</p>;
  }

  return (
    <div className="beat-stats flex flex-col h-full">
      <h4 className="text-base font-semibold text-black mb-2 text-center">Beat Matches</h4>
      <div className="overflow-auto win95-border-inset bg-white flex-grow p-0.5">
        <table className="min-w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <colgroup><col style={{ width: '70%' }} /><col style={{ width: '30%' }} /></colgroup>
          <thead className="bg-[#C0C0C0] sticky top-0 z-10">
            <tr>
              <HeaderCell sortKey="beatName" currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSortClick={handleSort}>Beat Name (Your Upload)</HeaderCell>
              <HeaderCell sortKey="totalMatches" currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSortClick={handleSort} className="text-center">Total Unique Song Matches</HeaderCell>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((beat) => (
              <React.Fragment key={beat.key}>
                <tr className="hover:bg-blue-200 hover:text-black group border-b border-gray-300 last:border-b-0 cursor-pointer" onClick={() => toggleExpandBeat(beat.beatName)} title={`Click to see matches for ${beat.beatName}`}>
                  <DataCell>{expandedBeat === beat.beatName ? '▼' : '►'} {beat.beatName}</DataCell><DataCell className="text-center">{beat.totalMatches}</DataCell>
                </tr>
                {expandedBeat === beat.beatName && beat.matchedSongs.length > 0 && (<tr className="bg-gray-50 group-hover:bg-blue-100"><td colSpan={2} className="p-0"><div className="p-2 m-1 win95-border-inset bg-white"><h5 className="text-xs font-semibold text-black mb-1">Matches for "{beat.beatName}":</h5><div className="max-h-32 overflow-y-auto"><table className="min-w-full text-xs"><thead className="bg-gray-200"><tr><th className="px-1 py-0.5 text-left font-normal text-black">Song Title</th><th className="px-1 py-0.5 text-left font-normal text-black">Artist</th><th className="px-1 py-0.5 text-center font-normal text-black">Confidence</th><th className="px-1 py-0.5 text-left font-normal text-black">Release</th><th className="px-1 py-0.5 text-left font-normal text-black">Links</th></tr></thead><tbody>{beat.matchedSongs.map(match => (<tr key={match.id} className="border-b border-gray-200 last:border-b-0"><td className="px-1 py-0.5 text-gray-700 truncate" title={match.title}>{match.title}</td><td className="px-1 py-0.5 text-gray-700 truncate" title={match.artist}>{match.artist}</td><td className="px-1 py-0.5 text-gray-700 text-center">{match.matchConfidence}%</td><td className="px-1 py-0.5 text-gray-700">{match.releaseDate}</td><td className="px-1 py-0.5">{match.platformLinks?.spotify && <a href={match.platformLinks.spotify} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mr-1">SP</a>}{match.platformLinks?.youtube && <a href={match.platformLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">YT</a>}</td></tr>))}</tbody></table></div></div></td></tr>)}
                 {expandedBeat === beat.beatName && beat.matchedSongs.length === 0 && (<tr className="bg-gray-50 group-hover:bg-blue-100"><td colSpan={2} className="p-0"><div className="p-2 m-1 win95-border-inset bg-white text-center text-xs text-gray-600">No specific song matches found for this beat in the logs.</div></td></tr>)}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(BeatStatsTable);