import React, { Suspense, lazy } from 'react';
import { Retro3DBarChartDatum } from './Retro3DBarChart';

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
        className="flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300"
        style={{ height: props.height || 350, width: props.width || 700 }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading 3D Chart...</p>
        </div>
      </div>
    }>
      <Retro3DBarChart {...props} />
    </Suspense>
  );
};

export default LazyRetro3DBarChart;
