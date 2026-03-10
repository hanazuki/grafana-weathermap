import React, { createContext, useCallback, useContext, useState } from 'react';

export type PopupTargetType = 'node' | 'link';

export interface PopupTarget {
  type: PopupTargetType;
  id: string;
}

export interface PopupState {
  pinned: PopupTarget | null;
  preview: PopupTarget | null;
  contextMenu: { clientX: number; clientY: number } | null;
}

interface PopupContextValue {
  state: PopupState;
  setContextMenu: (pos: { clientX: number; clientY: number } | null) => void;
  setPinned: (target: PopupTarget | null) => void;
  setPreview: (target: PopupTarget | null) => void;
  closeAll: () => void;
}

const PopupContext = createContext<PopupContextValue | null>(null);

export const PopupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PopupState>({
    pinned: null,
    preview: null,
    contextMenu: null,
  });

  const setContextMenu = useCallback((pos: { clientX: number; clientY: number } | null) => {
    setState((prev) => ({
      ...prev,
      // Opening a context menu always clears any pinned popup
      pinned: pos != null ? null : prev.pinned,
      contextMenu: pos,
    }));
  }, []);

  const setPinned = useCallback((target: PopupTarget | null) => {
    setState((prev) => ({ ...prev, pinned: target, contextMenu: null }));
  }, []);

  const setPreview = useCallback((target: PopupTarget | null) => {
    setState((prev) => ({ ...prev, preview: target }));
  }, []);

  const closeAll = useCallback(() => {
    setState({ pinned: null, preview: null, contextMenu: null });
  }, []);

  return (
    <PopupContext.Provider value={{ state, setContextMenu, setPinned, setPreview, closeAll }}>
      {children}
    </PopupContext.Provider>
  );
};

export function usePopup(): PopupContextValue {
  const ctx = useContext(PopupContext);
  if (!ctx) {
    throw new Error('usePopup must be used within PopupProvider');
  }
  return ctx;
}
