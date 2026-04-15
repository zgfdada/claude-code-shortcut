import { useState, useCallback, useEffect, useRef } from 'react';
import type { TerminalCapabilities, TerminalWindow } from '../types';

export interface CmdWindow extends TerminalWindow {}

const unsupportedCapabilities: TerminalCapabilities = {
  supported: false,
  canListWindows: false,
  canBind: false,
  canSendText: false,
  canFollow: false,
  reason: '当前平台暂不支持终端绑定与发送功能',
};

export function useTerminal() {
  const [boundHwnd, setBoundHwnd] = useState<string | null>(null);
  const [boundTitle, setBoundTitle] = useState<string | null>(null);
  const [windows, setWindows] = useState<CmdWindow[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [autoUnbound, setAutoUnbound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [capabilities, setCapabilities] = useState<TerminalCapabilities>(unsupportedCapabilities);
  const boundHwndRef = useRef<string | null>(null);

  // 保持 ref 同步
  useEffect(() => {
    boundHwndRef.current = boundHwnd;
  }, [boundHwnd]);

  useEffect(() => {
    void window.electronAPI.getTerminalCapabilities().then(setCapabilities).catch(() => {
      setCapabilities(unsupportedCapabilities);
    });
  }, []);

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
    if (!capabilities.canListWindows) {
      setWindows([]);
      return;
    }

    const list = await window.electronAPI.listCmdWindows();
    setWindows(list);
  }, [capabilities.canListWindows]);

  const openPicker = useCallback(async () => {
    if (!capabilities.canBind) {
      setShowPicker(false);
      return;
    }

    await refreshWindows();
    setShowPicker(true);
  }, [capabilities.canBind, refreshWindows]);

  const bindWindow = useCallback(async (w: CmdWindow) => {
    if (!capabilities.canBind) return;

    const wasFollowing = isFollowing;
    setBoundHwnd(w.hwnd);
    setBoundTitle(w.title);
    setShowPicker(false);
    setAutoUnbound(false);
    await window.electronAPI.bindTerminal(w.hwnd, wasFollowing);
  }, [capabilities.canBind, isFollowing]);

  const unbind = useCallback(async () => {
    setBoundHwnd(null);
    setBoundTitle(null);
    setAutoUnbound(false);
    await window.electronAPI.unbindTerminal();
  }, []);

  const sendText = useCallback(async (text: string) => {
    if (!capabilities.canSendText || !boundHwnd) return;
    await window.electronAPI.sendToTerminal(boundHwnd, text);
  }, [boundHwnd, capabilities.canSendText]);

  const enableFollow = useCallback(async () => {
    if (!capabilities.canFollow || !boundHwnd) return false;
    const result = await window.electronAPI.setFollowMode(true);
    if (result) setIsFollowing(true);
    return result;
  }, [boundHwnd, capabilities.canFollow]);

  const disableFollow = useCallback(async () => {
    if (!capabilities.canFollow) {
      setIsFollowing(false);
      return false;
    }

    const result = await window.electronAPI.setFollowMode(false);
    setIsFollowing(false);
    return result;
  }, [capabilities.canFollow]);

  const toggleFollow = useCallback(async () => {
    if (isFollowing) {
      return await disableFollow();
    } else {
      return await enableFollow();
    }
  }, [isFollowing, enableFollow, disableFollow]);

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
    isFollowing,
    enableFollow,
    disableFollow,
    toggleFollow,
    capabilities,
    terminalSupported: capabilities.supported,
    canBindTerminal: capabilities.canBind,
    canSendToTerminal: capabilities.canSendText,
    canFollowTerminal: capabilities.canFollow,
    terminalUnsupportedReason: capabilities.reason,
  };
}
