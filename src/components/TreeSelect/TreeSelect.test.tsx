import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { TreeNode } from '../Tree/treeUtils';
import { TreeSelect, type TreeSelectProps, type TreeSelectValue } from './TreeSelect';

const nodes: TreeNode[] = [
  { key: 'a', label: 'Alpha', children: [{ key: 'a1', label: 'Apple' }, { key: 'a2', label: 'Avocado' }] },
  { key: 'b', label: 'Beta', children: [{ key: 'b1', label: 'Banana' }] },
  { key: 'c', label: 'Gamma' },
];

function Harness(props: Partial<TreeSelectProps> & { initial?: TreeSelectValue }) {
  const { initial, ...rest } = props;
  const [value, setValue] = useState<TreeSelectValue>(initial ?? (props.selectionMode && props.selectionMode !== 'single' ? [] : null));
  return (
    <TreeSelect
      aria-label="Category"
      nodes={nodes}
      {...rest}
      value={value}
      onChange={(v) => {
        setValue(v);
        rest.onChange?.(v);
      }}
    />
  );
}

const trigger = () => screen.getByRole('combobox', { name: 'Category' });
const open = async () => userEvent.click(trigger());
const treeitem = (name: string) => screen.getByRole('treeitem', { name });

describe('TreeSelect', () => {
  it('AC-1: trigger has combobox semantics and opens a tree popup', async () => {
    render(<Harness />);
    expect(trigger()).toHaveAttribute('aria-haspopup', 'tree');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    await open();
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('tree')).toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-controls', screen.getByRole('tree').closest('.dropdown-menu')!.id);
  });

  it('AC-1: single mode selects a node, updates label and closes', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await open();
    await userEvent.click(screen.getByText('Gamma'));
    expect(onChange).toHaveBeenCalledWith('c');
    expect(trigger()).toHaveTextContent('Gamma');
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('AC-1: multiple mode joins labels and keeps the popup open', async () => {
    render(<Harness selectionMode="multiple" />);
    await open();
    await userEvent.click(screen.getByText('Gamma'));
    await userEvent.click(screen.getByText('Beta'));
    expect(trigger()).toHaveTextContent('Gamma, Beta');
    expect(screen.getByRole('tree')).toBeInTheDocument();
  });

  it('AC-1: chips display with removable chips', async () => {
    render(<Harness selectionMode="multiple" display="chips" initial={['c', 'b']} />);
    expect(screen.getByRole('button', { name: 'Remove Gamma' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Gamma' }));
    expect(screen.queryByRole('button', { name: 'Remove Gamma' })).not.toBeInTheDocument();
    expect(trigger()).toHaveTextContent('Beta');
  });

  it('AC-2: checkbox mode propagates partial and checked state', async () => {
    const onChange = vi.fn();
    render(<Harness selectionMode="checkbox" onChange={onChange} />);
    await open();
    await userEvent.click(screen.getByText('Alpha'));
    expect(treeitem('Alpha')).toHaveAttribute('aria-checked', 'true');
    expect(onChange).toHaveBeenLastCalledWith(expect.arrayContaining(['a', 'a1', 'a2']));
    // Outermost checked node is shown once.
    expect(trigger()).toHaveTextContent('Alpha');
    expect(trigger()).not.toHaveTextContent('Apple');
    await userEvent.click(treeitem('Alpha').querySelector('.ui-tree__toggler')!);
    await userEvent.click(screen.getByText('Apple'));
    expect(treeitem('Alpha')).toHaveAttribute('aria-checked', 'mixed');
    expect(trigger()).toHaveTextContent('Avocado');
  });

  it('AC-2: reopening restores partial state and expands to selected nodes', async () => {
    render(<Harness selectionMode="checkbox" initial={['a1']} />);
    await open();
    expect(treeitem('Alpha')).toHaveAttribute('aria-checked', 'mixed');
    expect(treeitem('Apple')).toHaveAttribute('aria-checked', 'true');
  });

  it('AC-3: filter keeps ancestors of matches visible and expanded', async () => {
    render(<Harness filter />);
    await open();
    expect(screen.getByRole('searchbox', { name: 'Filter' })).toHaveFocus();
    await userEvent.keyboard('avo');
    expect(treeitem('Alpha')).toHaveAttribute('aria-expanded', 'true');
    expect(treeitem('Avocado')).toBeInTheDocument();
    expect(screen.queryByRole('treeitem', { name: 'Beta' })).not.toBeInTheDocument();
  });

  it('Escape closes and restores focus; keyboard opens the popup', async () => {
    render(<Harness />);
    trigger().focus();
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('tree')).toBeInTheDocument();
    expect(treeitem('Alpha')).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('clicking outside closes the popup', async () => {
    render(<Harness />);
    await open();
    await userEvent.click(document.body);
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
  });
});
