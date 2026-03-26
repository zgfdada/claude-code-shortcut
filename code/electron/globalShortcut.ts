import { globalShortcut, BrowserWindow } from 'electron';
import log from 'electron-log';

const DEFAULT_HOTKEY = 'Ctrl+Shift+Space';

export function registerGlobalShortcut(mainWindow: BrowserWindow, hotkey: string = DEFAULT_HOTKEY): boolean {
  try {
    // 注销之前的快捷键
    globalShortcut.unregisterAll();

    const success = globalShortcut.register(hotkey, () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    if (success) {
      log.info(`Global shortcut registered: ${hotkey}`);
    } else {
      log.warn(`Failed to register global shortcut: ${hotkey}`);
    }

    return success;
  } catch (error) {
    log.error('Failed to register global shortcut:', error);
    return false;
  }
}

export function unregisterAllShortcuts(): void {
  globalShortcut.unregisterAll();
  log.info('All global shortcuts unregistered');
}
