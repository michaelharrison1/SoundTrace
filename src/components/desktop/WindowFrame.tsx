
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
  isMinimizedByApp?: boolean; // New prop to control display: none from App.tsx
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
  initialWidth = 'min(75vw, 800px)',
  initialHeight = 'min(70vh, 600px)',
  isModal = false,
  isMinimizedByApp = false, // Default to false
}) => {

  const windowStyle: React.CSSProperties = {
    width: initialWidth,
    height: initialHeight,
    zIndex: zIndex,
    position: 'absolute',
    display: isMinimizedByApp ? 'none' : 'flex', // Controlled by App.tsx
    flexDirection: 'column',
    top: isModal ? '50%' : '5%',
    left: isModal ? '50%' : '10%',
    transform: isModal ? 'translate(-50%, -50%)' : undefined,
  };

  return (
    <div
      className={`window app-window-frame ${isActive ? 'active' : ''} ${isMinimizedByApp ? 'window-hidden' : ''}`} // Added window-hidden for clarity
      style={windowStyle}
      onClick={onFocus}
      role="dialog"
      aria-labelledby={`window-title-${id}`}
      aria-modal={isModal}
      aria-hidden={isMinimizedByApp}
      tabIndex={-1}
      id={`window-${id}`}
    >
      <div className={`title-bar ${isActive ? '' : 'inactive'}`} onMouseDown={onFocus}>
        {icon && <img src={icon} alt="" width="16" height="16" className="mr-1 title-bar-icon" style={{imageRendering: 'pixelated'}}/>}
        <div className="title-bar-text" id={`window-title-${id}`}>{title}</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" onClick={(e) => { e.stopPropagation(); onMinimize(); }}></button>
          <button aria-label="Close" onClick={(e) => { e.stopPropagation(); onClose(); }}></button>
        </div>
      </div>
      <div className="window-body has-space" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
};

export default React.memo(WindowFrame);
