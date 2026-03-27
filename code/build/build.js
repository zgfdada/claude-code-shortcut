/**
 * 构建前备份用户数据库，构建后恢复到 exe 同级目录
 * 保证重新构建不会丢失用户数据
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const buildDir = __dirname;  // code/build
const root = path.join(buildDir, '..', '..');  // 项目根目录
const releaseDb = path.join(root, 'release', 'win-unpacked', 'data.db');
const projectDb = path.join(root, 'data.db');

// 构建前：备份用户数据库到项目根目录
if (fs.existsSync(releaseDb)) {
  fs.copyFileSync(releaseDb, projectDb);
  console.log('[build] 已备份用户数据库 →', projectDb);
} else if (!fs.existsSync(projectDb)) {
  fs.writeFileSync(projectDb, '');
  console.log('[build] 创建空数据库占位文件');
}

// 执行 vite 构建（在 build 目录下运行，使用本地的 node_modules）
console.log('[build] 开始构建...');
execSync('npx vite build', { stdio: 'inherit', cwd: buildDir });

// 执行 electron-builder（从 code/ 目录运行，加载 code/electron-builder.yml）
console.log('[build] 打包应用...');
const codeDir = path.join(root, 'code');
execSync('npx electron-builder', { stdio: 'inherit', cwd: codeDir });
