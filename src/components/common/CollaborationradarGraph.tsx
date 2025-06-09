
import React, { useMemo } from 'react';
import { TrackScanLog, AcrCloudMatch } from '../../types';

interface CollaborationRadarGraphProps {
  scanLogs: TrackScanLog[];
}

interface CollaborationData {
  [beatName: string]: string[]; // Beat name -> list of artist names
}

interface ArtistPair {
  artist1: string;
  artist2: string;
  commonBeats: number;
}

const CollaborationRadarGraph: React.FC<CollaborationRadarGraphProps> = ({ scanLogs }) => {
  const collaborationData = useMemo(() => {
    const beatToArtistsMap: CollaborationData = {};
    scanLogs.forEach(log => {
      if (log.matches.length > 0) {
        const beatName = log.originalFileName;
        if (!beatToArtistsMap[beatName]) {
          beatToArtistsMap[beatName] = [];
        }
        const artistsForThisBeat = new Set<string>();
        log.matches.forEach(match => {
          artistsForThisBeat.add(match.artist);
        });
        beatToArtistsMap[beatName].push(...Array.from(artistsForThisBeat));
      }
    });
    return beatToArtistsMap;
  }, [scanLogs]);

  const artistPairs = useMemo(() => {
    const pairs: { [key: string]: { artists: Set<string>, count: number } } = {};
    const artistToBeats: {[artistName: string]: Set<string>} = {};

    // Map each artist to the set of beats they've used
    for (const beatName in collaborationData) {
        collaborationData[beatName].forEach(artist => {
            if (!artistToBeats[artist]) {
                artistToBeats[artist] = new Set();
            }
            artistToBeats[artist].add(beatName);
        });
    }

    const artists = Object.keys(artistToBeats);
    for (let i = 0; i < artists.length; i++) {
        for (let j = i + 1; j < artists.length; j++) {
            const artist1 = artists[i];
            const artist2 = artists[j];

            const commonBeatsSet = new Set([...artistToBeats[artist1]].filter(beat => artistToBeats[artist2].has(beat)));
            if (commonBeatsSet.size > 0) { // Only consider pairs with at least one common beat
                 const pairKey = [artist1, artist2].sort().join('-');
                 if(!pairs[pairKey]) {
                    pairs[pairKey] = { artists: new Set([artist1, artist2]), count: 0 };
                 }
                 pairs[pairKey].count = commonBeatsSet.size;
            }
        }
    }
    // Convert to array and filter for pairs with multiple common beats for stronger suggestions
    return Object.values(pairs).filter(p => p.count > 0).sort((a,b) => b.count - a.count).slice(0, 10); // Top 10 pairs
  }, [collaborationData]);


  if (Object.keys(collaborationData).length === 0 || artistPairs.length === 0) {
    return (
      <div className="text-center text-gray-600 py-8">
        <p className="text-2xl mb-2">🕸️</p>
        <p>Not enough data for collaboration radar yet.</p>
        <p className="text-xs">Scan more tracks or find more matches to see potential collaborations.</p>
      </div>
    );
  }

  // Simplified rendering, not a real graph
  return (
    <div className="p-2">
      <h5 className="text-sm font-semibold text-black mb-2 text-center">Potential Collaborations Detected:</h5>
      <div className="text-xs text-gray-700 text-center mb-3">
        Artists below have used the same beat(s). Consider reaching out — these artists might vibe well together!
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto win95-border-inset p-1 bg-gray-100">
        {artistPairs.map(pairData => {
          const artists = Array.from(pairData.artists);
          return (
            <div key={artists.join('-')} className="p-1.5 bg-green-100 win95-border-outset">
              <p className="text-sm text-black font-semibold">
                <span className="text-green-700">{artists[0]}</span> &harr; <span className="text-green-700">{artists[1]}</span>
              </p>
              <p className="text-xs text-gray-700">Common Beats: {pairData.count}</p>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-gray-500 mt-2">(Displaying top collaborations based on shared beats)</p>
    </div>
  );
};

export default CollaborationRadarGraph;
