import React, { useRef, useLayoutEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
// Import only what we need from Three.js to reduce bundle size
import { Mesh } from 'three';

export interface Retro3DBarChartDatum {
  label: string;
  value: number;
  color?: string;
}

interface Retro3DBarChartProps {
  data: Retro3DBarChartDatum[];
  height?: number;
  width?: number;
  barColor?: string;
  backgroundColor?: string;
  yLabel?: string;
  xLabel?: string;
  animate?: boolean;
}

const pastelBg = '#FFF8DC';
const defaultBarColor = '#3b82f6'; // blue

function Bar({ x, y, z, width, height, depth, color, value, label, animate }: any) {
  const mesh = useRef<Mesh>(null!);
  useFrame((state, delta) => {
    if (animate && mesh.current) {
      // Animate bar growth
      mesh.current.scale.y += (1 - mesh.current.scale.y) * 0.08;
      if (Math.abs(mesh.current.scale.y - 1) < 0.01) mesh.current.scale.y = 1;
    }
  });
  useLayoutEffect(() => {
    if (mesh.current) mesh.current.scale.y = animate ? 0.01 : 1;
  }, [animate]);
  return (
    <group position={[x, y + height / 2, z]}>
      <mesh ref={mesh} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Label above bar */}
      <Html position={[0, height / 2 + 0.3, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          color: '#222',
          fontWeight: 'bold',
          fontSize: '0.9rem',
          textShadow: '0 1px 2px #fff, 0 0px 2px #000',
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 4,
          padding: '1px 6px',
          border: '1px solid #bbb',
          boxShadow: '0 2px 6px #ccc',
        }}>{value}</div>
      </Html>
      {/* X label below bar */}
      <Html position={[0, -height / 2 - 0.3, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          color: '#333',
          fontSize: '0.8rem',
          fontWeight: 600,
          textShadow: '0 1px 2px #fff',
        }}>{label}</div>
      </Html>
    </group>
  );
}

export const Retro3DBarChart: React.FC<Retro3DBarChartProps> = ({
  data,
  height = 350,
  width = 700,
  barColor = defaultBarColor,
  backgroundColor = pastelBg,
  yLabel = 'Followers',
  xLabel = 'Date',
  animate = true,
}) => {
  // Chart layout
  const barWidth = 0.7;
  const barDepth = 1.2;
  const gap = 0.5;
  const maxBarHeight = 5;
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const yTicks = 4;

  return (
    <div style={{ background: backgroundColor, borderRadius: 12, boxShadow: '0 4px 24px #e0e0e0', padding: 8, width, margin: '0 auto' }}>
      <Canvas shadows camera={{ position: [0, 6, 13], fov: 35 }} style={{ height, width: '100%' }}>
        {/* Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 7]} intensity={0.7} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        {/* Bars */}
        {data.map((d, i) => (
          <Bar
            key={d.label}
            x={i * (barWidth + gap) - ((data.length - 1) * (barWidth + gap)) / 2}
            y={0}
            z={0}
            width={barWidth}
            height={maxBarHeight * (d.value / maxValue)}
            depth={barDepth}
            color={d.color || barColor}
            value={d.value}
            label={d.label}
            animate={animate}
          />
        ))}
        {/* Y axis ticks */}
        {[...Array(yTicks + 1)].map((_, i) => {
          const y = (maxBarHeight / yTicks) * i;
          const val = Math.round((maxValue / yTicks) * i);
          return (
            <Html key={i} position={[-(data.length * (barWidth + gap)) / 2 - 0.7, y - maxBarHeight / 2, 0]} center style={{ pointerEvents: 'none' }}>
              <div style={{ color: '#444', fontSize: '0.8rem', fontWeight: 600, textShadow: '0 1px 2px #fff' }}>{val}</div>
            </Html>
          );
        })}
        {/* X axis label */}
        <Html position={[0, -maxBarHeight / 2 - 1.2, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{ color: '#333', fontSize: '1rem', fontWeight: 700 }}>{xLabel}</div>
        </Html>
        {/* Y axis label */}
        <Html position={[-(data.length * (barWidth + gap)) / 2 - 1.7, 0, 0]} center style={{ pointerEvents: 'none', transform: 'rotate(-90deg)' }}>
          <div style={{ color: '#333', fontSize: '1rem', fontWeight: 700, writingMode: 'vertical-lr', textOrientation: 'mixed' }}>{yLabel}</div>
        </Html>
        {/* Retro border effect */}
        <mesh position={[0, 0, -barDepth / 2 - 0.1]} receiveShadow>
          <boxGeometry args={[data.length * (barWidth + gap) + 1, maxBarHeight + 2, 0.2]} />
          <meshStandardMaterial color="#e0e0e0" />
        </mesh>
        <OrbitControls enablePan={false} enableZoom={false} maxPolarAngle={Math.PI / 2.1} minPolarAngle={Math.PI / 3} />
      </Canvas>
    </div>
  );
};

export default Retro3DBarChart;
