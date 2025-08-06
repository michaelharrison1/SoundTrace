import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Track {
  id: string;
  title: string;
  artist: string;
  velocity: number;
  avgVelocity: number;
  recommendation: string;
}

const DeadweightTab: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeadweight() {
      setLoading(true);
      setError(null);
      try {
        const topRes = await axios.get('/search/top-tracks');
        const topTracks = topRes.data.tracks || [];
        const velocities: number[] = [];
        const trackData: Track[] = [];
        for (const track of topTracks) {
          const historyRes = await axios.get(`/search/tracks/${track.id}/history`);
          const history = historyRes.data.history || [];
          let velocity = 0;
          if (history.length > 1) {
            velocity = (history[history.length - 1].streams - history[0].streams) / Math.max(1, (history.length - 1));
          }
          velocities.push(velocity);
          trackData.push({
            id: track.id,
            title: track.title,
            artist: track.artist,
            velocity,
            avgVelocity: 0,
            recommendation: '',
          });
        }
        const avg = velocities.reduce((a, b) => a + b, 0) / Math.max(1, velocities.length);
        for (const t of trackData) {
          t.avgVelocity = avg;
          if (t.velocity < 0.1 * avg) {
            t.recommendation = 'Archive this track / Try a remix / Run targeted ads';
          } else {
            t.recommendation = '—';
          }
        }
        setTracks(trackData.filter(t => t.velocity < 0.1 * avg));
      } catch {
        setError('Failed to load deadweight tracks.');
      } finally {
        setLoading(false);
      }
    }
    fetchDeadweight();
  }, []);

  if (loading) return <div>Loading deadweight tracks...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="p-2">
      <h4 className="font-bold mb-2">Deadweight Content Detector</h4>
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th>Track</th>
            <th>Artist</th>
            <th>Velocity</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track) => (
            <tr key={track.id}>
              <td>{track.title}</td>
              <td>{track.artist}</td>
              <td>{track.velocity.toFixed(2)}</td>
              <td>{track.recommendation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DeadweightTab;
