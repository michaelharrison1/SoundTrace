import React from 'react';

interface Win95AlertBoxProps {
  message: string;
  className?: string;
}

const Win95AlertBox: React.FC<Win95AlertBoxProps> = ({ message, className }) => (
  <div
    className={`win95-border-outset bg-[#F8F8F8] p-3 flex items-center space-x-2 animate-flicker text-black ${className || ''}`}
    style={{ maxWidth: 400, margin: '0 auto', boxShadow: '2px 2px 0 #000, 4px 4px 0 #888' }}
    role="alert"
  >
    <div className="flex-shrink-0">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="2" fill="#FFF" stroke="#000" strokeWidth="2" />
        <rect x="7" y="7" width="10" height="10" rx="2" fill="#1D9BF0" stroke="#000" strokeWidth="1" />
        <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#FFF" fontFamily="monospace">!</text>
      </svg>
    </div>
    <div className="font-mono text-base">
      {message}
    </div>
  </div>
);

export default Win95AlertBox;
