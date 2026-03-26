import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SearchBar } from './components/SearchBar';
import { CommandList } from './components/CommandList';
import { StatusBar } from './components/StatusBar';
import { LatestCommandBar } from './components/LatestCommandBar';
import { CategoryFilter } from './components/CategoryFilter';
import { SettingsPanel } from './components/SettingsPanel';
import { TerminalPicker } from './components/TerminalPicker';
import { useCommands } from './hooks/useCommands';
import { useSettings } from './hooks/useSettings';
import { useSearch } from './hooks/useSearch';
import { useTerminal } from './hooks/useTerminal';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const {
    commands,
    loading,
    loadCommands,
    searchCommands,
    copyCommand,
    toggleFavorite,
    deleteCommand,
    updateCommand,
  } = useCommands();
  const { settings, saveSettings, resetSettings } = useSettings();
  const { boundHwnd, boundTitle, windows, showPicker, setShowPicker, openPicker, bindWindow, unbind, sendText } = useTerminal();

  // 发送到终端：先发文本，再无条件记录使用次数
  const handleSendToTerminal = useCallback(async (id: string, text: string) => {
    void window.electronAPI.logInfo(`[发送] 开始: id=${id} text="${text}"`);
    try {
      await sendText(text);
      void window.electronAPI.logInfo(`[发送] sendText 完成`);
    } catch (err) {
      void window.electronAPI.logError(`[发送] sendText 失败`, err);
    }
    // 无论发送成功与否，用户已点击发送，记录使用次数
    try {
      await window.electronAPI.incrementUsage(id);
      void window.electronAPI.logInfo(`[发送] incrementUsage 完成: id=${id}`);
    } catch (err) {
      void window.electronAPI.logError(`[发送] incrementUsage 失败`, err);
    }
    await loadCommands();
    void window.electronAPI.logInfo(`[发送] loadCommands 刷新完成`);
  }, [sendText, loadCommands]);

  const handleSearch = useCallback(async (query: string) => {
    await searchCommands(query);
  }, [searchCommands]);

  const { query, setQuery } = useSearch(handleSearch, 150);

  // 最新添加的命令（按 createdAt 降序取第一条，不受搜索过滤影响）
  const [allCommands, setAllCommands] = useState(commands);
  useEffect(() => {
    if (!query) setAllCommands(commands);
  }, [commands, query]);

  const latestCommand = useMemo(() => {
    if (allCommands.length === 0) return null;
    return [...allCommands].sort((a, b) => b.createdAt - a.createdAt)[0];
  }, [allCommands]);

  // 类型筛选（忽略大小写，统一用小写作为 key）
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const allCategories = useMemo(() => {
    const cats = new Map<string, string>(); // lowercase key -> display label (first seen)
    allCommands.forEach((c) => {
      if (c.category) {
        const key = c.category.toLowerCase();
        if (!cats.has(key)) cats.set(key, c.category);
      }
    });
    return Array.from(cats.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    // entries: [lowerKey, displayLabel][]
  }, [allCommands]);

  const filteredCommands = useMemo(() => {
    if (selectedCategories.size === 0) return commands;
    return commands.filter((c) => selectedCategories.has(c.category.toLowerCase()));
  }, [commands, selectedCategories]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'x') {
        // Ctrl+X: 完全退出进程
        e.preventDefault();
        e.stopPropagation();
        window.electronAPI.closeWindow();
        return;
      }
      if (e.key === 'Escape') {
        if (showSettings) {
          setShowSettings(false);
        } else {
          window.electronAPI.hideWindow();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettings]);

  return (
    <div
      className="flex flex-col h-screen"
      style={{
        backgroundColor: settings.theme.backgroundColor,
        color: settings.theme.textColor,
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-1 select-none"
        style={{
          WebkitAppRegion: 'drag',
          backgroundColor: `${settings.theme.accentColor}11`,
          borderBottom: `1px solid ${settings.theme.accentColor}22`,
          minHeight: '28px',
        } as React.CSSProperties}
      >
        <span className="text-xs opacity-40" style={{ color: settings.theme.textColor }}>
          Claude Code Shortcut
        </span>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* 终端绑定按钮 */}
          <button
            onClick={boundHwnd ? unbind : openPicker}
            className="px-2 py-0.5 rounded text-xs transition-all duration-150 cursor-pointer"
            style={{
              color: boundHwnd ? settings.theme.accentColor : `${settings.theme.textColor}55`,
              backgroundColor: boundHwnd ? `${settings.theme.accentColor}22` : 'transparent',
              border: `1px solid ${boundHwnd ? settings.theme.accentColor : `${settings.theme.textColor}22`}`,
              maxWidth: '120px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={boundHwnd ? `已绑定：${boundTitle}，点击解绑` : '绑定 CMD 终端'}
          >
            {boundHwnd ? `⬡ ${boundTitle}` : '绑定终端'}
          </button>
          <button
            onClick={() => window.electronAPI.hideWindow()}
            className="w-5 h-5 rounded flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: settings.theme.textColor }}
            title="隐藏到托盘"
          >
            <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor">
              <rect width="10" height="2" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      <CategoryFilter
        categories={allCategories}
        selected={selectedCategories}
        onChange={setSelectedCategories}
      />

      <SearchBar
        query={query}
        onQueryChange={setQuery}
        onThemeToggle={() => setShowSettings(!showSettings)}
        onAddCommand={loadCommands}
      />

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div
              className="animate-spin rounded-full border-2 border-t-transparent"
              style={{
                width: '24px',
                height: '24px',
                borderColor: `${settings.theme.accentColor}44`,
                borderTopColor: settings.theme.accentColor,
              }}
            />
          </div>
        ) : (
          <CommandList
            commands={filteredCommands}
            onCopy={copyCommand}
            onToggleFavorite={toggleFavorite}
            onDelete={deleteCommand}
            onUpdate={updateCommand}
            onSendToTerminal={boundHwnd ? handleSendToTerminal : undefined}
          />
        )}
      </div>

      {latestCommand && (
        <LatestCommandBar
          command={latestCommand}
          onCopy={copyCommand}
          onToggleFavorite={toggleFavorite}
          onDelete={deleteCommand}
          onUpdate={updateCommand}
          onSendToTerminal={boundHwnd ? handleSendToTerminal : undefined}
        />
      )}

      <StatusBar commandCount={filteredCommands.length} />

      {showPicker && (
        <TerminalPicker
          windows={windows}
          onBind={bindWindow}
          onClose={() => setShowPicker(false)}
          onRefresh={openPicker}
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={saveSettings}
          onReset={resetSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default App;
