import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import log from 'electron-log';
import type { Command, Settings } from '../src/types';

let db: SqlJsDatabase;
let dbPath: string;
let dbDir: string;

export function setDbDir(dir: string): void {
  dbDir = dir;
}

const defaultSettings: Settings = {
  theme: {
    backgroundColor: '#1e1e2e',
    textColor: '#cdd6f4',
    accentColor: '#89b4fa',
  },
  window: {
    width: 600,
    height: 500,
  },
  hotkeys: {
    summonApp: 'Ctrl+Shift+Space',
  },
  minimizeToTray: true,
  categoryColors: {},
};

// 保存数据库到文件
function saveDatabase(): void {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    log.info(`数据库已保存：${dbPath}`);
  } catch (error) {
    log.error('保存数据库失败：', error);
    throw error;
  }
}

export async function initDatabase(): Promise<void> {
  // 使用 main.ts 设置的目录，fallback 到 exe 同级
  const dir = dbDir || (app.isPackaged ? path.dirname(process.execPath) : path.join(__dirname, '..'));
  dbPath = path.join(dir, 'data.db');

  log.info(`正在初始化数据库：${dbPath}`);

  // 定位 sql-wasm.wasm 文件
  let wasmPath: string;
  if (app.isPackaged) {
    wasmPath = path.join(process.resourcesPath, 'sql-wasm.wasm');
  } else {
    wasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  }

  const wasmBinary = fs.readFileSync(wasmPath);
  const SQL = await initSqlJs({ wasmBinary });

  // 加载已有数据库或创建新数据库（0字节占位文件视为不存在）
  const dbExists = fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0;
  if (dbExists) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    log.info('已加载现有数据库');
  } else {
    db = new SQL.Database();
    log.info('创建新数据库');
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS commands (
      id TEXT PRIMARY KEY,
      command TEXT NOT NULL,
      description TEXT NOT NULL,
      usage_count INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 创建索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_commands_usage ON commands(usage_count DESC);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_commands_favorite ON commands(is_favorite DESC);`);

  // 迁移：为旧数据库添加 category 列（已存在时会报错，忽略即可）
  try {
    db.run(`ALTER TABLE commands ADD COLUMN category TEXT NOT NULL DEFAULT ''`);
    log.info('已添加 category 列');
  } catch {
    // 列已存在，忽略
  }

  // 立即保存到文件
  saveDatabase();
  log.info('数据库初始化完成');
}

// ============ 命令操作 ============

function rowToCommand(row: unknown[]): Command {
  return {
    id: row[0] as string,
    command: row[1] as string,
    description: row[2] as string,
    usageCount: row[3] as number,
    isFavorite: Boolean(row[4]),
    createdAt: row[5] as number,
    updatedAt: row[6] as number,
    category: (row[7] as string) || '',
  };
}

export function getAllCommands(): Command[] {
  const result = db.exec(`
    SELECT id, command, description, usage_count, is_favorite, created_at, updated_at, category
    FROM commands
    ORDER BY is_favorite DESC, usage_count DESC, updated_at DESC
  `);

  if (result.length === 0) return [];
  return result[0].values.map(rowToCommand);
}

export function searchCommands(query: string): Command[] {
  const searchPattern = `%${query}%`;
  const stmt = db.prepare(`
    SELECT id, command, description, usage_count, is_favorite, created_at, updated_at, category
    FROM commands
    WHERE command LIKE ? OR description LIKE ?
    ORDER BY is_favorite DESC, usage_count DESC
  `);
  stmt.bind([searchPattern, searchPattern]);

  const commands: Command[] = [];
  while (stmt.step()) {
    const row = stmt.get();
    commands.push(rowToCommand(row));
  }
  stmt.free();
  return commands;
}

export function incrementUsage(id: string): void {
  log.info(`[Database] incrementUsage 开始执行，id=${id}`);

  // 先查询当前值
  const beforeStmt = db.prepare('SELECT usage_count FROM commands WHERE id = ?');
  beforeStmt.bind([id]);
  let beforeCount: number | null = null;
  if (beforeStmt.step()) {
    const row = beforeStmt.get();
    beforeCount = row[0] as number;
  }
  beforeStmt.free();
  log.info(`[Database] 更新前 usage_count=${beforeCount}`);

  // 执行更新
  const result = db.run(`UPDATE commands SET usage_count = usage_count + 1, updated_at = ? WHERE id = ?`, [Date.now(), id]);
  log.info(`[Database] UPDATE 执行结果，changes=${result.changes}`);

  saveDatabase();

  // 查询更新后的值
  const afterStmt = db.prepare('SELECT usage_count FROM commands WHERE id = ?');
  afterStmt.bind([id]);
  let afterCount: number | null = null;
  if (afterStmt.step()) {
    const row = afterStmt.get();
    afterCount = row[0] as number;
  }
  afterStmt.free();
  log.info(`[Database] 更新后 usage_count=${afterCount}`);
}

export function toggleFavorite(id: string): Command {
  db.run(
    `UPDATE commands SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?`,
    [Date.now(), id]
  );
  saveDatabase();

  const stmt = db.prepare('SELECT id, command, description, usage_count, is_favorite, created_at, updated_at, category FROM commands WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  const row = stmt.get();
  stmt.free();
  return rowToCommand(row);
}

export function addCommand(cmd: Omit<Command, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>): Command {
  const id = uuidv4();
  const now = Date.now();
  db.run(
    `INSERT INTO commands (id, command, description, usage_count, is_favorite, created_at, updated_at, category)
     VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
    [id, cmd.command, cmd.description, cmd.isFavorite ? 1 : 0, now, now, cmd.category || '']
  );
  saveDatabase();

  return {
    ...cmd,
    id,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
    category: cmd.category || '',
  };
}

export function updateCommand(id: string, updates: Partial<Command>): Command {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.command !== undefined) {
    fields.push('command = ?');
    values.push(updates.command);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.isFavorite !== undefined) {
    fields.push('is_favorite = ?');
    values.push(updates.isFavorite ? 1 : 0);
  }
  if (updates.category !== undefined) {
    fields.push('category = ?');
    values.push(updates.category);
  }

  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);

  db.run(`UPDATE commands SET ${fields.join(', ')} WHERE id = ?`, values);
  saveDatabase();

  const stmt = db.prepare('SELECT id, command, description, usage_count, is_favorite, created_at, updated_at, category FROM commands WHERE id = ?');
  stmt.bind([id]);
  stmt.step();
  const row = stmt.get();
  stmt.free();
  return rowToCommand(row);
}

export function deleteCommand(id: string): void {
  db.run('DELETE FROM commands WHERE id = ?', [id]);
  saveDatabase();
}

// ============ 设置操作 ============

export function getSettings(): Settings {
  const result = db.exec("SELECT value FROM settings WHERE key = 'app_settings'");
  if (result.length > 0 && result[0].values.length > 0) {
    try {
      return JSON.parse(result[0].values[0][0] as string) as Settings;
    } catch {
      return defaultSettings;
    }
  }
  return defaultSettings;
}

export function saveSettings(settings: Settings): void {
  // 先删除旧记录再插入（sql.js 的 INSERT OR REPLACE 语义稍有不同）
  db.run("DELETE FROM settings WHERE key = 'app_settings'");
  db.run("INSERT INTO settings (key, value) VALUES ('app_settings', ?)", [JSON.stringify(settings)]);
  saveDatabase();
}
