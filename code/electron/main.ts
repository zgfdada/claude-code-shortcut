import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import log from 'electron-log';
import { initDatabase, getSettings, saveSettings, setDbDir } from './database';
import { registerCommandsHandlers } from './ipc/commands';
import { registerSettingsHandlers } from './ipc/settings';
import { registerTerminalHandlers } from './ipc/terminal';
import { createTray, destroyTray } from './tray';
import { registerGlobalShortcut, unregisterAllShortcuts } from './globalShortcut';

// 禁用硬件加速，避免某些 Windows 系统上的问题
app.disableHardwareAcceleration();

// 配置日志路径到 exe 同级目录（必须在 app ready 前设置路径变量，但实际写入在 ready 后）
const appDir = app.isPackaged ? path.dirname(process.execPath) : path.join(__dirname, '..');
log.transports.file.resolvePathFn = () => path.join(appDir, 'app.log');
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('应用启动中...');

let mainWindow: BrowserWindow | null = null;

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  log.error('未捕获的异常：', error);
});

process.on('unhandledRejection', (reason) => {
  log.error('未处理的 Promise 拒绝：', reason);
});

function createWindow(): BrowserWindow {
  const settings = getSettings();

  // 恢复上次位置，确保在屏幕范围内
  let windowX: number | undefined;
  let windowY: number | undefined;
  if (settings.window.x !== undefined && settings.window.y !== undefined) {
    const displays = screen.getAllDisplays();
    const onScreen = displays.some((d) => {
      return (
        settings.window.x! >= d.bounds.x &&
        settings.window.y! >= d.bounds.y &&
        settings.window.x! < d.bounds.x + d.bounds.width &&
        settings.window.y! < d.bounds.y + d.bounds.height
      );
    });
    if (onScreen) {
      windowX = settings.window.x;
      windowY = settings.window.y;
    }
  }

  mainWindow = new BrowserWindow({
    width: settings.window.width,
    height: settings.window.height,
    x: windowX,
    y: windowY,
    minWidth: 400,
    minHeight: 300,
    frame: false, // 无边框窗口
    resizable: true,
    alwaysOnTop: true, // 悬浮置顶
    skipTaskbar: false,
    show: false, // 启动时隐藏，初始化完成后再显示
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // better-sqlite3 需要 nodeIntegration
    },
  });

  // 保存当前窗口位置和大小到设置
  function saveWindowBounds(): void {
    if (!mainWindow) return;
    const [width, height] = mainWindow.getSize();
    const [x, y] = mainWindow.getPosition();
    const current = getSettings();
    saveSettings({ ...current, window: { width, height, x, y } });
    log.info(`窗口位置已保存：${x},${y} ${width}x${height}`);
  }

  // 加载页面
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // 开发模式下打开 DevTools
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/code/build/index.html'));
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      log.info('主窗口已显示');
    }
  });

  // 最小化时保存位置
  mainWindow.on('minimize', () => {
    saveWindowBounds();
  });

  // 关闭按钮行为：隐藏到托盘而非退出，同时保存位置
  mainWindow.on('close', (event) => {
    saveWindowBounds();
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      log.info('窗口已隐藏到托盘');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// 注册窗口相关的 IPC 处理
function registerWindowHandlers(): void {
  ipcMain.handle('window:hide', async () => {
    if (mainWindow) {
      mainWindow.hide();
    }
  });

  ipcMain.handle('window:close', async () => {
    (app as typeof app & { isQuitting: boolean }).isQuitting = true;
    app.quit();
  });

  ipcMain.handle('window:resize', async (_event, width: number, height: number) => {
    if (mainWindow) {
      mainWindow.setSize(width, height);
    }
  });
}

ipcMain.handle('renderer:log-info', async (_event, message: string) => {
  log.info(message);
});

ipcMain.handle('renderer:log-error', async (_event, message: string, error?: unknown) => {
  log.error(message, error);
});

// 应用就绪
app.whenReady().then(async () => {
  log.info('应用已就绪');

  try {
    // 初始化数据库（存储在 exe 同级目录，重建前由构建脚本备份）
    setDbDir(appDir);
    log.info(`数据库目录：${appDir}`);
    await initDatabase();

    // 注册 IPC 处理器
    registerCommandsHandlers();
    registerSettingsHandlers();
    registerTerminalHandlers();
    registerWindowHandlers();

    // 创建窗口
    const window = createWindow();

    // 创建系统托盘
    createTray(window);

    // 注册全局快捷键
    const settings = getSettings();
    registerGlobalShortcut(window, settings.hotkeys.summonApp);

    log.info('应用初始化成功');
  } catch (error) {
    log.error('应用初始化失败：', error);
    app.quit();
  }

  // macOS 特性：点击 Dock 图标时显示窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

// 所有窗口关闭时（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 退出前清理
app.on('before-quit', () => {
  (app as typeof app & { isQuitting: boolean }).isQuitting = true;
  unregisterAllShortcuts();
  destroyTray();
  log.info('应用正在退出...');
});

app.on('will-quit', () => {
  unregisterAllShortcuts();
});
