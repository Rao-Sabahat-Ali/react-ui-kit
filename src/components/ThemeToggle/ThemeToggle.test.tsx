import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  it('AC-1: toggles resolved theme via ThemeProvider', async () => {
    render(<ThemeProvider theme="light" storageKey={null}><ThemeToggle /></ThemeProvider>);
    const btn = screen.getByRole('button', { name: 'Dark mode' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveAttribute('data-bs-theme', 'dark');
  });

  it('AC-2: menu mode sets light/dark/system', async () => {
    const user = userEvent.setup();
    render(<ThemeProvider theme="light" storageKey={null}><ThemeToggle mode="menu" /></ThemeProvider>);
    const trigger = screen.getByRole('button', { name: 'Theme' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    await user.click(trigger);
    expect(screen.getByRole('menuitemradio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('menuitemradio', { name: 'Dark' }));
    expect(document.documentElement).toHaveAttribute('data-bs-theme', 'dark');
    // Radio items stay open on click (Menu AC-12); the checked state follows the theme.
    expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: 'Light' })).toHaveAttribute('aria-checked', 'false');
    await user.keyboard('{End}{Enter}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.documentElement).toHaveAttribute('data-bs-theme', 'light'); // system → prefers light in jsdom
    await user.click(trigger);
    expect(screen.getByRole('menuitemradio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
  });
});
