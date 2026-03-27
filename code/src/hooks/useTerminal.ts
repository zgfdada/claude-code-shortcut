import { useState, useCallback, useEffect, useRef } from 'react';

export interface CmdWindow {
  hwnd: string;
  title: string;
}

export function useTerminal() {
  const [boundHwnd, setBoundHwnd] = useState<string | null>(null);
  const [boundTitle, setBoundTitle] = useState<string | null>(null);
  const [windows, setWindows] = useState<CmdWindow[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [autoUnbound, setAutoUnbound] = useState(false);
  const boundHwndRef = useRef<string | null>(null);

  // 保持 ref 同步
  useEffect(() => {
    boundHwndRef.current = boundHwnd;
  }, [boundHwnd]);

  // 监听终端关闭事件
  useEffect(() => {
    const unsubscribe = window.electronAPI.onTerminalClosed(() => {
      // 只在当前有绑定的情况下才处理
      if (boundHwndRef.current) {
        setBoundHwnd(null);
        setBoundTitle(null);
        setAutoUnbound(true);
        // 3 秒后清除提示
        setTimeout(() => setAutoUnbound(false), 3000);
      }
    });
    return unsubscribe;
  }, []);

  const refreshWindows = useCallback(async () => {
    const list = await window.electronAPI.listCmdWindows();
    setWindows(list);
  }, []);

  const openPicker = useCallback(async () => {
    await refreshWindows();
    setShowPicker(true);
  }, [refreshWindows]);

  const bindWindow = useCallback(async (w: CmdWindow) => {
    setBoundHwnd(w.hwnd);
    setBoundTitle(w.title);
    setShowPicker(false);
    setAutoUnbound(false);
    // 通知主进程开始监控
    await window.electronAPI.bindTerminal(w.hwnd);
  }, []);

  const unbind = useCallback(async () => {
    setBoundHwnd(null);
    setBoundTitle(null);
    setAutoUnbound(false);
    // 通知主进程停止监控
    await window.electronAPI.unbindTerminal();
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
    autoUnbound,
  };
}
