/**
 * 构建前备份用户数据库，构建后恢复到 exe 同级目录
 * 保证重新构建不会丢失用户数据
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const buildDir = __dirname;  // code/build
const root = path.join(buildDir, '..', '..');  // 项目根目录
const projectDb = path.join(root, 'data.db');
const rootNodeModules = path.join(root, 'node_modules');
const buildNodeModules = path.join(buildDir, 'node_modules');

function ensureBuildDependency(name) {
  const sourceDir = path.join(rootNodeModules, name);
  const targetDir = path.join(buildNodeModules, name);

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`[build] 缺少依赖 ${name}，请先在项目根目录执行 npm install`);
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  console.log(`[build] 已同步依赖 ${name} → ${targetDir}`);
}

if (!fs.existsSync(projectDb)) {
  fs.writeFileSync(projectDb, '');
  console.log('[build] 创建空数据库占位文件');
} else {
  console.log('[build] 使用项目根目录数据库 →', projectDb);
}

// 执行 vite 构建（在 build 目录下运行，使用本地的 node_modules）
console.log('[build] 开始构建...');
execSync('npx vite build', { stdio: 'inherit', cwd: buildDir });

fs.mkdirSync(buildNodeModules, { recursive: true });
ensureBuildDependency('sql.js');
ensureBuildDependency('koffi');

// 执行 electron-builder（从 code/ 目录运行，加载 code/electron-builder.yml）
console.log('[build] 打包应用...');
const codeDir = path.join(root, 'code');
execSync('npx electron-builder', { stdio: 'inherit', cwd: codeDir });
