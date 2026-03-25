import React, { useState } from 'react';
import { useSettings } from '../hooks/useSettings';

interface CategoryFilterProps {
  categories: [string, string][]; // [lowerKey, displayLabel]
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

export function CategoryFilter({ categories, selected, onChange }: CategoryFilterProps) {
  const { settings, saveSettings } = useSettings();
  const { accentColor, textColor } = settings.theme;
  const [editingColor, setEditingColor] = useState<string | null>(null);

  if (categories.length === 0) return null;

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  };

  const getColor = (key: string) =>
    settings.categoryColors?.[key] || accentColor;

  const handleColorChange = (key: string, color: string) => {
    const updated = { ...settings, categoryColors: { ...settings.categoryColors, [key]: color } };
    void saveSettings(updated);
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 px-4 py-1.5 border-b"
      style={{ borderColor: `${accentColor}22`, backgroundColor: `${accentColor}08` }}
    >
      {categories.map(([key, label]) => {
        const color = getColor(key);
        const checked = selected.has(key);
        return (
          <div key={key} className="flex items-center gap-1 relative">
            <button
              onClick={() => toggle(key)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-all duration-150 cursor-pointer"
              style={{
                color,
                backgroundColor: checked ? `${color}22` : 'transparent',
                border: `1px solid ${checked ? color : `${color}44`}`,
              }}
            >
              <span
                className="w-3 h-3 rounded-sm flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: checked ? color : 'transparent',
                  border: `1.5px solid ${color}`,
                }}
              >
                {checked && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3.5 6L6.5 2" stroke="#1e1e2e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="font-mono">{label}</span>
            </button>
            <button
              onClick={() => setEditingColor(editingColor === key ? null : key)}
              className="w-2.5 h-2.5 rounded-full shrink-0 cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
              style={{ backgroundColor: color }}
              title="修改颜色"
            />
            {editingColor === key && (
              <div
                className="absolute z-50 top-6 left-0 p-2 rounded shadow-lg"
                style={{ backgroundColor: settings.theme.backgroundColor, border: `1px solid ${accentColor}44` }}
              >
                <input
                  type="color"
                  value={color}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-24 h-7 cursor-pointer rounded"
                  style={{ border: 'none', padding: 0 }}
                />
                <button
                  onClick={() => setEditingColor(null)}
                  className="block w-full mt-1 text-xs text-center opacity-60 hover:opacity-100"
                  style={{ color: textColor }}
                >
                  关闭
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
