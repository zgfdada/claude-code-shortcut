# Claude Code 命令行快捷工具 - 实现计划

## 一、项目概述

**项目名称**: Claude Code Shortcut（Claude 代码助手）
**技术栈**: Electron + React + TypeScript（Vite 构建）
**运行平台**: Windows 11（纯本地运行，无网络依赖）
**核心目标**: 提供一个悬浮于所有页面之上的命令行快捷搜索工具，支持全局热键唤起、按使用频率智能排序、自定义主题。

> **技术选型理由**: Electron + React 拥有更大的前端生态和熟悉的开发体验。Electron 的 `BrowserWindow` 原生支持 `alwaysOnTop` 属性，全局热键通过 `globalShortcut` 模块实现，系统托盘通过 `Tray` API 支持。数据持久化采用 `better-sqlite3`，比 electron-store 更适合结构化数据存储，支持复杂查询（如按频率排序、中文分词搜索）。

---

## 二·1、界面概览

```
┌──────────────────────────────────────────────────────────────────────┐
│  标题栏: Claude Code Shortcut          [—] [□] [×] (窗口控制按钮)     │
├──────────────────────────────────────────────────────────────────────┤
│  🔍  搜索命令行或中文释义...                          [🎨] [⚙️]      │
│  ─────────────────────────────────────────────────────────────────   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  #1  ⭐ git status                        使用 42 次    [📋复制]│   │
│  │       查看当前 Git 仓库状态                                   │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  #2       npm run dev                       使用 38 次    [📋复制]│   │
│  │       启动本地开发服务器                                      │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  #3       /plan                         使用 25 次    [📋复制]│   │
│  │       进入计划模式，分析代码库并生成实现方案                    │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  #4       cargo build                       使用 20 次    [📋复制]│   │
│  │       编译 Rust 项目                                          │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  #5       docker ps                         使用 15 次    [📋复制]│   │
│  │       查看运行中的 Docker 容器                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ── 已加载 47 条命令 · Ctrl+Shift+Space 唤起 · Esc 隐藏 ──           │
└──────────────────────────────────────────────────────────────────────┘

浮动主题面板（点击 🎨 按钮展开）:

  背景颜色   [  #1e1e2e  ]  ←── 点击弹出颜色选择器
  文字颜色   [  #cdd6f4  ]  ←── 点击弹出颜色选择器
  强调颜色   [  #89b4fa  ]  ←── 点击弹出颜色选择器
  ──────────────────────────
  窗口宽度   [────●────] 600px  (400~800)
  窗口高度   [──────●──] 500px  (300~700)
  ──────────────────────────
            [ 保存主题 ]  [ 重置默认 ]
```

**界面布局说明**：
- **标题栏**：应用名称 + 原生窗口控制按钮（最小化/最大化/关闭）
- **搜索栏**：顶部固定，支持命令关键字和中文释义实时搜索
- **快捷按钮区**：搜索栏右侧放置「🎨 主题」和「⚙️ 设置」按钮（首页可见）
- **命令列表区**：垂直滚动，命令按「收藏优先 → 使用频率降序」排列
- **命令卡片**：
  - 左侧显示序号、收藏星标、命令本身、使用次数
  - 右侧放置复制按钮，hover 时显示复制成功提示
- **状态栏**：底部固定，显示命令总数、全局热键提示
- **浮动主题面板**：点击 🎨 按钮从右侧滑出，可调整颜色和尺寸

---

## 二、核心功能

| 功能 | 描述 |
|------|------|
| **全局热键唤起** | `Ctrl+Shift+Space` 一键呼出/隐藏窗口 |
| **悬浮置顶** | 窗口始终显示在其他应用之上 |
| **命令列表** | 按使用频率降序展示，附带复制按钮 |
| **智能搜索** | 支持命令关键字 + 中文功能释义搜索 |
| **使用记录** | 自动记录每次复制命令的次数 |
| **主题定制** | 背景色、文字颜色可调，首页右侧悬浮按钮一键调整 |
| **窗口尺寸** | 宽度、高度可调整 |
| **系统托盘** | 最小化到托盘，后台驻留 |

---

## 三、技术架构

