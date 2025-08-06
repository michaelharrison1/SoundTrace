
import React from 'react';

interface ProgressBarProps {
  text?: string;
  percent?: number; // For determinant progress bars (0-100)
  isIndeterminate?: boolean; // For moving Windows 95 style bars
  className?: string;
  textClassName?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  text, 
  percent, 
  isIndeterminate = true, // Default to indeterminate for loading states
  className, 
  textClassName 
}) => {
  // Authentic Windows 95 progress bar styling with retro light blue
  const barHeight = 20; // Classic Windows 95 height
  const blockCount = 16; // Fewer blocks for wider appearance
  const blockWidth = 12; // Wider blocks
  const blockGap = 1; // Minimal gap

  // For determinate progress, calculate filled blocks
  const filledBlocks = percent !== undefined ? Math.floor((percent / 100) * blockCount) : 0;

  return (
    <div className={`w-full ${className || ''}`} role="progressbar" aria-busy="true" aria-label={text || "Loading progress"}>
      {text && <p className={`text-black text-sm mb-1 text-center ${textClassName || ''}`}>{text}</p>}
      
      <div 
        className="win95-border-inset bg-[#C0C0C0] p-0.5 relative overflow-hidden"
        style={{ height: `${barHeight}px` }}
      >
        {isIndeterminate ? (
          // Indeterminate progress: Wave of light blue moving over black blocks
          <div className="h-full relative bg-[#C0C0C0] flex items-center">
            {/* Static black background blocks */}
            <div className="absolute inset-0 p-0.5 flex items-center">
              {[...Array(blockCount)].map((_, i) => (
                <div
                  key={`bg-${i}`}
                  className="flex-shrink-0 h-3/4 bg-black"
                  style={{ 
                    width: `${blockWidth}px`, 
                    marginRight: i < blockCount - 1 ? `${blockGap}px` : '0px',
                  }}
                />
              ))}
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
                className={`flex-shrink-0 h-3/4 ${i < filledBlocks ? 'bg-[#00FFFF]' : 'bg-black'}`}
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

export default ProgressBar;
