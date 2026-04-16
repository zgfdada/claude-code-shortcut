# Claude Code Shortcut 开发文档

## 项目概述

Claude Code Shortcut 是一个基于 **Electron + React + TypeScript** 的桌面 GUI 项目，用于管理常用命令、快速搜索/复制，并在 **Windows** 上支持将命令发送到已绑定终端。

当前版本已经完成一轮**最小改动的跨平台改造**：

1. **打包层补齐多平台配置**：Windows / Linux / macOS
2. **终端能力抽象为平台接口**：
   - Windows 复用现有 Win32 实现，继续支持绑定 / 发送 / 跟随
   - Linux / macOS 返回“不支持”，前端自动禁用对应按钮
3. **避免非 Windows 启动时加载 `user32.dll`**，从而保证 Linux / macOS 能正常启动 GUI

## 平台能力矩阵

| 平台 | GUI / 命令管理 | 终端列表 | 终端发送 | 跟随终端 | 当前状态 |
|------|----------------|----------|----------|----------|----------|
| Windows | 支持 | 支持 | 支持 | 支持 | 主路径，保留原功能 |
| Linux | 支持 | 不支持 | 不支持 | 不支持 | 已完成 GUI 与打包验证 |
| macOS | 支持 | 不支持 | 不支持 | 不支持 | 配置已补齐，待 macOS 实机复验 |

## 技术栈

- **桌面框架**：Electron 29.x
- **前端**：React 18.x
- **语言**：TypeScript 5.x
- **构建**：Vite 5.x + vite-plugin-electron
- **样式**：Tailwind CSS 3.x
- **数据库**：sql.js（SQLite WASM）
- **Windows 原生能力**：koffi + Win32 API
- **日志**：electron-log
- **打包**：electron-builder

## 目录结构

```text
├── code/
│   ├── src/                          # 渲染进程
│   │   ├── components/               # React 组件
│   │   ├── hooks/                    # 自定义 hooks
│   │   ├── types/                    # 共享类型
│   │   ├── App.tsx                   # 主界面
│   │   └── main.tsx                  # 渲染入口
│   │
│   ├── electron/                     # 主进程
│   │   ├── ipc/                      # IPC 处理器
│   │   │   ├── commands.ts
│   │   │   ├── settings.ts
│   │   │   └── terminal.ts           # 终端 IPC，依赖 terminal service
│   │   ├── terminal/                 # 终端平台抽象层
│   │   │   ├── createTerminalService.ts
│   │   │   ├── types.ts
│   │   │   ├── unsupportedTerminalService.ts
│   │   │   └── windowsTerminalService.ts
│   │   ├── database.ts               # sql.js 数据库读写
│   │   ├── globalShortcut.ts         # 全局快捷键
│   │   ├── main.ts                   # 主进程入口
│   │   ├── preload.ts                # 渲染桥接
│   │   ├── tray.ts                   # 托盘逻辑
│   │   └── winApi.ts                 # Win32 API 封装（仅 Windows service 使用）
│   │
│   ├── build/
│   │   ├── build.js                  # 生产构建入口
│   │   ├── dev.js                    # 开发模式入口
│   │   ├── preview.js                # 预览构建产物
│   │   └── vite.config.ts            # Vite 配置
│   │
│   └── resources/
│       └── icons/                    # Windows / Linux / macOS 图标资源
│
├── release/                          # electron-builder 输出目录
├── data.db                           # 项目默认数据库 / 开发环境数据库
├── README-USER.md                    # 用户文档
└── README-CODE.md                    # 开发文档
```

## 跨平台改造的关键点

## 1. 终端能力抽象

新增主进程 terminal service 层：

- `code/electron/terminal/types.ts`
- `code/electron/terminal/createTerminalService.ts`
- `code/electron/terminal/windowsTerminalService.ts`
- `code/electron/terminal/unsupportedTerminalService.ts`

其中：

- `windowsTerminalService.ts` 继续复用 `code/electron/winApi.ts` 中的 Win32 逻辑
- `unsupportedTerminalService.ts` 在 Linux / macOS 返回空列表、`false` 或受控错误
- `createTerminalService.ts` 通过 `process.platform` **动态加载** Windows 实现，避免非 Windows 平台在启动时 import `winApi.ts`

这是本次跨平台改造的核心：**把“能不能操作终端”变成能力判断，而不是让非 Windows 走到崩溃路径。**

## 2. IPC 保持兼容

现有终端 IPC 名称全部保留：

- `terminal:list`
- `terminal:send`
- `terminal:bind`
- `terminal:unbind`
- `terminal:follow`
- `terminal:getFollowState`

新增：

- `terminal:getCapabilities`

这样做的好处是：

- 旧的渲染层调用习惯基本不变
- 新平台差异通过 service + capability 消化
- Windows 行为保持稳定，改动面较小

## 3. 渲染层按 capability 自动降级

关键位置：

- `code/src/hooks/useTerminal.ts`
- `code/src/App.tsx`
- `code/src/types/index.ts`
- `code/electron/preload.ts`

