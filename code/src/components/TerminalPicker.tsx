import React from 'react';
import { useSettings } from '../hooks/useSettings';
import type { CmdWindow } from '../hooks/useTerminal';

interface TerminalPickerProps {
  windows: CmdWindow[];
  onBind: (w: CmdWindow) => void;
  onClose: () => void;
  onRefresh: () => void;
}

export function TerminalPicker({ windows, onBind, onClose, onRefresh }: TerminalPickerProps) {
  const { settings } = useSettings();
  const { accentColor, textColor, backgroundColor } = settings.theme;

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{ backgroundColor: `${backgroundColor}f0`, backdropFilter: 'blur(4px)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: `${accentColor}33` }}>
        <span className="text-sm font-medium" style={{ color: textColor }}>选择要绑定的 CMD 窗口</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="px-2 py-1 rounded text-xs opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: accentColor, border: `1px solid ${accentColor}44` }}
            title="刷新列表"
          >
            刷新
          </button>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded text-xs opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: textColor }}
          >
            取消
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {windows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
            <p className="text-sm opacity-50" style={{ color: textColor }}>未找到 CMD 窗口</p>
            <p className="text-xs opacity-30" style={{ color: textColor }}>请先打开一个 CMD 终端</p>
          </div>
        ) : (
          windows.map((w) => (
            <button
              key={w.hwnd}
              onClick={() => onBind(w)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150"
              style={{ borderBottom: `1px solid ${accentColor}11` }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${accentColor}11`; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
                <path d="M7 8l3 3-3 3" />
                <path d="M13 14h4" />
              </svg>
              <span className="text-sm font-mono truncate" style={{ color: textColor }}>{w.title}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
