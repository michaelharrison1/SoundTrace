import React, { Suspense, lazy } from 'react';
import { Retro3DBarChartDatum } from './Retro3DBarChart';
import ProgressBar from '../ProgressBar';

// Lazy load the Three.js component to reduce initial bundle size
const Retro3DBarChart = lazy(() => import('./Retro3DBarChart'));

interface LazyRetro3DBarChartProps {
  data: Retro3DBarChartDatum[];
  height?: number;
  width?: number;
  barColor?: string;
  backgroundColor?: string;
  yLabel?: string;
  xLabel?: string;
  animate?: boolean;
}

/**
 * Lazy-loaded wrapper for Retro3DBarChart to reduce initial bundle size.
 * Three.js libraries (~500KB+) are only loaded when this component is actually used.
 */
const LazyRetro3DBarChart: React.FC<LazyRetro3DBarChartProps> = (props) => {
  return (
    <Suspense fallback={
      <div 
        className="win95-border-inset bg-[#C0C0C0] p-4 flex flex-col items-center justify-center"
        style={{ height: props.height || 350, width: props.width || 700 }}
      >
        <div className="w-full max-w-xs">
          <ProgressBar text="Loading 3D Chart..." />
        </div>
      </div>
    }>
      <Retro3DBarChart {...props} />
    </Suspense>
  );
};

export default LazyRetro3DBarChart;
