/**
 * 构建前备份用户数据库，构建后恢复到 exe 同级目录
 * 保证重新构建不会丢失用户数据
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const buildDir = __dirname;  // code/build
const codeDir = path.join(buildDir, '..');
const root = path.join(buildDir, '..', '..');  // 项目根目录
const projectDb = path.join(root, 'data.db');
const rootNodeModules = path.join(root, 'node_modules');
const buildNodeModules = path.join(buildDir, 'node_modules');
const linuxNoSandboxHook = path.join(buildDir, 'after-pack-linux-no-sandbox.cjs');

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

function writeLinuxNoSandboxHook() {
  const hookSource = `const fs = require('fs');
const path = require('path');

async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') {
    return;
  }

  const executableName = context.packager.executableName;
  const appOutDir = context.appOutDir;
  const executablePath = path.join(appOutDir, executableName);
  const originalPath = path.join(appOutDir, executableName + '-bin');

  if (!fs.existsSync(executablePath)) {
    throw new Error('[afterPack] 未找到 Linux 可执行文件: ' + executablePath);
  }

  fs.rmSync(originalPath, { force: true });
  fs.renameSync(executablePath, originalPath);

  fs.writeFileSync(executablePath, '#!/bin/sh\\nexec "$(dirname "$0")/' + path.basename(originalPath) + '" --no-sandbox "$@"\\n');
  fs.chmodSync(executablePath, 0o755);
}

module.exports = { afterPack };
`;

  fs.writeFileSync(linuxNoSandboxHook, hookSource);
  console.log('[build] 已生成 Linux afterPack hook →', linuxNoSandboxHook);
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
writeLinuxNoSandboxHook();

// 执行 electron-builder（从 code/ 目录运行，加载 code/electron-builder.yml）
console.log('[build] 打包应用...');
const afterPackPath = path.relative(codeDir, linuxNoSandboxHook).split(path.sep).join('/');
const afterPackArg = os.platform() === 'win32' ? afterPackPath.replace(/"/g, '\\"') : `'${afterPackPath.replace(/'/g, `'"'"'`)}'`;
try {
  execSync(`npx electron-builder --config.afterPack=${afterPackArg}`, { stdio: 'inherit', cwd: codeDir });
} finally {
  fs.rmSync(linuxNoSandboxHook, { force: true });
}
