import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Topbar } from './Topbar';

describe('Topbar', () => {
  it('AC-1: banner landmark with slots and explicit menu toggle', async () => {
    const onMenuToggle = vi.fn();
    render(<Topbar brand="Svenska" onMenuToggle={onMenuToggle} actions={<button type="button">Settings</button>} />);
    expect(screen.getByRole('banner')).toHaveTextContent('Svenska');
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(onMenuToggle).toHaveBeenCalled();
  });

  it('AC-2: "/" focuses search unless typing in a field', async () => {
    render(<Topbar brand="S" search={<input aria-label="Search" />} actions={<input aria-label="Other" />} />);
    await userEvent.keyboard('/');
    expect(screen.getByLabelText('Search')).toHaveFocus();
    screen.getByLabelText('Other').focus();
    await userEvent.keyboard('/');
    expect(screen.getByLabelText('Other')).toHaveFocus();
    expect(screen.getByLabelText('Other')).toHaveValue('/');
  });

  it('no menu button without handler or shell sidebar', () => {
    render(<Topbar brand="S" />);
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull();
  });
});
