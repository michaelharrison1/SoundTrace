
import React from 'react';
import DesktopIcon from './DesktopIcon';
import WindowFrame from './WindowFrame'; // Used for non-modal windows
import { AppWindow } from '../../App'; 

interface DesktopProps {
  icons: Array<{ id: string; name: string; icon: string; action: () => void }>;
  openWindows: AppWindow[]; // Only non-modal, non-minimized windows passed here
  activeWindowId?: string;
  focusWindow: (id: string) => void;
  // onClose and onMinimize handled by WindowFrame itself, it calls parent's closeWindow/minimizeWindow via props
}

const Desktop: React.FC<DesktopProps> = ({ icons, openWindows, activeWindowId, focusWindow }) => {
  // Note: Actual WindowFrame instances are created in App.tsx and passed as children
  // This component mainly renders the icons and provides the desktop background area.
  // The openWindows prop is used to determine which windows are currently active and should be rendered by App.tsx
  // For this component, we only need to map icons. App.tsx will manage rendering of WindowFrames on top.

  return (
    <div 
      className="flex-grow p-2 flex flex-row flex-wrap content-start items-start overflow-hidden relative" // Changed to flex-row for icon layout
      style={{ backgroundColor: 'transparent' }} // Background is on body
      role="main" 
      aria-label="Desktop area with icons and application windows"
    >
      {/* Desktop Icons */}
      {icons.map(icon => (
        <DesktopIcon
          key={icon.id}
          id={icon.id}
          name={icon.name}
          iconSrc={icon.icon}
          onOpen={icon.action}
        />
      ))}
      {/* App.tsx renders the actual <WindowFrame> components that appear on the desktop */}
    </div>
  );
};

export default React.memo(Desktop);
