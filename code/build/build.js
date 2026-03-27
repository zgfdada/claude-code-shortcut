/**
 * 构建前备份用户数据库，构建后恢复到 exe 同级目录
 * 保证重新构建不会丢失用户数据
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '../..');
const releaseDb = path.join(root, 'release', 'win-unpacked', 'data.db');
const projectDb = path.join(root, 'data.db');
const viteConfig = path.join(__dirname, 'vite.config.ts');

// 构建前：备份用户数据库到项目根目录
if (fs.existsSync(releaseDb)) {
  // release 中已有数据，复制到项目根目录
  fs.copyFileSync(releaseDb, projectDb);
  console.log('[build] 已备份用户数据库 →', projectDb);
} else if (!fs.existsSync(projectDb)) {
  // 项目根目录也没有，且 release 也不存在，创建空占位文件
  // electron-builder 要求文件存在才能复制
  fs.writeFileSync(projectDb, '');
  console.log('[build] 创建空数据库占位文件');
}

// 执行正式构建
execSync(`npx vite build --config "${viteConfig}" && npx electron-builder`, { stdio: 'inherit', cwd: root });
