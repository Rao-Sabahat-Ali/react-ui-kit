import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Field } from '../Field/Field';
import type { Option } from '../Select/Select';
import { ListBox } from './ListBox';

const cities: Option<string>[] = [
  { label: 'Amsterdam', value: 'ams' },
  { label: 'Berlin', value: 'ber' },
  { label: 'Copenhagen', value: 'cph', disabled: true },
  { label: 'Dublin', value: 'dub' },
  { label: 'Edinburgh', value: 'edi' },
];

const active = () => {
  const id = screen.getByRole('listbox').getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};

function Multi({ onChange }: { onChange: (v: string[]) => void }) {
  const [value, setValue] = useState<string[]>([]);
  return (
    <ListBox
      aria-label="Cities"
      multiple
      options={cities}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe('ListBox', () => {
  it('AC-1: single selection via click and Enter emits value', async () => {
    const onChange = vi.fn();
    render(
      <Field label="City">
        <ListBox options={cities} onChange={onChange} />
      </Field>,
    );
    const list = screen.getByRole('listbox', { name: 'City' });
    expect(list).not.toHaveAttribute('aria-multiselectable');
    await userEvent.click(screen.getByRole('option', { name: 'Berlin' }));
    expect(onChange).toHaveBeenLastCalledWith('ber');
    expect(screen.getByRole('option', { name: 'Berlin' })).toHaveAttribute('aria-selected', 'true');
    expect(list).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(active()).toHaveTextContent('Dublin'); // disabled Copenhagen skipped
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('dub');
    await userEvent.keyboard('{Home}');
    expect(active()).toHaveTextContent('Amsterdam');
    await userEvent.keyboard('e');
    expect(active()).toHaveTextContent('Edinburgh');
    await userEvent.click(screen.getByRole('option', { name: 'Copenhagen' }));
    expect(onChange).not.toHaveBeenCalledWith('cph');
  });

  it('AC-2: multiple selection with Space, Shift+Arrow and Ctrl+A', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Multi onChange={onChange} />);
    const list = screen.getByRole('listbox');
    expect(list).toHaveAttribute('aria-multiselectable', 'true');
    act(() => list.focus());
    expect(active()).toHaveTextContent('Amsterdam');
    await user.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith(['ams']);
    await user.keyboard('{Shift>}{ArrowDown}{/Shift}');
    expect(onChange).toHaveBeenLastCalledWith(['ams', 'ber']);
    await user.keyboard('{End} ');
    expect(onChange).toHaveBeenLastCalledWith(['ams', 'ber', 'edi']);
    await user.keyboard('{Home} ');
    expect(onChange).toHaveBeenLastCalledWith(['ber', 'edi']);
    await user.keyboard('{Control>}a{/Control}');
    expect(onChange).toHaveBeenLastCalledWith(['ams', 'ber', 'dub', 'edi']);
    await user.keyboard('{Control>}a{/Control}');
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('AC-3: filter narrows options', async () => {
    render(<ListBox aria-label="Cities" options={cities} filter emptyMessage="None" />);
    const input = screen.getByRole('combobox', { name: 'Filter' });
    await userEvent.type(input, 'DU');
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Dublin']);
    await userEvent.keyboard('{ArrowDown}');
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Dublin' }).id);
    await userEvent.clear(input);
    await userEvent.type(input, 'zzz');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('AC-4: virtual mode renders only visible items with aria-setsize/posinset', async () => {
    const many: Option<number>[] = Array.from({ length: 1000 }, (_, i) => ({ label: `Item ${i + 1}`, value: i }));
    render(<ListBox aria-label="Items" options={many} virtual={{ itemHeight: 32 }} listHeight="320px" />);
    const rendered = screen.getAllByRole('option');
    expect(rendered.length).toBeLessThan(30);
    expect(rendered[0]).toHaveAttribute('aria-posinset', '1');
    expect(rendered[0]).toHaveAttribute('aria-setsize', '1000');
    act(() => screen.getByRole('listbox').focus());
    await userEvent.keyboard('{End}');
    const last = active();
    expect(last).toHaveTextContent('Item 1000');
    expect(last).toHaveAttribute('aria-posinset', '1000');
    expect(screen.getAllByRole('option').length).toBeLessThan(30);
  });

  it('renders groups as role=group labelled by the group name', () => {
    render(<ListBox aria-label="Food" options={[{ label: 'Fruit', options: [{ label: 'Apple', value: 'a' }] }]} />);
    expect(screen.getByRole('group', { name: 'Fruit' })).toContainElement(screen.getByRole('option', { name: 'Apple' }));
  });
});
