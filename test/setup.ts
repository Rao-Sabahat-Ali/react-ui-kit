import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('data-bs-theme');
  document.documentElement.removeAttribute('data-ui-profile');
  document.documentElement.removeAttribute('data-ui-density');
  document.body.removeAttribute('style');
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
});

// jsdom lacks matchMedia; components subscribe to prefers-* queries.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}
