import React from 'react';

interface Win95ModalProps {
  isOpen: boolean;
  title?: string;
  message: string | React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  children?: React.ReactNode;
}

const Win95Modal: React.FC<Win95ModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancel = true,
  children,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="win95-border-outset bg-[#F8F8F8] p-0.5 min-w-[320px] max-w-[90vw] shadow-lg animate-flicker" style={{ boxShadow: '2px 2px 0 #000, 4px 4px 0 #888' }}>
        <div className="win95-border-inset bg-[#C0C0C0] p-0.5">
          {title && (
            <div className="flex items-center bg-[#000080] text-white px-2 py-1 win95-border-outset mb-2">
              <span className="font-bold text-sm">{title}</span>
            </div>
          )}
          <div className="flex items-start space-x-2 p-2">
            <div className="flex-shrink-0 mt-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="2" fill="#FFF" stroke="#000" strokeWidth="2" />
                <rect x="7" y="7" width="10" height="10" rx="2" fill="#1D9BF0" stroke="#000" strokeWidth="1" />
                <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#FFF" fontFamily="monospace">!</text>
              </svg>
            </div>
            <div className="font-mono text-base flex-1">{message}{children}</div>
          </div>
          <div className="flex justify-end space-x-2 px-2 pb-2 mt-2">
            {showCancel && (
              <button className="win95-button-sm bg-[#C0C0C0] text-black font-mono px-3 py-1 win95-border-outset" onClick={onCancel}>{cancelText}</button>
            )}
            <button className="win95-button-sm bg-[#C0C0C0] text-black font-mono px-3 py-1 win95-border-outset" onClick={onConfirm}>{confirmText}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Win95Modal;
