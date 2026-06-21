import { vi } from 'vitest';

// Smoke test: import this mock and verify evalTS is callable without CEP environment.
export const evalTS = vi.fn().mockResolvedValue({});

export const evalES = vi.fn().mockResolvedValue('');

export const evalFile = vi.fn().mockResolvedValue('');

export const csi = {
  getSystemPath: vi.fn().mockReturnValue(''),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  evalScript: vi.fn(),
  getApplicationID: vi.fn().mockReturnValue(''),
  getExtensionID: vi.fn().mockReturnValue(''),
  openURLInDefaultBrowser: vi.fn(),
};

export const listenTS = vi.fn();
export const dispatchTS = vi.fn();
export const initBolt = vi.fn();
export const openLinkInBrowser = vi.fn();
export const posix = (str: string) => str.replace(/\\/g, '/');
