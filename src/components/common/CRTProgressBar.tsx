
import React from 'react';

interface CRTProgressBarProps {
  text?: string;
  isActive: boolean;
  className?: string;
  textClassName?: string;
}

const CRTProgressBar: React.FC<CRTProgressBarProps> = ({ text, isActive, className, textClassName }) => {
  return (
    <div className={`w-full ${className || ''}`} role="progressbar" aria-busy={isActive} aria-label={text || "Scan in progress"}>
      {text && <p className={`text-black text-sm mb-1 text-center ${textClassName || ''}`}>{text}</p>}
      <div className="h-5 bg-black win95-border-inset p-0.5">
        <div className="crt-scan-bar-container h-full"> {/* Uses styles from index.html */}
          {isActive && <div className="crt-scan-line"></div>}
        </div>
      </div>
    </div>
  );
};

export default React.memo(CRTProgressBar);
