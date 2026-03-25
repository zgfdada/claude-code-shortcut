import { ipcMain } from 'electron';
import * as db from '../database';
import log from 'electron-log';
import type { Command } from '../src/types';

export function registerCommandsHandlers(): void {
  ipcMain.handle('commands:getAll', async () => {
    try {
      return db.getAllCommands();
    } catch (error) {
      log.error('Failed to get all commands:', error);
      return [];
    }
  });

  ipcMain.handle('commands:search', async (_event, query: string) => {
    try {
      return db.searchCommands(query);
    } catch (error) {
      log.error('Failed to search commands:', error);
      return [];
    }
  });

  ipcMain.handle('commands:incrementUsage', async (_event, id: string) => {
    try {
      db.incrementUsage(id);
    } catch (error) {
      log.error('Failed to increment usage:', error);
    }
  });

  ipcMain.handle('commands:toggleFavorite', async (_event, id: string) => {
    try {
      return db.toggleFavorite(id);
    } catch (error) {
      log.error('Failed to toggle favorite:', error);
      throw error;
    }
  });

  ipcMain.handle('commands:add', async (_event, command: Omit<Command, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>) => {
    try {
      return db.addCommand(command);
    } catch (error) {
      log.error('Failed to add command:', error);
      throw error;
    }
  });

  ipcMain.handle('commands:update', async (_event, id: string, updates: Partial<Command>) => {
    try {
      return db.updateCommand(id, updates);
    } catch (error) {
      log.error('Failed to update command:', error);
      throw error;
    }
  });

  ipcMain.handle('commands:delete', async (_event, id: string) => {
    try {
      db.deleteCommand(id);
    } catch (error) {
      log.error('Failed to delete command:', error);
      throw error;
    }
  });

  log.info('Commands IPC handlers registered');
}
