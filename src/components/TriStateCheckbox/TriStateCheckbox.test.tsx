import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TriStateCheckbox, type TriState } from './TriStateCheckbox';

describe('TriStateCheckbox', () => {
  it('AC-1: cycles null -> true -> false -> null on click', async () => {
    const onChange = vi.fn();
    render(<TriStateCheckbox label="Active" onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: 'Active' });
    await userEvent.click(box);
    await userEvent.click(box);
    await userEvent.click(box);
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([true, false, null]);
  });

  it('AC-1: Space cycles, Enter does not', async () => {
    render(<TriStateCheckbox label="Active" defaultValue={true} />);
    const box = screen.getByRole('checkbox');
    box.focus();
    await userEvent.keyboard('{Enter}');
    expect(box).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard(' ');
    expect(box).toHaveAttribute('aria-checked', 'false');
  });

  it('AC-1: clicking the label cycles', async () => {
    render(<TriStateCheckbox label="Active" />);
    await userEvent.click(screen.getByText('Active'));
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  });

  it('AC-2: aria-checked matches state, mixed for null', async () => {
    function Harness() {
      const [v, setV] = useState<TriState>(null);
      return <TriStateCheckbox label="Active" value={v} onChange={setV} />;
    }
    render(<Harness />);
    const box = screen.getByRole('checkbox');
    expect(box).toHaveAttribute('aria-checked', 'mixed');
    await userEvent.click(box);
    expect(box).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(box);
    expect(box).toHaveAttribute('aria-checked', 'false');
  });

  it('labels describe the current state for assistive technology', async () => {
    render(<TriStateCheckbox label="Active" labels={{ null: 'Any', true: 'Yes', false: 'No' }} />);
    const box = screen.getByRole('checkbox');
    expect(box).toHaveAccessibleDescription('Any');
    await userEvent.click(box);
    expect(box).toHaveAccessibleDescription('Yes');
  });

  it('disabled does not cycle', async () => {
    render(<TriStateCheckbox label="Active" disabled />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed');
  });
});

describe('TriStateCheckbox (v2)', () => {
  it('AC-v2-1: the mark is drawn in only after the user changes the state', async () => {
    const { container } = render(<TriStateCheckbox label="Active" />);
    expect(container.querySelector('.ui-tri-state-checkbox__mark--draw')).toBeNull();
    await userEvent.click(screen.getByRole('checkbox'));
    expect(container.querySelector('.ui-tri-state-checkbox__mark--draw')).toBeInTheDocument();
  });
});
