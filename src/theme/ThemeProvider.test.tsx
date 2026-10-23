import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider, themeScript, useTheme } from './ThemeProvider';

const html = () => document.documentElement;

function Probe() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button type="button" onClick={() => setTheme('dark')}>
      {resolvedTheme}
    </button>
  );
}

function mockPrefersDark(matches: boolean) {
  const listeners: ((e: { matches: boolean }) => void)[] = [];
  const mql = { matches, addEventListener: (_: string, l: () => void) => listeners.push(l), removeEventListener: vi.fn() };
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
  return {
    set(next: boolean) {
      mql.matches = next;
      listeners.forEach((l) => l({ matches: next }));
    },
  };
}

describe('ThemeProvider', () => {
  it('AC-1: sets theme and profile attributes; density only when given', () => {
    const { rerender } = render(<ThemeProvider profile="admin" theme="light"><span /></ThemeProvider>);
    expect(html()).toHaveAttribute('data-bs-theme', 'light');
    expect(html()).toHaveAttribute('data-ui-profile', 'admin');
    expect(html()).not.toHaveAttribute('data-ui-density');
    rerender(<ThemeProvider profile="admin" theme="light" density="spacious"><span /></ThemeProvider>);
    expect(html()).toHaveAttribute('data-ui-density', 'spacious');
  });

  it('AC-2: default theme comes from the profile', () => {
    mockPrefersDark(false);
    const { unmount } = render(<ThemeProvider profile="game"><span /></ThemeProvider>);
    expect(html()).toHaveAttribute('data-bs-theme', 'dark');
    unmount();
    render(<ThemeProvider profile="cms"><span /></ThemeProvider>);
    expect(html()).toHaveAttribute('data-bs-theme', 'light');
  });

  it('AC-3: system follows prefers-color-scheme live', () => {
    const media = mockPrefersDark(true);
    render(<ThemeProvider theme="system"><Probe /></ThemeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('dark');
    act(() => media.set(false));
    expect(screen.getByRole('button')).toHaveTextContent('light');
  });

  it('AC-4: setTheme persists and is restored on next mount', () => {
    mockPrefersDark(false);
    const { unmount } = render(<ThemeProvider theme="light"><Probe /></ThemeProvider>);
    act(() => screen.getByRole('button').click());
    expect(localStorage.getItem('ui:theme')).toBe('dark');
    unmount();
    render(<ThemeProvider theme="light"><Probe /></ThemeProvider>);
    expect(screen.getByRole('button')).toHaveTextContent('dark');
  });

  it('AC-4: storage errors are swallowed', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<ThemeProvider theme="light"><Probe /></ThemeProvider>);
    expect(() => act(() => screen.getByRole('button').click())).not.toThrow();
    spy.mockRestore();
  });

  it('AC-5: storageKey null disables persistence', () => {
    render(<ThemeProvider theme="light" storageKey={null}><Probe /></ThemeProvider>);
    act(() => screen.getByRole('button').click());
    expect(localStorage.length).toBe(0);
  });

  it('AC-6: useTheme outside provider throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(/inside <ThemeProvider>/);
  });

  it('AC-7: sets color-scheme', () => {
    render(<ThemeProvider theme="dark"><span /></ThemeProvider>);
    expect(html().style.colorScheme).toBe('dark');
  });

  it('themeScript embeds profile default and storage key', () => {
    const src = themeScript({ profile: 'game', storageKey: 'k' });
    expect(src).toContain('"k"');
    expect(src).toContain('"dark"');
    expect(src).toContain('"game"');
  });
});
