# Claude Code Shortcut 开发文档

## 项目概述

Claude Code Shortcut 是一款基于 Electron + React + TypeScript 的 Windows 桌面应用，用于管理和快速发送命令到终端窗口。

## 技术栈

- **框架**：Electron 29.x + React 18.x
- **构建**：Vite 5.x + vite-plugin-electron
- **样式**：Tailwind CSS 3.x
- **数据库**：sql.js (SQLite WASM)
- **原生调用**：koffi (Windows API)
- **语言**：TypeScript 5.x

## 项目结构

```
├── code/                          # 源代码目录
│   ├── src/                       # 渲染进程代码
│   │   ├── components/            # React 组件
│   │   ├── hooks/                 # 自定义 Hooks
│   │   ├── types/                 # TypeScript 类型定义
│   │   ├── App.tsx               # 主应用组件
│   │   ├── main.tsx              # 渲染进程入口
│   │   └── index.css             # 全局样式
│   │
│   ├── electron/                  # 主进程代码
│   │   ├── ipc/                   # IPC 处理器
│   │   │   ├── commands.ts       # 命令相关 IPC
│   │   │   ├── settings.ts       # 设置相关 IPC
│   │   │   └── terminal.ts       # 终端相关 IPC
│   │   ├── database.ts           # 数据库操作
│   │   ├── main.ts               # 主进程入口
│   │   ├── preload.ts            # 预加载脚本
│   │   ├── winApi.ts             # Windows API 封装
│   │   ├── tray.ts               # 系统托盘
│   │   └── globalShortcut.ts     # 全局快捷键
│   │
│   ├── build/                     # 构建相关文件
│   │   ├── build.js              # 构建脚本
│   │   ├── vite.config.ts        # Vite 配置
│   │   ├── tailwind.config.js    # Tailwind 配置
│   │   ├── dist/                 # Vite 构建输出
│   │   └── dist-electron/        # Electron 主进程输出
│   │
│   ├── resources/                 # 静态资源
│   │   └── icons/                # 应用图标
│   │
│   └── Test/                      # 测试文件
│       ├── test-enum.js          # 枚举窗口测试
│       └── test-send*.js         # 发送命令测试
│
├── release/                       # 编译输出
│   └── win-unpacked/             # Windows 可执行文件
│
├── data.db                        # 用户数据库
├── CLAUDE.md                      # 项目规范
├── README-USER.md                 # 用户文档
└── README-CODE.md                 # 开发者文档

```

## 数据存储规范

**重要**：所有数据必须存储在可执行程序同目录下的 `data.db` 文件中，禁止写入用户目录（如 AppData）。

- **开发模式**：数据存储在项目根目录
- **生产模式**：数据存储在 `release/win-unpacked/` 目录
- **数据库备份**：构建脚本会自动备份 `data.db`

## IPC 通信规范

### 命令相关
- `commands:getAll` - 获取所有命令
- `commands:search` - 搜索命令
- `commands:incrementUsage` - 增加使用次数（需详细日志）
- `commands:toggleFavorite` - 切换收藏状态
- `commands:add` - 添加命令
- `commands:update` - 更新命令
- `commands:delete` - 删除命令

### 设置相关
- `settings:get` - 获取设置
- `settings:save` - 保存设置

### 终端相关
- `terminal:list` - 列出所有终端窗口
- `terminal:send` - 发送文本到指定窗口

### 窗口控制
- `window:hide` - 隐藏窗口到托盘
- `window:close` - 关闭应用
- `window:resize` - 调整窗口大小

## 日志规范

使用 `electron-log` 记录日志，日志文件位于程序同目录的 `app.log`。

### 日志级别
- `log.info()` - 常规信息（初始化、操作成功）
- `log.warn()` - 警告信息
- `log.error()` - 错误信息

### 关键函数日志要求

**`incrementUsage` 函数必须记录**：
1. 函数开始执行及传入参数
2. 更新前的 usage_count 值
3. UPDATE 执行结果（changes 数量）
4. 更新后的 usage_count 值
5. 任何异常信息

示例：
```typescript
log.info(`[Database] incrementUsage 开始执行，id=${id}`);
log.info(`[Database] 更新前 usage_count=${beforeCount}`);
log.info(`[Database] UPDATE 执行结果，changes=${result.changes}`);
log.info(`[Database] 更新后 usage_count=${afterCount}`);
```

## 开发流程

### Bug 修复 / 功能新增流程

1. **编写单元测试**（优先）
   - 在 `code/Test/` 目录创建测试脚本
   - 验证功能点是否正常工作
   - 测试通过后再修改项目代码

2. **添加详细日志**
   - 在关键函数入口/出口添加日志
   - 记录参数和返回值
   - 记录状态变化

3. **修改项目代码**
   - 保持 TypeScript 类型安全
   - 遵循现有代码风格
   - 添加必要的注释

4. **构建测试**
   - 运行 `npm run build`
   - 测试生产环境功能

### 常用命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 终端注入原理

使用 `koffi` 调用 Windows API：

1. **枚举窗口**：`EnumWindows` 查找 CMD/Windows Terminal 窗口
2. **发送输入**：`SendInput` 向目标窗口注入 Unicode 字符
3. **窗口激活**：`SetForegroundWindow` 确保窗口在前台

## 注意事项

1. **数据持久化**：sql.js 是内存数据库，每次操作后必须调用 `saveDatabase()`
2. **线程安全**：主进程和渲染进程通过 IPC 通信，不要直接访问数据库
3. **路径处理**：使用 Node.js 的 `path` 模块处理跨平台路径
4. **异常处理**：IPC 处理器必须 try-catch 并记录错误

## 快捷键映射

- `Ctrl+Shift+Space` - 唤起/隐藏（全局）
- `Ctrl+X` - 完全退出
- `Esc` - 隐藏窗口

## 发布流程

1. 更新版本号（`package.json`）
2. 运行 `npm run build`
3. 构建脚本会自动备份 data.db
4. 检查 `release/win-unpacked/` 目录
5. 压缩分发（可选）
