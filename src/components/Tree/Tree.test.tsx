import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Tree, type TreeProps } from './Tree';
import type { TreeNode, TreeSelectionValue } from './treeUtils';

const nodes: TreeNode[] = [
  {
    key: 'a',
    label: 'Alpha',
    children: [
      { key: 'a1', label: 'Apple' },
      { key: 'a2', label: 'Avocado', children: [{ key: 'a2x', label: 'Hass' }] },
    ],
  },
  { key: 'b', label: 'Beta', children: [{ key: 'b1', label: 'Banana' }] },
  { key: 'c', label: 'Gamma' },
];

const item = (name: string | RegExp) => screen.getByRole('treeitem', { name });
const labels = () => screen.getAllByRole('treeitem').map((i) => document.getElementById(i.getAttribute('aria-labelledby')!)!.textContent);

const toggler = (name: string) => item(name).querySelector('.ui-tree__toggler') as HTMLElement;

function Harness(props: Partial<TreeProps>) {
  const [sel, setSel] = useState<TreeSelectionValue>(props.selectionMode === 'checkbox' ? { checked: [], partial: [] } : props.selectionMode === 'multiple' ? [] : null);
  return <Tree aria-label="Tree" value={nodes} {...props} selection={sel} onSelectionChange={(s) => { setSel(s); props.onSelectionChange?.(s); }} />;
}

