import React from 'react';

interface ProgressBarProps {
  text?: string;
  className?: string;
  textClassName?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ text, className, textClassName }) => {
  return (
    <div className={`w-full ${className || ''}`} aria-live="polite">
      {text && <p className={`text-black text-sm mb-1 text-center ${textClassName || ''}`}>{text}</p>}
      <div
        className="h-5 bg-white win95-border-inset p-0.5"
        role="progressbar"
        aria-label={text || "Loading progress"}
        aria-busy="true"
      >
        <div className="h-full w-full overflow-hidden bg-white relative">
          <div className="absolute top-0 left-0 h-full progress-bar-blocks-container flex">
            {/* Render enough blocks to fill 2x the width for continuous marquee */}
            {[...Array(16)].map((_, i) => ( // 16 blocks (e.g. 8 visible, 8 for loop)
              <div
                key={i}
                className="h-full w-[6.25%] win95-border-outset bg-[#084B8A] mr-[2px]" // 100% / 16 blocks = 6.25% per block
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;