import { ipcMain, BrowserWindow } from 'electron';
import { enumCmdWindows, sendTextToCmd, isWindowValid } from '../winApi';
import log from 'electron-log';

// 主进程缓存 hwnd 对象，renderer 只传 hwndStr 作为 key
const hwndCache = new Map<string, object>();

// 当前绑定的窗口信息
let boundHwndStr: string | null = null;
let checkInterval: NodeJS.Timeout | null = null;
const CHECK_INTERVAL_MS = 2000; // 每 2 秒检查一次

// 检查绑定的窗口是否仍然有效
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

// 通知所有渲染进程窗口已关闭
function notifyWindowClosed(): void {
  if (!boundHwndStr) return;

  log.info(`[terminal] 自动解绑终端: ${boundHwndStr}`);
  boundHwndStr = null;

  // 停止检查
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }

  // 通知所有窗口
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((win) => {
    win.webContents.send('terminal:closed');
  });
}

// 开始定期检查
function startChecking(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
  checkInterval = setInterval(checkBoundWindow, CHECK_INTERVAL_MS);
  log.info(`[terminal] 开始定期检查终端状态，间隔 ${CHECK_INTERVAL_MS}ms`);
}

// 停止定期检查
function stopChecking(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    log.info('[terminal] 停止定期检查终端状态');
  }
}

export function registerTerminalHandlers(): void {
  ipcMain.handle('terminal:list', async () => {
    try {
      const windows = enumCmdWindows();
      hwndCache.clear();
      windows.forEach((w) => hwndCache.set(w.hwndStr, w.hwnd));
      return windows.map((w) => ({ hwnd: w.hwndStr, title: w.title }));
    } catch (error) {
      log.error('terminal:list error:', error);
      return [];
    }
  });

  ipcMain.handle('terminal:send', async (_event, hwndStr: string, text: string) => {
    try {
      const hwnd = hwndCache.get(hwndStr);
      if (!hwnd) {
        log.error(`terminal:send: hwnd not found in cache: ${hwndStr}`);
        throw new Error('终端句柄已失效，请重新绑定');
      }
      sendTextToCmd(hwnd, text);
    } catch (error) {
      log.error('terminal:send error:', error);
      throw error;
    }
  });

  // 绑定窗口时开始监控
  ipcMain.handle('terminal:bind', async (_event, hwndStr: string) => {
    boundHwndStr = hwndStr;
    log.info(`[terminal] 绑定终端: ${hwndStr}`);
    startChecking();
    return true;
  });

  // 解绑窗口时停止监控
  ipcMain.handle('terminal:unbind', async () => {
    log.info(`[terminal] 手动解绑终端: ${boundHwndStr}`);
    boundHwndStr = null;
    stopChecking();
    return true;
  });

  log.info('Terminal IPC handlers registered');
}
