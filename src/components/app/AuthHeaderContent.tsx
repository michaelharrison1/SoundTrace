import React from 'react';
import Button from '../common/Button';
import LogoutIcon from '../icons/LogoutIcon';
import { User } from '../../types';
import { useSpotifyPlayer } from '../../contexts/SpotifyContext';
// Removed: import { useGoogleAuth } from '../../contexts/GoogleAuthContext'; 
// Removed: import { YoutubeIcon } from '../icons/YoutubeIcon'; 

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
      <>
        <img src={spotifyUser.avatarUrl} alt={spotifyUser.displayName} className="w-5 h-5 rounded-full mr-1 hidden sm:inline-block win95-border-inset"/>
        <span className="text-xs text-green-300 hidden sm:block mr-1" title={`Connected to Spotify as ${spotifyUser.displayName}`}>S: {spotifyUser.displayName.substring(0,10)}{spotifyUser.displayName.length > 10 ? '...' : ''}</span>
        <Button onClick={disconnectSpotify} size="sm" className="!px-1 !py-0 !text-xs !h-5 hover:bg-gray-300">X</Button>
      </>
    );
  }
  return <Button onClick={initiateSpotifyLogin} size="sm" className="!px-1 !py-0 !text-xs !h-5 hover:bg-gray-300">Connect Spotify</Button>;
});
SpotifyConnectButton.displayName = 'SpotifyConnectButton';

// GoogleConnectButton component entirely removed as YouTube features it supported are changed.
// If general Google Sign-In (non-YouTube related) is still desired, it needs a different implementation.

const AuthHeaderContent: React.FC<AuthHeaderContentProps> = ({ currentUser, authView, onSetAuthView, onLogout }) => {
  const { disconnectSpotify: spotifyDisconnectHook, isSpotifyConnected } = useSpotifyPlayer();
  // Removed: const { disconnectGoogle: googleDisconnectHook, isGoogleConnected: isGoogleActuallyConnected } = useGoogleAuth();

  const handleFullLogout = async () => {
    // Removed Google disconnect from full logout as its YouTube integration is removed
    // if (isGoogleActuallyConnected) { 
    //   try { await googleDisconnectHook(); } 
    //   catch (error) { console.error("Error during Google disconnect on logout (non-critical):", error); }
    // }
    if (isSpotifyConnected) { 
        try { await spotifyDisconnectHook(); } 
        catch (error) { console.error("Error during Spotify disconnect on logout (non-critical):", error); }
    }
    onLogout(); 
  };
  
  const getNavButtonClass = (viewType: AuthView | 'logout', isUserContext: boolean) => {
    const isActive = !isUserContext && viewType !== 'logout' && authView === viewType;
    return `px-2 py-0.5 !text-black !border-t-white !border-l-white !border-b-[#808080] !border-r-[#808080] !shadow-[1px_1px_0px_#000000] hover:!bg-gray-300 active:!shadow-[0px_0px_0px_#000000] active:!border-t-[#808080] active:!border-l-[#808080] active:!border-b-white active:!border-r-white ${isActive ? '!shadow-none !translate-x-[1px] !translate-y-[1px] !border-t-[#808080] !border-l-[#808080] !border-b-white !border-r-white' : ''}`;
  };

  if (currentUser) {
    return (
      <>
        <span className="text-xs text-white hidden sm:block mr-2">User: {currentUser.username}</span>
        <div className="flex items-center space-x-1">
          <SpotifyConnectButton />
          {/* GoogleConnectButton removed */}
        </div>
        <Button
          onClick={handleFullLogout}
          size="sm"
          className={`${getNavButtonClass('logout', true)} ml-2`}
          icon={<LogoutIcon className="w-3 h-3" />}
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