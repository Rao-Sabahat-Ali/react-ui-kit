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
});
