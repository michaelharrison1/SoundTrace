import React from 'react';

interface Win95ProgressBarProps {
  percent?: number;
  text?: string;
  className?: string;
}

const Win95ProgressBar: React.FC<Win95ProgressBarProps> = ({ percent = 0, text, className }) => {
  // Authentic Windows 95 progress bar styling with percentage support
  const barHeight = 20; // Classic Windows 95 height
  const blockCount = 20;
  const blockWidth = 8;
  const blockGap = 2;

  // Calculate filled blocks based on percentage
  const filledBlocks = Math.floor((percent / 100) * blockCount);
  const isIndeterminate = percent === 0; // Show moving animation if no progress

  return (
    <div className={`w-full ${className || ''}`} aria-live="polite" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      {text && <p className="text-black text-sm mb-1 text-center font-mono">{text}</p>}
      
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
                className={`flex-shrink-0 h-3/4 transition-colors duration-200 ${i < filledBlocks ? 'bg-[#000080]' : 'bg-[#C0C0C0]'}`}
                style={{ 
                  width: `${blockWidth}px`, 
                  marginRight: i < blockCount - 1 ? `${blockGap}px` : '0px',
                  border: i < filledBlocks ? '1px solid #000040' : '1px solid #A0A0A0',
                  boxShadow: i < filledBlocks 
                    ? 'inset 1px 1px 0px rgba(255,255,255,0.3), inset -1px -1px 0px rgba(0,0,0,0.3)' 
                    : 'inset 1px 1px 0px rgba(255,255,255,0.1), inset -1px -1px 0px rgba(0,0,0,0.1)',
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
