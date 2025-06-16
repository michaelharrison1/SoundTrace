
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TrackScanLog, AcrCloudMatch, AggregatedSongData } from '../../../types';

const SPOTIFY_COLOR = '#1DB954'; // Green - this will now be the color for ALL bubbles
// const YOUTUBE_COLOR = '#FF0000'; // Red - No longer used
// const DEFAULT_BUBBLE_COLOR = '#0078D7'; // Windows Blue - No longer used
const MIN_BUBBLE_SIZE = 15; // px
const MAX_BUBBLE_SIZE = 80; // px
const BUBBLE_BORDER_COLOR = '#000000';

interface BubbleData {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  match: AcrCloudMatch;
  log: TrackScanLog; // Keep a reference to the parent log for context
  opacity: number;
}

interface BubbleGalaxyVisualizerProps {
  scanLogs: TrackScanLog[];
  onSelectMatch: (match: AcrCloudMatch, log: TrackScanLog) => void;
  containerWidth: number;
  containerHeight: number;
}

// Simplified: All bubbles are now SPOTIFY_COLOR (green)
const getBubbleColor = (_match: AcrCloudMatch): string => {
  return SPOTIFY_COLOR;
};

const normalizeStreamCount = (
  streamCount: number | undefined,
  minStreams: number,
  maxStreams: number
): number => {
  if (typeof streamCount === 'undefined' || streamCount <= 0) return MIN_BUBBLE_SIZE;
  if (minStreams === maxStreams) return (MIN_BUBBLE_SIZE + MAX_BUBBLE_SIZE) / 2; // Avoid division by zero if all have same streams

  const scaledSize =
    MIN_BUBBLE_SIZE +
    ((Math.log1p(streamCount) - Math.log1p(minStreams)) / (Math.log1p(maxStreams) - Math.log1p(minStreams))) *
      (MAX_BUBBLE_SIZE - MIN_BUBBLE_SIZE);
  return Math.max(MIN_BUBBLE_SIZE, Math.min(MAX_BUBBLE_SIZE, scaledSize));
};


const BubbleGalaxyVisualizer: React.FC<BubbleGalaxyVisualizerProps> = ({
  scanLogs,
  onSelectMatch,
  containerWidth,
  containerHeight,
}) => {
  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const animationFrameId = useRef<number | null>(null);
  const lastTimestamp = useRef<number>(0);

  useEffect(() => {
    const allMatches: { match: AcrCloudMatch, log: TrackScanLog }[] = [];
    scanLogs.forEach(log => {
      if (log.matches && (log.status === 'completed_match_found' || log.status === 'scanned_match_found' || log.status === 'imported_spotify_track')) {
        log.matches.forEach(match => {
          allMatches.push({ match, log });
        });
      }
    });

    if (allMatches.length === 0) {
      setBubbles([]);
      return;
    }
    
    const streamCounts = allMatches
        .map(item => item.match.streamCount ?? 0)
        .filter(count => count > 0);

    const minStreams = streamCounts.length > 0 ? Math.min(...streamCounts) : 0;
    const maxStreams = streamCounts.length > 0 ? Math.max(...streamCounts) : 0;
    

    const initialBubbles = allMatches.map(({ match, log }, index) => {
      const radius = normalizeStreamCount(match.streamCount, minStreams, maxStreams) / 2;
      return {
        id: `${log.logId}-${match.id || index}`,
        x: Math.random() * (containerWidth - radius * 2) + radius,
        y: Math.random() * (containerHeight - radius * 2) + radius,
        vx: (Math.random() - 0.5) * 0.3, // Slower speed
        vy: (Math.random() - 0.5) * 0.3,
        radius,
        color: getBubbleColor(match), // Will always return SPOTIFY_COLOR
        match,
        log,
        opacity: 0.7 + Math.random() * 0.3, // Random opacity for depth
      };
    });
    setBubbles(initialBubbles);
  }, [scanLogs, containerWidth, containerHeight]);

  const updateBubbles = useCallback((timestamp: number) => {
    if (!lastTimestamp.current) lastTimestamp.current = timestamp;
    const deltaTime = timestamp - lastTimestamp.current;
    lastTimestamp.current = timestamp;

    if (deltaTime > 0 && containerWidth > 0 && containerHeight > 0) {
        setBubbles(prevBubbles =>
            prevBubbles.map(b => {
            let newX = b.x + b.vx * (deltaTime / 16); // Normalize speed relative to ~60fps
            let newY = b.y + b.vy * (deltaTime / 16);
            let newVx = b.vx;
            let newVy = b.vy;

            if (newX - b.radius < 0) { newX = b.radius; newVx *= -1; }
            if (newX + b.radius > containerWidth) { newX = containerWidth - b.radius; newVx *= -1;}
            if (newY - b.radius < 0) { newY = b.radius; newVy *= -1; }
            if (newY + b.radius > containerHeight) { newY = containerHeight - b.radius; newVy *= -1; }

            return { ...b, x: newX, y: newY, vx: newVx, vy: newVy };
            })
        );
    }
    animationFrameId.current = requestAnimationFrame(updateBubbles);
  }, [containerWidth, containerHeight]);

  useEffect(() => {
    if (bubbles.length > 0 && containerWidth > 0 && containerHeight > 0) {
      animationFrameId.current = requestAnimationFrame(updateBubbles);
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      lastTimestamp.current = 0;
    };
  }, [bubbles.length, updateBubbles, containerWidth, containerHeight]);

  if (scanLogs.length === 0 || bubbles.length === 0) {
    return (
      <div style={{ height: containerHeight }} className="flex items-center justify-center text-gray-700">
        No stream data available for visualization.
      </div>
    );
  }

  return (
    <div
      className="relative win95-border-inset bg-[#000010] overflow-hidden" // Dark space-like background
      style={{ width: '100%', height: containerHeight, minHeight: '250px' }}
      aria-label="Bubble Galaxy Stream Visualizer"
    >
      {bubbles.map(bubble => (
        <div
          key={bubble.id}
          className="absolute rounded-full cursor-pointer transition-transform duration-100 ease-linear"
          style={{
            left: bubble.x - bubble.radius,
            top: bubble.y - bubble.radius,
            width: bubble.radius * 2,
            height: bubble.radius * 2,
            backgroundColor: bubble.color,
            opacity: bubble.opacity,
            border: `1px solid ${BUBBLE_BORDER_COLOR}`,
            boxShadow: `inset 1px 1px 0px rgba(255,255,255,0.3), 1px 1px 0px #000000`, // Subtle 3D effect
          }}
          onClick={() => onSelectMatch(bubble.match, bubble.log)}
          title={`${bubble.match.title} - ${bubble.match.artist}\nStreams: ${bubble.match.streamCount?.toLocaleString() || 'N/A'}`}
          role="button"
          aria-label={`View details for ${bubble.match.title}`}
        />
      ))}
    </div>
  );
};

export default React.memo(BubbleGalaxyVisualizer);
