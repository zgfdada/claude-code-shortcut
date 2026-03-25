import React, { useState, useEffect, useRef } from 'react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  accentColor: string;
}

const PRESET_COLORS = [
  '#1e1e2e', '#313244', '#45475a', '#585b70',
  '#cdd6f4', '#bac2de', '#a6adc8', '#9399b2',
  '#89b4fa', '#74c7ec', '#94e2d5', '#a6e3a1',
  '#f9e2af', '#fab387', '#eba0ac', '#f38ba8',
  '#cba6f7', '#b4befe',
];

export function ColorPicker({ label, value, onChange, accentColor }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={ref} className="relative">
      <label
        className="block text-xs mb-1 font-medium"
        style={{ color: `${accentColor}bb` }}
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 rounded border-2 cursor-pointer transition-transform duration-150 hover:scale-110"
          style={{
            backgroundColor: value,
            borderColor: `${accentColor}66`,
          }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1 rounded text-xs font-mono outline-none border"
          style={{
            backgroundColor: `${accentColor}11`,
            borderColor: `${accentColor}33`,
            color: accentColor,
          }}
          maxLength={9}
        />
      </div>

      {/* 颜色选择面板 */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 p-3 rounded-lg z-50 border shadow-xl"
          style={{
            backgroundColor: '#313244',
            borderColor: `${accentColor}44`,
            minWidth: '220px',
          }}
        >
          <div className="grid grid-cols-6 gap-2 mb-3">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  onChange(color);
                  setIsOpen(false);
                }}
                className="w-7 h-7 rounded border-2 cursor-pointer transition-transform duration-100 hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: color === value ? accentColor : 'transparent',
                  outline: color === value ? `2px solid ${accentColor}` : 'none',
                }}
                title={color}
              />
            ))}
          </div>

          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-8 rounded cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