流程：

1. preload 暴露 `getTerminalCapabilities()`
2. `useTerminal()` 初始化时读取 capability
3. 前端根据 capability 控制：
   - 是否允许打开终端选择器
   - 是否显示“发送”按钮
   - 是否允许启用“跟随”
   - 是否把“绑定终端”按钮置灰并显示原因

## 4. 打包层多平台适配

关键文件：

- `code/electron-builder.yml`
- `code/build/build.js`
- `code/electron/tray.ts`

当前配置：

- **Windows**：NSIS 安装包
- **Linux**：AppImage
- **macOS**：zip / dmg 配置

其中：

- `tray.ts` 会按平台优先选择不同图标格式
- `build.js` 会在打包前同步 `sql.js` 与 `koffi` 到 `code/build/node_modules`
- `electron-builder.yml` 显式声明 `electronVersion`，避免构建机无法自动识别 Electron 版本

## 开发与构建

### 1. 安装依赖

在项目根目录执行：

```bash
npm install
```

### 2. 开发模式

```bash
npm run dev
```

### 3. 生产构建

```bash
npm run build
```

构建流程由 `code/build/build.js` 驱动，主要步骤为：

1. 检查项目根目录 `data.db`
2. 执行 Vite 构建
3. 同步 `sql.js` 和 `koffi` 依赖到构建目录
4. 执行 `electron-builder`

### 4. 预览构建产物

```bash
npm run preview
```

## 打包输出

默认输出到 `release/` 目录，常见产物包括：

- `zgf-cmd-helper-Setup-<version>.exe`（Windows 安装包）
- `win-unpacked/`（Windows 免安装目录）
- `zgf的命令行辅助小工具-<version>.AppImage`（Linux）
- `linux-unpacked/`（Linux 免安装目录）
- `zgf的命令行辅助小工具-<version>-mac.zip`（macOS）
- `mac/`（macOS `.app` 目录）

## 数据与日志

- 数据库存储：`data.db`
- 日志文件：`app.log`

当前设计仍然保持“**数据跟随应用目录**”的思路：

- **开发模式**：默认使用项目根目录 `data.db`
- **打包模式**：应用包会携带 `data.db`

因此在分发 release 时，建议注意：

- 不要把调试过程中生成的 `app.log` 一起发布
- 如果不希望分发个人命令数据，请在打包前替换为干净的 `data.db`

## 终端实现说明（Windows）

Windows 终端能力依赖 `code/electron/winApi.ts`，主要使用：

1. `EnumWindows`：枚举终端窗口
2. `SendInput`：向目标窗口发送文本
3. `SetForegroundWindow`：激活目标窗口
4. `IsWindow`：检测绑定窗口是否仍然存在
5. 定时轮询：实现自动解绑与跟随模式

`windowsTerminalService.ts` 负责维护：

- 已绑定窗口句柄缓存
- 自动解绑定时器
- 跟随模式定时器
- 主进程向渲染进程发送 `terminal:closed`

## Linux / macOS 已知限制

### Linux AppImage

运行 AppImage 可能依赖：

- `libfuse2t64`
- 或 `libfuse2`

### Linux unpacked 目录

如果直接运行 `linux-unpacked/` 中的主程序，可能遇到 `chrome-sandbox` 权限问题，可临时使用：

```bash
./linux-unpacked/claude-code-shortcut-code --no-sandbox
```

### macOS

虽然已补齐打包配置并可生成 mac 产物，但：

- 最终运行验证仍建议在真实 macOS 环境完成
- 未签名应用在首次启动时可能被 Gatekeeper 阻止

## 回归验证建议

每次涉及终端、打包或 preload 改动时，建议至少验证以下场景：

### Windows

- 能正常列出终端窗口
- 绑定终端成功
- 命令可发送到终端
- 关闭终端后自动解绑
- 跟随模式能跟随最小化 / 恢复 / 焦点切换

### Linux / macOS

- 应用能正常启动
- 命令管理、搜索、收藏、主题等基础功能可用
- “绑定终端”按钮为禁用状态
- 不显示发送按钮或无法触发终端调用
- 不会因为终端模块而崩溃

## 关键文件索引

- `code/electron/main.ts`：主进程启动入口
- `code/electron/ipc/terminal.ts`：终端 IPC 注册
- `code/electron/terminal/createTerminalService.ts`：平台 service 分发
- `code/electron/terminal/windowsTerminalService.ts`：Windows 终端实现
- `code/electron/terminal/unsupportedTerminalService.ts`：非 Windows 占位实现
- `code/electron/winApi.ts`：Win32 API 封装
- `code/electron/tray.ts`：托盘和图标适配
- `code/build/build.js`：构建脚本
- `code/electron-builder.yml`：多平台打包配置
- `code/src/hooks/useTerminal.ts`：渲染层终端能力封装
- `code/src/App.tsx`：终端按钮启用/禁用逻辑
