
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
    channelTitle: string; // Added property
    publishedAt: string;  // Added property
}

interface MyYouTubeVideosProps {
    onVideosSelected: (videoUrls: string[]) => void;
    isJobInitiating: boolean; // To disable controls while parent is processing
}

const MyYouTubeVideos: React.FC<MyYouTubeVideosProps> = ({ onVideosSelected, isJobInitiating }) => {
    const { isGoogleConnected, googleUser, connectGoogle } = useGoogleAuth();
    const [videos, setVideos] = useState<YouTubeVideo[]>([]);
    const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
    const [isLoadingVideos, setIsLoadingVideos] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nextPageToken, setNextPageToken] = useState<string | null | undefined>(undefined);
    const soundTraceAuthToken = localStorage.getItem('authToken');

    const fetchVideos = useCallback(async (pageToken?: string | null) => {
        if (!soundTraceAuthToken || !isGoogleConnected) {
            setError("Please connect your Google account to load YouTube videos.");
            return;
        }
        setIsLoadingVideos(true);
        setError(null);
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
                     setError("Google session expired or token invalid. Please try disconnecting and reconnecting your Google account.");
                } else {
                    throw new Error(data.message || 'Failed to fetch YouTube videos.');
                }
            }
            setVideos(prev => pageToken ? [...prev, ...data.videos] : data.videos);
            setNextPageToken(data.nextPageToken);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoadingVideos(false);
        }
    }, [soundTraceAuthToken, isGoogleConnected]);

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
        // If all currently visible are selected, deselect them. Otherwise, select them.
        const allCurrentlySelected = videos.every(v => selectedVideos.has(v.id));
        if (allCurrentlySelected && videos.length > 0) {
            setSelectedVideos(prev => {
                const newSelection = new Set(prev);
                videos.forEach(v => newSelection.delete(v.id));
                return newSelection;
            });
        } else {
            setSelectedVideos(prev => new Set([...prev, ...allVisibleIds]));
        }
    };
    
    const handleScanSelected = () => {
        const selectedUrls = videos.filter(v => selectedVideos.has(v.id)).map(v => v.url);
        if (selectedUrls.length > 0) {
            onVideosSelected(selectedUrls);
        }
    };

    useEffect(() => {
        // Optionally auto-fetch if connected and no videos loaded
        if (isGoogleConnected && videos.length === 0 && nextPageToken === undefined && soundTraceAuthToken) {
            fetchVideos();
        }
    }, [isGoogleConnected, videos.length, nextPageToken, fetchVideos, soundTraceAuthToken]);

    if (!isGoogleConnected) {
        return (
            <div className="p-0.5 win95-border-outset bg-[#C0C0C0]">
                <div className="p-3 bg-[#C0C0C0] text-center">
                    <YoutubeIcon className="w-10 h-10 mx-auto mb-2 text-red-600" />
                    <p className="text-black mb-2">Connect your Google account to access your YouTube videos for scanning.</p>
                    <Button onClick={connectGoogle} size="md" disabled={isJobInitiating}>
                        Connect Google Account
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-0.5 win95-border-outset bg-[#C0C0C0]">
            <div className="p-3 bg-[#C0C0C0]">
                <h3 className="text-lg font-normal text-black mb-2">My YouTube Videos</h3>
                {googleUser && <p className="text-xs text-gray-700 mb-2">Connected as: {googleUser.displayName || googleUser.email}</p>}

                {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

                {videos.length === 0 && !isLoadingVideos && (
                    <Button onClick={() => fetchVideos()} disabled={isLoadingVideos || isJobInitiating}>Load My Videos</Button>
                )}

                {isLoadingVideos && videos.length === 0 && <ProgressBar text="Loading your YouTube videos..." />}

                {videos.length > 0 && (
                    <>
                        <div className="flex justify-between items-center mb-1">
                            <Button onClick={handleSelectAllVisible} size="sm" disabled={isJobInitiating || isLoadingVideos}>
                                {videos.every(v => selectedVideos.has(v.id)) && videos.length > 0 ? "Deselect All Visible" : "Select All Visible"} ({selectedVideos.size} selected)
                            </Button>
                            <Button onClick={handleScanSelected} size="sm" variant="primary" disabled={selectedVideos.size === 0 || isJobInitiating || isLoadingVideos}>
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
                            <Button onClick={() => fetchVideos(nextPageToken)} isLoading={isLoadingVideos} disabled={isJobInitiating} className="w-full mt-2">Load More Videos</Button>
                        )}
                        {isLoadingVideos && videos.length > 0 && <ProgressBar text="Loading more videos..." className="mt-2" />}
                    </>
                )}
            </div>
        </div>
    );
};

export default React.memo(MyYouTubeVideos);