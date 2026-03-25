/**
 * 构建前备份用户数据库，构建后恢复到 exe 同级目录
 * 保证重新构建不会丢失用户数据
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const releaseDb = path.join(root, 'release', 'win-unpacked', 'data.db');
const projectDb = path.join(root, 'data.db');

// 构建前：把 release 里的用户数据库备份到项目根目录
if (fs.existsSync(releaseDb)) {
  fs.copyFileSync(releaseDb, projectDb);
  console.log('[build] 已备份用户数据库 →', projectDb);
} else if (!fs.existsSync(projectDb)) {
  // 首次构建，创建空占位文件（electron-builder 要求文件存在）
  fs.writeFileSync(projectDb, '');
  console.log('[build] 创建空数据库占位文件');
}

// 执行正式构建
execSync('npx vite build && npx electron-builder', { stdio: 'inherit', cwd: root });
