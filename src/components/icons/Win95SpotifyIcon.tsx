import React from 'react';

interface Win95SpotifyIconProps extends React.HTMLAttributes<HTMLImageElement> {
  className?: string;
}

const Win95SpotifyIcon: React.FC<Win95SpotifyIconProps> = ({ className, ...props }) => {
  return (
    <img 
      src="/win95icons/Sound program.ico" 
      alt="Spotify" 
      className={className} 
      style={{ width: '16px', height: '16px' }}
      {...props}
    />
  );
};

export default Win95SpotifyIcon;
