import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, type Column } from './DataTable';
import { nextSort, sortRows } from './sort';

interface User {
  id: number;
  name: string;
  age: number | null;
  joined: Date;
  address: { city: string };
}

const users: User[] = [
  { id: 1, name: 'Charlie', age: 30, joined: new Date('2024-03-01'), address: { city: 'Oslo' } },
  { id: 2, name: 'alice', age: null, joined: new Date('2023-01-01'), address: { city: 'Berlin' } },
  { id: 3, name: 'Bob', age: 25, joined: new Date('2025-06-01'), address: { city: 'Tokyo' } },
  { id: 4, name: 'item 10', age: 25, joined: new Date('2022-01-01'), address: { city: 'Lima' } },
  { id: 5, name: 'item 9', age: 40, joined: new Date('2021-01-01'), address: { city: 'Rome' } },
];

const columns: Column<User>[] = [
  { field: 'name', header: 'Name', sortable: true },
  { field: 'age', header: 'Age', sortable: true, align: 'end' },
  { field: 'address.city', header: 'City' },
];

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]!).getAllByRole('row');
const names = () => bodyRows().map((r) => within(r).getAllByRole('cell').at(0)!.textContent);

describe('DataTable', () => {
  it('AC-1: caption, column headers and rows', () => {
    render(<DataTable caption="Users" data={users} columns={columns} />);
    expect(screen.getByRole('table', { name: 'Users' })).toHaveClass('table');
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('scope', 'col');
    expect(bodyRows()).toHaveLength(5);
  });

  it('AC-2: sort cycles asc → desc → none with aria-sort', async () => {
    render(<DataTable caption="Users" data={users} columns={columns} />);
    const header = screen.getByRole('columnheader', { name: /Name/ });
    const button = within(header).getByRole('button');
    expect(header).toHaveAttribute('aria-sort', 'none');
    await userEvent.click(button);
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(names()).toEqual(['alice', 'Bob', 'Charlie', 'item 9', 'item 10']);
    await userEvent.click(button);
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(names()[0]).toBe('item 10');
    await userEvent.click(button);
    expect(header).toHaveAttribute('aria-sort', 'none');
    expect(names()[0]).toBe('Charlie');
  });

  it('AC-3: multiple sort with shift adds secondary sort', async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    render(<DataTable caption="Users" sortMode="multiple" data={users} columns={columns} onSortChange={onSortChange} />);
    await user.click(within(screen.getByRole('columnheader', { name: /Age/ })).getByRole('button'));
    await user.keyboard('{Shift>}');
    await user.click(within(screen.getByRole('columnheader', { name: /Name/ })).getByRole('button'));
    await user.keyboard('{/Shift}');
    expect(onSortChange).toHaveBeenLastCalledWith([{ field: 'age', order: 1 }, { field: 'name', order: 1 }]);
    expect(names()).toEqual(['Bob', 'item 10', 'Charlie', 'item 9', 'alice']);
  });

  it('AC-4: sorting semantics — numbers, locale strings, dates, nulls last', () => {
    const cols = [{ field: 'age' }, { field: 'name' }, { field: 'joined' }];
    expect(sortRows(users, [{ field: 'age', order: -1 }], cols).map((u) => u.age)).toEqual([40, 30, 25, 25, null]);
    expect(sortRows(users, [{ field: 'name', order: 1 }], cols).map((u) => u.name)).toEqual(['alice', 'Bob', 'Charlie', 'item 9', 'item 10']);
    expect(sortRows(users, [{ field: 'joined', order: 1 }], cols)[0]?.id).toBe(5);
    expect(nextSort([{ field: 'a', order: -1 }], 'a', false)).toEqual([]);
  });

  it('AC-5: paginator renders current page only', async () => {
    render(<DataTable caption="Users" data={users} columns={columns} paginator defaultPageSize={2} pageSizeOptions={[]} />);
    expect(bodyRows()).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(names()).toEqual(['item 9']);
  });

  it('AC-6: multiple selection with select-all and indeterminate', async () => {
    const onSelectionChange = vi.fn();
    render(<DataTable caption="Users" data={users} columns={columns} selectionMode="multiple" onSelectionChange={onSelectionChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select row 2' }));
    expect(onSelectionChange).toHaveBeenLastCalledWith([2]);
    const all = screen.getByRole('checkbox', { name: 'Select all rows' }) as HTMLInputElement;
    expect(all.indeterminate).toBe(true);
    await userEvent.click(all);
    expect(onSelectionChange).toHaveBeenLastCalledWith([2, 1, 3, 4, 5]);
    await userEvent.click(all);
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it('AC-7: single selection toggles on row click', async () => {
    const onSelectionChange = vi.fn();
    render(<DataTable caption="Users" data={users} columns={columns} selectionMode="single" onSelectionChange={onSelectionChange} />);
    const row = bodyRows()[0]!;
    await userEvent.click(within(row).getByText('Charlie'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(1);
    expect(row).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(within(row).getByText('Charlie'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(null);
  });

  it('AC-8: loading renders skeleton rows and aria-busy', () => {
    const { container } = render(<DataTable caption="Users" data={users} columns={columns} loading loadingRows={3} />);
    expect(screen.getByRole('table', { hidden: true })).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('.ui-data-table__loading-row')).toHaveLength(3);
  });

  it('AC-9: empty data shows empty message', () => {
    render(<DataTable caption="Users" data={[]} columns={columns} emptyMessage="No users yet" />);
    expect(screen.getByText('No users yet').closest('td')).toHaveAttribute('colspan', '3');
  });

  it('AC-10: body templates and dot paths', () => {
    render(<DataTable caption="Users" data={users.slice(0, 1)} columns={[...columns, { id: 'x', header: 'X', body: (u) => <strong>{u.name}!</strong> }]} />);
    expect(screen.getByText('Oslo')).toBeInTheDocument();
    expect(screen.getByText('Charlie!').tagName).toBe('STRONG');
  });

  it('AC-11: controlled sort does not change without parent update', async () => {
    const onSortChange = vi.fn();
    render(<DataTable caption="Users" data={users} columns={columns} sort={[]} onSortChange={onSortChange} />);
    await userEvent.click(within(screen.getByRole('columnheader', { name: /Name/ })).getByRole('button'));
    expect(onSortChange).toHaveBeenCalledWith([{ field: 'name', order: 1 }]);
    expect(names()[0]).toBe('Charlie');
  });

  it('onRowClick works with keyboard', async () => {
    const onRowClick = vi.fn();
    render(<DataTable caption="Users" data={users} columns={columns} onRowClick={onRowClick} />);
    bodyRows()[1]!.focus();
    await userEvent.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledWith(users[1], expect.anything());
  });
});
