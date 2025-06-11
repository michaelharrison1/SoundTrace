
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { GoogleOAuthProvider, useGoogleLogin, googleLogout, CodeResponse } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.soundtrace.uk';

interface GoogleUserProfile {
    googleId?: string;
    email?: string;
    displayName?: string;
    avatarUrl?: string;
}

interface GoogleAuthContextType {
    isGoogleConnected: boolean;
    googleUser: GoogleUserProfile | null;
    isLoadingGoogleAuth: boolean;
    connectGoogle: () => void;
    disconnectGoogle: () => Promise<void>;
    checkGoogleStatus: () => Promise<void>;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

export const useGoogleAuth = (): GoogleAuthContextType => {
    const context = useContext(GoogleAuthContext);
    if (!context) {
        throw new Error('useGoogleAuth must be used within a GoogleApiProvider');
    }
    return context;
};

interface GoogleApiProviderProps {
    children: ReactNode;
}

const GoogleApiProviderInternal: React.FC<GoogleApiProviderProps> = ({ children }) => {
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [googleUser, setGoogleUser] = useState<GoogleUserProfile | null>(null);
    const [isLoadingGoogleAuth, setIsLoadingGoogleAuth] = useState(true);
    const soundTraceAuthToken = localStorage.getItem('authToken');

    const handleGoogleLoginSuccess = useCallback(async (codeResponse: Omit<CodeResponse, 'error' | 'error_description' | 'error_uri'>) => {
        if (!soundTraceAuthToken) {
            console.error("SoundTrace user not logged in. Cannot link Google account.");
            // Potentially show a message to the user
            return;
        }
        console.log('Google Auth Code received:', codeResponse.code);
        try {
            const backendResponse = await fetch(`${API_BASE_URL}/api/auth/google/link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${soundTraceAuthToken}`,
                },
                body: JSON.stringify({ code: codeResponse.code }),
                credentials: 'include',
            });
            const data = await backendResponse.json();
            if (!backendResponse.ok) {
                throw new Error(data.message || 'Failed to link Google account on backend.');
            }
            setIsGoogleConnected(true);
            setGoogleUser(data.googleUser || null); // Expect backend to return profile info
            console.log('Google account linked successfully on backend:', data);
        } catch (error) {
            console.error('Error sending Google auth code to backend:', error);
            // Handle error, show message to user
        }
    }, [soundTraceAuthToken]);

    const googleLogin = useGoogleLogin({
        onSuccess: handleGoogleLoginSuccess,
        onError: errorResponse => console.error('Google Login Error:', errorResponse),
        flow: 'auth-code', // Use authorization code flow
        scope: 'https://www.googleapis.com/auth/youtube.readonly',
        // redirect_uri is handled by the library for 'auth-code' flow, ensure it's configured in Google Cloud Console
    });

    const connectGoogle = useCallback(() => {
        if (!soundTraceAuthToken) {
            alert("Please log in to SoundTrace first to connect your Google account.");
            return;
        }
        googleLogin();
    }, [googleLogin, soundTraceAuthToken]);

    const disconnectGoogle = useCallback(async () => {
        if (!soundTraceAuthToken) return;
        setIsLoadingGoogleAuth(true);
        try {
            await fetch(`${API_BASE_URL}/api/auth/google/disconnect`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${soundTraceAuthToken}` },
                credentials: 'include',
            });
            googleLogout(); // Clear @react-oauth/google state
            setIsGoogleConnected(false);
            setGoogleUser(null);
        } catch (error) {
            console.error("Error disconnecting Google account:", error);
        } finally {
            setIsLoadingGoogleAuth(false);
        }
    }, [soundTraceAuthToken]);

    const checkGoogleStatus = useCallback(async () => {
        if (!soundTraceAuthToken) {
            setIsLoadingGoogleAuth(false);
            setIsGoogleConnected(false);
            setGoogleUser(null);
            return;
        }
        setIsLoadingGoogleAuth(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/google/status`, {
                headers: { 'Authorization': `Bearer ${soundTraceAuthToken}` },
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch Google status');
            const data = await response.json();
            setIsGoogleConnected(data.isConnected);
            setGoogleUser(data.profile || null);
            // Handle data.needsTokenRefresh if necessary, e.g., by prompting re-login or backend handles it.
        } catch (error) {
            console.error("Error checking Google connection status:", error);
            setIsGoogleConnected(false);
            setGoogleUser(null);
        } finally {
            setIsLoadingGoogleAuth(false);
        }
    }, [soundTraceAuthToken]);

    useEffect(() => {
        if (soundTraceAuthToken) {
            checkGoogleStatus();
        } else {
            setIsLoadingGoogleAuth(false);
            setIsGoogleConnected(false);
            setGoogleUser(null);
        }
    }, [soundTraceAuthToken, checkGoogleStatus]);


    const value: GoogleAuthContextType = {
        isGoogleConnected,
        googleUser,
        isLoadingGoogleAuth,
        connectGoogle,
        disconnectGoogle,
        checkGoogleStatus,
    };

    return <GoogleAuthContext.Provider value={value}>{children}</GoogleAuthContext.Provider>;
};


export const GoogleApiProvider: React.FC<GoogleApiProviderProps> = ({ children }) => {
    if (!GOOGLE_CLIENT_ID) {
        console.error("VITE_GOOGLE_CLIENT_ID is not defined. Google OAuth features will not work.");
        return <>{children}</>; // Render children without provider if no client ID
    }
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <GoogleApiProviderInternal>{children}</GoogleApiProviderInternal>
        </GoogleOAuthProvider>
    );
};
