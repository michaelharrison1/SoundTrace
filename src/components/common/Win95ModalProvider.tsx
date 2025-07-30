import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Win95Modal, { Win95ModalType } from './Win95Modal';

interface ModalRequest {
  type: Win95ModalType;
  title?: string;
  message: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  allowOutsideClick?: boolean;
  resolve: (value: any) => void;
}

interface Win95ModalContextType {
  confirm: (options: Omit<ModalRequest, 'type' | 'resolve'>) => Promise<boolean>;
  alert: (options: Omit<ModalRequest, 'type' | 'resolve'>) => Promise<void>;
  prompt: (options: Omit<ModalRequest, 'type' | 'resolve'>) => Promise<string | null>;
}

const Win95ModalContext = createContext<Win95ModalContextType | undefined>(undefined);

export const useWin95Modal = () => {
  const ctx = useContext(Win95ModalContext);
  if (!ctx) throw new Error('useWin95Modal must be used within a Win95ModalProvider');
  return ctx;
};

export const Win95ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modal, setModal] = useState<ModalRequest | null>(null);

  const closeModal = () => setModal(null);

  const confirm = useCallback((options: Omit<ModalRequest, 'type' | 'resolve'>) => {
    return new Promise<boolean>(resolve => {
      setModal({ ...options, type: 'confirm', resolve });
    });
  }, []);

  const alert = useCallback((options: Omit<ModalRequest, 'type' | 'resolve'>) => {
    return new Promise<void>(resolve => {
      setModal({ ...options, type: 'alert', resolve });
    });
  }, []);

  const prompt = useCallback((options: Omit<ModalRequest, 'type' | 'resolve'>) => {
    return new Promise<string | null>(resolve => {
      setModal({ ...options, type: 'prompt', resolve });
    });
  }, []);

  const handleConfirm = (value?: string) => {
    if (!modal) return;
    if (modal.type === 'prompt') {
      modal.resolve(value ?? '');
    } else if (modal.type === 'confirm') {
      modal.resolve(true);
    } else {
      modal.resolve(undefined);
    }
    closeModal();
  };

  const handleCancel = () => {
    if (!modal) return;
    if (modal.type === 'prompt') {
      modal.resolve(null);
    } else if (modal.type === 'confirm') {
      modal.resolve(false);
    } else {
      modal.resolve(undefined);
    }
    closeModal();
  };

  return (
    <Win95ModalContext.Provider value={{ confirm, alert, prompt }}>
      {children}
      <Win95Modal
        open={!!modal}
        type={modal?.type || 'alert'}
        title={modal?.title}
        message={modal?.message || ''}
        defaultValue={modal?.defaultValue}
        confirmText={modal?.confirmText}
        cancelText={modal?.cancelText}
        allowOutsideClick={modal?.allowOutsideClick}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Win95ModalContext.Provider>
  );
};
