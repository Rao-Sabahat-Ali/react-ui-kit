import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from './Chip';

describe('Chip', () => {
  it('AC-1: remove button is named "Remove {label}" and calls onRemove', async () => {
    const onRemove = vi.fn();
    render(<Chip label="Design" removable onRemove={onRemove} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Design' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('Delete on a focused interactive chip removes it', async () => {
    const onRemove = vi.fn();
    render(<Chip label="Design" removable onRemove={onRemove} onClick={() => {}} />);
    screen.getByRole('button', { name: 'Design' }).focus();
    await userEvent.keyboard('{Delete}');
    expect(onRemove).toHaveBeenCalled();
  });

  it('AC-2: clickable chip toggles aria-pressed (uncontrolled)', async () => {
    const onClick = vi.fn();
    render(<Chip label="Open" onClick={onClick} />);
    const btn = screen.getByRole('button', { name: 'Open' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('{Enter}');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('AC-2: controlled selected', async () => {
    const Harness = () => {
      const [on, setOn] = useState(true);
      return <Chip label="Mine" selected={on} onChange={setOn} />;
    };
    render(<Harness />);
    const btn = screen.getByRole('button', { name: 'Mine' });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('non-interactive chip has no toggle button', () => {
    render(<Chip label="Static" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Static')).toBeInTheDocument();
  });
});
