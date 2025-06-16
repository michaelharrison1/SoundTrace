
import React, { useState, useEffect, useCallback } from 'react';
import { AppWindow, AuthView } from '../../App';
import StartMenu from './StartMenu';
import { User } from '../../types';

interface TaskbarProps {
  openWindows: AppWindow[]; // Should only contain non-modal windows
  activeWindowId?: string; // ID of the currently visible non-modal window
  onTabClick: (id: string) => void; // Makes the window visible and active
  onCloseTab: (id: string) => void; // Hides/minimizes the window
  currentUser: User | null;
  onLogout: () => void;
  onSwitchAuthView: (view: AuthView) => void;
  currentAuthView: AuthView;
  onOpenWindow: (id: string, title: string, content: React.ReactElement, icon?: string, options?: any) => void;
}

const Taskbar: React.FC<TaskbarProps> = ({
    openWindows, activeWindowId, onTabClick, onCloseTab,
    currentUser, onLogout, onSwitchAuthView, currentAuthView, onOpenWindow
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [startMenuOpen, setStartMenuOpen] = useState(false);

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timerId);
  }, []);

  const toggleStartMenu = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setStartMenuOpen(prev => !prev);
  }, []);

  const closeStartMenu = useCallback(() => {
    setStartMenuOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const startMenuElement = document.querySelector('.start-menu');
      const startButtonElement = document.querySelector('.taskbar-start-button');
      if (startMenuOpen && startMenuElement && !startMenuElement.contains(event.target as Node) && startButtonElement && !startButtonElement.contains(event.target as Node)) {
        closeStartMenu();
      }
    };
    if (startMenuOpen) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [startMenuOpen, closeStartMenu]);

  const handleAuthViewChange = (view: AuthView) => {
    onSwitchAuthView(view);
    closeStartMenu();
  }

  return (
    <footer className="taskbar" role="toolbar" aria-label="Taskbar">
      <button
        className={`taskbar-start-button ${startMenuOpen ? 'active' : ''}`}
        onClick={toggleStartMenu}
        aria-haspopup="true"
        aria-expanded={startMenuOpen}
        id="start-button"
      >
        <img src="/src/components/windows95icons/actions/start_20x20.png" alt="Start Menu" style={{imageRendering: 'pixelated'}}/> {/* Updated icon path if needed */}
        Start
      </button>
      {startMenuOpen && (
        <StartMenu
            onClose={closeStartMenu}
            onLogout={onLogout}
            currentUser={currentUser}
            onSwitchAuthView={handleAuthViewChange}
            currentAuthView={currentAuthView}
            onOpenWindow={onOpenWindow}
        />
      )}
      <div className="taskbar-divider"></div>
      <div className="taskbar-tabs">
        {openWindows.map(win => (
          <button
            key={win.id}
            className={`taskbar-tab ${(activeWindowId === win.id && !win.isMinimized) ? 'active' : ''}`}
            onClick={() => onTabClick(win.id)}
            title={win.title}
            aria-pressed={(activeWindowId === win.id && !win.isMinimized)}
            aria-controls={`window-${win.id}`}
          >
            {win.icon && <img src={win.icon} alt="" className="taskbar-tab-icon" />} {/* Ensure class taskbar-tab-icon is styled in index.html */}
            <span className="truncate">{win.title}</span>
          </button>
        ))}
      </div>
      <div className="taskbar-clock" role="timer" aria-live="off">
        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </footer>
  );
};

export default React.memo(Taskbar);
