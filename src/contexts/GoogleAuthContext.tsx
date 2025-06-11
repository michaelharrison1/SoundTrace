
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { GoogleOAuthProvider, useGoogleLogin, googleLogout, CodeResponse } from '@react-oauth/google';
import { GoogleUserProfile, YouTubeChannel } from '../types'; // Import YouTubeChannel

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.soundtrace.uk';

interface GoogleAuthContextType {
    isGoogleConnected: boolean;
    googleUser: GoogleUserProfile | null;
    isLoadingGoogleAuth: boolean;
    connectGoogle: () => void;
    disconnectGoogle: () => Promise<void>;
    checkGoogleStatus: () => Promise<void>;
    // YouTube Channel Selection
    selectedYouTubeChannel: YouTubeChannel | null;
    availableYouTubeChannels: YouTubeChannel[];
    isLoadingYouTubeChannels: boolean;
    showChannelSelectorModal: boolean;
    setShowChannelSelectorModal: (show: boolean) => void;
    fetchUserChannels: () => Promise<void>;
    setSelectedYouTubeChannelOnBackend: (channel: YouTubeChannel) => Promise<void>;
    changeSelectedYouTubeChannel: () => void; // New function to re-trigger selection
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

export const useGoogleAuth = (): GoogleAuthContextType => {
    const context = useContext(GoogleAuthContext);
    if (!context) throw new Error('useGoogleAuth must be used within a GoogleApiProvider');
    return context;
};

interface GoogleApiProviderProps { children: ReactNode; }

const GoogleApiProviderInternal: React.FC<GoogleApiProviderProps> = ({ children }) => {
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [googleUser, setGoogleUser] = useState<GoogleUserProfile | null>(null);
    const [isLoadingGoogleAuth, setIsLoadingGoogleAuth] = useState(true);
    
    // YouTube Channel Selection State
    const [selectedYouTubeChannel, setSelectedYouTubeChannel] = useState<YouTubeChannel | null>(null);
    const [availableYouTubeChannels, setAvailableYouTubeChannels] = useState<YouTubeChannel[]>([]);
    const [isLoadingYouTubeChannels, setIsLoadingYouTubeChannels] = useState(false);
    const [showChannelSelectorModal, setShowChannelSelectorModal] = useState(false);
    const [googleAuthErrorMessage, setGoogleAuthErrorMessage] = useState<string | null>(null);


    const soundTraceAuthToken = localStorage.getItem('authToken');

    const checkGoogleStatus = useCallback(async (isInitialCall = false) => {
        if (!soundTraceAuthToken) {
            setIsLoadingGoogleAuth(false); setIsGoogleConnected(false); setGoogleUser(null); setSelectedYouTubeChannel(null);
            return;
        }
        if (isInitialCall) setIsLoadingGoogleAuth(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/google/status`, {
                headers: { 'Authorization': `Bearer ${soundTraceAuthToken}` }, credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch Google status');
            const data = await response.json();
            setIsGoogleConnected(data.isConnected);
            setGoogleUser(data.profile || null);
            setSelectedYouTubeChannel(data.selectedChannel || null); // Set selected channel from backend
            if (data.isConnected && !data.selectedChannel && !isInitialCall) { // If connected but no channel (e.g., after initial link before selection)
                // This condition might be handled by handleGoogleLoginSuccess now.
                // fetchUserChannels(); // Consider if this auto-fetch is desired here or only after login/explicit change.
            }
        } catch (error) {
            console.error("Error checking Google connection status:", error);
            setIsGoogleConnected(false); setGoogleUser(null); setSelectedYouTubeChannel(null);
        } finally {
            if (isInitialCall) setIsLoadingGoogleAuth(false);
        }
    }, [soundTraceAuthToken]);

    const fetchUserChannels = useCallback(async () => {
        if (!isGoogleConnected || !soundTraceAuthToken) return;
        setIsLoadingYouTubeChannels(true); setGoogleAuthErrorMessage(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/youtube/channels/list-mine`, {
                headers: { 'Authorization': `Bearer ${soundTraceAuthToken}` }, credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to fetch YouTube channels.');
            setAvailableYouTubeChannels(data.channels || []);
            if (data.channels && data.channels.length === 1) {
                await setSelectedYouTubeChannelOnBackend(data.channels[0]); // Auto-select if only one
                setShowChannelSelectorModal(false);
            } else if (data.channels && data.channels.length > 1) {
                setShowChannelSelectorModal(true);
            } else { // 0 channels
                setGoogleAuthErrorMessage("No YouTube channels found for this Google account.");
                setShowChannelSelectorModal(false); // Ensure modal is closed
                setSelectedYouTubeChannel(null); // Clear any previous selection
            }
        } catch (error: any) {
            console.error("Error fetching user YouTube channels:", error);
            setGoogleAuthErrorMessage(error.message || "Failed to load your YouTube channels.");
            setAvailableYouTubeChannels([]);
        } finally {
            setIsLoadingYouTubeChannels(false);
        }
    }, [isGoogleConnected, soundTraceAuthToken]);

    const setSelectedYouTubeChannelOnBackend = useCallback(async (channel: YouTubeChannel) => {
        if (!soundTraceAuthToken) return;
        setIsLoadingYouTubeChannels(true); // Indicate loading while saving selection
        setGoogleAuthErrorMessage(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/youtube/channels/select`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${soundTraceAuthToken}` },
                body: JSON.stringify(channel), credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to select YouTube channel on backend.');
            setSelectedYouTubeChannel(data.selectedChannel);
            setShowChannelSelectorModal(false);
        } catch (error: any) {
            console.error("Error selecting YouTube channel on backend:", error);
            setGoogleAuthErrorMessage(error.message || "Failed to save your channel selection.");
        } finally {
             setIsLoadingYouTubeChannels(false);
        }
    }, [soundTraceAuthToken]);
    
    const handleGoogleLoginSuccess = useCallback(async (codeResponse: Omit<CodeResponse, 'error' | 'error_description' | 'error_uri'>) => {
        if (!soundTraceAuthToken) { console.error("SoundTrace user not logged in."); return; }
        try {
            const backendResponse = await fetch(`${API_BASE_URL}/api/auth/google/link`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${soundTraceAuthToken}`},
                body: JSON.stringify({ code: codeResponse.code }), credentials: 'include',
            });
            const data = await backendResponse.json();
            if (!backendResponse.ok) throw new Error(data.message || 'Failed to link Google account.');
            await checkGoogleStatus(); // Refresh general Google status
            if (data.needsChannelSelection !== false) { // Explicitly check if it's not false
                 await fetchUserChannels(); // Now fetch channels to prompt selection
            }
        } catch (error) { console.error('Error sending Google auth code to backend:', error); }
    }, [soundTraceAuthToken, checkGoogleStatus, fetchUserChannels]);

    const googleLogin = useGoogleLogin({
        onSuccess: handleGoogleLoginSuccess,
        onError: errorResponse => { console.error('Google Login Error:', errorResponse); setGoogleAuthErrorMessage("Google login failed. Please try again.");},
        flow: 'auth-code', scope: 'https://www.googleapis.com/auth/youtube.readonly',
    });

    const connectGoogle = useCallback(() => {
        if (!soundTraceAuthToken) { alert("Please log in to SoundTrace first."); return; }
        setGoogleAuthErrorMessage(null); // Clear previous errors
        googleLogin();
    }, [googleLogin, soundTraceAuthToken]);

    const disconnectGoogle = useCallback(async () => {
        if (!soundTraceAuthToken) return;
        setIsLoadingGoogleAuth(true); setGoogleAuthErrorMessage(null);
        try {
            await fetch(`${API_BASE_URL}/api/auth/google/disconnect`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${soundTraceAuthToken}` }, credentials: 'include',
            });
            googleLogout();
            setIsGoogleConnected(false); setGoogleUser(null); setSelectedYouTubeChannel(null); setAvailableYouTubeChannels([]); setShowChannelSelectorModal(false);
        } catch (error) { console.error("Error disconnecting Google account:", error); setGoogleAuthErrorMessage("Failed to disconnect Google. Please try again."); }
        finally { setIsLoadingGoogleAuth(false); }
    }, [soundTraceAuthToken]);
    
    const changeSelectedYouTubeChannel = useCallback(() => {
        if (isGoogleConnected) {
            fetchUserChannels(); // This will refetch channels and show modal if >1
        } else {
            connectGoogle(); // If not connected, initiate connection
        }
    }, [isGoogleConnected, fetchUserChannels, connectGoogle]);

    useEffect(() => {
        if (soundTraceAuthToken) { checkGoogleStatus(true); }
        else { setIsLoadingGoogleAuth(false); setIsGoogleConnected(false); setGoogleUser(null); setSelectedYouTubeChannel(null); }
    }, [soundTraceAuthToken, checkGoogleStatus]);

    const value: GoogleAuthContextType = {
        isGoogleConnected, googleUser, isLoadingGoogleAuth, connectGoogle, disconnectGoogle, checkGoogleStatus,
        selectedYouTubeChannel, availableYouTubeChannels, isLoadingYouTubeChannels, showChannelSelectorModal, setShowChannelSelectorModal,
        fetchUserChannels, setSelectedYouTubeChannelOnBackend, changeSelectedYouTubeChannel
    };

    return (
        <GoogleAuthContext.Provider value={value}>
            {children}
            {googleAuthErrorMessage && (
                <div className="fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded-md shadow-lg z-[100]">
                    <p>Google Auth Error: {googleAuthErrorMessage}</p>
                    <button onClick={() => setGoogleAuthErrorMessage(null)} className="ml-2 text-sm underline">Dismiss</button>
                </div>
            )}
        </GoogleAuthContext.Provider>
    );
};

export const GoogleApiProvider: React.FC<GoogleApiProviderProps> = ({ children }) => {
    if (!GOOGLE_CLIENT_ID) { console.error("VITE_GOOGLE_CLIENT_ID is not defined. Google OAuth features will not work."); return <>{children}</>; }
    return (<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><GoogleApiProviderInternal>{children}</GoogleApiProviderInternal></GoogleOAuthProvider>);
};