describe('Tree', () => {
  it('AC-1: expands and collapses via click on the toggler', async () => {
    render(<Tree aria-label="Tree" value={nodes} />);
    expect(labels()).toEqual(['Alpha', 'Beta', 'Gamma']);
    await userEvent.click(toggler('Alpha'));
    expect(item('Alpha')).toHaveAttribute('aria-expanded', 'true');
    expect(labels()).toContain('Apple');
    await userEvent.click(toggler('Alpha'));
    expect(item('Alpha')).toHaveAttribute('aria-expanded', 'false');
    expect(labels()).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('AC-1: expands and collapses via arrow keys and reports onToggle', async () => {
    const onToggle = vi.fn();
    render(<Tree aria-label="Tree" value={nodes} onToggle={onToggle} />);
    await userEvent.tab();
    expect(item('Alpha')).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(item('Alpha')).toHaveAttribute('aria-expanded', 'true');
    expect(onToggle).toHaveBeenLastCalledWith(new Set(['a']));
    await userEvent.keyboard('{ArrowRight}');
    expect(item('Apple')).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(item('Alpha')).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(item('Alpha')).toHaveAttribute('aria-expanded', 'false');
  });

  it('AC-1: Home/End/ArrowDown/ArrowUp, "*" and typeahead', async () => {
    render(<Tree aria-label="Tree" value={nodes} defaultExpandedKeys={new Set(['a'])} />);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    expect(item('Apple')).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(item('Gamma')).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(item('Alpha')).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(item('Alpha')).toHaveFocus();
    await userEvent.keyboard('b');
    expect(item('Beta')).toHaveFocus();
    await userEvent.keyboard('{Home}*');
    expect(item('Beta')).toHaveAttribute('aria-expanded', 'true');
    expect(item('Alpha')).toHaveAttribute('aria-expanded', 'true');
  });

  it('AC-1: uses a roving tabindex', async () => {
    render(<Tree aria-label="Tree" value={nodes} />);
    expect(screen.getAllByRole('treeitem').filter((i) => i.tabIndex === 0)).toHaveLength(1);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    expect(item('Beta')).toHaveAttribute('tabindex', '0');
    expect(item('Alpha')).toHaveAttribute('tabindex', '-1');
  });

  it('AC-2: single selection selects one node', async () => {
    const onSelectionChange = vi.fn();
    render(<Harness selectionMode="single" onSelectionChange={onSelectionChange} />);
    await userEvent.click(screen.getByText('Beta'));
    expect(item('Beta')).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByText('Gamma'));
    expect(item('Beta')).toHaveAttribute('aria-selected', 'false');
    expect(item('Gamma')).toHaveAttribute('aria-selected', 'true');
    expect(onSelectionChange).toHaveBeenLastCalledWith('c');
  });

  it('AC-2: multiple selection toggles nodes; Enter and Space select via keyboard', async () => {
    render(<Harness selectionMode="multiple" />);
    expect(screen.getByRole('tree')).toHaveAttribute('aria-multiselectable', 'true');
    await userEvent.click(screen.getByText('Beta'));
    await userEvent.click(screen.getByText('Gamma'));
    expect(item('Beta')).toHaveAttribute('aria-selected', 'true');
    expect(item('Gamma')).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByText('Beta'));
    expect(item('Beta')).toHaveAttribute('aria-selected', 'false');
    await userEvent.keyboard('{Home}{Enter}');
    expect(item('Alpha')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard(' ');
    expect(item('Alpha')).toHaveAttribute('aria-selected', 'false');
  });

  it('AC-2: checkbox mode propagates checked and partial state', async () => {
    const onSelectionChange = vi.fn();
    render(<Harness selectionMode="checkbox" defaultExpandedKeys={new Set(['a', 'a2'])} onSelectionChange={onSelectionChange} />);
    await userEvent.click(screen.getByText('Apple'));
    expect(item('Apple')).toHaveAttribute('aria-checked', 'true');
    expect(item('Alpha')).toHaveAttribute('aria-checked', 'mixed');
    expect(item('Avocado')).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(screen.getByText('Avocado'));
    expect(item('Hass')).toHaveAttribute('aria-checked', 'true');
    expect(item('Alpha')).toHaveAttribute('aria-checked', 'true');
    expect(onSelectionChange).toHaveBeenLastCalledWith(expect.objectContaining({ checked: expect.arrayContaining(['a', 'a1', 'a2', 'a2x']), partial: [] }));
    await userEvent.click(screen.getByText('Alpha'));
    expect(item('Apple')).toHaveAttribute('aria-checked', 'false');
    expect(item('Alpha')).toHaveAttribute('aria-checked', 'false');
  });

  it('AC-2: disabled and non-selectable nodes are not selectable', async () => {
    const custom: TreeNode[] = [
      { key: 'x', label: 'Disabled', disabled: true },
      { key: 'y', label: 'Group', selectable: false },
      { key: 'z', label: 'Fine' },
    ];
    render(<Tree aria-label="T" value={custom} selectionMode="single" />);
    await userEvent.click(screen.getByText('Disabled'));
    await userEvent.click(screen.getByText('Group'));
    expect(screen.getAllByRole('treeitem').filter((i) => i.getAttribute('aria-selected') === 'true')).toHaveLength(0);
    expect(item('Disabled')).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByText('Fine'));
    expect(item('Fine')).toHaveAttribute('aria-selected', 'true');
  });

  it('AC-3: lazy children load with a spinner and aria-busy', async () => {
    let resolve: (children: TreeNode[]) => void = () => {};
    const onLoadChildren = vi.fn(() => new Promise<TreeNode[]>((r) => (resolve = r)));
    render(<Tree aria-label="Tree" value={[{ key: 'r', label: 'Remote' }]} onLoadChildren={onLoadChildren} />);
    expect(item('Remote')).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggler('Remote'));
    expect(onLoadChildren).toHaveBeenCalledWith(expect.objectContaining({ key: 'r' }));
    expect(item(/Remote/)).toHaveAttribute('aria-busy', 'true');
    expect(within(item(/Remote/)).getByText('Loading…')).toBeInTheDocument();
    await act(async () => resolve([{ key: 'r1', label: 'Child one' }]));
    await waitFor(() => expect(screen.getByRole('treeitem', { name: 'Child one' })).toBeInTheDocument());
    expect(item('Remote')).not.toHaveAttribute('aria-busy');
    expect(item('Remote')).toHaveAttribute('aria-expanded', 'true');
  });

  it('AC-4: filter shows matches with their ancestors, expanded', async () => {
    render(<Tree aria-label="Tree" value={nodes} filter />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Filter' }), 'hass');
    expect(labels()).toEqual(['Alpha', 'Avocado', 'Hass']);
    expect(item('Alpha')).toHaveAttribute('aria-expanded', 'true');
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Filter' }));
    expect(labels()).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('AC-4: shows an empty message when nothing matches', async () => {
    render(<Tree aria-label="Tree" value={nodes} filter />);
    await userEvent.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('AC-5: ARIA level, setsize and posinset are correct', () => {
    render(<Tree aria-label="Tree" value={nodes} defaultExpandedKeys={new Set(['a', 'a2'])} />);
    expect(screen.getByRole('tree')).toBeInTheDocument();
    expect(item('Alpha')).toHaveAttribute('aria-level', '1');
    expect(item('Alpha')).toHaveAttribute('aria-setsize', '3');
    expect(item('Alpha')).toHaveAttribute('aria-posinset', '1');
    expect(item('Gamma')).toHaveAttribute('aria-posinset', '3');
    expect(item('Avocado')).toHaveAttribute('aria-level', '2');
    expect(item('Avocado')).toHaveAttribute('aria-setsize', '2');
    expect(item('Avocado')).toHaveAttribute('aria-posinset', '2');
    expect(item('Hass')).toHaveAttribute('aria-level', '3');
    expect(item('Hass')).not.toHaveAttribute('aria-expanded');
    expect(within(item('Alpha')).getAllByRole('group')).not.toHaveLength(0);
  });

  it('supports drag and drop with pointer events', () => {
    const onNodeDrop = vi.fn();
    render(<Tree aria-label="Tree" value={nodes} dragdrop onNodeDrop={onNodeDrop} />);
    const target = item('Gamma');
    target.querySelector('.ui-tree__row')!.getBoundingClientRect = () => ({ top: 0, height: 40, bottom: 40, left: 0, right: 100, width: 100, x: 0, y: 0, toJSON: () => ({}) });
    document.elementFromPoint = () => target.querySelector('.ui-tree__row');
    const row = item('Beta').querySelector('.ui-tree__row')!;
    act(() => {
      row.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 0, clientY: 0 }));
    });
    act(() => {
      document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 10, clientY: 38 }));
    });
    act(() => {
      document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 10, clientY: 38 }));
    });
    expect(onNodeDrop).toHaveBeenCalledTimes(1);
    const drop = onNodeDrop.mock.calls[0]![0];
    expect(drop).toMatchObject({ dragKey: 'b', dropKey: 'c', position: 'after' });
    expect((drop.value as TreeNode[]).map((n) => n.key)).toEqual(['a', 'c', 'b']);
  });
});
