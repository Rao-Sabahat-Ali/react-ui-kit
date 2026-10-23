import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ToggleButton } from './ToggleButton';

describe('ToggleButton', () => {
  it('AC-1: click toggles and aria-pressed reflects state', async () => {
    const onChange = vi.fn();
    render(<ToggleButton offLabel="Bold" onChange={onChange} />);
    const button = screen.getByRole('button', { name: 'Bold' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveClass('active');
    expect(onChange).toHaveBeenLastCalledWith(true, expect.anything());
    button.focus();
    await userEvent.keyboard(' ');
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('AC-1: controlled pressed follows the prop', async () => {
    function Harness() {
      const [p, setP] = useState(true);
      return <ToggleButton offLabel="Mute" pressed={p} onChange={setP} />;
    }
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Mute' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('AC-2: label and icon swap per state with a stable accessible name', async () => {
    const { container } = render(<ToggleButton offLabel="Follow" onLabel="Following" offIcon="plus" onIcon="check" />);
    const button = screen.getByRole('button', { name: 'Follow' });
    expect(button).toHaveTextContent('Follow');
    const offPath = container.querySelector('svg path')?.getAttribute('d');
    await userEvent.click(button);
    expect(button).toHaveTextContent('Following');
    expect(button).toHaveAccessibleName('Follow');
    expect(container.querySelector('svg path')?.getAttribute('d')).not.toBe(offPath);
  });

  it('icon-only toggle uses aria-label', () => {
    render(<ToggleButton aria-label="Favourite" offIcon="star" onIcon="star-filled" />);
    expect(screen.getByRole('button', { name: 'Favourite' })).toBeInTheDocument();
  });

  it('disabled does not toggle', async () => {
    render(<ToggleButton offLabel="Locked" disabled />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });
});
