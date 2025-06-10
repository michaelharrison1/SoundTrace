import React from 'react';

interface ScanMessagesProps {
  isLoading: boolean;
  error: string | null;
  scanCompletionMessage: string | null;
  alreadyScannedMessage: string | null;
  manualAddMessage: string | null;
}

const ScanMessages: React.FC<ScanMessagesProps> = ({
  isLoading,
  error,
  scanCompletionMessage,
  alreadyScannedMessage,
  manualAddMessage
}) => {
  if (isLoading) {
    return null; // Loading progress is handled by ProgressBar in ScanPage
  }

  const hasAnyMessage = error || scanCompletionMessage || alreadyScannedMessage || manualAddMessage;

  if (!hasAnyMessage) {
    return null;
  }

  return (
    <div className="p-0.5 win95-border-outset bg-[#C0C0C0]">
      <div className="p-2 bg-[#C0C0C0] space-y-1.5">
        {scanCompletionMessage && (
          <div className="p-2 bg-green-200 text-black border border-black">
            <p className="font-semibold">Scan Status:</p>
            <p>{scanCompletionMessage}</p>
          </div>
        )}
        {alreadyScannedMessage && (
          <div className="p-2 bg-blue-200 text-black border border-black">
            <p className="font-semibold">Already Scanned:</p>
            <p>{alreadyScannedMessage}</p>
          </div>
        )}
        {manualAddMessage && !manualAddMessage.toLowerCase().startsWith("error:") && (
             <div className={`p-1.5 text-xs border bg-green-100 border-green-700 text-green-700`}>
                {manualAddMessage}
            </div>
        )}
        {error && (
          <div className="p-2 bg-yellow-200 text-black border border-black">
            <p className="font-semibold">Notifications/Errors:</p>
            <p style={{ whiteSpace: 'pre-line' }}>{error}</p>
          </div>
        )}
         {manualAddMessage && manualAddMessage.toLowerCase().startsWith("error:") && (
             <div className={`p-1.5 text-xs border bg-red-100 border-red-700 text-red-700`}>
                {manualAddMessage}
            </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ScanMessages);
