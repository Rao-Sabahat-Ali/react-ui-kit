import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataTable } from './DataTable';
import { bodyRows, names, people, personColumns, type Person } from './DataTable.fixtures';
import type { Column, RowKey } from './types';

const scss = readFileSync(`${process.cwd()}/src/components/DataTable/DataTable.scss`, 'utf8');
const plainColumns: Column<Person>[] = personColumns.map(({ field, header, align }) => ({ field, header, align }));
const headerTexts = () => screen.getAllByRole('columnheader').map((th) => th.textContent);
const th = (id: string) => document.querySelector<HTMLElement>(`[data-column-header="${id}"]`)!;
const handle = (header: string) => screen.getByRole('separator', { name: `Resize ${header}` });

describe('DataTable column resize', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return DOMRect.fromRect({ x: 0, y: 0, width: this.hasAttribute('data-column-header') ? 100 : 0, height: 30 });
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('AC-27: separator handles; pointer drag +40 px grows the column and calls onColumnResize', () => {
    const onColumnResize = vi.fn();
    render(<DataTable caption="People" data={people} columns={plainColumns} resizableColumns onColumnResize={onColumnResize} />);
    expect(screen.getAllByRole('separator')).toHaveLength(4);
    const sep = handle('Team');
    expect(sep).toHaveAttribute('aria-orientation', 'vertical');
    expect(sep).toHaveAttribute('aria-valuenow', '100');
    expect(sep).toHaveAttribute('aria-valuemin', '48');
    fireEvent.pointerDown(sep, { clientX: 200, button: 0 });
    fireEvent.pointerMove(window, { clientX: 240 });
    fireEvent.pointerUp(window, { clientX: 240 });
    expect(th('team').style.width).toBe('140px');
    expect(handle('Team')).toHaveAttribute('aria-valuenow', '140');
    expect(onColumnResize).toHaveBeenCalledTimes(1);
    expect(onColumnResize).toHaveBeenCalledWith({ columnId: 'team', width: 140 });
  });

  it('AC-28: arrow keys resize by 16 / 64 px, clamp at minWidth, mirrored in RTL', async () => {
    const user = userEvent.setup();
    const onColumnResize = vi.fn();
    const { unmount } = render(<DataTable caption="People" data={people} columns={plainColumns} resizableColumns columnResizeMode="expand" onColumnResize={onColumnResize} />);
    handle('Name').focus();
    await user.keyboard('{ArrowRight}');
    expect(handle('Name')).toHaveAttribute('aria-valuenow', '116');
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(handle('Name')).toHaveAttribute('aria-valuenow', '180');
    await user.keyboard('{ArrowLeft}');
    expect(handle('Name')).toHaveAttribute('aria-valuenow', '164');
    expect(onColumnResize).toHaveBeenLastCalledWith({ columnId: 'name', width: 164 });
    await user.keyboard('{Home}');
    expect(handle('Name')).toHaveAttribute('aria-valuenow', '48');
    await user.keyboard('{ArrowLeft}');
    expect(handle('Name')).toHaveAttribute('aria-valuenow', '48');
    unmount();

    render(
      <div dir="rtl">
        <DataTable caption="People" data={people} columns={plainColumns} resizableColumns columnResizeMode="expand" />
      </div>,
    );
    handle('Name').focus();
    await user.keyboard('{ArrowLeft}');
    expect(handle('Name')).toHaveAttribute('aria-valuenow', '116');
  });

  it('AC-29: fit keeps the table width (neighbour shrinks); expand grows the table', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DataTable caption="People" data={people} columns={plainColumns} resizableColumns />);
    handle('Team').focus();
    await user.keyboard('{ArrowRight}');
    expect(th('team').style.width).toBe('116px');
    expect(th('score').style.width).toBe('84px');
    expect(screen.getByRole('table').style.width).toBe('');
    unmount();

    render(<DataTable caption="People" data={people} columns={plainColumns} resizableColumns columnResizeMode="expand" />);
    handle('Team').focus();
    await user.keyboard('{ArrowRight}');
    expect(th('team').style.width).toBe('116px');
    expect(th('score').style.width).toBe('100px');
    expect(screen.getByRole('table').style.width).toBe('416px');
  });
});