```
┌──────────────────────────────────────────────────────┐
│            渲染进程 (React + TypeScript)             │
│  ├── SearchBar       - 搜索框                        │
│  ├── CommandList     - 命令列表(按频率排序)          │
│  ├── CommandItem     - 单条命令(带复制按钮)          │
│  ├── SettingsPanel   - 设置面板(主题/尺寸)           │
│  └── StatusBar       - 状态栏(命令数/热键)           │
├──────────────────────────────────────────────────────┤
│          IPC 通信层 (contextBridge/ipcRenderer)       │
├──────────────────────────────────────────────────────┤
│            主进程 (Electron Main)                     │
│  ├── main.ts            - 入口，窗口创建              │
│  ├── preload.ts        - 安全桥接(contextBridge)    │
│  ├── database.ts       - SQLite 数据库初始化/连接   │
│  ├── ipc/commands.ts   - 命令增删改查+使用计数        │
│  ├── ipc/settings.ts   - 设置读写                    │
│  ├── ipc/clipboard.ts  - 剪贴板操作                   │
│  ├── tray.ts           - 系统托盘管理                 │
│  └── globalShortcut.ts - 全局热键注册                │
├──────────────────────────────────────────────────────┤
│               数据层 (SQLite 数据库)                  │
│  ├── commands 表   - id, command, description,        │
│  │                   usageCount, isFavorite,          │
│  │                   createdAt, updatedAt             │
│  └── settings 表   - key, value (JSON)               │
│  数据库路径: %APPDATA%/claude-code-shortcut/data.db  │
└──────────────────────────────────────────────────────┘
```

---

## 四、数据模型

### SQLite 数据库设计

```sql
-- 命令表
CREATE TABLE commands (
  id          TEXT PRIMARY KEY,     -- UUID
  command     TEXT NOT NULL,        -- "git status"
  description TEXT NOT NULL,        -- "查看当前Git仓库状态"
  usage_count INTEGER DEFAULT 0,    -- 使用次数
  is_favorite INTEGER DEFAULT 0,   -- 收藏标志 (0/1)
  created_at  INTEGER NOT NULL,     -- 创建时间戳 (Unix ms)
  updated_at  INTEGER NOT NULL      -- 更新时间戳 (Unix ms)
);

-- 设置表
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,          -- 设置项 key
  value TEXT NOT NULL              -- JSON 格式的 value
);

-- 索引: 加速搜索和排序
CREATE INDEX idx_commands_usage ON commands(usage_count DESC);
CREATE INDEX idx_commands_favorite ON commands(is_favorite DESC);
```

### TypeScript 类型映射

```typescript
interface Command {
  id: string;           // UUID
  command: string;      // "git status"
  description: string;  // "查看当前Git仓库状态"
  usageCount: number;   // 使用次数
  createdAt: number;    // 创建时间戳
  updatedAt: number;    // 更新时间戳
  isFavorite: boolean;  // 收藏标志
}

interface Settings {
  theme: {
    backgroundColor: string; // 默认 "#1e1e2e"
    textColor: string;       // 默认 "#cdd6f4"
    accentColor: string;     // 默认 "#89b4fa"
  };
  window: {
    width: number;   // 默认 600
    height: number;  // 默认 500
  };
  hotkeys: {
    summonApp: string; // 默认 "Ctrl+Shift+Space"
  };
  minimizeToTray: boolean; // 默认 true
}
```

---

## 五、文件结构

```
C:\Github\claudecode自研小工具\
├── src/                          # 渲染进程源码 (React + TypeScript)
│   ├── components/
│   │   ├── SearchBar.tsx             # 搜索栏组件
│   │   ├── CommandList.tsx           # 命令列表组件
│   │   ├── CommandItem.tsx           # 单条命令组件
│   │   ├── SettingsPanel.tsx        # 设置面板组件
│   │   ├── StatusBar.tsx             # 状态栏组件
│   │   └── ColorPicker.tsx           # 颜色选择器组件
│   ├── hooks/
│   │   ├── useCommands.ts            # 命令状态 Hook
│   │   ├── useSettings.ts            # 设置状态 Hook
│   │   └── useSearch.ts              # 搜索防抖 Hook
│   ├── types/
│   │   └── index.ts                  # 类型定义
│   ├── App.tsx                      # 根组件
│   ├── main.tsx                     # React 入口
│   └── index.css                    # 全局样式（Tailwind CSS）
├── electron/                      # 主进程源码
│   ├── main.ts                     # Electron 入口
│   ├── preload.ts                  # contextBridge 安全桥接
│   ├── database.ts                 # SQLite 数据库初始化/连接（better-sqlite3）
│   ├── ipc/
│   │   ├── commands.ts              # 命令 CRUD + 使用计数
│   │   └── settings.ts             # 设置读写
│   ├── tray.ts                     # 系统托盘管理
│   └── globalShortcut.ts           # 全局热键管理
├── resources/                     # 应用资源
│   └── icons/                     # 应用图标
├── package.json
├── vite.config.ts                 # Vite 配置
├── electron-builder.json          # 打包配置
├── tailwind.config.js
├── tsconfig.json
├── SPEC.md
└── README.md
```

---

## 六、实现步骤

