import type { TerminalService } from './types';

const unsupportedState = {
  isFollowing: false,
  boundHwnd: null,
};

export const unsupportedTerminalService: TerminalService = {
  getCapabilities() {
    return {
      supported: false,
      canListWindows: false,
      canBind: false,
      canSendText: false,
      canFollow: false,
      reason: '当前平台暂不支持终端绑定与发送功能',
    };
  },

  async listWindows() {
    return [];
  },

  async sendText() {
    throw new Error('当前平台暂不支持终端发送功能');
  },

  async bind() {
    return false;
  },

  async unbind() {
    return true;
  },

  async setFollowMode() {
    return false;
  },

  async getFollowState() {
    return unsupportedState;
  },

  cleanup() {
    // no-op
  },
};
