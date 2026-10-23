import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MultiStateCheckbox } from './MultiStateCheckbox';

const options = [
  { value: 'public', label: 'Public', icon: 'eye' },
  { value: 'private', label: 'Private' },
  { value: 'shared', label: 'Shared' },
];

describe('MultiStateCheckbox', () => {
  it('AC-1: click cycles through options and null when empty', async () => {
    const onChange = vi.fn();
    render(<MultiStateCheckbox label="Visibility" options={options} onChange={onChange} />);
    const button = screen.getByRole('button');
    for (let i = 0; i < 4; i++) await userEvent.click(button);
    expect(onChange.mock.calls.map((c) => c[0])).toEqual(['public', 'private', 'shared', null]);
  });

  it('AC-1: empty=false skips the null state', async () => {
    const onChange = vi.fn();
    render(<MultiStateCheckbox label="Visibility" options={options} empty={false} defaultValue="shared" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenLastCalledWith('public', expect.anything());
  });

  it('AC-1: Space cycles', async () => {
    render(<MultiStateCheckbox label="Visibility" options={options} />);
    screen.getByRole('button').focus();
    await userEvent.keyboard(' ');
    expect(screen.getByRole('button')).toHaveAccessibleName('Visibility: Public');
  });

  it('AC-2: accessible name reflects current state', async () => {
    render(<MultiStateCheckbox label="Visibility" options={options} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleName('Visibility: None');
    await userEvent.click(button);
    expect(button).toHaveAccessibleName('Visibility: Public');
    await userEvent.click(button);
    expect(button).toHaveAccessibleName('Visibility: Private');
    expect(button).toHaveTextContent('Private');
  });

  it('controlled value drives the state', () => {
    render(<MultiStateCheckbox label="Visibility" options={options} value="shared" />);
    expect(screen.getByRole('button')).toHaveAccessibleName('Visibility: Shared');
  });
});
