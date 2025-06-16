
import React, { useMemo, useRef, useState, useCallback } from 'react';
import { TrackScanLog, AcrCloudMatch } from '../../../types';

const DNA_STRAND_MAIN_COLOR = '#1DB954'; // Spotify Green for main strands
const DNA_RUNG_COLOR = '#10B981';   // A slightly different green for track rungs
const DNA_RUNG_HIGHLIGHT_COLOR = '#34D399'; // Lighter green for hover
const DNA_BACKGROUND_COLOR = '#202020';
const MIN_STRAND_THICKNESS = 2;
const MAX_STRAND_THICKNESS = 8;
const RUNG_THICKNESS = 2;
const RUNG_HIGHLIGHT_THICKNESS = 3;

interface DnaStrandVisualizerProps {
  scanLogs: TrackScanLog[];
  onSelectMatch: (match: AcrCloudMatch, log: TrackScanLog) => void;
  containerWidth: number;
  containerHeight: number;
  totalStreams: number | null | undefined;
}

interface DnaSegmentData {
  id: string;
  match: AcrCloudMatch;
  log: TrackScanLog;
  // For SVG rendering:
  y: number;          // y-coordinate for the center of the rung
  x1: number;         // x-coordinate of the rung on the first strand
  x2: number;         // x-coordinate of the rung on the second strand
  isFront1: boolean;  // is the first connection point on the front strand?
  isFront2: boolean;  // is the second connection point on the front strand?
}

const MAX_TOTAL_STREAMS_FOR_SCALING = 100000000; // Cap for scaling strand thickness