### 阶段 1: 项目初始化
- [ ] 使用 `npm create electron-vite@latest` 创建 Electron + React + TypeScript 项目（Vite 构建）
- [ ] 安装依赖：`better-sqlite3`（SQLite 数据库）、`uuid`、`electron-log`
- [ ] 配置 Electron 主进程：`main.ts` 创建 BrowserWindow，设置 `alwaysOnTop: true`、`resizable: true`
- [ ] 配置 `preload.ts`：通过 `contextBridge.exposeInMainWorld` 暴露安全 IPC 接口
- [ ] 验证项目可运行：`npm run dev`

### 阶段 2: 数据层（SQLite）
- [ ] 安装 `better-sqlite3` 并配置 native 模块构建（electron-rebuild）
- [ ] 初始化 SQLite 数据库：创建 `commands` 和 `settings` 表及索引
- [ ] 创建 TypeScript 类型定义：`Command`、`Settings` 接口
- [ ] 实现命令 CRUD IPC 处理函数（增、删、改、查、按频率排序）
- [ ] 实现设置加载/保存/重置（settings 表 key-value 模式）
- [ ] 预置 50 条常用命令（见阶段 7 附录）
- [ ] 数据库路径放在 `%APPDATA%/claude-code-shortcut/data.db`

### 阶段 3: 前端核心 UI
- [ ] 构建 `App.tsx` 根组件：布局结构（搜索栏、列表、状态栏）
- [ ] 实现 `SearchBar.tsx`：带搜索图标的输入框，onChange 触发搜索
- [ ] 实现 `CommandList.tsx` + `CommandItem.tsx`：遍历显示命令列表
- [ ] 复制按钮功能：调用 `window.electronAPI.copyCommand()` + 通知主进程计数
- [ ] 键盘导航：↑↓ 键选择、Enter 键复制、Esc 键隐藏窗口

### 阶段 4: 搜索与过滤
- [ ] 搜索逻辑：同时匹配 `command`（命令本身）和 `description`（中文释义）
- [ ] 防抖 Hook（150ms）：避免频繁触发搜索
- [ ] 收藏命令置顶 + 其余按频率排序

### 阶段 5: 设置面板 + 首页主题快捷入口
- [ ] 首页右侧悬浮「🎨 主题」按钮，点击展开浮动主题面板
- [ ] 颜色选择器：`SettingsPanel.tsx` 内嵌背景色、文字色、强调色选择
- [ ] 窗口尺寸滑块：宽度（400-800px）、高度（300-700px）
- [ ] 实时应用：修改后立即刷新窗口样式和尺寸
- [ ] 设置持久化到 SQLite（settings 表）

### 阶段 6: 全局热键与系统托盘
- [ ] 注册 `Ctrl+Shift+Space` 全局热键（Electron `globalShortcut`）
- [ ] 热键触发：显示/隐藏 BrowserWindow
- [ ] 系统托盘（Tray）：最小化到托盘，托盘图标 + 右键菜单（显示/退出）
- [ ] 窗口关闭行为：隐藏到托盘而非退出

### 阶段 7: 预置命令（50 条）

#### Git 版本控制
| 命令 | 中文释义 |
|------|----------|
| `git status` | 查看 Git 仓库状态 |
| `git add .` | 添加所有更改到暂存区 |
| `git add -p` | 交互式添加部分更改 |
| `git commit -m ""` | 提交更改（需填写消息） |
| `git commit --amend` | 修改最后一次提交 |
| `git push` | 推送到远程仓库 |
| `git push -u origin ` | 推送并设置上游分支 |
| `git pull` | 拉取远程最新代码 |
| `git pull --rebase` | 变基方式拉取远程代码 |
| `git branch` | 查看本地分支 |
| `git branch -a` | 查看所有分支（含远程） |
| `git checkout ` | 切换分支 |
| `git checkout -b ` | 创建并切换新分支 |
| `git stash` | 暂存当前更改 |
| `git stash pop` | 恢复暂存的更改 |
| `git log --oneline` | 查看简略提交历史 |
| `git diff` | 查看未暂存的更改 |
| `git diff --cached` | 查看已暂存的更改 |
| `git reset --soft HEAD~1` | 撤销最后一次提交（保留更改） |
| `git rebase -i HEAD~3` | 交互式变基最近3次提交 |

