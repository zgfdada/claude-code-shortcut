export interface Command {
  id: string;
  command: string;
  description: string;
  category: string;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
}

export interface ThemeSettings {
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

export interface WindowSettings {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export interface HotkeySettings {
  summonApp: string;
}

export interface Settings {
  theme: ThemeSettings;
  window: WindowSettings;
  hotkeys: HotkeySettings;
  minimizeToTray: boolean;
  categoryColors: Record<string, string>;
}

export interface ElectronAPI {
  getCommands: () => Promise<Command[]>;
  searchCommands: (query: string) => Promise<Command[]>;
  incrementUsage: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<Command>;
  addCommand: (command: Omit<Command, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>) => Promise<Command>;
  updateCommand: (id: string, updates: Partial<Command>) => Promise<Command>;
  deleteCommand: (id: string) => Promise<void>;
  getSettings: () => Promise<Settings>;
  saveSettings: (settings: Settings) => Promise<void>;
  hideWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  resizeWindow: (width: number, height: number) => Promise<void>;
  onThemeUpdate: (callback: (settings: Settings) => void) => void;
  logInfo: (message: string) => Promise<void>;
  logError: (message: string, error?: unknown) => Promise<void>;
  listCmdWindows: () => Promise<{ hwnd: string; title: string }[]>;
  sendToTerminal: (hwnd: string, text: string) => Promise<void>;
  bindTerminal: (hwnd: string) => Promise<boolean>;
  unbindTerminal: () => Promise<boolean>;
  onTerminalClosed: (callback: () => void) => (() => void);
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
