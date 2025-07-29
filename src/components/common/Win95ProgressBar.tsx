import React from 'react';

interface Win95ProgressBarProps {
  percent?: number;
  text?: string;
  className?: string;
}

const Win95ProgressBar: React.FC<Win95ProgressBarProps> = ({ percent = 0, text, className }) => {
  // Blocky, slow, retro blue/grey bar with pixelated border and flicker
  const blocks = 20;
  const filledBlocks = Math.round((percent / 100) * blocks);
  return (
    <div className={`w-full ${className || ''}`} aria-live="polite">
      {text && <p className="text-black text-sm mb-1 text-center font-mono">{text}</p>}
      <div className="h-6 bg-[#E0E0E0] win95-border-inset p-0.5 flex items-center relative" style={{ fontFamily: 'monospace', boxShadow: '2px 2px 0 #000, 4px 4px 0 #888' }}>
        <div className="flex w-full h-full">
          {[...Array(blocks)].map((_, i) => (
            <div
              key={i}
              className={`h-full transition-all duration-700 ${i < filledBlocks ? 'bg-[#1D9BF0] animate-flicker' : 'bg-[#B0B0B0]'}`}
              style={{ width: `${100 / blocks}%`, borderRight: '1px solid #888' }}
            />
          ))}
        </div>
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px #000, inset 0 0 0 4px #FFF' }} />
      </div>
    </div>
  );
};

export default Win95ProgressBar;