describe('DataTable column reorder', () => {
  it('AC-30: dragging a header onto another reorders header and body cells', () => {
    const onColumnOrderChange = vi.fn();
    render(<DataTable caption="People" data={people} columns={plainColumns} reorderableColumns onColumnOrderChange={onColumnOrderChange} />);
    fireEvent.dragStart(th('name'));
    fireEvent.dragOver(th('score'));
    fireEvent.drop(th('score'));
    expect(onColumnOrderChange).toHaveBeenCalledWith(['team', 'score', 'name', 'joined']);
    expect(headerTexts()).toEqual(['Team', 'Score', 'Name', 'Joined']);
    expect(within(bodyRows()[0]!).getAllByRole('cell').map((c) => c.textContent)).toEqual(['Red', '10', 'Anna', people[0]!.joined.toLocaleDateString()]);
  });

  it('AC-31: Alt+Shift+Arrow moves a column, keeps focus and announces; utility columns stay', async () => {
    const user = userEvent.setup();
    const cols: Column<Person>[] = [{ field: 'name', header: 'Name', sortable: true }, ...plainColumns.slice(1)];
    render(<DataTable caption="People" data={people} columns={cols} reorderableColumns selectionMode="multiple" />);
    const nameButton = within(th('name')).getByRole('button', { name: 'Name' });
    nameButton.focus();
    await user.keyboard('{Alt>}{Shift>}{ArrowRight}{/Shift}{/Alt}');
    expect(headerTexts().slice(1)).toEqual(['Team', 'Name', 'Score', 'Joined']);
    expect(within(th('name')).getByRole('button', { name: 'Name' })).toHaveFocus();
    expect(screen.getByText('Name moved to position 2 of 4')).toHaveAttribute('aria-live', 'polite');
    // Non-sortable reorderable columns get a header button too; moving before the first data column is a no-op.
    within(th('team')).getByRole('button', { name: 'Team' }).focus();
    await user.keyboard('{Alt>}{Shift>}{ArrowLeft}{/Shift}{/Alt}');
    await user.keyboard('{Alt>}{Shift>}{ArrowLeft}{/Shift}{/Alt}');
    expect(headerTexts()[0]).toBe(''); // selection column stays first
    expect(headerTexts().slice(1)).toEqual(['Team', 'Name', 'Score', 'Joined']);
  });
});

