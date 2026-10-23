import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox, CheckboxGroup } from './Checkbox';

describe('Checkbox', () => {
  it('AC-1: clicking label toggles and emits true', async () => {
    const onChange = vi.fn();
    render(<Checkbox label="Remember me" onChange={onChange} />);
    await userEvent.click(screen.getByText('Remember me'));
    expect(onChange).toHaveBeenCalledWith(true, expect.anything());
    expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeChecked();
  });

  it('AC-2: indeterminate sets DOM property', () => {
    render(<Checkbox label="All" indeterminate />);
    expect((screen.getByRole('checkbox') as HTMLInputElement).indeterminate).toBe(true);
  });

  it('AC-3: invalid adds is-invalid', () => {
    render(<Checkbox label="Terms" invalid />);
    expect(screen.getByRole('checkbox')).toHaveClass('is-invalid');
  });

  it('AC-4: CheckboxGroup emits array in option order and renders legend', async () => {
    const onChange = vi.fn();
    render(
      <CheckboxGroup
        legend="Notify me"
        options={[{ label: 'Email', value: 'email' }, { label: 'SMS', value: 'sms' }]}
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('group', { name: 'Notify me' })).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('SMS'));
    await userEvent.click(screen.getByLabelText('Email'));
    expect(onChange).toHaveBeenLastCalledWith(['email', 'sms']);
  });

  it('AC-5: disabled prevents toggling', async () => {
    const onChange = vi.fn();
    render(<Checkbox label="Off" disabled onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
