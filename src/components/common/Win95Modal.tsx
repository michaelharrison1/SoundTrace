import React from 'react';

export type Win95ModalType = 'confirm' | 'alert' | 'prompt';

export interface Win95ModalProps {
  open: boolean;
  type: Win95ModalType;
  title?: string;
  message: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  allowOutsideClick?: boolean;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}

const Win95Modal: React.FC<Win95ModalProps> = ({
  open,
  type,
  title,
  message,
  defaultValue = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
  allowOutsideClick = true,
  onConfirm,
  onCancel,
}) => {
  const [inputValue, setInputValue] = React.useState(defaultValue);
  React.useEffect(() => { setInputValue(defaultValue); }, [defaultValue, open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30" onClick={allowOutsideClick ? onCancel : undefined}>
      <div
        className="win95-border-outset bg-[#C0C0C0] min-w-[320px] max-w-[90vw] p-0.5 shadow-xl relative"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between bg-[#000080] text-white px-2 py-1 h-7 win95-border-inset">
          <span className="font-bold text-sm">{title || 'Message'}</span>
        </div>
        <div className="p-4 text-black text-base min-h-[48px]">{message}</div>
        {type === 'prompt' && (
          <div className="px-4 pb-2">
            <input
              className="w-full win95-border-inset bg-white px-2 py-1 text-black"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              autoFocus
            />
          </div>
        )}
        <div className="flex justify-end gap-2 px-4 pb-3">
          {type === 'confirm' && (
            <>
              <button className="win95-button-sm px-4 py-1" onClick={() => onConfirm()}>{confirmText}</button>
              <button className="win95-button-sm px-4 py-1" onClick={onCancel}>{cancelText}</button>
            </>
          )}
          {type === 'alert' && (
            <button className="win95-button-sm px-4 py-1" onClick={() => onConfirm()}>{confirmText}</button>
          )}
          {type === 'prompt' && (
            <>
              <button className="win95-button-sm px-4 py-1" onClick={() => onConfirm(inputValue)}>{confirmText}</button>
              <button className="win95-button-sm px-4 py-1" onClick={onCancel}>{cancelText}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Win95Modal;