#### Node.js / npm
| 命令 | 中文释义 |
|------|----------|
| `npm install` | 安装项目依赖 |
| `npm install ` | 安装指定包 |
| `npm install -D ` | 安装为开发依赖 |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run lint` | 运行代码检查 |
| `npm run test` | 运行测试 |
| `npm run format` | 格式化代码 |
| `npx ` | 使用本地 bin 目录的包 |
| `pnpm install` | 使用 pnpm 安装依赖 |
| `yarn install` | 使用 yarn 安装依赖 |

#### Rust / Cargo
| 命令 | 中文释义 |
|------|----------|
| `cargo build` | 编译 Rust 项目 |
| `cargo run` | 运行 Rust 项目 |
| `cargo test` | 运行 Rust 测试 |
| `cargo check` | 快速检查代码（不生成二进制） |
| `cargo fmt` | 格式化 Rust 代码 |
| `cargo clippy` | 运行 Rust linter |
| `cargo add ` | 添加 Rust 依赖 |

#### Claude Code 核心命令
| 命令 | 中文释义 |
|------|----------|
| `/plan` | 进入计划模式，分析代码库并生成实现方案 |
| `/debug` | 进入调试模式，诊断问题根因 |
| `/explore` | 探索代码库，了解项目结构和模式 |
| `/review` | 审查代码质量、安全性和最佳实践 |
| `/test` | 生成并运行测试用例 |
| `/search` | 在代码库中搜索关键字和模式 |
| `/read` | 读取并分析指定文件 |
| `/glob` | 按模式匹配文件路径 |
| `/grep` | 在文件中搜索文本内容 |
| `/write` | 创建或覆写文件 |
| `/edit` | 对文件进行精确修改 |
| `/bash` | 执行命令行命令 |
| `/WebFetch` | 获取并分析网页内容 |
| `/WebSearch` | 搜索网络获取最新信息 |
| `/AskUserQuestion` | 向用户提问以澄清需求 |

#### Docker / 系统
| 命令 | 中文释义 |
|------|----------|
| `docker ps` | 查看运行中的容器 |
| `docker ps -a` | 查看所有容器（含已停止） |
| `docker images` | 查看本地镜像 |
| `docker-compose up` | 启动 Docker Compose 服务 |
| `docker-compose down` | 停止 Docker Compose 服务 |
| `docker logs ` | 查看容器日志 |
| `docker exec -it  /bin/bash` | 进入容器终端 |
| `ipconfig` | 查看网络配置（Windows） |
| `ipconfig /flushdns` | 刷新 DNS 缓存 |
| `tasklist` | 查看运行中的进程 |
| `taskkill /F /IM ` | 强制结束指定进程 |

### 阶段 8: 构建发布
- [ ] 配置 `electron-builder`：Windows 打包（nsis 或 portable）
- [ ] 生成应用图标（256x256 PNG + ICO）
- [ ] 测试最终 exe 在干净环境运行

---

## 七、关键文件清单

| 文件路径 | 说明 |
|----------|------|
| `electron/main.ts` | Electron 主进程入口，创建 BrowserWindow，注册热键和托盘 |
| `electron/preload.ts` | contextBridge 安全桥接，暴露 IPC 方法到渲染进程 |
| `electron/database.ts` | SQLite 数据库初始化、表创建、连接管理（better-sqlite3） |
| `electron/tray.ts` | 系统托盘管理：图标、菜单、显示/隐藏窗口 |
| `electron/globalShortcut.ts` | 全局热键注册：Ctrl+Shift+Space 唤起/隐藏 |
| `electron/ipc/commands.ts` | 命令 CRUD、使用计数（SQLite 读写） |
| `electron/ipc/settings.ts` | 设置读写（SQLite settings 表 key-value） |
| `src/App.tsx` | React 根组件，布局结构，状态初始化，含主题面板展开/收起 |
| `src/components/SearchBar.tsx` | 搜索栏组件 |
| `src/components/CommandList.tsx` | 命令列表组件（按频率排序） |
| `src/components/CommandItem.tsx` | 单条命令：显示命令+描述+复制按钮+收藏 |
| `src/components/SettingsPanel.tsx` | 设置面板：颜色选择器、尺寸滑块 |
| `src/hooks/useCommands.ts` | 命令状态管理：加载、搜索、复制、计数 |

---

## 八、验证方案

1. **开发验证**：`npm run dev` 启动 Electron 开发模式，检查窗口置顶、搜索、复制功能
2. **数据库验证**：确认 `%APPDATA%/claude-code-shortcut/data.db` 文件已创建，包含 commands 和 settings 表，50 条预置命令已插入
3. **热键验证**：在任意应用中按 `Ctrl+Shift+Space` 唤出工具
4. **搜索验证**：输入命令关键字（如 "git"）和中文描述（如 "状态"）分别测试
5. **复制验证**：点击复制按钮后，粘贴到终端确认内容正确，使用次数 +1（数据库验证 usage_count 字段更新）
6. **主题验证**：调整背景色和文字颜色，窗口实时刷新，重启后设置仍保留（SQLite settings 表持久化）
7. **托盘验证**：关闭窗口后检查是否最小化到托盘，托盘图标右键菜单可用
8. **打包验证**：`npm run build` 生成 exe，在另一台无开发环境的机器上测试
