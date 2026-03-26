import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../types';

const defaultSettings: Settings = {
  theme: {
    backgroundColor: '#1e1e2e',
    textColor: '#cdd6f4',
    accentColor: '#89b4fa',
  },
  window: {
    width: 600,
    height: 500,
  },
  hotkeys: {
    summonApp: 'Ctrl+Shift+Space',
  },
  minimizeToTray: true,
  categoryColors: {},
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const data = await window.electronAPI.getSettings();
      setSettings(data);
      applySettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();

    // 监听主题更新事件
    window.electronAPI.onThemeUpdate((newSettings) => {
      setSettings(newSettings);
      applySettings(newSettings);
    });
  }, [loadSettings]);

  const saveSettings = useCallback(async (newSettings: Settings) => {
    try {
      await window.electronAPI.saveSettings(newSettings);
      setSettings(newSettings);
      applySettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, []);

  const resetSettings = useCallback(async () => {
    await saveSettings(defaultSettings);
  }, [saveSettings]);

  return {
    settings,
    loading,
    saveSettings,
    resetSettings,
  };
}

function applySettings(settings: Settings) {
  const root = document.documentElement;
  root.style.setProperty('--bg-primary', settings.theme.backgroundColor);
  root.style.setProperty('--text-primary', settings.theme.textColor);
  root.style.setProperty('--accent-primary', settings.theme.accentColor);
  document.body.style.backgroundColor = settings.theme.backgroundColor;
  document.body.style.color = settings.theme.textColor;

  // 实时调整窗口尺寸
  window.electronAPI.resizeWindow(settings.window.width, settings.window.height);
}
