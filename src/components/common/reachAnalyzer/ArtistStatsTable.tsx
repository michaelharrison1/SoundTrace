
import React, { useMemo } from 'react';
import ProgressBar from '../ProgressBar';
import ArtistFollowers from '../ArtistFollowers';
import { ArtistLeaderboardEntry, ArtistSortableColumn, SortDirection } from '../ReachAnalyzer'; // Import shared types
import { formatFollowersDisplay } from './reachAnalyzerUtils';


interface ArtistStatsTableProps {
  aggregatedArtistData: ArtistLeaderboardEntry[];
  isLoading: boolean;
  currentArtistLevel: number;
  sortColumn: ArtistSortableColumn;
  sortDirection: SortDirection;
  onSort: (column: ArtistSortableColumn) => void;
  onSortDirection: (direction: SortDirection) => void; // Not directly used here, but parent might need it
}

const PopularityBar: React.FC<{ score: number | null | undefined }> = React.memo(({ score }) => {
  if (typeof score !== 'number' || score === null) return <span className="text-xs text-gray-500">-</span>;
  const percent = score;
  let barColor = 'bg-green-500';
  if (score < 40) barColor = 'bg-red-500';
  else if (score < 70) barColor = 'bg-yellow-500';

  return (
    <div className="w-10 h-2.5 bg-gray-300 win95-border-inset relative inline-block ml-1 align-middle" title={`Popularity: ${score}`}>
      <div className={`${barColor} h-full`} style={{ width: `${percent}%` }}></div>
    </div>
  );
});
PopularityBar.displayName = 'PopularityBar';


const HeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableHeaderCellElement> & {
  sortKey?: ArtistSortableColumn;
  currentSortColumn: ArtistSortableColumn;
  currentSortDirection: SortDirection;
  onSortClick: (column: ArtistSortableColumn) => void;
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


const ArtistStatsTable: React.FC<ArtistStatsTableProps> = ({
  aggregatedArtistData,
  isLoading,
  currentArtistLevel,
  sortColumn,
  sortDirection,
  onSort,
}) => {

  const handleSort = (column: ArtistSortableColumn) => {
    onSort(column); 
  };

  const sortedData = useMemo(() => {
     return [...aggregatedArtistData].sort((a, b) => {
      let valA: any, valB: any;
      switch (sortColumn) {
        case 'artistName': valA = a.artistName; valB = b.artistName; return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'matchedTracksCount': valA = a.matchedTracksCount; valB = b.matchedTracksCount; break;
        case 'spotifyFollowers': valA = a.spotifyFollowers ?? -1; valB = b.spotifyFollowers ?? -1; break;
        case 'totalArtistStreams': valA = a.totalArtistStreams ?? -1; valB = b.totalArtistStreams ?? -1; break; // Added sorting for total streams
        case 'mostRecentMatchDate':
            valA = a.mostRecentMatchDate ? new Date(a.mostRecentMatchDate).getTime() : 0;
            valB = b.mostRecentMatchDate ? new Date(b.mostRecentMatchDate).getTime() : 0;
            break;
        case 'spotifyPopularity': valA = a.spotifyPopularity ?? -1; valB = b.spotifyPopularity ?? -1; break;
        default: return 0;
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  },[aggregatedArtistData, sortColumn, sortDirection])


  if (isLoading) {
    return <div className="flex flex-col items-center justify-center flex-grow py-4"><ProgressBar text="Loading artist data..." /></div>;
  }
  if (aggregatedArtistData.length === 0) {
    return <p className="text-center text-gray-700 py-8">No artist data available from current scans.</p>;
  }

  return (
    <div className="artist-leaderboard flex flex-col h-full">
      <h4 className="text-base font-semibold text-black mb-0 text-center">Artist Statistics</h4>
      <p className="text-xs text-gray-600 text-center mb-1">Total Unique Artists: {aggregatedArtistData.length} &bull; Artist Level: {currentArtistLevel}</p>
      <div className="overflow-auto win95-border-inset bg-white flex-grow p-0.5">
        <table className="min-w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '20%' }} /> {/* Artist */}
            <col style={{ width: '10%' }} /> {/* Beat Matches */}
            <col style={{ width: '18%' }} /> {/* Followers */}
            <col style={{ width: '15%' }} /> {/* Total Streams */}
            <col style={{ width: '12%' }} /> {/* Popularity */}
            <col style={{ width: '12%' }} /> {/* Most Recent Match */}
            <col style={{ width: '13%' }} /> {/* Genres */}
          </colgroup>
          <thead className="bg-[#C0C0C0] sticky top-0 z-10">
            <tr>
              <HeaderCell sortKey="artistName" currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSortClick={handleSort}>Artist</HeaderCell>
              <HeaderCell sortKey="matchedTracksCount" currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSortClick={handleSort} className="text-center">Beat Matches</HeaderCell>
              <HeaderCell sortKey="spotifyFollowers" currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSortClick={handleSort} className="text-center">Followers</HeaderCell>
              <HeaderCell sortKey="totalArtistStreams" currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSortClick={handleSort} className="text-center">Total Streams</HeaderCell>
              <HeaderCell sortKey="spotifyPopularity" currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSortClick={handleSort} className="text-center">Popularity</HeaderCell>
              <HeaderCell sortKey="mostRecentMatchDate" currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSortClick={handleSort} className="text-center" title="Release date of the artist’s most recent track that used your beat.">Most Recent Match</HeaderCell>
              <HeaderCell currentSortColumn={sortColumn} currentSortDirection={sortDirection} onSortClick={() => {}} className="text-center">Genres</HeaderCell>
            </tr>
          </thead>
          <tbody className="bg-white">
            {sortedData.map((artist) => (
              <tr key={artist.key} className="hover:bg-blue-200 hover:text-black group border-b border-gray-300 last:border-b-0">
                <DataCell title={artist.artistName}>{artist.artistName}</DataCell>
                <DataCell className="text-center">{artist.matchedTracksCount}</DataCell>
                <DataCell className="text-center">
                  <div className="flex items-center justify-center space-x-2 h-full">
                    <ArtistFollowers followers={artist.spotifyFollowers} isLoading={artist.isFollowersLoading} error={artist.followersError} />
                    <div className="w-12 h-2.5 bg-gray-300 win95-border-inset relative" title={`${artist.spotifyFollowers ?? 0} followers`}><div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500" style={{ width: `${artist.followerBarPercent}%`, boxShadow: artist.followerBarPercent > 0 ? '0.5px 0.5px 0px #404040' : 'none' }}></div></div>
                  </div>
                </DataCell>
                <DataCell className="text-center">
                  {typeof artist.totalArtistStreams === 'number' ? formatFollowersDisplay(artist.totalArtistStreams) : (artist.isFollowersLoading ? '...' : '-')}
                </DataCell>
                <DataCell className="text-center">{typeof artist.spotifyPopularity === 'number' ? artist.spotifyPopularity : (artist.isFollowersLoading && !artist.followersError ? '...' : '-')}<PopularityBar score={artist.spotifyPopularity} /></DataCell>
                <DataCell className="text-center">{artist.mostRecentMatchDate || '-'}</DataCell>
                <DataCell className="text-center"><div className="flex flex-wrap justify-center items-center gap-0.5">{(artist.genres && artist.genres.length > 0) ? artist.genres.slice(0,2).map(genre => (<span key={genre} className="text-xs px-1 py-0 bg-gray-200 group-hover:bg-gray-300 win95-border-inset text-gray-700 group-hover:text-black whitespace-nowrap">{genre}</span>)) : (artist.isFollowersLoading && !artist.followersError ? '...' : <span className="text-xs">-</span>)}</div></DataCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(ArtistStatsTable);