
import React from 'react';
import Button from '../common/Button';
import LogoutIcon from '../icons/LogoutIcon';
import keyIcon from '../icons/key_32x32.png';
import { User } from '../../types';
import { useSpotifyPlayer } from '../../contexts/SpotifyContext';
import SpotifyIcon from '../icons/SpotifyIcon';
import connectSpotifyIcon from '../icons/ConnectSpotify.png';


type AuthView = 'login' | 'register';

interface AuthHeaderContentProps {
  currentUser: User | null;
  authView: AuthView;
  onSetAuthView: (view: AuthView) => void;
  onLogout: () => void; 
}

const SpotifyConnectButton: React.FC = React.memo(() => {
  const { isSpotifyConnected, spotifyUser, isLoadingSpotifyAuth, initiateSpotifyLogin, disconnectSpotify } = useSpotifyPlayer();
  if (isLoadingSpotifyAuth) return <span className="text-xs text-yellow-300 hidden sm:block mr-1">(Spotify...)</span>;
  if (isSpotifyConnected && spotifyUser) {
    return (
      <div className="flex items-center">
        {spotifyUser.avatarUrl && <img src={spotifyUser.avatarUrl} alt={spotifyUser.displayName} className="w-5 h-5 rounded-full mr-1 hidden sm:inline-block win95-border-inset"/>}
        <span className="text-xs text-green-300 hidden sm:block mr-1" title={`Connected to Spotify as ${spotifyUser.displayName}`}>S: {spotifyUser.displayName.substring(0,10)}{spotifyUser.displayName.length > 10 ? '...' : ''}</span>
        <Button onClick={disconnectSpotify} size="sm" className="!px-1 !py-0 !text-xs !h-5 hover:bg-gray-300 win95-button-sm">X</Button>
      </div>
    );
  }
  return (
      <Button
          onClick={initiateSpotifyLogin}
          size="sm"
          className="!px-3 !py-0.5 !text-xs !h-6 hover:bg-gray-300 win95-button-sm flex items-center space-x-1 min-w-[130px]"
      >
          <img src={connectSpotifyIcon} alt="Connect Spotify" className="w-4 h-4 mr-1 inline-block"/>
          <span className="inline-block">Connect Spotify</span>
      </Button>
  );
});
SpotifyConnectButton.displayName = 'SpotifyConnectButton';


const AuthHeaderContent: React.FC<AuthHeaderContentProps> = ({currentUser, authView, onSetAuthView, onLogout }) => {
  const { disconnectSpotify: spotifyDisconnectHook, isSpotifyConnected } = useSpotifyPlayer();

  const handleFullLogout = async () => {
    if (isSpotifyConnected) { 
        try { await spotifyDisconnectHook(); } 
        catch (error) { /* Silent handling */ }
    }
    onLogout(); 
  };
  
  const getNavButtonClass = (viewType: AuthView | 'logout', isUserContext: boolean) => {
    const isActive = !isUserContext && viewType !== 'logout' && authView === viewType;
    // Base Win95 button styles are applied by the Button component itself or global .win95-button-sm
    // Here we only handle active state for tabs.
    return `win95-button-sm ${isActive ? '!shadow-none !translate-x-[0.5px] !translate-y-[0.5px] !border-t-[#808080] !border-l-[#808080] !border-b-white !border-r-white' : ''}`;
  };

  if (currentUser) {
    return (
      <>
        <span className="text-xs text-white hidden sm:block mr-2">User: {currentUser.username}</span>
        <div className="flex items-center space-x-2">
          <SpotifyConnectButton />
        </div>
        <Button
          onClick={handleFullLogout}
          size="sm"
          className={`${getNavButtonClass('logout', true)} ml-2 !px-2 !py-0.5 !text-xs !h-6 flex items-center`}
          icon={<img src={keyIcon} alt="Logout" className="w-4 h-4 mr-1" />}
        >
          Logout
        </Button>
      </>
    );
  } else {
    return (
      <>
        <Button onClick={() => onSetAuthView('login')} size="sm" className={getNavButtonClass('login', false)} aria-pressed={authView === 'login'}>Login</Button>
        <Button onClick={() => onSetAuthView('register')} size="sm" className={getNavButtonClass('register', false)} aria-pressed={authView === 'register'}>Register</Button>
      </>
    );
  }
};

export default React.memo(AuthHeaderContent);
