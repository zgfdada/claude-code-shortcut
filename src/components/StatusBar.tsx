import React from 'react';
import { useSettings } from '../hooks/useSettings';

interface StatusBarProps {
  commandCount: number;
}

export function StatusBar({ commandCount }: StatusBarProps) {
  const { settings } = useSettings();
  const { accentColor, textColor } = settings.theme;

  return (
    <div
      className="flex items-center justify-center gap-4 px-4 py-2 border-t text-xs"
      style={{
        borderColor: `${accentColor}33`,
        color: `${textColor}77`,
      }}
    >
      <span>已加载 {commandCount} 条命令</span>
      <span style={{ color: `${accentColor}44` }}>|</span>
      <span>
        <kbd
          className="px-1.5 py-0.5 rounded text-xs font-mono"
          style={{
            backgroundColor: `${accentColor}22`,
            color: accentColor,
          }}
        >
          Ctrl+Shift+Space
        </kbd>
        {' '}唤起
      </span>
      <span style={{ color: `${accentColor}44` }}>|</span>
      <span>
        <kbd
          className="px-1.5 py-0.5 rounded text-xs font-mono"
          style={{
            backgroundColor: `${accentColor}22`,
            color: accentColor,
          }}
        >
          Esc
        </kbd>
        {' '}隐藏
      </span>
      <span style={{ color: `${accentColor}44` }}>|</span>
      <span>
        <kbd
          className="px-1.5 py-0.5 rounded text-xs font-mono"
          style={{
            backgroundColor: `${accentColor}22`,
            color: accentColor,
          }}
        >
          Ctrl+X
        </kbd>
        {' '}退出
      </span>
    </div>
  );
}
