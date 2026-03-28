import koffi from 'koffi';
import log from 'electron-log';

const user32 = koffi.load('user32.dll');

// 定义 callback 类型（模块级别只定义一次）
const EnumProc = koffi.proto('int __stdcall EnumProcCCS(void* hWnd, intptr_t lParam)');

const EnumWindows = user32.func('bool EnumWindows(EnumProcCCS* lpEnumFunc, intptr_t lParam)');
const GetClassNameW = user32.func('int GetClassNameW(void* hWnd, char16_t* lpClassName, int nMaxCount)');
const GetWindowTextW = user32.func('int GetWindowTextW(void* hWnd, char16_t* lpWindowText, int nMaxCount)');
const IsWindowVisible = user32.func('bool IsWindowVisible(void* hWnd)');
const SetForegroundWindow = user32.func('bool SetForegroundWindow(void* hWnd)');
const SendInput = user32.func('uint32 SendInput(uint32 nInputs, void* pInputs, int cbSize)');
const IsWindow = user32.func('bool IsWindow(void* hWnd)');
const GetWindowRect = user32.func('bool GetWindowRect(void* hWnd, _Out_ int32_t* lpRect)');
const SetWindowPos = user32.func('bool SetWindowPos(void* hWnd, void* hWndInsertAfter, int X, int Y, int cx, int cy, uint32_t uFlags)');
const IsIconic = user32.func('bool IsIconic(void* hWnd)');
const GetForegroundWindow = user32.func('void* GetForegroundWindow()');

// SetWindowPos 标志
const SWP_NOSIZE = 0x0001;
const SWP_NOZORDER = 0x0004;
const SWP_SHOWWINDOW = 0x0040;
const HWND_TOPMOST = -1;

const KEYEVENTF_UNICODE = 0x0004;
const KEYEVENTF_KEYUP = 0x0002;
const INPUT_SIZE = 40; // x64: sizeof(INPUT) = 40 bytes

const CONSOLE_CLASS_NAMES = new Set([
  'ConsoleWindowClass',
  'CASCADIA_HOSTING_WINDOW_CLASS',
]);

export interface CmdWindow {
  hwnd: object;
  hwndStr: string;
  title: string;
  className: string;
}

function readUtf16(buf: Buffer): string {
  return buf.toString('utf16le').replace(/\0.*/, '').trim();
}

// 构造单个 INPUT 结构（x64, 40 bytes）
function makeKeyInput(wScan: number, flags: number): Buffer {
  const buf = Buffer.alloc(INPUT_SIZE, 0);
  buf.writeUInt32LE(1, 0);           // type = INPUT_KEYBOARD
  buf.writeUInt16LE(0, 8);           // wVk = 0
  buf.writeUInt16LE(wScan, 10);      // wScan = unicode char
  buf.writeUInt32LE(flags, 12);      // dwFlags
  buf.writeUInt32LE(0, 16);          // time = 0
  buf.writeBigUInt64LE(0n, 24);      // dwExtraInfo = 0
  return buf;
}

export function enumCmdWindows(): CmdWindow[] {
  const results: CmdWindow[] = [];
  const allClassNames = new Set<string>();

  EnumWindows((hwnd: object, _lParam: unknown) => {
    try {
      const classBuf = Buffer.alloc(512);
      const classLen = GetClassNameW(hwnd, classBuf, 256) as number;
      const className = classLen > 0 ? readUtf16(classBuf) : '';
      if (!className) return 1;
      if (!(IsWindowVisible(hwnd) as boolean)) return 1;

      allClassNames.add(className);

      if (CONSOLE_CLASS_NAMES.has(className)) {
        const titleBuf = Buffer.alloc(512);
        GetWindowTextW(hwnd, titleBuf, 256);
        const title = readUtf16(titleBuf);
        if (title) {
          // hwnd 是 koffi 的 opaque pointer，序列化用 koffi.address
          const hwndStr = String(koffi.address(hwnd));
          results.push({ hwnd, hwndStr, title, className });
          log.info(`[winApi] 找到终端: class="${className}" title="${title}" addr=${hwndStr}`);
        }
      }
    } catch (e) {
      log.error('[winApi] callback error:', e);
    }
    return 1;
  }, 0);

  log.info(`[winApi] 枚举完成，类名: ${[...allClassNames].sort().join(', ')}`);
  log.info(`[winApi] 找到 ${results.length} 个终端窗口`);

  return results;
}

