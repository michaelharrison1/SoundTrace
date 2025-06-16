
import React from 'react';

interface WindowFrameProps {
  id: string;
  title: string;
  icon?: string;
  children: React.ReactNode;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  isActive: boolean;
  zIndex: number;
  initialWidth?: string;
  initialHeight?: string;
  isModal?: boolean;
}

const WindowFrame: React.FC<WindowFrameProps> = ({
  id,
  title,
  icon,
  children,
  onClose,
  onMinimize,
  onFocus,
  isActive,
  zIndex,
  initialWidth = 'min(75vw, 800px)', // Default responsive width
  initialHeight = 'min(70vh, 600px)', // Default responsive height
  isModal = false
}) => {
  
  // Adjusted positioning logic
  const windowStyle: React.CSSProperties = {
    width: initialWidth,
    height: initialHeight,
    zIndex: zIndex,
    position: 'absolute',
    display: 'flex', // Added flex for structure
    flexDirection: 'column', // Stack title bar and body
    // For modals, center them. For app windows, slightly offset.
    top: isModal ? '50%' : '5%',
    left: isModal ? '50%' : '10%',
    transform: isModal ? 'translate(-50%, -50%)' : undefined,
    // Using 98.css 'window' class handles most border/shadow, but this can be a fallback
    // boxShadow: '2px 2px 8px rgba(0,0,0,0.3)', 
  };

  return (
    <div
      className={`window app-window-frame ${isActive ? 'active' : ''}`} // app-window-frame from index.html for custom sizing/positioning
      style={windowStyle}
      onClick={onFocus} // Bring to front on click anywhere on the window
      role="dialog"
      aria-labelledby={`window-title-${id}`}
      aria-modal={isModal}
      tabIndex={-1} // Make the window itself focusable
    >
      <div className={`title-bar ${isActive ? '' : 'inactive'}`} onMouseDown={onFocus}> {/* Ensure 'inactive' class is applied if not active for 98.css */}
        {icon && <img src={icon} alt="" width="16" height="16" className="mr-1 title-bar-icon" style={{imageRendering: 'pixelated'}}/>}
        <div className="title-bar-text" id={`window-title-${id}`}>{title}</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" onClick={(e) => { e.stopPropagation(); onMinimize(); }}></button>
          {/* Maximize button is typically present but could be disabled for non-resizable windows */}
          {/* <button aria-label="Maximize" disabled></button>  */}
          <button aria-label="Close" onClick={(e) => { e.stopPropagation(); onClose(); }}></button>
        </div>
      </div>
      <div className="window-body has-space" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}> {/* Ensures children can grow and scroll */}
        {/* The direct child of window-body should handle its own scrolling */}
        {children}
      </div>
    </div>
  );
};

export default React.memo(WindowFrame);