const DnaStrandVisualizer: React.FC<DnaStrandVisualizerProps> = ({
  scanLogs,
  onSelectMatch,
  containerWidth,
  containerHeight,
  totalStreams,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredSegmentId, setHoveredSegmentId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);

  const uniqueMatches = useMemo((): { match: AcrCloudMatch, log: TrackScanLog }[] => {
    const seenMatchIds = new Set<string>();
    const result: { match: AcrCloudMatch, log: TrackScanLog }[] = [];
    scanLogs.forEach(log => {
      if (log.matches && (log.status === 'completed_match_found' || log.status === 'scanned_match_found' || log.status === 'imported_spotify_track')) {
        log.matches.forEach(match => {
          const uniqueKey = match.spotifyTrackId || `${match.artist}-${match.title}`;
          if (!seenMatchIds.has(uniqueKey)) {
            seenMatchIds.add(uniqueKey);
            result.push({ match, log });
          }
        });
      }
    });
    return result.sort((a,b) => (b.match.streamCount || 0) - (a.match.streamCount || 0));
  }, [scanLogs]);

  const strandThickness = useMemo(() => {
    if (typeof totalStreams !== 'number' || totalStreams === null || totalStreams <= 0) {
      return MIN_STRAND_THICKNESS;
    }
    const scale = Math.min(1, Math.log1p(totalStreams) / Math.log1p(MAX_TOTAL_STREAMS_FOR_SCALING));
    return MIN_STRAND_THICKNESS + scale * (MAX_STRAND_THICKNESS - MIN_STRAND_THICKNESS);
  }, [totalStreams]);


  const helixData = useMemo(() => {
    if (!containerWidth || !containerHeight || uniqueMatches.length === 0) {
      return { path1: '', path2: '', segments: [] };
    }

    const amplitudeValue = containerWidth * 0.25;
    const centerX = containerWidth / 2;
    const numSegmentsValue = uniqueMatches.length;
    const verticalPaddingValue = containerHeight * 0.1;
    const drawingHeightValue = containerHeight - 2 * verticalPaddingValue;
    const verticalSpacingValue = numSegmentsValue > 1 ? drawingHeightValue / (numSegmentsValue - 1) : drawingHeightValue / 2;
    const numTwistsValue = Math.max(2, Math.min(5, Math.floor(numSegmentsValue / 7)));
    const totalAngleValue = numTwistsValue * 2 * Math.PI;

    const segments: DnaSegmentData[] = [];
    const points1: string[] = [];
    const points2: string[] = [];

    for (let i = 0; i < numSegmentsValue; i++) {
      const yBase = verticalPaddingValue + (numSegmentsValue === 1 ? drawingHeightValue / 2 : i * verticalSpacingValue);
      const t = (numSegmentsValue === 1) ? 0.5 : i / (numSegmentsValue - 1);
      const angle = t * totalAngleValue;

      const zFactor = Math.sin(angle);
      const perspectiveScale = 1 + zFactor * 0.1;
      const currentAmplitude = amplitudeValue * perspectiveScale;

      const x1 = centerX + currentAmplitude * Math.cos(angle);
      const x2 = centerX + currentAmplitude * Math.cos(angle + Math.PI);

      if(i === 0){
         points1.push(`M ${x1} ${yBase}`);
         points2.push(`M ${x2} ${yBase}`);
      } else {
         const prevYBase = verticalPaddingValue + (numSegmentsValue === 1 ? drawingHeightValue / 2 : (i-1) * verticalSpacingValue);
         const prevT = (numSegmentsValue === 1) ? 0.5 : (i-1) / (numSegmentsValue -1);
         const prevAngle = prevT * totalAngleValue;
         const prevZFactor = Math.sin(prevAngle);
         const prevPerspectiveScale = 1 + prevZFactor * 0.1;
         const prevAmplitude = amplitudeValue * prevPerspectiveScale;

         const prev_x1 = centerX + prevAmplitude * Math.cos(prevAngle);
         const prev_x2 = centerX + prevAmplitude * Math.cos(prevAngle + Math.PI);

         const c1x1 = (prev_x1 + x1) / 2;
         const c1y1 = prevYBase;
         const c2x1 = (prev_x1 + x1) / 2;
         const c2y1 = yBase;

         const c1x2 = (prev_x2 + x2) / 2;
         const c1y2 = prevYBase;
         const c2x2 = (prev_x2 + x2) / 2;
         const c2y2 = yBase;

         points1.push(`C ${c1x1} ${c1y1}, ${c2x1} ${c2y1}, ${x1} ${yBase}`);
         points2.push(`C ${c1x2} ${c1y2}, ${c2x2} ${c2y2}, ${x2} ${yBase}`);
      }

      segments.push({
        id: uniqueMatches[i].match.spotifyTrackId || `${uniqueMatches[i].log.logId}-${i}`,
        match: uniqueMatches[i].match,
        log: uniqueMatches[i].log,
        y: yBase,
        x1: x1,
        x2: x2,
        isFront1: zFactor >= 0,
        isFront2: Math.sin(angle + Math.PI) >=0
      });
    }
    return { path1: points1.join(' '), path2: points2.join(' '), segments };
  }, [uniqueMatches, containerWidth, containerHeight]);


  const handleMouseEnter = useCallback((event: React.MouseEvent, segment: DnaSegmentData) => {
    setHoveredSegmentId(segment.id);
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const tooltipContent = `
      <strong>${segment.match.title}</strong><br/>
      Artist: ${segment.match.artist}<br/>
      Streams: ${segment.match.streamCount?.toLocaleString() || 'N/A'}
    `;
    setTooltip({
      content: tooltipContent,
      x: event.clientX - svgRect.left + 10,
      y: event.clientY - svgRect.top - 20,
    });
  }, [setHoveredSegmentId, setTooltip]);

  const handleMouseLeave = useCallback(() => {
    setHoveredSegmentId(null);
    setTooltip(null);
  }, [setHoveredSegmentId, setTooltip]);

  const handleClick = useCallback((segment: DnaSegmentData) => {
    onSelectMatch(segment.match, segment.log);
  }, [onSelectMatch]);

  if (!containerWidth || !containerHeight ) {
    return <div style={{ height: containerHeight, width: containerWidth }} className="flex items-center justify-center text-black bg-gray-300 win95-border-inset">Initializing DNA Visualizer...</div>;
  }
  if (uniqueMatches.length === 0) {
    return <div style={{ height: containerHeight, width: containerWidth }} className="flex items-center justify-center text-black bg-gray-300 win95-border-inset">No track data with streams for DNA visualization.</div>;
  }

  const { path1, path2, segments } = helixData;

  const frontRungs = segments.filter(s => s.isFront1 || s.isFront2);
  const backRungs = segments.filter(s => !s.isFront1 && !s.isFront2);


  return (
    <div
        className="relative win95-border-inset overflow-hidden"
        style={{ width: containerWidth, height: containerHeight, backgroundColor: DNA_BACKGROUND_COLOR }}
        role="application"
        aria-label="DNA Strand Visualization of Matched Tracks"
    >
      <svg ref={svgRef} width="100%" height="100%" className="font-normal">
        <defs>
            <filter id="dnaStrandShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.5"/>
            </filter>
        </defs>

        <path d={path1} stroke={DNA_STRAND_MAIN_COLOR} strokeWidth={strandThickness} fill="none" strokeOpacity="0.5" />
        <path d={path2} stroke={DNA_STRAND_MAIN_COLOR} strokeWidth={strandThickness} fill="none" strokeOpacity="0.5" />

        {backRungs.map(segment => (
          <line
            key={`${segment.id}-rung-back`}
            x1={segment.x1} y1={segment.y}
            x2={segment.x2} y2={segment.y}
            stroke={hoveredSegmentId === segment.id ? DNA_RUNG_HIGHLIGHT_COLOR : DNA_RUNG_COLOR}
            strokeWidth={hoveredSegmentId === segment.id ? RUNG_HIGHLIGHT_THICKNESS : RUNG_THICKNESS}
            strokeOpacity="0.6"
            onMouseEnter={(e) => handleMouseEnter(e, segment)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(segment)}
            className="cursor-pointer transition-all duration-100"
            aria-label={`Track: ${segment.match.title} by ${segment.match.artist}`}
          />
        ))}

         <path d={path1} stroke={DNA_STRAND_MAIN_COLOR} strokeWidth={strandThickness} fill="none" filter="url(#dnaStrandShadow)" />
         <path d={path2} stroke={DNA_STRAND_MAIN_COLOR} strokeWidth={strandThickness} fill="none" filter="url(#dnaStrandShadow)" />


        {frontRungs.map(segment => (
          <line
            key={`${segment.id}-rung-front`}
            x1={segment.x1} y1={segment.y}
            x2={segment.x2} y2={segment.y}
            stroke={hoveredSegmentId === segment.id ? DNA_RUNG_HIGHLIGHT_COLOR : DNA_RUNG_COLOR}
            strokeWidth={hoveredSegmentId === segment.id ? RUNG_HIGHLIGHT_THICKNESS : RUNG_THICKNESS}
            strokeOpacity="1"
            onMouseEnter={(e) => handleMouseEnter(e, segment)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(segment)}
            className="cursor-pointer transition-all duration-100"
            aria-label={`Track: ${segment.match.title} by ${segment.match.artist}`}
          />
        ))}
      </svg>
      {tooltip && (
        <div
          className="absolute p-1 bg-[#FEFEE0] text-black border border-black text-xs win95-border-outset shadow-md pointer-events-none whitespace-nowrap z-50"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(10px, -25px)' }}
          dangerouslySetInnerHTML={{ __html: tooltip.content }}
        />
      )}
    </div>
  );
};

export default React.memo(DnaStrandVisualizer);
