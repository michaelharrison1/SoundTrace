import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { GoogleOAuthProvider, useGoogleLogin, googleLogout, CodeResponse } from '@react-oauth/google';
import { GoogleUserProfile } from '../types'; // GoogleUserProfile type will be updated in types.ts

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.soundtrace.uk';

// GoogleAuthContextType updated to remove YouTube specific fields.
export interface GoogleAuthContextType {
    isGoogleConnected: boolean;
    googleUser: GoogleUserProfile | null; // This will contain basic Google profile.
    isLoadingGoogleAuth: boolean;
    connectGoogle: () => void;
    disconnectGoogle: () => Promise<void>;
    checkGoogleStatus: () => Promise<void>;
    googleAuthErrorMessage: string | null;
    setGoogleAuthErrorMessage: (message: string | null) => void;
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
    const [googleAuthErrorMessage, setGoogleAuthErrorMessage] = useState<string | null>(null);

    const soundTraceAuthToken = localStorage.getItem('authToken');

    // checkGoogleStatus now fetches general Google connection status.
    // YouTube channel details are no longer managed or displayed by the frontend via this context.
    const checkGoogleStatus = useCallback(async (isInitialCall = false) => {
        if (!soundTraceAuthToken) {
            setIsLoadingGoogleAuth(false); setIsGoogleConnected(false); setGoogleUser(null);
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
            // googleUser will store basic profile; YouTube specifics are removed.
            setGoogleUser(data.profile || null); 
        } catch (error) {
            console.error("Error checking Google connection status:", error);
            setIsGoogleConnected(false); setGoogleUser(null);
        } finally {
            if (isInitialCall) setIsLoadingGoogleAuth(false);
        }
    }, [soundTraceAuthToken]);

    const handleGoogleLoginSuccess = useCallback(async (codeResponse: Omit<CodeResponse, 'error' | 'error_description' | 'error_uri'>) => {
        if (!soundTraceAuthToken) { console.error("SoundTrace user not logged in."); setGoogleAuthErrorMessage("User not logged in to SoundTrace."); return; }
        setGoogleAuthErrorMessage(null);
        try {
            const backendResponse = await fetch(`${API_BASE_URL}/api/auth/google/link`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${soundTraceAuthToken}`},
                body: JSON.stringify({ code: codeResponse.code }), credentials: 'include',
            });
            const data = await backendResponse.json();
            if (!backendResponse.ok) throw new Error(data.message || 'Failed to link Google account.');
            await checkGoogleStatus(); 
            // No frontend channel selection or YouTube-specific logic needed here anymore.
        } catch (error: any) { 
            console.error('Error sending Google auth code to backend:', error);
            setGoogleAuthErrorMessage(error.message || "Failed to link Google account.");
        }
    }, [soundTraceAuthToken, checkGoogleStatus]);

    const googleLogin = useGoogleLogin({
        onSuccess: handleGoogleLoginSuccess,
        onError: errorResponse => { 
            console.error('Google Login Error:', errorResponse);
            setGoogleAuthErrorMessage( (errorResponse as any).error_description || "Google login failed. Please try again.");
        },
        flow: 'auth-code', 
        // Scopes are now only for basic profile and email, as YouTube specific data handling by frontend is removed.
        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    });

    const connectGoogle = useCallback(() => {
        if (!soundTraceAuthToken) { alert("Please log in to SoundTrace first."); return; }
        setGoogleAuthErrorMessage(null); 
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
            setIsGoogleConnected(false); setGoogleUser(null);
        } catch (error: any) { 
            console.error("Error disconnecting Google account:", error); 
            setGoogleAuthErrorMessage(error.message || "Failed to disconnect Google. Please try again.");
        }
        finally { setIsLoadingGoogleAuth(false); }
    }, [soundTraceAuthToken]);


    useEffect(() => {
        if (soundTraceAuthToken) { checkGoogleStatus(true); }
        else { setIsLoadingGoogleAuth(false); setIsGoogleConnected(false); setGoogleUser(null); }
    }, [soundTraceAuthToken, checkGoogleStatus]);

    const value: GoogleAuthContextType = {
        isGoogleConnected, googleUser, isLoadingGoogleAuth, connectGoogle, disconnectGoogle, checkGoogleStatus,
        googleAuthErrorMessage, setGoogleAuthErrorMessage
    };

    return (
        <GoogleAuthContext.Provider value={value}>
            {children}
            {googleAuthErrorMessage && (
                <div className="fixed bottom-4 right-4 bg-red-500 text-white p-3 rounded-md shadow-lg z-[1000] win95-border-outset">
                    <p className="text-sm font-bold">Google Authentication Notice:</p>
                    <p className="text-sm">{googleAuthErrorMessage}</p>
                    <button onClick={() => setGoogleAuthErrorMessage(null)} className="mt-1 text-xs underline win95-button-sm !bg-red-700 !text-white hover:!bg-red-600">Dismiss</button>
                </div>
            )}
        </GoogleAuthContext.Provider>
    );
};

export const GoogleApiProvider: React.FC<GoogleApiProviderProps> = ({ children }) => {
    if (!GOOGLE_CLIENT_ID) { 
        console.error("VITE_GOOGLE_CLIENT_ID is not defined. Google OAuth features will not work."); 
        return <>{children}</>; 
    }
    return (<GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}><GoogleApiProviderInternal>{children}</GoogleApiProviderInternal></GoogleOAuthProvider>);
};