import type React from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

export type PopupTargetType = 'node' | 'link';

export interface PopupTarget {
  type: PopupTargetType;
  id: string;
}

export interface PopupState {
  pinned: PopupTarget | null;
  pinnedFlowPos: { x: number; y: number } | null; // flow (canvas) coordinates captured at pin time
  preview: PopupTarget | null;
  contextMenu: { clientX: number; clientY: number } | null;
  cursorPos: { x: number; y: number };
  inlineEdit: PopupTarget | null;
}

interface PopupContextValue {
  state: PopupState;
  setContextMenu: (pos: { clientX: number; clientY: number } | null) => void;
  setPinned: (target: PopupTarget | null, pos?: { x: number; y: number }) => void;
  setPreview: (target: PopupTarget | null) => void;
  setCursorPos: (pos: { x: number; y: number }) => void;
  setInlineEdit: (target: PopupTarget | null) => void;
  closeAll: () => void;
}

const PopupContext = createContext<PopupContextValue | null>(null);

export const PopupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PopupState>({
    pinned: null,
    pinnedFlowPos: null,
    preview: null,
    contextMenu: null,
    cursorPos: { x: 0, y: 0 },
    inlineEdit: null,
  });

  const setContextMenu = useCallback((pos: { clientX: number; clientY: number } | null) => {
    setState((prev) => ({
      ...prev,
      // Opening a context menu always clears any pinned popup
      pinned: pos != null ? null : prev.pinned,
      contextMenu: pos,
    }));
  }, []);

  const setPinned = useCallback((target: PopupTarget | null, pos?: { x: number; y: number }) => {
    setState((prev) => ({
      ...prev,
      pinned: target,
      pinnedFlowPos: target != null ? (pos ?? null) : null,
      contextMenu: null,
    }));
  }, []);

  const setPreview = useCallback((target: PopupTarget | null) => {
    setState((prev) => ({ ...prev, preview: target }));
  }, []);

  const setCursorPos = useCallback((pos: { x: number; y: number }) => {
    setState((prev) => ({ ...prev, cursorPos: pos }));
  }, []);

  const setInlineEdit = useCallback((target: PopupTarget | null) => {
    setState((prev) => ({ ...prev, inlineEdit: target }));
  }, []);

  const closeAll = useCallback(() => {
    setState((prev) => ({ ...prev, pinned: null, preview: null, contextMenu: null }));
  }, []);

  return (
    <PopupContext.Provider
      value={{ state, setContextMenu, setPinned, setPreview, setCursorPos, setInlineEdit, closeAll }}
    >
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
