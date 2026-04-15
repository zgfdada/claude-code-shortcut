import { BrowserWindow } from 'electron';
import log from 'electron-log';
import {
  enumCmdWindows,
  sendTextToCmd,
  isWindowValid,
  positionWindowBeside,
  isWindowMinimized,
  isWindowForeground,
} from '../winApi';
import type { TerminalService } from './types';

const hwndCache = new Map<string, object>();

let boundHwndStr: string | null = null;
let checkInterval: NodeJS.Timeout | null = null;
let followInterval: NodeJS.Timeout | null = null;
let isFollowing = false;
const CHECK_INTERVAL_MS = 2000;
const FOLLOW_INTERVAL_MS = 100;

function notifyWindowClosed(): void {
  if (!boundHwndStr) return;

  log.info(`[terminal] 自动解绑终端: ${boundHwndStr}`);
  boundHwndStr = null;

  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }

  const windows = BrowserWindow.getAllWindows();
  windows.forEach((win) => {
    win.webContents.send('terminal:closed');
  });
}

function checkBoundWindow(): void {
  if (!boundHwndStr) return;

  const hwnd = hwndCache.get(boundHwndStr);
  if (!hwnd) {
    log.warn(`[terminal] 绑定的窗口句柄不在缓存中: ${boundHwndStr}`);
    notifyWindowClosed();
    return;
  }

  if (!isWindowValid(hwnd)) {
    log.info(`[terminal] 检测到账绑定的终端窗口已关闭: ${boundHwndStr}`);
    notifyWindowClosed();
  }
}

function startChecking(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  checkInterval = setInterval(checkBoundWindow, CHECK_INTERVAL_MS);
  log.info(`[terminal] 开始定期检查终端状态，间隔 ${CHECK_INTERVAL_MS}ms`);
}

function stopChecking(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    log.info('[terminal] 停止定期检查终端状态');
  }
}

function updateFollowPosition(): void {
  if (!isFollowing || !boundHwndStr) return;

  const hwnd = hwndCache.get(boundHwndStr);
  if (!hwnd) return;

  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (!isWindowValid(hwnd)) {
    log.info('[terminal] 跟随模式：终端已关闭，停止跟随');
    stopFollowing();
    notifyWindowClosed();
    return;
  }

  const targetMinimized = isWindowMinimized(hwnd);
  const toolVisible = mainWindow.isVisible();

  if (targetMinimized) {
    if (toolVisible) {
      mainWindow.hide();
      log.info('[terminal] 跟随模式：终端最小化，小工具同步隐藏');
    }
    return;
  }

  if (!toolVisible) {
    mainWindow.show();
    log.info('[terminal] 跟随模式：终端恢复，小工具同步显示');
  }

  const isForeground = isWindowForeground(hwnd);
  const isAlwaysOnTop = mainWindow.isAlwaysOnTop();

  if (isForeground && !isAlwaysOnTop) {
    mainWindow.setAlwaysOnTop(true);
    log.info('[terminal] 跟随模式：终端获得焦点，工具窗口置顶');
  } else if (!isForeground && isAlwaysOnTop) {
    mainWindow.setAlwaysOnTop(false);
    log.info('[terminal] 跟随模式：终端失去焦点，工具窗口取消置顶');
  }

  positionWindowBeside(hwnd, mainWindow, 0);
}

function startFollowing(): void {
  if (followInterval) {
    clearInterval(followInterval);
  }
  isFollowing = true;

  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(false);
    log.info('[terminal] 跟随模式：取消窗口置顶，与终端同一图层');
  }

  followInterval = setInterval(updateFollowPosition, FOLLOW_INTERVAL_MS);
  log.info(`[terminal] 开始跟随模式，间隔 ${FOLLOW_INTERVAL_MS}ms`);
  updateFollowPosition();
}

function stopFollowing(): void {
  isFollowing = false;
  if (followInterval) {
    clearInterval(followInterval);
    followInterval = null;
    log.info('[terminal] 停止跟随模式');
  }

  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(true);
    log.info('[terminal] 跟随模式：恢复窗口置顶');
  }
}

export const windowsTerminalService: TerminalService = {
  getCapabilities() {
    return {
      supported: true,
      canListWindows: true,
      canBind: true,
      canSendText: true,
      canFollow: true,
    };
  },

  async listWindows() {
    const windows = enumCmdWindows();
    hwndCache.clear();
    windows.forEach((w) => hwndCache.set(w.hwndStr, w.hwnd));
    return windows.map((w) => ({ hwnd: w.hwndStr, title: w.title }));
  },

  async sendText(hwndStr: string, text: string) {
    const hwnd = hwndCache.get(hwndStr);
    if (!hwnd) {
      log.error(`terminal:send: hwnd not found in cache: ${hwndStr}`);
      throw new Error('终端句柄已失效，请重新绑定');
    }
    sendTextToCmd(hwnd, text);
  },

  async bind(hwndStr: string, autoEnableFollow: boolean = false) {
    boundHwndStr = hwndStr;
    log.info(`[terminal] 绑定终端: ${hwndStr}, autoEnableFollow=${autoEnableFollow}`);
    startChecking();

    if (autoEnableFollow) {
      log.info('[terminal] 自动恢复跟随模式');
      startFollowing();
    }

    return true;
  },

  async unbind() {
    log.info(`[terminal] 手动解绑终端: ${boundHwndStr}`);
    boundHwndStr = null;
    stopChecking();
    stopFollowing();
    return true;
  },

  async setFollowMode(enable: boolean) {
    if (enable) {
      if (!boundHwndStr) {
        log.warn('[terminal] 未绑定终端，无法启用跟随模式');
        return false;
      }
      startFollowing();
      return true;
    }

    stopFollowing();
    return true;
  },

  async getFollowState() {
    return { isFollowing, boundHwnd: boundHwndStr };
  },

  cleanup() {
    stopChecking();
    stopFollowing();
    hwndCache.clear();
    boundHwndStr = null;
  },
};
