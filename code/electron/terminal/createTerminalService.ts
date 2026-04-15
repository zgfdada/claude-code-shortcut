import type { TerminalService } from './types';
import { unsupportedTerminalService } from './unsupportedTerminalService';

let servicePromise: Promise<TerminalService> | null = null;

export function getTerminalService(): Promise<TerminalService> {
  if (!servicePromise) {
    servicePromise = (async () => {
      if (process.platform === 'win32') {
        const mod = await import('./windowsTerminalService');
        return mod.windowsTerminalService;
      }
      return unsupportedTerminalService;
    })();
  }

  return servicePromise;
}
