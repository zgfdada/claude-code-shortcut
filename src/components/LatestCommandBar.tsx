import React, { useState, useRef } from 'react';
import type { Command } from '../types';
import { useSettings } from '../hooks/useSettings';

interface LatestCommandBarProps {
  command: Command;
  onCopy: (id: string, commandText: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Command>) => Promise<void>;
}

export function LatestCommandBar({
  command,
  onCopy,
  onToggleFavorite,
  onDelete,
  onUpdate,
}: LatestCommandBarProps) {
  const { settings } = useSettings();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { accentColor, textColor } = settings.theme;

  const handleCopy = () => {
    onCopy(command.id, command.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const openEdit = () => {
    setEditValue(command.command);
    setEditDesc(command.description);
    setEditCategory(command.category || '');
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditValue('');
    setEditDesc('');
    setEditCategory('');
  };

  const confirmEdit = async () => {
    const trimmedCmd = editValue.trim();
    const trimmedDesc = editDesc.trim();
    const trimmedCategory = editCategory.trim();
    if (!trimmedCmd) return;
    if (trimmedCmd === command.command && trimmedDesc === command.description && trimmedCategory === (command.category || '')) {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      await onUpdate(command.id, { command: trimmedCmd, description: trimmedDesc || trimmedCmd, category: trimmedCategory });
      setIsEditing(false);
      setEditValue('');
      setEditDesc('');
      setEditCategory('');
    } finally {
      setSaving(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void confirmEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const handleDelete = () => {
    if (confirm('确认删除该命令？')) {
      onDelete(command.id);
    }
  };

  return (
    <div
      style={{
        borderTop: `1px solid ${accentColor}44`,
        borderBottom: `1px solid ${accentColor}22`,
        backgroundColor: `${accentColor}08`,
      }}
    >
      <div
        className="px-4 py-0.5 text-xs font-mono opacity-40"
        style={{ color: accentColor }}
      >
        最新添加
      </div>
      <div
        className="flex items-start gap-3 px-4 py-2"
      >
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex flex-col gap-1.5">
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleEditKeyDown}
                placeholder="命令"
                className="w-full bg-transparent outline-none text-sm font-mono px-2 py-0.5 rounded border"
                style={{ color: accentColor, borderColor: `${accentColor}66`, backgroundColor: `${accentColor}11` }}
              />
              <input
                type="text"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                onKeyDown={handleEditKeyDown}
                placeholder="中文注释（描述）"
                className="w-full bg-transparent outline-none text-xs px-2 py-0.5 rounded border"
                style={{ color: `${textColor}cc`, borderColor: `${accentColor}44`, backgroundColor: `${accentColor}08` }}
              />
              <input
                type="text"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                onKeyDown={handleEditKeyDown}
                placeholder="类型（如 cmd、Claude、git，可选）"
                className="w-full bg-transparent outline-none text-xs px-2 py-0.5 rounded border"
                style={{ color: `${textColor}cc`, borderColor: `${accentColor}44`, backgroundColor: `${accentColor}08` }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={cancelEdit}
                  className="px-2 py-0.5 rounded text-xs opacity-60 hover:opacity-100"
                  style={{ color: textColor }}
                >
                  取消
                </button>
                <button
                  onClick={() => void confirmEdit()}
                  disabled={saving}
                  className="px-2 py-0.5 rounded text-xs font-medium disabled:opacity-40"
                  style={{ backgroundColor: `${accentColor}33`, color: accentColor }}
                >
                  {saving ? '保存中' : '确认'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleFavorite(command.id)}
                className="text-base leading-none cursor-pointer p-0.5"
                title={command.isFavorite ? '取消收藏' : '添加收藏'}
              >
                {command.isFavorite
                  ? <span style={{ color: '#f9e2af' }}>★</span>
                  : <span style={{ color: `${textColor}55` }}>☆</span>}
              </button>
              <span className="font-mono text-sm font-medium truncate" style={{ color: accentColor }}>
                {command.command}
              </span>
            </div>
          )}

          {!isEditing && (
            <p className="text-xs mt-0.5 flex items-center gap-2 truncate" style={{ color: `${textColor}99` }}>
              <span className="truncate">{command.description}</span>
              {command.category && (() => {
                const catColor = settings.categoryColors?.[command.category.toLowerCase()] || accentColor;
                return (
                  <span
                    className="shrink-0 px-1.5 py-0.5 rounded text-xs font-mono"
                    style={{ backgroundColor: `${catColor}22`, color: catColor, border: `1px solid ${catColor}44` }}
                  >
                    {command.category}
                  </span>
                );
              })()}
            </p>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleDelete}
              className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 cursor-pointer"
              style={{ backgroundColor: 'transparent', color: '#ff6b6b', border: `1px solid ${accentColor}44` }}
            >
              删除
            </button>
            <button
              onClick={openEdit}
              className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 cursor-pointer"
              style={{ backgroundColor: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }}
            >
              编辑
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-1 rounded text-xs font-medium transition-all duration-200 cursor-pointer"
              style={{
                backgroundColor: copied ? '#a6e3a1' : `${accentColor}22`,
                color: copied ? '#1e1e2e' : accentColor,
                border: `1px solid ${copied ? '#a6e3a1' : `${accentColor}44`}`,
              }}
            >
              {copied ? '已复制!' : '复制'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
