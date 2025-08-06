import React, { useState, useRef, useEffect } from 'react';
// import settingsIcon from '../icons/Settings.png'; // Commented out to remove the import

interface MainAppMenuProps {
  onLogout: () => void;
  onSpotifyConnect: () => void;
  user: any;
  navStyle?: boolean;
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

const MainAppMenu: React.FC<MainAppMenuProps> = ({ onLogout, onSpotifyConnect, user, navStyle }) => {
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
    <div style={navStyle ? { position: 'static' } : { position: 'absolute', top: 8, right: 16, zIndex: 100 }}>
      <button
        aria-label="Open menu"
        onClick={() => setOpen(v => !v)}
        className={navStyle ? "px-3 py-1 text-black text-sm win95-border-outset hover:bg-gray-300" : "px-4 py-1 text-black text-base win95-border-outset hover:bg-gray-300 flex items-center justify-center h-10"}
        style={navStyle ? {} : { minWidth: 36, minHeight: 32, borderRadius: 4 }}
      >
        {navStyle ? <span className="font-bold">User Menu</span> : <img src="/icons/Settings.png" alt="Settings" style={{ width: 20, height: 20 }} />}
      </button>
      {open && (
        <div ref={menuRef} style={menuStyle}>
          <div style={{ ...menuItemStyle, fontWeight: 700, background: '#e0e0e0', marginBottom: 8, cursor: 'default' }}>
            {user?.displayName || 'User Menu'}
          </div>
          <div style={menuItemStyle} onClick={onSpotifyConnect}>
            <img src="/icons/ConnectSpotify.png" alt="Connect Spotify" style={{ width: 18, height: 18, marginRight: 8, verticalAlign: 'middle', display: 'inline-block' }} />
            Spotify Connect
          </div>
          <div style={menuItemStyle} onClick={onLogout}>
            <img src="/icons/key_32x32.png" alt="Logout" style={{ width: 16, height: 16, marginRight: 8, verticalAlign: 'middle', display: 'inline-block' }} />
            Logout
          </div>
        </div>
      )}
    </div>
  );
};

export default MainAppMenu;
