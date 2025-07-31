import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface TrackMomentum {
  trackId: string;
  title: string;
  artist: string;
  velocity: number;
  acceleration: number;
  aiLabel: string;
  trendingScore: number;
}

const statusColors: Record<string, string> = {
  'Potential Viral': 'text-green-600',
  'Trending Slowly': 'text-blue-600',
  'Plateauing': 'text-yellow-600',
  'Declining': 'text-red-600',
};

const TrackMomentumTab: React.FC = () => {
  const [momentum, setMomentum] = useState<TrackMomentum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMomentum() {
      setLoading(true);
      setError(null);
      try {
        // Fetch trending tracks and their history
        const trendingRes = await axios.get('/search/trending');
        const trendingTracks = trendingRes.data.tracks || [];
        const momentumData: TrackMomentum[] = [];
        for (const track of trendingTracks) {
          const historyRes = await axios.get(`/search/tracks/${track.id}/history`);
          const history = historyRes.data.history || [];
          // Calculate velocity and acceleration
          const len = history.length;
          let velocity = 0, acceleration = 0;
          if (len > 1) {
            velocity = history[len - 1].streams - history[len - 2].streams;
            if (len > 2) {
              const prevVelocity = history[len - 2].streams - history[len - 3].streams;
              acceleration = velocity - prevVelocity;
            }
          }
          // Get AI label
          const aiRes = await axios.post('/api/v1/openai/quick-insight', {
            trackId: track.id,
            velocity,
            acceleration,
          });
          const aiLabel = aiRes.data.label || 'Unknown';
          momentumData.push({
            trackId: track.id,
            title: track.title,
            artist: track.artist,
            velocity,
            acceleration,
            aiLabel,
            trendingScore: track.trendingScore || 0,
          });
        }
        setMomentum(momentumData);
      } catch (err: any) {
        setError('Failed to load track momentum.');
      } finally {
        setLoading(false);
      }
    }
    fetchMomentum();
  }, []);

  if (loading) return <div>Loading track momentum...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="p-2">
      <h4 className="font-bold mb-2">Track Momentum</h4>
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th>Track</th>
            <th>Artist</th>
            <th>Velocity</th>
            <th>Acceleration</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {momentum.map((track) => (
            <tr key={track.trackId}>
              <td>{track.title}</td>
              <td>{track.artist}</td>
              <td>{track.velocity}</td>
              <td>{track.acceleration}</td>
              <td className={statusColors[track.aiLabel] || ''}>{track.aiLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrackMomentumTab;
