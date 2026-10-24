import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../locale/LocaleProvider';
import { DataTable } from './DataTable';
import { bodyRows, names, people, type Person } from './DataTable.fixtures';
import type { CellEditorContext, Column } from './types';

const textEditor = ({ value, onChange, 'aria-label': label }: CellEditorContext<Person>) => (
  <input aria-label={label} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
);
const unlabelledEditor = ({ value, onChange }: CellEditorContext<Person>) => <input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />;

const editColumns: Column<Person>[] = [
  { field: 'name', header: 'Name', editor: textEditor },
  { field: 'team', header: 'Team', editor: unlabelledEditor, editable: (p) => p.team !== 'Green' },
  { field: 'score', header: 'Score', editor: textEditor, editable: false },
];
const cell = (rowIndex: number, col: string) => bodyRows()[rowIndex]!.querySelector<HTMLElement>(`[data-col="${col}"]`)!;

describe('DataTable inline editing', () => {
  it('AC-47: click / Enter / F2 opens the editor with focus, labelled "{header}, row {n}"', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" data={people} columns={editColumns} editMode="cell" />);
    await user.click(cell(0, 'name'));
    expect(screen.getByRole('textbox', { name: 'Name, row 1' })).toHaveFocus();
    await user.keyboard('{Escape}');
    cell(1, 'team').focus();
    await user.keyboard('{Enter}');
    // Editors that ignore the label still get it.
    expect(screen.getByRole('textbox', { name: 'Team, row 2' })).toHaveFocus();
    await user.keyboard('{Escape}');
    cell(2, 'name').focus();
    await user.keyboard('{F2}');
    expect(screen.getByRole('textbox', { name: 'Name, row 3' })).toHaveFocus();
  });

  it('AC-48: Enter commits and returns focus; returning false keeps the editor open and invalid', async () => {
    const user = userEvent.setup();
    const onCellEditComplete = vi.fn().mockReturnValueOnce(false).mockReturnValue(undefined);
    render(<DataTable caption="People" data={people} columns={editColumns} editMode="cell" onCellEditComplete={onCellEditComplete} />);
    await user.click(cell(0, 'name'));
    await user.keyboard('{Control>}a{/Control}Annie{Enter}');
    expect(onCellEditComplete).toHaveBeenLastCalledWith({ row: people[0], field: 'name', value: 'Anna', newValue: 'Annie', rowIndex: 0 });
    const editor = screen.getByRole('textbox', { name: 'Name, row 1' });
    expect(editor).toHaveAttribute('aria-invalid', 'true');
    await user.keyboard('{Enter}');
    expect(onCellEditComplete).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(cell(0, 'name')).toHaveFocus();
  });

  it('AC-49: Escape cancels and restores; blur outside commits', async () => {
    const user = userEvent.setup();
    const onCellEditCancel = vi.fn();
    const onCellEditComplete = vi.fn();
    render(
      <>
        <button type="button">Outside</button>
        <DataTable caption="People" data={people} columns={editColumns} editMode="cell" onCellEditCancel={onCellEditCancel} onCellEditComplete={onCellEditComplete} />
      </>,
    );
    await user.click(cell(0, 'name'));
    await user.keyboard('xyz{Escape}');
    expect(onCellEditCancel).toHaveBeenCalledWith({ row: people[0], field: 'name' });
    expect(onCellEditComplete).not.toHaveBeenCalled();
    expect(cell(0, 'name')).toHaveTextContent('Anna');
    expect(cell(0, 'name')).toHaveFocus();
    await user.click(cell(1, 'name'));
    await user.keyboard('{End}!');
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(onCellEditComplete).toHaveBeenCalledWith(expect.objectContaining({ field: 'name', newValue: 'Björn!' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('AC-50: Tab commits and edits the next editable cell; Shift+Tab previous; non-editable never open', async () => {
    const user = userEvent.setup();
    const onCellEditComplete = vi.fn();
    render(<DataTable caption="People" data={people} columns={editColumns} editMode="cell" onCellEditComplete={onCellEditComplete} />);
    await user.click(cell(2, 'name'));
    await user.keyboard('{Tab}');
    expect(onCellEditComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox', { name: 'Team, row 3' })).toHaveFocus();
    await user.keyboard('{Tab}');
    // Score is never editable → next row's Name.
    expect(screen.getByRole('textbox', { name: 'Name, row 4' })).toHaveFocus();
    await user.keyboard('{Tab}');
    // Dan's team is Green → predicate false → skip to row 5.
    expect(screen.getByRole('textbox', { name: 'Name, row 5' })).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('textbox', { name: 'Name, row 4' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await user.click(cell(0, 'score'));
    await user.click(cell(3, 'team'));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('AC-51: row editing with Edit / Save / Cancel', async () => {
    const user = userEvent.setup();
    const onRowEditSave = vi.fn();
    const onRowEditCancel = vi.fn();
    render(<DataTable caption="People" data={people} columns={editColumns} editMode="row" onRowEditSave={onRowEditSave} onRowEditCancel={onRowEditCancel} />);
    await user.click(screen.getByRole('button', { name: 'Edit row 1' }));
    const name = screen.getByRole('textbox', { name: 'Name, row 1' });
    await user.clear(name);
    await user.type(name, 'Ann');
    await user.click(screen.getByRole('button', { name: 'Save row 1' }));
    expect(onRowEditSave).toHaveBeenCalledWith({ row: people[0], newRow: { ...people[0], name: 'Ann' } });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit row 2' }));
    await user.type(screen.getByRole('textbox', { name: 'Name, row 2' }), 'zz');
    await user.click(screen.getByRole('button', { name: 'Cancel editing row 2' }));
    expect(onRowEditCancel).toHaveBeenCalledWith({ row: people[1], newRow: { ...people[1], name: 'Björnzz' } });
    expect(cell(1, 'name')).toHaveTextContent('Björn');
  });
});

describe('DataTable virtual scroll', () => {
  const many: Person[] = Array.from({ length: 10_000 }, (_, i) => ({ id: i, name: `Person ${i}`, team: 'Red', score: i, joined: new Date(2024, 0, 1) }));
  const cols: Column<Person>[] = [
    { field: 'name', header: 'Name', sortable: true },
    { field: 'score', header: 'Score' },
  ];

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 400 });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    // @ts-expect-error restore jsdom default
    delete HTMLElement.prototype.clientHeight;
  });

  const viewport = () => document.querySelector<HTMLElement>('.ui-data-table__viewport')!;
  const scrollTo = (top: number) =>
    act(() => {
      viewport().scrollTop = top;
      viewport().dispatchEvent(new Event('scroll'));
    });

  it('AC-52: renders only the visible window via VirtualScroller; scrolling updates rows', () => {
    render(<DataTable caption="Many" data={many} columns={cols} virtualScroll={{ itemSize: 40 }} scrollHeight="400px" />);
    expect(viewport()).toHaveClass('ui-virtual-scroller');
    const rows = () => within(viewport()).getAllByRole('row');
    expect(rows().length).toBeLessThan(50);
    expect(screen.getByText('Person 0')).toBeInTheDocument();
    scrollTo(40 * 5000);
    expect(screen.getByText('Person 5000')).toBeInTheDocument();
    expect(screen.queryByText('Person 0')).not.toBeInTheDocument();
    expect(rows().length).toBeLessThan(50);
  });

  it('AC-53: aria-rowcount / aria-rowindex; header stays outside the scrolling body', () => {
    render(<DataTable caption="Many" data={many} columns={cols} virtualScroll={{ itemSize: 40 }} scrollHeight="400px" />);
    const table = screen.getByRole('table', { name: 'Many' });
    expect(table).toHaveAttribute('aria-rowcount', '10001');
    expect(within(table).getAllByRole('row')[0]).toHaveAttribute('aria-rowindex', '1');
    expect(screen.getByText('Person 0').closest('[role="row"]')).toHaveAttribute('aria-rowindex', '2');
    scrollTo(40 * 100);
    expect(screen.getByText('Person 100').closest('[role="row"]')).toHaveAttribute('aria-rowindex', '102');
    const headerRow = screen.getByRole('columnheader', { name: /Name/ }).closest('[role="row"]')!;
    expect(viewport().contains(headerRow)).toBe(false);
  });

  it('AC-54: paginator is ignored with a warning; lazy + virtual loads the visible window', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { unmount } = render(<DataTable caption="Many" data={many} columns={cols} virtualScroll={{ itemSize: 40 }} scrollHeight="400px" paginator />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('paginator'));
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    unmount();

    const onLazyLoad = vi.fn();
    render(<DataTable caption="Lazy" data={many.slice(0, 20)} columns={cols} lazy totalRecords={10_000} virtualScroll={{ itemSize: 40, overscan: 2 }} scrollHeight="400px" onLazyLoad={onLazyLoad} />);
    expect(onLazyLoad).toHaveBeenLastCalledWith({ first: 0, rows: 12, sort: [], filters: {}, globalFilter: '' });
    scrollTo(40 * 1000);
    expect(onLazyLoad).toHaveBeenLastCalledWith(expect.objectContaining({ first: 998, rows: 14 }));
    // Rows not loaded yet render as skeleton placeholders.
    expect(within(viewport()).getAllByRole('row')[0]).toHaveClass('ui-data-table__loading-row');
  });
});

describe('DataTable row grouping', () => {
  const cols: Column<Person>[] = [
    { field: 'name', header: 'Name', sortable: true },
    { field: 'team', header: 'Team', sortable: true },
  ];
  const groupHeaders = () => Array.from(document.querySelectorAll('.ui-data-table__group-header'));

  it('AC-55: group header rows (th scope=rowgroup spanning all columns) with templates', () => {
    const header = vi.fn((value: unknown, rows: Person[]) => `${String(value)} (${rows.length})`);
    render(<DataTable caption="People" data={people} columns={cols} groupBy="team" groupHeaderTemplate={header} groupFooterTemplate={(v, rows) => `Total ${String(v)}: ${rows.length}`} />);
    expect(groupHeaders().map((g) => g.textContent)).toEqual(['Blue (2)', 'Green (1)', 'Red (2)']);
    const th = groupHeaders()[0]!.querySelector('th')!;
    expect(th).toHaveAttribute('scope', 'rowgroup');
    expect(th).toHaveAttribute('colspan', '2');
    expect(groupHeaders()[0]!.nextElementSibling).toHaveTextContent('Björn');
    expect(screen.getByText('Total Blue: 2').closest('tr')).toHaveClass('ui-data-table__group-footer');
  });

  it('AC-56: expandableGroups toggles group rows', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" data={people} columns={cols} groupBy="team" expandableGroups />);
    const toggle = within(groupHeaders()[0] as HTMLElement).getByRole('button', { name: 'Blue' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(names()).toEqual(['Dan', 'Anna', 'Carla']);
    await user.click(toggle);
    expect(names()).toHaveLength(5);
  });

  it('AC-57: sorting keeps the group field as the primary key', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" data={people} columns={cols} groupBy="team" />);
    const sortName = within(screen.getByRole('columnheader', { name: /Name/ })).getByRole('button');
    await user.click(sortName);
    await user.click(sortName);
    expect(names()).toEqual(['Élodie', 'Björn', 'Dan', 'Carla', 'Anna']);
    expect(groupHeaders().map((g) => g.textContent)).toEqual(['Blue', 'Green', 'Red']);
  });
});

describe('DataTable cell keyboard navigation', () => {
  const cols: Column<Person>[] = [
    { field: 'name', header: 'Name', sortable: true },
    { field: 'team', header: 'Team' },
    { field: 'score', header: 'Score' },
  ];
  const grid = () => screen.getByRole('grid', { name: 'People' });
  const focusedText = () => (document.activeElement as HTMLElement).textContent;

  it('AC-58: role="grid", a single tab stop, Tab enters and leaves', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Before</button>
        <DataTable caption="People" data={people} columns={cols} cellNavigation selectionMode="multiple" />
        <button type="button">After</button>
      </>,
    );
    expect(grid()).toBeInTheDocument();
    expect(grid().querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Before' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getAllByRole('columnheader')[0]);
    await user.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  it('AC-59: arrows, Home/End, Ctrl+Home/End, PageUp/PageDown; RTL mirrors', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DataTable caption="People" data={people} columns={cols} cellNavigation />);
    await user.tab();
    expect(focusedText()).toBe('Name');
    await user.keyboard('{ArrowDown}');
    expect(focusedText()).toBe('Anna');
    expect(document.activeElement).toHaveAttribute('role', 'gridcell');
    await user.keyboard('{ArrowRight}');
    expect(focusedText()).toBe('Red');
    await user.keyboard('{End}');
    expect(focusedText()).toBe('10');
    await user.keyboard('{Home}');
    expect(focusedText()).toBe('Anna');
    await user.keyboard('{Control>}{End}{/Control}');
    expect(focusedText()).toBe('25');
    await user.keyboard('{Control>}{Home}{/Control}');
    expect(focusedText()).toBe('Name');
    await user.keyboard('{PageDown}');
    expect(focusedText()).toBe('Élodie');
    await user.keyboard('{PageUp}');
    expect(focusedText()).toBe('Name');
    await user.keyboard('{ArrowUp}{ArrowLeft}');
    expect(focusedText()).toBe('Name');
    expect(grid().querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    unmount();

    render(
      <LocaleProvider locale="ar">
        <DataTable caption="People" data={people} columns={cols} cellNavigation />
      </LocaleProvider>,
    );
    await user.tab();
    await user.keyboard('{ArrowDown}{ArrowLeft}');
    expect(focusedText()).toBe('Red');
  });

  it('AC-60: cell content is tabindex -1 until Enter; Escape returns to the cell', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" data={people} columns={cols} cellNavigation selectionMode="multiple" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Select row 1' });
    expect(checkbox).toHaveAttribute('tabindex', '-1');
    expect(within(screen.getAllByRole('columnheader')[1]!).getByRole('button')).toHaveAttribute('tabindex', '-1');
    await user.tab();
    await user.keyboard('{ArrowDown}');
    const cellEl = checkbox.closest('td')!;
    expect(cellEl).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(checkbox).toHaveFocus();
    expect(checkbox).not.toHaveAttribute('tabindex', '-1');
    await user.keyboard('{Escape}');
    expect(cellEl).toHaveFocus();
    expect(checkbox).toHaveAttribute('tabindex', '-1');
    // Space toggles row selection from the cell.
    await user.keyboard(' ');
    expect(checkbox).toBeChecked();
  });

  it('AC-60: Enter on an editable cell in grid mode starts editing', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" data={people} columns={[{ field: 'name', header: 'Name', editor: textEditor }]} cellNavigation editMode="cell" />);
    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toHaveAttribute('aria-readonly', 'false');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('textbox', { name: 'Name, row 1' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(focusedText()).toBe('Anna');
  });
});

describe('DataTable context menu', () => {
  const cols: Column<Person>[] = [
    { field: 'name', header: 'Name' },
    { field: 'team', header: 'Team' },
  ];

  it('AC-61: right-click and Shift+F10 open the ContextMenu with row items', async () => {
    const user = userEvent.setup();
    const onContextMenu = vi.fn();
    const items = vi.fn((p: Person) => [{ label: `Open ${p.name}` }, { label: 'Delete' }]);
    render(<DataTable caption="People" data={people} columns={cols} contextMenu={items} onContextMenu={onContextMenu} />);
    fireEvent.contextMenu(screen.getByText('Carla'), { clientX: 10, clientY: 20 });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Open Carla' })).toBeInTheDocument();
    expect(items).toHaveBeenCalledWith(people[2]);
    expect(onContextMenu).toHaveBeenCalledWith({ row: people[2], originalEvent: expect.anything() });
    expect(bodyRows()[2]).toHaveClass('ui-data-table__row--context');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(bodyRows()[2]).not.toHaveClass('ui-data-table__row--context');

    bodyRows()[1]!.focus();
    await user.keyboard('{Shift>}{F10}{/Shift}');
    expect(screen.getByRole('menuitem', { name: 'Open Björn' })).toBeInTheDocument();
  });

  it('AC-61: ContextMenu key on a focused grid cell', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" data={people} columns={cols} cellNavigation contextMenu={[{ label: 'Inspect' }]} />);
    await user.tab();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    fireEvent.keyDown(document.activeElement!, { key: 'ContextMenu' });
    expect(screen.getByRole('menuitem', { name: 'Inspect' })).toBeInTheDocument();
    expect(bodyRows()[1]).toHaveClass('ui-data-table__row--context');
  });

  it('AC-62: command receives the row; Escape returns focus to the origin', async () => {
    const user = userEvent.setup();
    const command = vi.fn();
    render(<DataTable caption="People" data={people} columns={cols} cellNavigation contextMenu={[{ label: 'Archive', command }]} />);
    await user.tab();
    await user.keyboard('{ArrowDown}{ArrowRight}');
    const origin = document.activeElement as HTMLElement;
    await user.keyboard('{Shift>}{F10}{/Shift}');
    expect(screen.getByRole('menuitem', { name: 'Archive' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(origin).toHaveFocus();
    await user.keyboard('{Shift>}{F10}{/Shift}');
    await user.click(screen.getByRole('menuitem', { name: 'Archive' }));
    expect(command).toHaveBeenCalledWith(expect.objectContaining({ row: people[0], item: expect.objectContaining({ label: 'Archive' }) }));
  });
});
