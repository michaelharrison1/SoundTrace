
import React from 'react';

const SpotifyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none" // Spotify icon is usually solid color, no stroke
    {...props}
  >
    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm4.634 14.608c-.24.36-.73.472-1.09.233-2.982-1.835-6.717-2.243-11.032-1.228-.413.096-.83-.13-.927-.543s.13-.83.544-.927c4.738-1.103 8.883-.628 12.255 1.435.36.24.472.73.232 1.09zm.842-2.282c-.29.433-.877.577-1.31.286-3.428-2.1-8.547-2.73-12.445-1.49-.49.153-.995-.13-1.148-.62s.13-.994.62-1.147c4.352-1.358 9.94-.666 13.818 1.803.434.29.578.876.287 1.31zm.07-2.522C16.015 9.38 10.13 9.008 5.922 10.201c-.566.164-1.165-.152-1.33-.718-.164-.565.152-1.165.718-1.33C9.995 6.797 16.584 7.212 19.22 9.82c.49.49.217 1.282-.363 1.527s-1.282.217-1.527-.363z" />
  </svg>
);

export default SpotifyIcon;
