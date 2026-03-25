import React, { useState, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onThemeToggle: () => void;
  onAddCommand: () => void;
}

export function SearchBar({ query, onQueryChange, onThemeToggle, onAddCommand }: SearchBarProps) {
  const { settings } = useSettings();
  const accent = settings.theme.accentColor;
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCmd, setNewCmd] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const cmdInputRef = useRef<HTMLInputElement>(null);

  const openForm = () => {
    setShowAddForm(true);
    setNewCmd('');
    setNewDesc('');
    setNewCategory('');
    setTimeout(() => cmdInputRef.current?.focus(), 50);
  };

  const closeForm = () => {
    setShowAddForm(false);
    setNewCmd('');
    setNewDesc('');
    setNewCategory('');
  };

  const handleSave = async () => {
    if (!newCmd.trim()) return;
    setSaving(true);
    try {
      await window.electronAPI.addCommand({
        command: newCmd.trim(),
        description: newDesc.trim() || newCmd.trim(),
        category: newCategory.trim(),
        isFavorite: false,
      });
      onAddCommand();
      closeForm();
    } catch (e) {
      console.error('Failed to add command:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') closeForm();
  };

  if (showAddForm) {
    return (
      <div className="px-4 py-3 border-b" style={{ borderColor: `${accent}33` }}>
        <div className="flex items-center gap-2 mb-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-xs font-medium opacity-70" style={{ color: settings.theme.textColor }}>添加命令</span>
        </div>
        <input
          ref={cmdInputRef}
          type="text"
          placeholder="命令（如 git status）"
          value={newCmd}
          onChange={(e) => setNewCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent outline-none text-sm mb-2 px-2 py-1 rounded border"
          style={{
            color: settings.theme.textColor,
            borderColor: `${accent}44`,
            backgroundColor: `${accent}11`,
          }}
        />
        <input
          type="text"
          placeholder="描述（可选）"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent outline-none text-sm mb-2 px-2 py-1 rounded border"
          style={{
            color: settings.theme.textColor,
            borderColor: `${accent}44`,
            backgroundColor: `${accent}11`,
          }}
        />
        <input
          type="text"
          placeholder="类型（如 cmd、Claude、git，可选）"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent outline-none text-sm mb-3 px-2 py-1 rounded border"
          style={{
            color: settings.theme.textColor,
            borderColor: `${accent}44`,
            backgroundColor: `${accent}11`,
          }}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={closeForm}
            className="px-3 py-1 text-xs rounded opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: settings.theme.textColor }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!newCmd.trim() || saving}
            className="px-3 py-1 text-xs rounded transition-opacity disabled:opacity-40"
            style={{ backgroundColor: `${accent}33`, color: accent }}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b"
      style={{ borderColor: `${accent}33` }}
    >
      {/* 搜索图标 */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>

      {/* 搜索输入框 */}
      <input
        type="text"
        placeholder="搜索命令行或中文释义..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="flex-1 bg-transparent outline-none text-base placeholder:text-sm"
        style={{ color: settings.theme.textColor }}
        autoFocus
      />

      {/* 快捷按钮 */}
      <div className="flex items-center gap-2">
        {/* 添加命令按钮 */}
        <button
          onClick={openForm}
          className="p-2 rounded-lg transition-colors duration-200 cursor-pointer"
          style={{ backgroundColor: `${accent}22` }}
          title="添加命令"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        {/* 主题按钮 */}
        <button
          onClick={onThemeToggle}
          className="p-2 rounded-lg transition-colors duration-200 cursor-pointer"
          style={{ backgroundColor: `${accent}22` }}
          title="主题设置"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={accent}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        </button>
      </div>
    </div>
  );
}
