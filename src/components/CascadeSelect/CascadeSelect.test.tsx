import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Field } from '../Field/Field';
import { CascadeSelect, type CascadeOption } from './CascadeSelect';

const places: CascadeOption<string>[] = [
  {
    label: 'Sweden',
    children: [
      { label: 'Stockholm County', children: [{ label: 'Stockholm', value: 'sto' }, { label: 'Solna', value: 'sol' }] },
      { label: 'Skåne', children: [{ label: 'Malmö', value: 'mmx' }, { label: 'Lund', value: 'lnd' }] },
    ],
  },
  { label: 'Pakistan', children: [{ label: 'Lahore', value: 'lhe' }, { label: 'Karachi', value: 'khi', disabled: true }] },
  { label: 'Anywhere', value: 'any' },
];

const trigger = () => screen.getByRole('combobox');
const active = () => {
  const id = trigger().getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};
const activeLabel = () => active()?.querySelector('.ui-cascade-select__label')?.textContent;

describe('CascadeSelect', () => {
  it('AC-1: group items open sub-panels; leaves select and close', async () => {
    const onChange = vi.fn();
    render(<CascadeSelect aria-label="Place" options={places} onChange={onChange} />);
    await userEvent.click(trigger());
    expect(screen.getByRole('tree')).toBeInTheDocument();
    const sweden = screen.getByRole('treeitem', { name: 'Sweden' });
    expect(sweden).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(screen.getByText('Sweden'));
    expect(sweden).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByText('Skåne'));
    await userEvent.click(screen.getByText('Lund'));
    expect(onChange).toHaveBeenCalledWith('lnd');
    expect(screen.queryByRole('tree')).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it('AC-2: keyboard navigation between levels', async () => {
    const onChange = vi.fn();
    render(<CascadeSelect aria-label="Place" options={places} onChange={onChange} />);
    trigger().focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(activeLabel()).toBe('Sweden');
    await userEvent.keyboard('{ArrowDown}');
    expect(activeLabel()).toBe('Pakistan');
    await userEvent.keyboard('{ArrowRight}');
    expect(activeLabel()).toBe('Lahore');
    expect(screen.getByRole('treeitem', { name: 'Pakistan' })).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{ArrowDown}');
    expect(activeLabel()).toBe('Lahore'); // Karachi disabled
    await userEvent.keyboard('{ArrowLeft}');
    expect(activeLabel()).toBe('Pakistan');
    await userEvent.keyboard('{ArrowUp}{Enter}');
    expect(activeLabel()).toBe('Stockholm County');
    await userEvent.keyboard('{Enter}');
    expect(activeLabel()).toBe('Stockholm');
    expect(active()).toHaveAttribute('aria-level', '3');
    await userEvent.keyboard('{End}{Enter}');
    expect(onChange).toHaveBeenCalledWith('sol');
    expect(screen.queryByRole('tree')).toBeNull();
    await userEvent.keyboard('{ArrowDown}');
    expect(activeLabel()).toBe('Solna'); // reopens at the selected leaf
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('tree')).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it('AC-3: displays the selected leaf label in the trigger', () => {
    render(
      <Field label="Place">
        <CascadeSelect options={places} defaultValue="mmx" />
      </Field>,
    );
    expect(screen.getByRole('combobox', { name: /Place/ })).toHaveTextContent('Malmö');
  });
});
