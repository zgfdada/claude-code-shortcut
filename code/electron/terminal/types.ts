import type { TerminalCapabilities, TerminalWindow } from '../../src/types';

export interface TerminalState {
  isFollowing: boolean;
  boundHwnd: string | null;
}

export interface TerminalService {
  getCapabilities(): TerminalCapabilities;
  listWindows(): Promise<TerminalWindow[]>;
  sendText(hwnd: string, text: string): Promise<void>;
  bind(hwnd: string, autoEnableFollow?: boolean): Promise<boolean>;
  unbind(): Promise<boolean>;
  setFollowMode(enable: boolean): Promise<boolean>;
  getFollowState(): Promise<TerminalState>;
  cleanup(): void;
}
