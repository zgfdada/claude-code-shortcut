import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import path from 'path';
import fs from 'fs';
import log from 'electron-log';

let tray: Tray | null = null;

function getTrayIconPath(): string | null {
  const baseDir = app.isPackaged
    ? path.join(process.resourcesPath, 'icons')
    : path.join(__dirname, '..', 'resources', 'icons');

  const candidates = process.platform === 'win32'
    ? ['icon.ico', 'icon.png']
    : process.platform === 'darwin'
      ? ['icon.png', 'icon.icns', 'icon.ico']
      : ['icon.png', 'icon.ico'];

  for (const file of candidates) {
    const iconPath = path.join(baseDir, file);
    if (fs.existsSync(iconPath)) {
      return iconPath;
    }
  }

  return null;
}

export function createTray(mainWindow: BrowserWindow): Tray {
  // 创建简单的托盘图标（16x16 像素）
  const iconSize = 16;

  // 尝试加载应用图标，如果失败则使用默认图标
  let trayIcon: nativeImage;
  try {
    const iconPath = getTrayIconPath();
    trayIcon = iconPath ? nativeImage.createFromPath(iconPath) : createDefaultIcon();
    if (trayIcon.isEmpty()) {
      trayIcon = createDefaultIcon();
    }
  } catch {
    trayIcon = createDefaultIcon();
  }

  tray = new Tray(trayIcon.resize({ width: iconSize, height: iconSize }));
  tray.setToolTip('Claude Code Shortcut');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  log.info('System tray created');
  return tray;
}

function createDefaultIcon(): nativeImage {
  // 创建一个简单的默认图标（蓝色圆形）
  const size = 32;
  const canvas = Buffer.alloc(size * size * 4);

  // 填充蓝色
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = Math.floor(i / size);
    const centerX = size / 2;
    const centerY = size / 2;
    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

    if (dist < size / 2 - 1) {
      // 蓝色填充
      canvas[i * 4] = 0x89;     // R
      canvas[i * 4 + 1] = 0xb4; // G
      canvas[i * 4 + 2] = 0xfa; // B
      canvas[i * 4 + 3] = 255;  // A
    } else {
      // 透明
      canvas[i * 4] = 0;
      canvas[i * 4 + 1] = 0;
      canvas[i * 4 + 2] = 0;
      canvas[i * 4 + 3] = 0;
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
