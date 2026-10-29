import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from './Switch';

describe('Switch', () => {
  it('AC-1: renders form-switch with role switch', () => {
    const { container } = render(<Switch label="Show translations" />);
    expect(container.firstChild).toHaveClass('form-switch');
    expect(screen.getByRole('switch', { name: 'Show translations' })).toBeInTheDocument();
  });

  it('AC-2: toggle emits boolean', async () => {
    const onChange = vi.fn();
    render(<Switch label="Sound" onChange={onChange} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true, expect.anything());
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('AC-3: labelPosition start uses form-check-reverse', () => {
    const { container } = render(<Switch label="A" labelPosition="start" />);
    expect(container.firstChild).toHaveClass('form-check-reverse');
  });
});

describe('Switch (v2)', () => {
  it('AC-v2-1: the knob is a separate decorative part that slides over the track', async () => {
    const { container } = render(<Switch label="Notifications" />);
    const knob = container.querySelector('.ui-switch__knob')!;
    expect(knob).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByRole('switch')).toHaveLength(1);
    await userEvent.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch')).toBeChecked();
  });
});
