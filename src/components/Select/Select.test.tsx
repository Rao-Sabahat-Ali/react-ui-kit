import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Field } from '../Field/Field';
import { Select, type Option } from './Select';

const fruits: Option<string>[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana', disabled: true },
  { label: 'Blueberry', value: 'blueberry' },
  { label: 'Cherry', value: 'cherry' },
];

const listbox = () => screen.getByRole('listbox');
const active = () => {
  const id = screen.getByRole('combobox').getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};

describe('Select', () => {
  it('AC-1: trigger is a combobox labelled by Field', () => {
    render(<Field label="Fruit"><Select options={fruits} /></Field>);
    expect(screen.getByRole('combobox', { name: /Fruit/ })).toBeInTheDocument();
  });

  it('AC-2: click opens, selecting emits value, closes and refocuses trigger', async () => {
    const onChange = vi.fn();
    render(<Select aria-label="Fruit" options={fruits} onChange={onChange} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(within(listbox()).getByRole('option', { name: 'Cherry' }));
    expect(onChange).toHaveBeenCalledWith('cherry');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('combobox')).toHaveFocus();
    expect(screen.getByRole('combobox')).toHaveTextContent('Cherry');
  });

  it('AC-3: arrows move active descendant, Enter selects, Escape closes without change', async () => {
    const onChange = vi.fn();
    render(<Select aria-label="Fruit" options={fruits} onChange={onChange} />);
    screen.getByRole('combobox').focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(active()).toHaveTextContent('Apple');
    await userEvent.keyboard('{ArrowDown}');
    expect(active()).toHaveTextContent('Blueberry');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('blueberry');
  });

  it('AC-4: typeahead jumps to matching option', async () => {
    render(<Select aria-label="Fruit" options={fruits} />);
    screen.getByRole('combobox').focus();
    await userEvent.keyboard('{ArrowDown}c');
    expect(active()).toHaveTextContent('Cherry');
  });

  it('AC-5: disabled options are skipped and not selectable', async () => {
    const onChange = vi.fn();
    render(<Select aria-label="Fruit" options={fruits} onChange={onChange} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: 'Banana' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('option', { name: 'Banana' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('AC-6: filter narrows options and shows empty message', async () => {
    render(<Select aria-label="Fruit" options={fruits} filter emptyMessage="Nothing" />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Fruit' }));
    const input = screen.getByRole('combobox', { name: 'Filter' });
    expect(input).toHaveFocus();
    await userEvent.type(input, 'BLUE');
    expect(within(listbox()).getAllByRole('option')).toHaveLength(1);
    await userEvent.clear(input);
    await userEvent.type(input, 'zzz');
    expect(screen.getByText('Nothing')).toBeInTheDocument();
  });

  it('AC-7: native mode renders select.form-select and emits typed values', async () => {
    const onChange = vi.fn();
    const numbers: Option<number>[] = [{ label: 'One', value: 1 }, { label: 'Two', value: 2 }];
    render(<Select aria-label="Number" native options={numbers} onChange={onChange} />);
    const select = screen.getByRole('combobox', { name: 'Number' });
    expect(select.tagName).toBe('SELECT');
    expect(select).toHaveClass('form-select');
    await userEvent.selectOptions(select, 'Two');
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('AC-8: clearable resets to null', async () => {
    const onChange = vi.fn();
    render(<Select aria-label="Fruit" options={fruits} defaultValue="apple" clearable onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('AC-9: clicking outside closes', async () => {
    render(<><button type="button">outside</button><Select aria-label="Fruit" options={fruits} /></>);
    await userEvent.click(screen.getByRole('combobox'));
    expect(listbox()).toBeInTheDocument();
    await userEvent.click(screen.getByText('outside'));
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('renders groups as headers', async () => {
    render(<Select aria-label="Food" options={[{ label: 'Fruit', options: [{ label: 'Apple', value: 'a' }] }]} />);
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Fruit')).toHaveClass('dropdown-header');
  });
});

describe('Select (v2) presence', () => {
  afterEach(() => {
    delete (document as { getAnimations?: unknown }).getAnimations;
  });

  it('AC-v2-1: the panel is a lifted overlay that stays mounted and inert while it leaves', async () => {
    (document as { getAnimations?: unknown }).getAnimations = () => [];
    render(<Select aria-label="Fruit" options={fruits} />);
    await userEvent.click(screen.getByRole('combobox'));
    const panel = listbox().closest('.ui-select__panel')!;
    expect(panel).toHaveAttribute('data-state', 'open');
    await userEvent.keyboard('{Escape}');
    expect(panel).toHaveAttribute('data-state', 'closed');
    expect(panel).toHaveAttribute('inert');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
  });

  it('AC-v2-2: without animation support the panel unmounts at once', async () => {
    render(<Select aria-label="Fruit" options={fruits} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
