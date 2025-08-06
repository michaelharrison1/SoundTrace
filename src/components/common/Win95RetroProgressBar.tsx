import React from 'react';

interface Win95RetroProgressBarProps {
  text?: string;
  percent?: number; // For determinant progress bars (0-100)
  isIndeterminate?: boolean; // For moving Windows 95 style bars
  className?: string;
  textClassName?: string;
}

const Win95RetroProgressBar: React.FC<Win95RetroProgressBarProps> = ({ 
  text, 
  percent, 
  isIndeterminate = true, // Default to indeterminate for loading states
  className, 
  textClassName 
}) => {
  // Authentic Windows 95 progress bar styling
  const barHeight = 20; // Classic Windows 95 height
  const blockCount = 20;
  const blockWidth = 8;
  const blockGap = 2;

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
          // Indeterminate progress: Moving blocks animation (Windows 95 style)
          <div className="h-full relative bg-[#C0C0C0]">
            <div className="win95-progress-marquee h-full flex items-center">
              {[...Array(Math.ceil(blockCount * 1.5))].map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 h-3/4 bg-[#000080] win95-progress-block"
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
          <div className="h-full flex items-center bg-[#C0C0C0]">
            {[...Array(blockCount)].map((_, i) => (
              <div
                key={i}
                className={`flex-shrink-0 h-3/4 ${i < filledBlocks ? 'bg-[#000080]' : 'bg-[#C0C0C0]'}`}
                style={{ 
                  width: `${blockWidth}px`, 
                  marginRight: i < blockCount - 1 ? `${blockGap}px` : '0px',
                  border: i < filledBlocks ? '1px solid #000040' : '1px solid #A0A0A0',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Win95RetroProgressBar;
