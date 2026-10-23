import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { TreeKey, TreeNode } from '../Tree/treeUtils';
import { OrganizationChart, type OrganizationChartProps } from './OrganizationChart';

const nodes: TreeNode[] = [
  {
    key: 'ceo',
    label: 'CEO',
    children: [
      { key: 'cto', label: 'CTO', children: [{ key: 'dev', label: 'Dev' }] },
      { key: 'cfo', label: 'CFO' },
      { key: 'coo', label: 'COO' },
    ],
  },
];

function Harness(props: Partial<OrganizationChartProps>) {
  const [sel, setSel] = useState<TreeKey | TreeKey[] | null>(props.selectionMode === 'multiple' ? [] : null);
  return <OrganizationChart aria-label="Org" value={nodes} {...props} selection={sel} onSelectionChange={(s) => { setSel(s); props.onSelectionChange?.(s); }} />;
}

const item = (name: string) => screen.getByRole('treeitem', { name });

describe('OrganizationChart', () => {
  it('AC-1: renders nodes with connector structure and tree semantics', () => {
    const { container } = render(<Harness />);
    expect(screen.getByRole('tree', { name: 'Org' })).toBeInTheDocument();
    expect(screen.getAllByRole('treeitem')).toHaveLength(5);
    expect(within(item('CEO')).getAllByRole('group')).toHaveLength(2);
    expect(item('CTO')).toHaveAttribute('aria-level', '2');
    expect(item('CFO')).toHaveAttribute('aria-posinset', '2');
    expect(item('CFO')).toHaveAttribute('aria-setsize', '3');
    expect(container.querySelectorAll('.ui-org-chart__children')).toHaveLength(2);
  });

  it('AC-1: custom node template and selection', async () => {
    const onSelectionChange = vi.fn();
    render(<Harness selectionMode="single" nodeTemplate={(n) => <em>{`Role: ${n.label}`}</em>} onSelectionChange={onSelectionChange} />);
    await userEvent.click(screen.getByText('Role: CTO'));
    expect(item('Role: CTO')).toHaveAttribute('aria-selected', 'true');
    expect(onSelectionChange).toHaveBeenLastCalledWith('cto');
    await userEvent.click(screen.getByText('Role: CFO'));
    expect(item('Role: CTO')).toHaveAttribute('aria-selected', 'false');
  });

  it('AC-1: multiple selection', async () => {
    render(<Harness selectionMode="multiple" />);
    await userEvent.click(screen.getByText('CTO'));
    await userEvent.click(screen.getByText('CFO'));
    expect(item('CTO')).toHaveAttribute('aria-selected', 'true');
    expect(item('CFO')).toHaveAttribute('aria-selected', 'true');
  });

  it('AC-2: collapse hides the subtree', async () => {
    const { container } = render(<Harness collapsible />);
    expect(item('CTO')).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(item('CTO').querySelector('.ui-org-chart__toggler')!);
    expect(item('CTO')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('treeitem', { name: 'Dev' })).not.toBeInTheDocument();
    expect(container.querySelectorAll('.ui-org-chart__children')).toHaveLength(1);
    await userEvent.click(item('CTO').querySelector('.ui-org-chart__toggler')!);
    expect(screen.getByRole('treeitem', { name: 'Dev' })).toBeInTheDocument();
  });

  it('AC-2: non-collapsible charts always show every node', () => {
    render(<Harness />);
    expect(item('CTO')).not.toHaveAttribute('aria-expanded');
  });

  it('AC-3: keyboard navigation follows tree semantics', async () => {
    render(<Harness selectionMode="single" collapsible />);
    await userEvent.tab();
    expect(item('CEO')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(item('CTO')).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(item('CFO')).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(item('COO')).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(item('CTO')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(item('Dev')).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(item('CTO')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(item('CTO')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard(' ');
    expect(item('CTO')).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{ArrowDown}');
    expect(item('CTO')).toHaveFocus();
  });

  it('AC-3: roving tabindex has a single tab stop', () => {
    render(<Harness />);
    expect(screen.getAllByRole('treeitem').filter((i) => i.tabIndex === 0)).toHaveLength(1);
  });
});
