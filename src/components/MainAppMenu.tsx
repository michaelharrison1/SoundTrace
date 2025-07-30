import React, { useState, useRef, useEffect } from 'react';
import settingsIcon from '../icons/Settings.png';

interface MainAppMenuProps {
  onLogout: () => void;
  onSpotifyConnect: () => void;
  user: any;
}

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  top: 44,
  right: 12,
  minWidth: 180,
  background: '#C0C0C0',
  border: '2px outset #fff',
  boxShadow: '2px 2px 8px #888',
  zIndex: 1000,
  borderRadius: 6,
  padding: 8,
  fontFamily: 'VT323, monospace',
};

const menuItemStyle: React.CSSProperties = {
  padding: '6px 12px',
  cursor: 'pointer',
  borderRadius: 4,
  fontSize: '1.1rem',
  marginBottom: 2,
  border: '1px solid #bbb',
  background: '#f8f8f8',
  boxShadow: '0 1px 2px #eee',
};

const MainAppMenu: React.FC<MainAppMenuProps> = ({ onLogout, onSpotifyConnect, user }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div style={{ position: 'absolute', top: 8, right: 16, zIndex: 100 }}>
      <button
        aria-label="Open menu"
        onClick={() => setOpen(v => !v)}
        style={{
          background: '#C0C0C0',
          border: '2px outset #fff',
          borderRadius: 6,
          padding: 4,
          boxShadow: '1px 1px 4px #aaa',
          cursor: 'pointer',
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img src={settingsIcon} alt="Settings" style={{ width: 24, height: 24 }} />
      </button>
      {open && (
        <div ref={menuRef} style={menuStyle}>
          <div style={{ ...menuItemStyle, fontWeight: 700, background: '#e0e0e0', marginBottom: 8, cursor: 'default' }}>
            {user?.displayName || 'User Menu'}
          </div>
          <div style={menuItemStyle} onClick={onSpotifyConnect}>
            Spotify Connect
          </div>
          <div style={menuItemStyle} onClick={onLogout}>
            Logout
          </div>
        </div>
      )}
    </div>
  );
};

export default MainAppMenu;
