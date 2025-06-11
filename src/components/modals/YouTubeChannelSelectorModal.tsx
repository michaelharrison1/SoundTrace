
import React from 'react';
import { useGoogleAuth } from '../../contexts/GoogleAuthContext';
import { YouTubeChannel } from '../../types';
import Button from '../common/Button';
import ProgressBar from '../common/ProgressBar';

const YouTubeChannelSelectorModal: React.FC = () => {
  const {
    availableYouTubeChannels,
    isLoadingYouTubeChannels,
    setSelectedYouTubeChannelOnBackend,
    setShowChannelSelectorModal,
  } = useGoogleAuth();

  if (isLoadingYouTubeChannels && availableYouTubeChannels.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[1000] p-4">
        <div className="bg-[#C0C0C0] p-4 win95-border-outset max-w-md w-full">
          <ProgressBar text="Loading your YouTube channels..." />
        </div>
      </div>
    );
  }
  
  if (availableYouTubeChannels.length === 0 && !isLoadingYouTubeChannels) {
     // This case should ideally be handled by a message in GoogleAuthContext,
     // but as a fallback, we can prevent modal render or show a message here.
     // For now, if this component is rendered with no channels, it means something went wrong or user has no channels.
     // The GoogleAuthContext should ideally not set showChannelSelectorModal to true in this case.
     return null; 
  }


  const handleChannelSelect = (channel: YouTubeChannel) => {
    setSelectedYouTubeChannelOnBackend(channel);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm">
      <div className="bg-[#C0C0C0] p-0.5 win95-border-outset max-w-lg w-full">
        <div className="title-bar bg-[#000080] text-white px-2 py-1 h-7 flex items-center justify-between select-none">
          <h2 className="text-sm font-bold">Select Your YouTube Channel</h2>
          <Button
            onClick={() => setShowChannelSelectorModal(false)}
            size="sm"
            className="!bg-[#C0C0C0] !text-black !font-mono !w-4 !h-4 !leading-none !text-xs !p-0 !min-w-0"
            aria-label="Close"
          >
            X
          </Button>
        </div>
        <div className="p-4 bg-[#C0C0C0]">
          {availableYouTubeChannels.length > 0 ? (
            <>
              <p className="text-sm text-black mb-3">
                Your Google account is associated with multiple YouTube channels. Please select the one you'd like to use with SoundTrace:
              </p>
              <div className="max-h-60 overflow-y-auto win95-border-inset bg-white p-1 space-y-1">
                {availableYouTubeChannels.map((channel) => (
                  <div
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel)}
                    className="flex items-center p-2 hover:bg-blue-500 hover:text-white cursor-pointer border border-transparent focus:border-black focus:outline-none"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleChannelSelect(channel)}
                    aria-label={`Select channel: ${channel.title}`}
                  >
                    {channel.thumbnailUrl && (
                      <img src={channel.thumbnailUrl} alt="" className="w-10 h-10 mr-2 win95-border-inset" />
                    )}
                    <span className="text-sm font-normal">{channel.title}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-black text-center py-4">
              No YouTube channels found for this Google account, or an error occurred.
            </p>
          )}
           {isLoadingYouTubeChannels && <ProgressBar text="Processing selection..." className="mt-2" />}
        </div>
      </div>
    </div>
  );
};

export default React.memo(YouTubeChannelSelectorModal);
