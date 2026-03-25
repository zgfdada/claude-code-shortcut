import { useState, useEffect, useCallback } from 'react';
import type { Command } from '../types';

export function useCommands() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCommands = useCallback(async () => {
    console.log('[useCommands] 开始加载命令');
    try {
      const data = await window.electronAPI.getCommands();
      console.log('[useCommands] 命令加载完成，数量：', data.length);
      setCommands(data);
    } catch (error) {
      console.error('加载命令失败：', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCommands();
  }, [loadCommands]);

  const searchCommands = useCallback(async (query: string) => {
    console.log('[useCommands] 搜索命令：', query);
    try {
      const data = await window.electronAPI.searchCommands(query);
      console.log('[useCommands] 搜索结果数量：', data.length);
      setCommands(data);
    } catch (error) {
      console.error('搜索命令失败：', error);
    }
  }, []);

  const copyCommand = useCallback(async (id: string, commandText: string) => {
    console.log('[useCommands] 复制命令，请求ID：', id);
    try {
      await navigator.clipboard.writeText(commandText);
      await window.electronAPI.incrementUsage(id);
      await loadCommands();
      console.log('[useCommands] 复制命令成功，ID：', id);
    } catch (error) {
      console.error('复制命令失败：', error);
    }
  }, [loadCommands]);

  const toggleFavorite = useCallback(async (id: string) => {
    console.log('[useCommands] 切换收藏状态，ID：', id);
    try {
      await window.electronAPI.toggleFavorite(id);
      await loadCommands();
      console.log('[useCommands] 收藏状态切换完成，ID：', id);
    } catch (error) {
      console.error('切换收藏失败：', error);
    }
  }, [loadCommands]);

  const deleteCommand = useCallback(async (id: string) => {
    console.log('[useCommands] 删除命令，ID：', id);
    try {
      await window.electronAPI.deleteCommand(id);
      await loadCommands();
      console.log('[useCommands] 删除命令成功，ID：', id);
    } catch (error) {
      console.error('删除命令失败：', error);
    }
  }, [loadCommands]);

  const updateCommand = useCallback(async (id: string, updates: Partial<Command>) => {
    console.log('[useCommands] 更新命令，ID：', id, '更新项：', updates);
    try {
      await window.electronAPI.updateCommand(id, updates);
      await loadCommands();
      console.log('[useCommands] 更新命令成功，ID：', id);
    } catch (error) {
      console.error('更新命令失败：', error);
    }
  }, [loadCommands]);

  return {
    commands,
    loading,
    loadCommands,
    searchCommands,
    copyCommand,
    toggleFavorite,
    deleteCommand,
    updateCommand,
  };
}
