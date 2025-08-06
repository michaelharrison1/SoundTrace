import React from 'react';

interface Win95ProgressBarProps {
  percent?: number;
  text?: string;
  className?: string;
}

const Win95ProgressBar: React.FC<Win95ProgressBarProps> = ({ percent = 0, text, className }) => {
  // Authentic Windows 95 progress bar styling with percentage support
  const barHeight = 20; // Classic Windows 95 height
  const blockCount = 16; // Fewer blocks for wider appearance
  const blockWidth = 12; // Wider blocks
  const blockGap = 1; // Minimal gap

  // Calculate filled blocks based on percentage
  const filledBlocks = Math.floor((percent / 100) * blockCount);
  const isIndeterminate = percent === 0; // Show moving animation if no progress
  const isCompleted = percent === 100; // Full light blue when completed

  return (
    <div className={`w-full ${className || ''}`} aria-live="polite" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      {text && <p className="text-black text-sm mb-1 text-center font-mono">{text}</p>}
      
      <div 
        className="win95-border-inset bg-[#C0C0C0] p-0.5 relative overflow-hidden"
        style={{ height: `${barHeight}px` }}
      >
        {isCompleted ? (
          // Completed: Full light blue bar
          <div className="h-full flex items-center bg-[#C0C0C0] p-0.5">
            <div 
              className="h-3/4 w-full bg-[#00FFFF]"
              style={{ 
                boxShadow: 'inset 1px 1px 0px rgba(255,255,255,0.3), inset -1px -1px 0px rgba(0,0,0,0.3)'
              }}
            />
          </div>
        ) : isIndeterminate ? (
          // Indeterminate progress: Wave of light blue moving over black blocks
          <div className="h-full relative bg-[#C0C0C0] flex items-center">
            {/* Static black background that fills the entire width */}
            <div className="absolute inset-0 p-0.5 flex items-center">
              <div className="h-3/4 w-full bg-black" />
            </div>
            {/* Moving light blue wave */}
            <div className="win95-progress-marquee h-full flex items-center absolute inset-0 p-0.5">
              {[...Array(Math.ceil(blockCount * 0.4))].map((_, i) => (
                <div
                  key={`wave-${i}`}
                  className="flex-shrink-0 h-3/4 bg-[#00FFFF] win95-progress-block"
                  style={{ 
                    width: `${blockWidth}px`, 
                    marginRight: `${blockGap}px`,
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          // Determinate progress: Fill blocks based on percentage
          <div className="h-full flex items-center bg-[#C0C0C0] p-0.5">
            {[...Array(blockCount)].map((_, i) => (
              <div
                key={i}
                className={`flex-shrink-0 h-3/4 transition-colors duration-200 ${i < filledBlocks ? 'bg-[#00FFFF]' : 'bg-black'}`}
                style={{ 
                  width: `${blockWidth}px`, 
                  marginRight: i < blockCount - 1 ? `${blockGap}px` : '0px',
                  boxShadow: i < filledBlocks 
                    ? 'inset 1px 1px 0px rgba(255,255,255,0.3), inset -1px -1px 0px rgba(0,0,0,0.3)' 
                    : 'none',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Win95ProgressBar;
