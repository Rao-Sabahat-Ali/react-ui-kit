import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RadioGroup } from './RadioButton';

const options = [
  { label: 'Easy', value: 1 },
  { label: 'Medium', value: 2, description: 'Most common 3000 words' },
  { label: 'Hard', value: 3 },
];

describe('RadioGroup', () => {
  it('AC-1: fieldset with legend and shared name', () => {
    render(<RadioGroup legend="Level" options={options} />);
    expect(screen.getByRole('group', { name: 'Level' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(new Set(radios.map((r) => r.getAttribute('name'))).size).toBe(1);
  });

  it('AC-2: selecting emits typed value', async () => {
    const onChange = vi.fn();
    render(<RadioGroup legend="Level" options={options} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('Hard'));
    expect(onChange).toHaveBeenCalledWith(3);
    expect(screen.getByLabelText('Hard')).toBeChecked();
  });

  it('AC-3: description linked via aria-describedby', () => {
    render(<RadioGroup legend="Level" options={options} />);
    expect(screen.getByLabelText('Medium')).toHaveAccessibleDescription('Most common 3000 words');
  });

  it('arrow keys move selection (native)', async () => {
    const onChange = vi.fn();
    render(<RadioGroup legend="Level" options={options} defaultValue={1} onChange={onChange} />);
    screen.getByLabelText('Easy').focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