describe('DataTable frozen column', () => {
  it('AC-32: frozen first column is sticky at inline-start, offset after the selection column', () => {
    render(<DataTable caption="People" data={people} columns={plainColumns} frozenFirstColumn selectionMode="multiple" />);
    const cells = [th('name'), bodyRows()[0]!.querySelector<HTMLElement>('[data-col="name"]')!];
    for (const cell of cells) {
      expect(cell).toHaveClass('ui-data-table__cell--frozen');
      expect(cell.style.getPropertyValue('--ui-data-table-frozen-offset')).toBe('calc(3rem * 1)');
    }
    expect(screen.getAllByRole('columnheader')[0]).toHaveClass('ui-data-table__cell--frozen');
    expect(th('team')).not.toHaveClass('ui-data-table__cell--frozen');
    expect(scss).toMatch(/\.ui-data-table__cell--frozen \{\s*position: sticky;\s*inset-inline-start: var\(--ui-data-table-frozen-offset, 0\)/);
  });

  it('AC-32: Column.frozen works per column', () => {
    render(<DataTable caption="People" data={people} columns={plainColumns.map((c) => (c.field === 'team' ? { ...c, frozen: true } : c))} />);
    expect(th('team')).toHaveClass('ui-data-table__cell--frozen');
    expect(th('team').style.getPropertyValue('--ui-data-table-frozen-offset')).toBe('0px');
  });
});

describe('DataTable row expansion', () => {
  const template = (p: Person) => <p>Details for {p.name}</p>;

  it('AC-33: expander column with "Expand row n" buttons', () => {
    render(<DataTable caption="People" data={people} columns={plainColumns} rowExpansionTemplate={template} />);
    const button = screen.getByRole('button', { name: 'Expand row 1' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('button', { name: /^Expand row/ })).toHaveLength(5);
  });

  it('AC-34: toggling renders a full-width expansion row and calls onRowToggle', async () => {
    const user = userEvent.setup();
    const onRowToggle = vi.fn();
    render(<DataTable caption="People" data={people} columns={plainColumns} rowExpansionTemplate={template} onRowToggle={onRowToggle} />);
    await user.click(screen.getByRole('button', { name: 'Expand row 2' }));
    const button = screen.getByRole('button', { name: 'Collapse row 2' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const row = document.getElementById(button.getAttribute('aria-controls')!)!;
    expect(row).toHaveClass('ui-data-table__expansion');
    expect(row.previousElementSibling).toBe(button.closest('tr'));
    expect(within(row).getByRole('cell')).toHaveAttribute('colspan', '5');
    expect(row).toHaveTextContent('Details for Björn');
    expect(onRowToggle).toHaveBeenLastCalledWith([2]);
    await user.click(button);
    expect(onRowToggle).toHaveBeenLastCalledWith([]);
    expect(screen.queryByText('Details for Björn')).not.toBeInTheDocument();
  });

  it('AC-35: controlled expandedRows survive sorting (keyed by dataKey)', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [expanded, setExpanded] = useState<RowKey[]>([3]);
      return <DataTable caption="People" data={people} columns={personColumns} rowExpansionTemplate={template} expandedRows={expanded} onRowToggle={setExpanded} />;
    }
    render(<Harness />);
    expect(screen.getByText('Details for Carla')).toBeInTheDocument();
    await user.click(within(screen.getByRole('columnheader', { name: /Name/ })).getAllByRole('button')[0]!);
    await user.click(within(screen.getByRole('columnheader', { name: /Name/ })).getAllByRole('button')[0]!);
    expect(names()).toEqual(['Élodie', 'Dan', 'Carla', 'Björn', 'Anna']);
    const expansion = screen.getByText('Details for Carla').closest('tr')!;
    expect(expansion.previousElementSibling).toHaveTextContent('Carla');
  });
});

describe('DataTable column visibility', () => {
  it('AC-36: "Columns" menu with a menuitemcheckbox per column', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" data={people} columns={plainColumns} columnToggle defaultHiddenColumns={['score']} />);
    await user.click(screen.getByRole('button', { name: 'Columns' }));
    const items = screen.getAllByRole('menuitemcheckbox');
    expect(items.map((i) => i.textContent)).toEqual(['Name', 'Team', 'Score', 'Joined']);
    expect(items.map((i) => i.getAttribute('aria-checked'))).toEqual(['true', 'true', 'false', 'true']);
  });

  it('AC-37: unchecking hides the column; hideable:false disabled; last visible column stays', async () => {
    const user = userEvent.setup();
    const onHiddenColumnsChange = vi.fn();
    const cols = plainColumns.map((c) => (c.field === 'name' ? { ...c, hideable: false } : c));
    render(<DataTable caption="People" data={people} columns={cols} columnToggle onHiddenColumnsChange={onHiddenColumnsChange} />);
    await user.click(screen.getByRole('button', { name: 'Columns' }));
    expect(screen.getByRole('menuitemcheckbox', { name: 'Name' })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Team' }));
    expect(onHiddenColumnsChange).toHaveBeenLastCalledWith(['team']);
    expect(headerTexts()).toEqual(['Name', 'Score', 'Joined']);
    expect(within(bodyRows()[0]!).getAllByRole('cell')).toHaveLength(3);
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Score' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Joined' }));
    expect(headerTexts()).toEqual(['Name']);
  });

  it('AC-37: at least one column always stays visible', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" data={people} columns={plainColumns.slice(0, 2)} columnToggle defaultHiddenColumns={['team']} />);
    await user.click(screen.getByRole('button', { name: 'Columns' }));
    expect(screen.getByRole('menuitemcheckbox', { name: 'Name' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitemcheckbox', { name: 'Team' })).not.toHaveAttribute('aria-disabled');
  });
});
