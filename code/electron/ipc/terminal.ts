import { ipcMain } from 'electron';
import log from 'electron-log';
import { getTerminalService } from '../terminal/createTerminalService';

const terminalServicePromise = getTerminalService();

export function registerTerminalHandlers(): void {
  ipcMain.handle('terminal:getCapabilities', async () => {
    const terminalService = await terminalServicePromise;
    return terminalService.getCapabilities();
  });

  ipcMain.handle('terminal:list', async () => {
    try {
      const terminalService = await terminalServicePromise;
      return terminalService.listWindows();
    } catch (error) {
      log.error('terminal:list error:', error);
      return [];
    }
  });

  ipcMain.handle('terminal:send', async (_event, hwndStr: string, text: string) => {
    try {
      const terminalService = await terminalServicePromise;
      await terminalService.sendText(hwndStr, text);
    } catch (error) {
      log.error('terminal:send error:', error);
      throw error;
    }
  });

  ipcMain.handle('terminal:bind', async (_event, hwndStr: string, autoEnableFollow: boolean = false) => {
    try {
      const terminalService = await terminalServicePromise;
      return await terminalService.bind(hwndStr, autoEnableFollow);
    } catch (error) {
      log.error('terminal:bind error:', error);
      return false;
    }
  });

  ipcMain.handle('terminal:unbind', async () => {
    try {
      const terminalService = await terminalServicePromise;
      return await terminalService.unbind();
    } catch (error) {
      log.error('terminal:unbind error:', error);
      return false;
    }
  });

  ipcMain.handle('terminal:follow', async (_event, enable: boolean) => {
    try {
      const terminalService = await terminalServicePromise;
      return await terminalService.setFollowMode(enable);
    } catch (error) {
      log.error('terminal:follow error:', error);
      return false;
    }
  });

  ipcMain.handle('terminal:getFollowState', async () => {
    const terminalService = await terminalServicePromise;
    return terminalService.getFollowState();
  });

  log.info('Terminal IPC handlers registered');
}

export async function cleanupTerminalHandlers(): Promise<void> {
  const terminalService = await terminalServicePromise;
  terminalService.cleanup();
}
