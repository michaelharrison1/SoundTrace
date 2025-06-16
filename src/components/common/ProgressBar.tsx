
import React from 'react';

interface ProgressBarProps {
  text?: string;
  className?: string;
  textClassName?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ text, className, textClassName }) => {
  // Using a fixed number of blocks (e.g., 20) for smoother appearance.
  // Each block will be 5% of the container (which is 200% of viewport).
  const numberOfBlocks = 20;

  return (
    <div className={`w-full ${className || ''}`} aria-live="polite">
      {text && <p className={`text-black text-sm mb-1 text-center ${textClassName || ''}`}>{text}</p>}
      <div
        className="h-5 bg-white win95-border-inset p-0.5" // Ensure this has the inset border
        role="progressbar"
        aria-label={text || "Loading progress"}
        aria-busy="true"
      >
        <div className="h-full w-full overflow-hidden bg-white relative"> {/* Inner container for blocks */}
          <div className="absolute top-0 left-0 h-full progress-bar-blocks-container flex">
            {[...Array(numberOfBlocks * 2)].map((_, i) => ( // *2 because container is 200% width
              <div
                key={i}
                className="progress-bar-block" // Class defined in index.html for consistent styling
                style={{ width: `${100 / (numberOfBlocks * 2)}%` }} // e.g., 2.5% if 20 blocks in 200% view
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
