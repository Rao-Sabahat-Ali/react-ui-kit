import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PickList, type PickListChange, type PickListProps } from './PickList';

interface Item {
  id: number;
  name: string;
}
const make = (names: string[], start = 1): Item[] => names.map((name, i) => ({ id: start + i, name }));

function Harness(props: Partial<PickListProps<Item>>) {
  const [state, setState] = useState<PickListChange<Item>>({ source: make(['Apple', 'Banana', 'Cherry']), target: make(['Date'], 10) });
  return (
    <PickList
      sourceHeader="Source"
      targetHeader="Target"
      itemTemplate={(i) => i.name}
      {...props}
      source={state.source}
      target={state.target}
      onChange={(v) => {
        setState(v);
        props.onChange?.(v);
      }}
    />
  );
}

const list = (name: string) => screen.getByRole('listbox', { name });
const names = (name: string) => within(list(name)).queryAllByRole('option').map((o) => o.textContent);
const btn = (name: string) => screen.getByRole('button', { name });

describe('PickList', () => {
  it('AC-1: renders two labelled listboxes and transfer buttons', () => {
    render(<Harness />);
    expect(names('Source')).toEqual(['Apple', 'Banana', 'Cherry']);
    expect(names('Target')).toEqual(['Date']);
    for (const label of ['Move to target', 'Move to source']) expect(btn(label)).toBeDisabled();
  });

  it('AC-1: transfer buttons move selected items', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(within(list('Source')).getByRole('option', { name: 'Banana' }));
    await userEvent.click(btn('Move to target'));
    expect(names('Source')).toEqual(['Apple', 'Cherry']);
    expect(names('Target')).toEqual(['Date', 'Banana']);
    expect(onChange).toHaveBeenCalledWith({ source: make(['Apple', 'Cherry'], 1).map((i, k) => ({ ...i, id: k === 0 ? 1 : 3 })), target: [{ id: 10, name: 'Date' }, { id: 2, name: 'Banana' }] });
    expect(screen.getByRole('status')).toHaveTextContent('Banana moved to position 2 of 2');
    await userEvent.click(within(list('Target')).getByRole('option', { name: 'Date' }));
    await userEvent.click(btn('Move to source'));
    expect(names('Source')).toEqual(['Apple', 'Cherry', 'Date']);
  });

  it('AC-1: move all transfers every item', async () => {
    render(<Harness />);
    await userEvent.click(btn('Move all to target'));
    expect(names('Source')).toEqual([]);
    expect(names('Target')).toEqual(['Date', 'Apple', 'Banana', 'Cherry']);
    await userEvent.click(btn('Move all to source'));
    expect(names('Target')).toEqual([]);
    expect(names('Source')).toEqual(['Date', 'Apple', 'Banana', 'Cherry']);
  });

  it('AC-2: double-click moves an item', async () => {
    render(<Harness />);
    await userEvent.dblClick(within(list('Source')).getByRole('option', { name: 'Apple' }));
    expect(names('Target')).toEqual(['Date', 'Apple']);
  });

  it('AC-2: Enter moves the focused item and focus stays in the list', async () => {
    render(<Harness />);
    within(list('Source')).getByRole('option', { name: 'Apple' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(names('Source')).toEqual(['Banana', 'Cherry']);
    expect(names('Target')).toEqual(['Date', 'Apple']);
    expect(within(list('Source')).getByRole('option', { name: 'Banana' })).toHaveFocus();
  });

  it('AC-3: filter works per list', async () => {
    render(<Harness filter />);
    const [sourceFilter, targetFilter] = screen.getAllByRole('searchbox', { name: 'Filter' });
    await userEvent.type(sourceFilter!, 'an');
    expect(names('Source')).toEqual(['Banana']);
    expect(names('Target')).toEqual(['Date']);
    await userEvent.click(btn('Move all to target'));
    expect(names('Target')).toEqual(['Date', 'Banana']);
    await userEvent.type(targetFilter!, 'zz');
    expect(names('Target')).toEqual([]);
  });

  it('reorders the target list with showReorder', async () => {
    render(<Harness showReorder />);
    await userEvent.click(btn('Move all to target'));
    await userEvent.click(within(list('Target')).getByRole('option', { name: 'Cherry' }));
    await userEvent.click(btn('Move to top'));
    expect(names('Target')).toEqual(['Cherry', 'Date', 'Apple', 'Banana']);
    within(list('Target')).getByRole('option', { name: 'Cherry' }).focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(names('Target')).toEqual(['Date', 'Cherry', 'Apple', 'Banana']);
  });
});
