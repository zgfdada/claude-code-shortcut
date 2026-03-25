import { contextBridge, ipcRenderer } from 'electron';
import type { Command, Settings } from '../src/types';

contextBridge.exposeInMainWorld('electronAPI', {
  // 命令相关
  getCommands: (): Promise<Command[]> => ipcRenderer.invoke('commands:getAll'),
  searchCommands: (query: string): Promise<Command[]> => ipcRenderer.invoke('commands:search', query),
  incrementUsage: (id: string): Promise<void> => ipcRenderer.invoke('commands:incrementUsage', id),
  toggleFavorite: (id: string): Promise<Command> => ipcRenderer.invoke('commands:toggleFavorite', id),
  addCommand: (command: Omit<Command, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>): Promise<Command> =>
    ipcRenderer.invoke('commands:add', command),
  updateCommand: (id: string, updates: Partial<Command>): Promise<Command> =>
    ipcRenderer.invoke('commands:update', id, updates),
  deleteCommand: (id: string): Promise<void> => ipcRenderer.invoke('commands:delete', id),

  // 设置相关
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Settings): Promise<void> => ipcRenderer.invoke('settings:save', settings),

  // 窗口控制
  hideWindow: (): Promise<void> => ipcRenderer.invoke('window:hide'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('window:close'),
  resizeWindow: (width: number, height: number): Promise<void> =>
    ipcRenderer.invoke('window:resize', width, height),

  // 主题更新监听
  onThemeUpdate: (callback: (settings: Settings) => void): void => {
    ipcRenderer.on('settings:updated', (_event, settings: Settings) => {
      callback(settings);
    });
  },

  // 日志（写入主进程 app.log）
  logInfo: (message: string): Promise<void> => ipcRenderer.invoke('renderer:log-info', message),
  logError: (message: string, error?: unknown): Promise<void> => ipcRenderer.invoke('renderer:log-error', message, error),
});
