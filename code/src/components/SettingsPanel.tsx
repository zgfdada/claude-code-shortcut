import React, { useState } from 'react';
import type { Settings } from '../types';
import { ColorPicker } from './ColorPicker';

interface SettingsPanelProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onReset: () => void;
  onClose: () => void;
}

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
};

export function SettingsPanel({ settings, onSave, onReset, onClose }: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const { backgroundColor, textColor, accentColor } = localSettings.theme;

  const handleThemeChange = (key: keyof typeof localSettings.theme, value: string) => {
    setLocalSettings({
      ...localSettings,
      theme: {
        ...localSettings.theme,
        [key]: value,
      },
    });
    onSave({
      ...localSettings,
      theme: {
        ...localSettings.theme,
        [key]: value,
      },
    });
  };

  const handleWindowChange = (key: 'width' | 'height', value: number) => {
    const newSettings = {
      ...localSettings,
      window: {
        ...localSettings.window,
        [key]: value,
      },
    };
    setLocalSettings(newSettings);
    onSave(newSettings);
  };

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      />

      {/* 设置面板 */}
      <div
        className="fixed top-0 right-0 h-full z-50 shadow-2xl overflow-y-auto"
        style={{
          width: '320px',
          backgroundColor: '#181825',
          borderLeft: `1px solid ${accentColor}33`,
        }}
      >
        {/* 标题 */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: `${accentColor}33` }}
        >
          <div className="flex items-center gap-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={accentColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
            <h2 className="text-sm font-semibold" style={{ color: accentColor }}>
              主题与布局
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded cursor-pointer transition-colors duration-150"
            style={{ color: textColor }}
            title="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-6">
          {/* 颜色设置 */}
          <section>
            <h3 className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: `${textColor}88` }}>
              颜色
            </h3>
            <div className="space-y-4">
              <ColorPicker
                label="背景颜色"
                value={backgroundColor}
                onChange={(c) => handleThemeChange('backgroundColor', c)}
                accentColor={accentColor}
              />
              <ColorPicker
                label="文字颜色"
                value={textColor}
                onChange={(c) => handleThemeChange('textColor', c)}
                accentColor={accentColor}
              />
              <ColorPicker
                label="强调颜色"
                value={accentColor}
                onChange={(c) => handleThemeChange('accentColor', c)}
                accentColor={accentColor}
              />
            </div>
          </section>

          {/* 分隔线 */}
          <div style={{ borderColor: `${accentColor}22` }} className="border-t" />

          {/* 窗口尺寸 */}
          <section>
            <h3 className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: `${textColor}88` }}>
              窗口尺寸
            </h3>
            <div className="space-y-5">
              {/* 宽度 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs" style={{ color: `${textColor}bb` }}>宽度</label>
                  <span className="text-xs font-mono" style={{ color: accentColor }}>
                    {localSettings.window.width}px
                  </span>
                </div>
                <input
                  type="range"
                  min="400"
                  max="800"
                  step="10"
                  value={localSettings.window.width}
                  onChange={(e) => handleWindowChange('width', parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `${accentColor}33`,
                    accentColor: accentColor,
                  }}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs opacity-50" style={{ color: textColor }}>400px</span>
                  <span className="text-xs opacity-50" style={{ color: textColor }}>800px</span>
                </div>
              </div>

              {/* 高度 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs" style={{ color: `${textColor}bb` }}>高度</label>
                  <span className="text-xs font-mono" style={{ color: accentColor }}>
                    {localSettings.window.height}px
                  </span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="700"
                  step="10"
                  value={localSettings.window.height}
                  onChange={(e) => handleWindowChange('height', parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `${accentColor}33`,
                    accentColor: accentColor,
                  }}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs opacity-50" style={{ color: textColor }}>300px</span>
                  <span className="text-xs opacity-50" style={{ color: textColor }}>700px</span>
                </div>
              </div>
            </div>
          </section>

          {/* 分隔线 */}
          <div style={{ borderColor: `${accentColor}22` }} className="border-t" />

          {/* 快捷键 */}
          <section>
            <h3 className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: `${textColor}88` }}>
              快捷键
            </h3>
            <div
              className="flex items-center justify-between px-3 py-2 rounded text-xs font-mono"
              style={{
                backgroundColor: `${accentColor}11`,
                border: `1px solid ${accentColor}33`,
                color: textColor,
              }}
            >
              <span>唤起窗口</span>
              <span style={{ color: accentColor }}>{localSettings.hotkeys.summonApp}</span>
            </div>
          </section>

          {/* 重置按钮 */}
          <div className="pt-2">
            <button
              onClick={onReset}
              className="w-full py-2 rounded text-xs font-medium transition-colors duration-200 cursor-pointer"
              style={{
                backgroundColor: `${accentColor}11`,
                border: `1px solid ${accentColor}33`,
                color: accentColor,
              }}
            >
              重置为默认主题
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
