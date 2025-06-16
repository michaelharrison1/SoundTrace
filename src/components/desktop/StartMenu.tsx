

import React from 'react';
import { User } from '../../types';
import { AuthView, AppWindow } from '../../App'; // Added AppWindow for options type clarity

// Example imports for window content (adjust paths as needed)
import PrivacyPolicyPage from '../PrivacyPolicyPage';
import TermsOfServicePage from '../TermsOfServicePage';
import { useSpotifyPlayer } from '../../contexts/SpotifyContext';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';

interface StartMenuProps {
  onClose: () => void;
  onLogout: () => void;
  currentUser: User | null;
  onSwitchAuthView: (view: AuthView) => void;
  currentAuthView: AuthView; // To show which one is active
  onOpenWindow: (id: string, title: string, content: React.ReactElement, icon?: string, options?: Partial<Pick<AppWindow, 'width' | 'height' | 'isModal'>>) => void;
}

const StartMenuItem: React.FC<{ icon: string; label: string; onClick: () => void; shortcut?: string; disabled?: boolean; hasSubmenu?: boolean }> =
  ({ icon, label, onClick, shortcut, disabled, hasSubmenu }) => (
  <a
    href="#"
    className={`start-menu-item ${disabled ? 'text-gray-500 pointer-events-none opacity-70' : 'hover:bg-[#000080] hover:text-white'}`}
    onClick={(e) => { e.preventDefault(); if(!disabled) onClick(); }}
    role="menuitem"
    aria-disabled={disabled}
  >
    <img src={icon} alt="" className="w-5 h-5 mr-2 object-contain" style={{imageRendering: 'pixelated'}} />
    <span className="flex-grow">{label}</span>
    {hasSubmenu && <span className="ml-auto text-xs mr-1">►</span>}
    {shortcut && <span className="ml-auto text-xs opacity-80">{shortcut}</span>}
  </a>
);

const StartMenu: React.FC<StartMenuProps> = ({ onClose, onLogout, currentUser, onSwitchAuthView, onOpenWindow }) => {
  const { isSpotifyConnected, spotifyUser, initiateSpotifyLogin, disconnectSpotify: spotifyDisconnectHook } = useSpotifyPlayer();
  const { isGoogleConnected, googleUser, connectGoogle, disconnectGoogle: googleDisconnectHook } = useGoogleAuth();


  const handlePrivacyClick = () => {
    onOpenWindow('privacy_startmenu', 'Privacy Policy', <PrivacyPolicyPage />, '/src/components/windows95icons/apps/notepad_16x16.png', { width: '650px', height: '550px' });
    onClose();
  };
  const handleTermsClick = () => {
    onOpenWindow('terms_startmenu', 'Terms of Service', <TermsOfServicePage />, '/src/components/windows95icons/apps/ms_dos_16x16.png', { width: '650px', height: '550px' });
    onClose();
  };
  const handleLoginClick = () => {
    onSwitchAuthView('login'); // This should trigger App.tsx to open the login window
    onClose();
  };
  const handleRegisterClick = () => {
    onSwitchAuthView('register'); // This should trigger App.tsx to open the register window
    onClose();
  };
  const handleLogoutClick = () => {
    onLogout();
    onClose();
  };

  const handleSpotifyConnect = () => {
    initiateSpotifyLogin();
    onClose();
  };
  const handleSpotifyDisconnect = async () => {
    await spotifyDisconnectHook();
    onClose();
  };
  const handleGoogleConnect = () => {
    connectGoogle();
    onClose();
  };
  const handleGoogleDisconnect = async () => {
    await googleDisconnectHook();
    onClose();
  };

  const connectStatusStyles = "text-xs ml-1";

  return (
    <div className="start-menu" role="menu" aria-labelledby="start-button">
      <div className="flex h-full">
        <div className="start-menu-sidebar" aria-hidden="true">
           SoundTrace 95
        </div>
        <div className="flex-grow flex flex-col"> {/* Ensures items stack vertically */}

            {currentUser && (
                <>
                    <StartMenuItem
                        icon={isSpotifyConnected ? '/src/components/windows95icons/apps/cd_player_20x20.png' : '/src/components/windows95icons/actions/no_20x20.png'}
                        label={isSpotifyConnected ? `Spotify: ${spotifyUser?.displayName?.substring(0,10) || 'Connected'}` : 'Connect Spotify'}
                        onClick={isSpotifyConnected ? handleSpotifyDisconnect : handleSpotifyConnect}
                    />
                    <StartMenuItem
                        icon={isGoogleConnected ? '/src/components/windows95icons/apps/google_icon_20x20.png' : '/src/components/windows95icons/actions/no_20x20.png'}
                        label={isGoogleConnected ? `Google: ${googleUser?.googleDisplayName?.substring(0,10) || 'Connected'}` : 'Connect Google'}
                        onClick={isGoogleConnected ? handleGoogleDisconnect : handleGoogleConnect}
                    />
                    <div className="start-menu-separator"></div>
                </>
            )}

            {/* Could add "Programs", "Documents", "Settings" here as expandable submenus in future */}
            {/* <StartMenuItem icon="/src/components/windows95icons/actions/folder_open_16x16.png" label="Programs" onClick={() => {}} hasSubmenu /> */}

            <StartMenuItem icon="/src/components/windows95icons/actions/help_book_16x16.png" label="Help" onClick={() => { alert('SoundTrace 95 Help: Explore the desktop icons to access features. For issues, contact support@soundtrace.uk.'); onClose(); }} />
            <div className="start-menu-separator"></div>

            <StartMenuItem icon="/src/components/windows95icons/apps/notepad_20x20.png" label="Privacy Policy" onClick={handlePrivacyClick} />
            <StartMenuItem icon="/src/components/windows95icons/apps/ms_dos_20x20.png" label="Terms of Service" onClick={handleTermsClick} />

            <div className="start-menu-separator"></div>

            {!currentUser ? (
                <>
                <StartMenuItem
                    icon="/src/components/windows95icons/actions/key_20x20.png"
                    label="Login"
                    onClick={handleLoginClick}
                />
                <StartMenuItem
                    icon="/src/components/windows95icons/actions/add_user_20x20.png"
                    label="Register"
                    onClick={handleRegisterClick}
                />
                </>
            ) : (
                <StartMenuItem icon="/src/components/windows95icons/actions/shut_down_20x20.png" label="Log Out..." onClick={handleLogoutClick} />
            )}

            {/* Removed "Close Start Menu" as clicking outside closes it */}
        </div>
      </div>
    </div>
  );
};

export default React.memo(StartMenu);
