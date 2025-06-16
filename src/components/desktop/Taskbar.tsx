

import React, { useState, useEffect, useCallback } from 'react';
import { AppWindow, AuthView } from '../../App';
import StartMenu from './StartMenu';
import { User } from '../../types';

interface TaskbarProps {
  openWindows: AppWindow[];
  activeWindowId?: string;
  onTabClick: (id: string) => void;
  onCloseTab: (id: string) => void;
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
    const timerId = setInterval(() => setCurrentTime(new Date()), 30000); // Update every 30 seconds for clock
    return () => clearInterval(timerId);
  }, []);

  const toggleStartMenu = useCallback((event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent click from bubbling to document
    setStartMenuOpen(prev => !prev);
  }, []);

  const closeStartMenu = useCallback(() => {
    setStartMenuOpen(false);
  }, []);

  // Close Start Menu if clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const startMenuElement = document.querySelector('.start-menu');
      const startButtonElement = document.querySelector('.taskbar-start-button');

      if (startMenuOpen &&
          startMenuElement &&
          !startMenuElement.contains(event.target as Node) &&
          startButtonElement &&
          !startButtonElement.contains(event.target as Node)
         ) {
        closeStartMenu();
      }
    };

    if (startMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [startMenuOpen, closeStartMenu]);


  const handleAuthViewChange = (view: AuthView) => {
    onSwitchAuthView(view); // This is passed from App.tsx
    // It should trigger App.tsx to open the correct login/register window
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
        <img src="/src/components/windows95icons/actions/start_16x16.png" alt="" /> {/* Decorative */}
        Start
      </button>
      {startMenuOpen && (
        <StartMenu
            onClose={closeStartMenu}
            onLogout={onLogout}
            currentUser={currentUser}
            onSwitchAuthView={handleAuthViewChange} // This will now call App.tsx's setAuthView
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
          >
            {win.icon && <img src={win.icon} alt="" className="mr-1 w-4 h-4" style={{imageRendering: 'pixelated'}} />}
            <span className="truncate">{win.title}</span>
            {/*
            // Optional: Close button on tabs
            <button
              onClick={(e) => { e.stopPropagation(); onCloseTab(win.id); }}
              className="ml-auto text-black text-xs font-mono hover:bg-gray-400 px-0.5"
              aria-label={`Close ${win.title}`}
            >x</button>
            */}
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
