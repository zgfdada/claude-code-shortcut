import { ipcMain, BrowserWindow } from 'electron';
import * as db from '../database';
import log from 'electron-log';
import type { Settings } from '../src/types';

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async () => {
    try {
      return db.getSettings();
    } catch (error) {
      log.error('Failed to get settings:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:save', async (_event, settings: Settings) => {
    try {
      db.saveSettings(settings);

      // 通知所有窗口更新主题
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        win.webContents.send('settings:updated', settings);
      }

      log.info('Settings saved and broadcasted');
    } catch (error) {
      log.error('Failed to save settings:', error);
      throw error;
    }
  });

  log.info('Settings IPC handlers registered');
}
