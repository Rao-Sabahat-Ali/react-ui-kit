import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { OrderList, type OrderListProps } from './OrderList';
import { moveItem, moveSelected } from './reorder';

interface Task {
  id: number;
  name: string;
}
const initial: Task[] = ['One', 'Two', 'Three', 'Four'].map((name, i) => ({ id: i + 1, name }));

function Harness(props: Partial<OrderListProps<Task>>) {
  const [value, setValue] = useState(initial);
  return (
    <OrderList
      header="Tasks"
      itemTemplate={(t) => t.name}
      {...props}
      value={value}
      onChange={(v) => {
        setValue(v);
        props.onChange?.(v);
      }}
    />
  );
}

const names = () => screen.getAllByRole('option').map((o) => o.textContent);
const option = (name: string) => screen.getByRole('option', { name });
const btn = (name: string) => screen.getByRole('button', { name });

describe('OrderList', () => {
  it('AC-1: move buttons are disabled until something is selected', () => {
    render(<Harness />);
    expect(btn('Move up')).toBeDisabled();
    expect(screen.getByRole('listbox', { name: 'Tasks' })).toHaveAttribute('aria-multiselectable', 'true');
  });

  it('AC-1: move buttons reorder selected items and keep selection', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(option('Three'));
    await userEvent.click(btn('Move up'));
    expect(names()).toEqual(['One', 'Three', 'Two', 'Four']);
    expect(option('Three')).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(btn('Move to top'));
    expect(names()).toEqual(['Three', 'One', 'Two', 'Four']);
    await userEvent.click(btn('Move down'));
    expect(names()).toEqual(['One', 'Three', 'Two', 'Four']);
    await userEvent.click(btn('Move to bottom'));
    expect(names()).toEqual(['One', 'Two', 'Four', 'Three']);
    expect(option('Three')).toHaveAttribute('aria-selected', 'true');
    expect(onChange).toHaveBeenLastCalledWith([initial[0], initial[1], initial[3], initial[2]]);
  });

  it('AC-1: multiple selected items move together', async () => {
    render(<Harness />);
    const user = userEvent.setup();
    await user.click(option('Two'));
    await user.keyboard('{Control>}');
    await user.click(option('Four'));
    await user.keyboard('{/Control}');
    await user.click(btn('Move up'));
    expect(names()).toEqual(['Two', 'One', 'Four', 'Three']);
    await user.click(btn('Move up'));
    expect(names()).toEqual(['Two', 'Four', 'One', 'Three']);
  });

  it('AC-2: Alt+Arrow reorders, keeps focus and announces the new position', async () => {
    render(<Harness />);
    await userEvent.click(option('Two'));
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(names()).toEqual(['One', 'Three', 'Two', 'Four']);
    expect(option('Two')).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Two moved to position 3 of 4');
    await userEvent.keyboard('{Alt>}{ArrowUp}{ArrowUp}{/Alt}');
    expect(names()).toEqual(['Two', 'One', 'Three', 'Four']);
    expect(screen.getByRole('status')).toHaveTextContent('Two moved to position 1 of 4');
  });

  it('AC-2: plain arrows move focus, Space selects', async () => {
    render(<Harness />);
    await userEvent.tab();
    await userEvent.tab({ shift: true });
    option('One').focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(option('Two')).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(option('Two')).toHaveAttribute('aria-selected', 'true');
  });

  it('AC-3: drag and drop reorders using pointer events', () => {
    const onChange = vi.fn();
    render(<Harness dragdrop onChange={onChange} />);
    document.elementFromPoint = () => option('Four');
    act(() => {
      option('One').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 0 }));
    });
    act(() => {
      document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 0, clientY: 50 }));
    });
    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 0, clientY: 50 }));
    });
    expect(names()).toEqual(['Two', 'Three', 'Four', 'One']);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('One moved to position 4 of 4');
  });

  it('reorder helpers keep contiguous blocks at the edges', () => {
    expect(moveSelected(['a', 'b', 'c'], new Set([0]), 'up')).toEqual(['a', 'b', 'c']);
    expect(moveSelected(['a', 'b', 'c'], new Set([1, 2]), 'down')).toEqual(['a', 'b', 'c']);
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });
});
