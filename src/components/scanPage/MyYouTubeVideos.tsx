
import React, { useState, useEffect, useCallback } from 'react';
import Button from '../common/Button';
import ProgressBar from '../common/ProgressBar';
import { YoutubeIcon } from '../icons/YoutubeIcon';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.soundtrace.uk';

interface YouTubeVideo {
    id: string;
    title: string;
    thumbnailUrl?: string;
    url: string;
    channelTitle: string; 
    publishedAt: string; 
}

interface MyYouTubeVideosProps {
    onVideosSelected: (videoUrls: string[]) => void;
    isJobInitiating: boolean; 
}

const MyYouTubeVideos: React.FC<MyYouTubeVideosProps> = ({ onVideosSelected, isJobInitiating }) => {
    const { 
        isGoogleConnected, googleUser, connectGoogle, isLoadingGoogleAuth, // isLoadingYouTubeChannels is removed
        setGoogleAuthErrorMessage // Use for displaying errors
    } = useGoogleAuth();

    const [videos, setVideos] = useState<YouTubeVideo[]>([]);
    const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
    const [isLoadingApiVideos, setIsLoadingApiVideos] = useState(false);
    const [error, setError] = useState<string | null>(null); // Component-specific error for video fetching
    const [nextPageToken, setNextPageToken] = useState<string | null | undefined>(undefined); // Undefined initially to allow first fetch
    const soundTraceAuthToken = localStorage.getItem('authToken');

    const fetchVideos = useCallback(async (pageToken?: string | null) => {
        if (!soundTraceAuthToken || !isGoogleConnected) {
            setError("Please connect Google to load your YouTube videos.");
            return;
        }
        setIsLoadingApiVideos(true);
        setError(null);
        setGoogleAuthErrorMessage(null); // Clear global errors on new attempt
        try {
            const params = new URLSearchParams({ maxResults: '10' });
            if (pageToken) params.append('pageToken', pageToken);

            const response = await fetch(`${API_BASE_URL}/api/youtube/videos?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${soundTraceAuthToken}` },
                credentials: 'include',
            });
            const data = await response.json();
            if (!response.ok) {
                if (data.needsReLogin) {
                     setError("Google session expired or token invalid. Please try reconnecting Google.");
                     setGoogleAuthErrorMessage("Google session expired. Please disconnect and reconnect Google from the header.");
                } else {
                    throw new Error(data.message || 'Failed to fetch YouTube videos.');
                }
            }
            setVideos(prev => pageToken ? [...prev, ...data.videos] : data.videos);
            setNextPageToken(data.nextPageToken);
            if (data.videos?.length === 0 && !pageToken) {
                setError("No videos found for your linked YouTube channel, or the channel couldn't be accessed.");
            }
        } catch (err: any) {
            setError(err.message);
            setGoogleAuthErrorMessage(err.message);
        } finally {
            setIsLoadingApiVideos(false);
        }
    }, [soundTraceAuthToken, isGoogleConnected, setGoogleAuthErrorMessage]);

    const handleVideoSelection = (videoId: string) => {
        setSelectedVideos(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(videoId)) newSelection.delete(videoId);
            else newSelection.add(videoId);
            return newSelection;
        });
    };

    const handleSelectAllVisible = () => {
        const allVisibleIds = new Set(videos.map(v => v.id));
        const allCurrentlySelected = videos.every(v => selectedVideos.has(v.id));
        if (allCurrentlySelected && videos.length > 0) {
            setSelectedVideos(prev => { const newSelection = new Set(prev); videos.forEach(v => newSelection.delete(v.id)); return newSelection; });
        } else { setSelectedVideos(prev => new Set([...prev, ...allVisibleIds])); }
    };
    
    const handleScanSelected = () => {
        const selectedUrls = videos.filter(v => selectedVideos.has(v.id)).map(v => v.url);
        if (selectedUrls.length > 0) onVideosSelected(selectedUrls);
    };

    // Initial fetch if Google is connected and no videos loaded yet
    useEffect(() => {
        if (isGoogleConnected && soundTraceAuthToken && videos.length === 0 && nextPageToken === undefined) {
            fetchVideos();
        }
    }, [isGoogleConnected, soundTraceAuthToken, videos.length, nextPageToken, fetchVideos]);


    if (!isGoogleConnected) {
        return (
            <div className="p-0.5 win95-border-outset bg-[#C0C0C0]">
                <div className="p-3 bg-[#C0C0C0] text-center">
                    <YoutubeIcon className="w-10 h-10 mx-auto mb-2 text-red-600" />
                    <p className="text-black mb-2">Connect Google to scan your YouTube videos.</p>
                    <Button onClick={connectGoogle} size="md" disabled={isJobInitiating || isLoadingGoogleAuth}>
                        Connect Google Account
                    </Button>
                </div>
            </div> );
    }
    
    if (isLoadingGoogleAuth) { // Show loading if overall Google Auth is still initializing
        return (
            <div className="p-0.5 win95-border-outset bg-[#C0C0C0]">
                <div className="p-3 bg-[#C0C0C0] text-center">
                     <ProgressBar text="Initializing Google connection..." />
                </div>
            </div>
        );
    }


    return (
        <div className="p-0.5 win95-border-outset bg-[#C0C0C0]">
            <div className="p-3 bg-[#C0C0C0]">
                <h3 className="text-lg font-normal text-black mb-1">My YouTube Videos</h3>
                 {googleUser?.primaryYouTubeChannelTitle && <p className="text-xs text-gray-700 mb-1">Linked Channel: {googleUser.primaryYouTubeChannelTitle}</p>}
                {googleUser && !googleUser.primaryYouTubeChannelTitle && isGoogleConnected && (
                    <p className="text-xs text-yellow-600 mb-1">
                        No primary YouTube channel could be identified for your Google account, or it hasn't been synced yet.
                        If you recently linked your account, try refreshing. If issues persist, re-linking your Google account might help.
                    </p>
                )}

                {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

                {videos.length === 0 && !isLoadingApiVideos && isGoogleConnected && !error && (
                    <Button onClick={() => fetchVideos()} disabled={isLoadingApiVideos || isJobInitiating || !googleUser?.primaryYouTubeChannelId}>
                        {googleUser?.primaryYouTubeChannelId ? `Load Videos from "${googleUser.primaryYouTubeChannelTitle || 'Linked Channel'}"` : "Link Google Account to Load Videos"}
                    </Button>
                )}
                {videos.length === 0 && !isLoadingApiVideos && isGoogleConnected && !googleUser?.primaryYouTubeChannelId && !error && (
                     <p className="text-xs text-gray-700 mb-2">Link your Google account via the header to enable fetching your videos.</p>
                )}


                {isLoadingApiVideos && videos.length === 0 && <ProgressBar text="Loading your YouTube videos..." />}

                {videos.length > 0 && (
                    <>
                        <div className="flex justify-between items-center mb-1">
                            <Button onClick={handleSelectAllVisible} size="sm" disabled={isJobInitiating || isLoadingApiVideos}>
                                {videos.every(v => selectedVideos.has(v.id)) && videos.length > 0 ? "Deselect All Visible" : "Select All Visible"} ({selectedVideos.size} selected)
                            </Button>
                            <Button onClick={handleScanSelected} size="sm" variant="primary" disabled={selectedVideos.size === 0 || isJobInitiating || isLoadingApiVideos}>
                                Scan {selectedVideos.size} Selected Video(s)
                            </Button>
                        </div>
                        <div className="max-h-60 overflow-y-auto win95-border-inset bg-white p-1 space-y-0.5">
                            {videos.map(video => (
                                <div key={video.id} className={`flex items-center p-1 hover:bg-gray-200 cursor-pointer ${selectedVideos.has(video.id) ? 'bg-blue-200' : 'bg-white'}`} onClick={() => handleVideoSelection(video.id)}>
                                    <input type="checkbox" checked={selectedVideos.has(video.id)} onChange={() => handleVideoSelection(video.id)} className="mr-2 h-4 w-4 win95-checkbox" />
                                    {video.thumbnailUrl && <img src={video.thumbnailUrl} alt={video.title} className="w-12 h-9 object-cover mr-2 win95-border-inset"/>}
                                    <div className="truncate">
                                        <p className="text-sm text-black font-normal truncate" title={video.title}>{video.title}</p>
                                        <p className="text-xs text-gray-700">{video.channelTitle} &bull; {new Date(video.publishedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {nextPageToken && (
                            <Button onClick={() => fetchVideos(nextPageToken)} isLoading={isLoadingApiVideos} disabled={isJobInitiating} className="w-full mt-2">Load More Videos</Button>
                        )}
                        {isLoadingApiVideos && videos.length > 0 && <ProgressBar text="Loading more videos..." className="mt-2" />}
                    </>
                )}
            </div>
        </div>
    );
};

export default React.memo(MyYouTubeVideos);
