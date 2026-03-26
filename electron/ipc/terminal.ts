import { ipcMain } from 'electron';
import { enumCmdWindows, sendTextToCmd } from '../winApi';
import log from 'electron-log';

// 主进程缓存 hwnd 对象，renderer 只传 hwndStr 作为 key
const hwndCache = new Map<string, object>();

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

  log.info('Terminal IPC handlers registered');
}