export function isWindowValid(hwnd: object): boolean {
  try {
    return IsWindow(hwnd) as boolean;
  } catch (error) {
    log.error('[winApi] IsWindow 检查失败:', error);
    return false;
  }
}

export interface WindowRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export function getWindowRect(hwnd: object): WindowRect | null {
  try {
    const rectBuf = Buffer.alloc(16); // 4个int32
    const result = GetWindowRect(hwnd, rectBuf) as boolean;
    if (!result) {
      log.warn('[winApi] GetWindowRect 失败');
      return null;
    }

    const left = rectBuf.readInt32LE(0);
    const top = rectBuf.readInt32LE(4);
    const right = rectBuf.readInt32LE(8);
    const bottom = rectBuf.readInt32LE(12);

    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  } catch (error) {
    log.error('[winApi] GetWindowRect 出错:', error);
    return null;
  }
}

export function isWindowMinimized(hwnd: object): boolean {
  try {
    return IsIconic(hwnd) as boolean;
  } catch (error) {
    log.error('[winApi] IsIconic 检查失败:', error);
    return false;
  }
}

export function isWindowForeground(hwnd: object): boolean {
  try {
    const foregroundHwnd = GetForegroundWindow() as object;
    const isForeground = koffi.address(foregroundHwnd) === koffi.address(hwnd);
    return isForeground;
  } catch (error) {
    log.error('[winApi] GetForegroundWindow 检查失败:', error);
    return false;
  }
}

export function positionWindowBeside(
  targetHwnd: object,
  toolWindow: Electron.BrowserWindow,
  offsetX: number = 0
): void {
  const targetRect = getWindowRect(targetHwnd);
  if (!targetRect) {
    log.warn('[winApi] 无法获取终端窗口位置');
    return;
  }

  // 检查终端是否最小化
  if (isWindowMinimized(targetHwnd)) {
    // 如果终端最小化，小工具也隐藏
    toolWindow.hide();
    return;
  }

  // 如果小工具被隐藏了，重新显示
  if (!toolWindow.isVisible()) {
    toolWindow.show();
  }

  // 获取小工具当前大小
  const [toolWidth, toolHeight] = toolWindow.getSize();

  // 计算新位置：终端右侧 + offsetX，顶部对齐
  const newX = targetRect.right + offsetX;
  const newY = targetRect.top;

  // 确保不超出屏幕右边界（简单处理：如果超出则显示在左侧）
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const screenWidth = primaryDisplay.workAreaSize.width;

  let finalX = newX;
  let finalY = newY;

  if (newX + toolWidth > screenWidth) {
    // 显示在终端左侧
    finalX = targetRect.left - toolWidth - offsetX;
  }

  // 确保不超出屏幕底部
  const screenHeight = primaryDisplay.workAreaSize.height;
  if (finalY + toolHeight > screenHeight) {
    finalY = screenHeight - toolHeight - 10;
  }

  // 设置小工具位置（不改变大小，保持置顶）
  toolWindow.setPosition(Math.round(finalX), Math.round(finalY));
  log.info(`[winApi] 跟随模式：小工具位置更新为 (${finalX}, ${finalY})`);
}

export function sendTextToCmd(hwnd: object, text: string): void {
  log.info(`[winApi] 发送到终端: "${text}"`);

  // 检查窗口是否仍然有效
  if (!isWindowValid(hwnd)) {
    log.error('[winApi] 终端窗口已关闭，无法发送文本');
    throw new Error('终端窗口已关闭');
  }

  if (!SetForegroundWindow(hwnd)) {
    log.warn('[winApi] SetForegroundWindow returned false');
  }

  // 等待窗口激活，不做 restore/resize，避免改动用户手动调整后的终端尺寸
  const start = Date.now();
  while (Date.now() - start < 300) { /* spin */ }

  // 用 SendInput 逐字符注入 Unicode
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const down = makeKeyInput(code, KEYEVENTF_UNICODE);
    const up = makeKeyInput(code, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP);
    const buf = Buffer.concat([down, up]);
    const sent = SendInput(2, buf, INPUT_SIZE) as number;
    if (sent !== 2) {
      log.warn(`[winApi] SendInput 未完整发送，字符=${JSON.stringify(char)} sent=${sent}`);
    }
  }

  log.info(`[winApi] 发送完成: ${[...text].length} 字符`);
}
