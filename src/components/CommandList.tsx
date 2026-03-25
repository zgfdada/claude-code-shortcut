import React from 'react';
import type { Command } from '../types';
import { CommandItem } from './CommandItem';
import { useSettings } from '../hooks/useSettings';

interface CommandListProps {
  commands: Command[];
  onCopy: (id: string, commandText: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Command>) => Promise<void>;
}

export function CommandList({ commands, onCopy, onToggleFavorite, onDelete, onUpdate }: CommandListProps) {
  const { settings } = useSettings();

  if (commands.length === 0) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3 py-16"
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke={settings.theme.accentColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.4"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <p className="text-sm" style={{ color: `${settings.theme.textColor}88` }}>
          未找到匹配的命令
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {commands.map((command, index) => (
        <CommandItem
          key={command.id}
          command={command}
          index={index}
          onCopy={onCopy}
          onToggleFavorite={onToggleFavorite}
          onDelete={onDelete}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
}
