import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InputText } from './InputText';

describe('InputText', () => {
  it('AC-1: renders form-control with size classes', () => {
    render(<InputText aria-label="Name" size="sm" />);
    expect(screen.getByRole('textbox')).toHaveClass('form-control', 'ui-input-text', 'form-control-sm');
  });

  it('AC-2: controlled value with onChange(value) first', async () => {
    const onChange = vi.fn();
    function Controlled() {
      const [v, setV] = useState('');
      return <InputText aria-label="Name" value={v} onChange={(next, e) => { setV(next); onChange(next, e); }} />;
    }
    render(<Controlled />);
    await userEvent.type(screen.getByRole('textbox'), 'ab');
    expect(onChange).toHaveBeenLastCalledWith('ab', expect.anything());
    expect(screen.getByRole('textbox')).toHaveValue('ab');
  });

  it('AC-3: uncontrolled defaultValue', async () => {
    render(<InputText aria-label="Name" defaultValue="x" />);
    await userEvent.type(screen.getByRole('textbox'), 'y');
    expect(screen.getByRole('textbox')).toHaveValue('xy');
  });

  it('AC-4: invalid adds is-invalid and aria-invalid', () => {
    render(<InputText aria-label="Name" invalid />);
    expect(screen.getByRole('textbox')).toHaveClass('is-invalid');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('AC-5: prefix and suffix render in input-group', () => {
    const { container } = render(<InputText aria-label="Price" prefix="$" suffix=".00" />);
    expect(container.querySelector('.input-group')).toBeInTheDocument();
    expect(container.querySelectorAll('.input-group-text')).toHaveLength(2);
  });

  it('AC-6: clearable clears, emits empty string, refocuses, hides when empty', async () => {
    const onChange = vi.fn();
    render(<InputText aria-label="Search" defaultValue="abc" clearable onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenCalledWith('');
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });
});
