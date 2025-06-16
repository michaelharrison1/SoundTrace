
import React from 'react';
import DesktopIcon from './DesktopIcon';
// WindowFrame is no longer directly rendered or managed by Desktop.tsx
// App.tsx now handles rendering all WindowFrame instances.

interface DesktopProps {
  icons: Array<{ id: string; name: string; icon: string; action: () => void }>;
  // openWindows, activeWindowId, focusWindow props are removed as App.tsx manages window rendering and state.
}

const Desktop: React.FC<DesktopProps> = ({ icons }) => {
  return (
    <div
      className="flex-grow p-2 flex flex-col flex-nowrap items-start content-start overflow-y-auto relative"
      style={{ backgroundColor: 'transparent' }} // Background is now handled by body CSS
      role="main"
      aria-label="Desktop area with icons" 
    >
      {/* Desktop Icons */}
      {icons.map(icon => (
        <DesktopIcon
          key={icon.id}
          id={icon.id} // id is still useful for unique keys
          name={icon.name}
          iconSrc={icon.icon}
          onOpen={icon.action} // Action is now () => {} from App.tsx, making icons non-interactive
        />
      ))}
      {/* Application windows are rendered by App.tsx directly on top of this desktop area */}
    </div>
  );
};

export default React.memo(Desktop);