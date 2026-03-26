import { useState, useCallback } from 'react';

export interface CmdWindow {
  hwnd: string;
  title: string;
}

export function useTerminal() {
  const [boundHwnd, setBoundHwnd] = useState<string | null>(null);
  const [boundTitle, setBoundTitle] = useState<string | null>(null);
  const [windows, setWindows] = useState<CmdWindow[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const refreshWindows = useCallback(async () => {
    const list = await window.electronAPI.listCmdWindows();
    setWindows(list);
  }, []);

  const openPicker = useCallback(async () => {
    await refreshWindows();
    setShowPicker(true);
  }, [refreshWindows]);

  const bindWindow = useCallback((w: CmdWindow) => {
    setBoundHwnd(w.hwnd);
    setBoundTitle(w.title);
    setShowPicker(false);
  }, []);

  const unbind = useCallback(() => {
    setBoundHwnd(null);
    setBoundTitle(null);
  }, []);

  const sendText = useCallback(async (text: string) => {
    if (!boundHwnd) return;
    await window.electronAPI.sendToTerminal(boundHwnd, text);
  }, [boundHwnd]);

  return {
    boundHwnd,
    boundTitle,
    windows,
    showPicker,
    setShowPicker,
    openPicker,
    bindWindow,
    unbind,
    sendText,
  };
}
