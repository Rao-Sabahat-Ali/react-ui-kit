import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable } from './DataTable';
import { bodyRows, people, personColumns, type Person } from './DataTable.fixtures';
import { filterRows } from './filters';
import type { CellEditorContext, Column } from './types';

const textEditor = ({ value, onChange, 'aria-label': label }: CellEditorContext<Person>) => (
  <input aria-label={label} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
);
const editColumns: Column<Person>[] = [
  { field: 'name', header: 'Name', editor: textEditor },
  { field: 'team', header: 'Team', editor: textEditor },
];
const cols: Column<Person>[] = [
  { field: 'name', header: 'Name' },
  { field: 'team', header: 'Team' },
  { field: 'score', header: 'Score' },
];
const cell = (rowIndex: number, col: string) => bodyRows()[rowIndex]!.querySelector<HTMLElement>(`[data-col="${col}"]`)!;

describe('DataTable review fixes', () => {
  it('AC-16: date-only ISO strings are local calendar days (not UTC midnight)', () => {
    const rows = [
      { id: 1, day: '2024-03-05' },
      { id: 2, day: '2024-03-06' },
    ];
    const columns: Column<(typeof rows)[number]>[] = [{ field: 'day', header: 'Day', filterable: true, filterType: 'date' }];
    const run = (matchMode: 'dateIs' | 'dateBefore') => filterRows(rows, { filters: { day: { matchMode, value: new Date(2024, 2, 5, 15) } }, columns, globalFilter: '' }).map((r) => r.id);
    expect(run('dateIs')).toEqual([1]);
    expect(run('dateBefore')).toEqual([]);
  });

  it('AC-22: applying an empty value in the menu clears a filterFn column instead of keeping an active filter', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    const columns: Column<Person>[] = [{ field: 'name', header: 'Name', filterable: true, filterFn: (v, f) => String(v).startsWith(String(f)) }];
    render(<DataTable caption="People" data={people} columns={columns} onFilterChange={onFilterChange} />);
    await user.click(screen.getByRole('button', { name: 'Filter Name' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Apply' }));
    expect(onFilterChange).toHaveBeenCalledWith({});
    expect(screen.getByRole('button', { name: 'Filter Name' })).not.toHaveClass('ui-data-table__filter--active');
  });

  it('AC-49: blur-commit does not pull focus back to the edited cell', async () => {
    const user = userEvent.setup();
    const onCellEditComplete = vi.fn();
    render(
      <>
        <button type="button">Outside</button>
        <DataTable caption="People" data={people} columns={editColumns} editMode="cell" onCellEditComplete={onCellEditComplete} />
      </>,
    );
    await user.click(cell(0, 'name'));
    await user.keyboard('!');
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(onCellEditComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
  });

  it('AC-51: row editing keeps focus (editor on Edit; Edit button after Save / Cancel)', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" data={people} columns={editColumns} editMode="row" />);
    await user.click(screen.getByRole('button', { name: 'Edit row 1' }));
    expect(screen.getByRole('textbox', { name: 'Name, row 1' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Save row 1' }));
    expect(screen.getByRole('button', { name: 'Edit row 1' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Edit row 2' }));
    await user.click(screen.getByRole('button', { name: 'Cancel editing row 2' }));
    expect(screen.getByRole('button', { name: 'Edit row 2' })).toHaveFocus();
  });

  it('AC-31: keyboard reorder never displaces a non-reorderable column', async () => {
    const user = userEvent.setup();
    const columns: Column<Person>[] = [{ field: 'name', header: 'Name', reorderable: false }, { field: 'team', header: 'Team' }, { field: 'score', header: 'Score' }];
    render(<DataTable caption="People" data={people} columns={columns} reorderableColumns />);
    screen.getByRole('button', { name: 'Team' }).focus();
    await user.keyboard('{Alt>}{Shift>}{ArrowLeft}{/Shift}{/Alt}');
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Name', 'Team', 'Score']);
  });

  it('AC-59: browser shortcuts (Alt/Meta + Arrow) are not hijacked; Enter on a cell without content is not swallowed', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" data={people} columns={cols} cellNavigation />);
    await user.tab();
    await user.keyboard('{ArrowDown}');
    const start = document.activeElement;
    const alt = fireEvent.keyDown(start!, { key: 'ArrowRight', altKey: true });
    const meta = fireEvent.keyDown(start!, { key: 'ArrowRight', metaKey: true });
    expect(alt && meta).toBe(true); // not default-prevented
    expect(document.activeElement).toBe(start);
    expect(fireEvent.keyDown(start!, { key: 'Enter' })).toBe(true);
  });

  it('AC-53: aria-multiselectable is only exposed on a grid', () => {
    const { rerender } = render(<DataTable caption="People" data={people} columns={personColumns} selectionMode="multiple" />);
    expect(document.querySelector('table')).not.toHaveAttribute('aria-multiselectable');
    rerender(<DataTable caption="People" data={people} columns={personColumns} selectionMode="multiple" cellNavigation />);
    expect(screen.getByRole('grid')).toHaveAttribute('aria-multiselectable', 'true');
  });

  it('AC-32: frozen header cells stay sticky (head rule must not fall back to position: relative); text alignment is logical', () => {
    const scss = readFileSync(`${process.cwd()}/src/components/DataTable/DataTable.scss`, 'utf8');
    expect(scss).toMatch(/\.ui-data-table__head \.ui-data-table__cell--frozen \{[^}]*position: sticky/);
    expect(scss).toMatch(/\.ui-data-table \.text-end \{\s*text-align: end !important/);
  });
});
