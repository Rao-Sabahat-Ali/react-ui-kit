import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Column } from '../DataTable/DataTable';
import type { TreeNode } from '../Tree/treeUtils';
import { TreeTable } from './TreeTable';

interface Row {
  name: string;
  size: number;
}

const node = (key: string, name: string, size: number, children?: TreeNode<Row>[]): TreeNode<Row> => ({ key, label: name, data: { name, size }, children });

const value: TreeNode<Row>[] = [
  node('b', 'Beta', 20, [node('b1', 'Zed', 1), node('b2', 'Yak', 5), node('b3', 'Xi', 3)]),
  node('a', 'Alpha', 30, [node('a1', 'Child', 2)]),
  node('c', 'Gamma', 10),
];

const columns: Column<Row>[] = [
  { field: 'name', header: 'Name', sortable: true },
  { field: 'size', header: 'Size', sortable: true, align: 'end' },
];

const rows = () => screen.getAllByRole('row').slice(1);
const rowNames = () => rows().map((r) => within(r).getAllByRole('gridcell')[0]!.textContent);
const row = (name: string) => screen.getByRole('row', { name: new RegExp(name) });
const toggler = (name: string) => row(name).querySelector('.ui-tree-table__toggler') as HTMLElement;

describe('TreeTable', () => {
  it('AC-1: toggler expands child rows with indentation per level', async () => {
    render(<TreeTable caption="Files" value={value} columns={columns} />);
    expect(rowNames()).toEqual(['Beta', 'Alpha', 'Gamma']);
    await userEvent.click(toggler('Alpha'));
    expect(rowNames()).toEqual(['Beta', 'Alpha', 'Child', 'Gamma']);
    const parent = row('Alpha').querySelector<HTMLElement>('.ui-tree-table__cell-start')!;
    const child = row('Child').querySelector<HTMLElement>('.ui-tree-table__cell-start')!;
    expect(parent.style.paddingInlineStart).toContain('* 0');
    expect(child.style.paddingInlineStart).toContain('* 1');
    await userEvent.click(toggler('Alpha'));
    expect(rowNames()).toEqual(['Beta', 'Alpha', 'Gamma']);
  });

  it('AC-1: onToggle receives expanded keys; controlled expandedKeys', async () => {
    const onToggle = vi.fn();
    render(<TreeTable caption="Files" value={value} columns={columns} expandedKeys={new Set()} onToggle={onToggle} />);
    await userEvent.click(toggler('Beta'));
    expect(onToggle).toHaveBeenCalledWith(new Set(['b']));
    expect(rowNames()).toEqual(['Beta', 'Alpha', 'Gamma']);
  });

  it('AC-2: sorting sorts within siblings only', async () => {
    render(<TreeTable caption="Files" value={value} columns={columns} defaultExpandedKeys={new Set(['b'])} />);
    expect(rowNames()).toEqual(['Beta', 'Zed', 'Yak', 'Xi', 'Alpha', 'Gamma']);
    await userEvent.click(within(screen.getByRole('columnheader', { name: /Name/ })).getByRole('button'));
    expect(rowNames()).toEqual(['Alpha', 'Beta', 'Xi', 'Yak', 'Zed', 'Gamma']);
    await userEvent.click(within(screen.getByRole('columnheader', { name: /Name/ })).getByRole('button'));
    expect(rowNames()).toEqual(['Gamma', 'Beta', 'Zed', 'Yak', 'Xi', 'Alpha']);
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'descending');
  });

  it('AC-3: treegrid ARIA attributes are present', () => {
    render(<TreeTable caption="Files" value={value} columns={columns} defaultExpandedKeys={new Set(['b'])} />);
    expect(screen.getByRole('treegrid', { name: 'Files' })).toBeInTheDocument();
    expect(row('Beta')).toHaveAttribute('aria-level', '1');
    expect(row('Beta')).toHaveAttribute('aria-expanded', 'true');
    expect(row('Beta')).toHaveAttribute('aria-setsize', '3');
    expect(row('Beta')).toHaveAttribute('aria-posinset', '1');
    expect(row('Zed')).toHaveAttribute('aria-level', '2');
    expect(row('Zed')).toHaveAttribute('aria-setsize', '3');
    expect(row('Gamma')).not.toHaveAttribute('aria-expanded');
    expect(row('Alpha')).toHaveAttribute('aria-expanded', 'false');
  });

  it('AC-3: ArrowRight / ArrowLeft expand, collapse and move between levels', async () => {
    render(<TreeTable caption="Files" value={value} columns={columns} />);
    row('Beta').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(row('Beta')).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(row('Zed')).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(row('Beta')).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(row('Beta')).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(row('Gamma')).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(row('Beta')).toHaveFocus();
  });

  it('supports checkbox selection with partial parents', async () => {
    render(<TreeTable caption="Files" value={value} columns={columns} selectionMode="checkbox" defaultExpandedKeys={new Set(['b'])} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Zed' }));
    expect(row('Zed')).toHaveAttribute('aria-checked', 'true');
    expect(row('Beta')).toHaveAttribute('aria-checked', 'mixed');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Beta' }));
    expect(row('Yak')).toHaveAttribute('aria-checked', 'true');
    expect(row('Beta')).toHaveAttribute('aria-checked', 'true');
  });

  it('supports single selection by click and Enter', async () => {
    render(<TreeTable caption="Files" value={value} columns={columns} selectionMode="single" />);
    await userEvent.click(screen.getByText('Gamma'));
    expect(row('Gamma')).toHaveAttribute('aria-selected', 'true');
    row('Alpha').focus();
    await userEvent.keyboard('{Enter}');
    expect(row('Alpha')).toHaveAttribute('aria-selected', 'true');
    expect(row('Gamma')).toHaveAttribute('aria-selected', 'false');
  });

  it('loads children lazily', async () => {
    let resolve: (c: TreeNode<Row>[]) => void = () => {};
    const onLoadChildren = vi.fn(() => new Promise<TreeNode<Row>[]>((r) => (resolve = r)));
    render(<TreeTable caption="Files" value={[node('r', 'Remote', 0)]} columns={columns} onLoadChildren={onLoadChildren} />);
    await userEvent.click(toggler('Remote'));
    expect(row('Remote')).toHaveAttribute('aria-busy', 'true');
    await act(async () => resolve([node('r1', 'Loaded', 1)]));
    await waitFor(() => expect(row('Loaded')).toBeInTheDocument());
    expect(row('Remote')).not.toHaveAttribute('aria-busy');
  });

  it('paginates top-level rows and renders loading and empty states', async () => {
    const { rerender } = render(<TreeTable caption="Files" value={value} columns={columns} paginator defaultPageSize={2} />);
    expect(rowNames()).toEqual(['Beta', 'Alpha']);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(rowNames()).toEqual(['Gamma']);
    rerender(<TreeTable caption="Files" value={[]} columns={columns} />);
    expect(screen.getByText('No records found')).toBeInTheDocument();
    rerender(<TreeTable caption="Files" value={value} columns={columns} loading />);
    expect(screen.getByRole('treegrid')).toHaveAttribute('aria-busy', 'true');
  });
});
