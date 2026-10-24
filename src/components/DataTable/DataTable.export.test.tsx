import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataTable } from './DataTable';
import { names, people, personColumns, type Person } from './DataTable.fixtures';
import { escapeCsvValue } from './csv';
import { readState, serializeState } from './state';
import type { Column, DataTableHandle } from './types';

const cols: Column<Person>[] = [
  { field: 'name', header: 'Name', sortable: true },
  { field: 'team', header: <span>Team</span> },
  { field: 'score', header: 'Score', sortable: true },
];

const sortBy = async (user: ReturnType<typeof userEvent.setup>, header: string) =>
  user.click(within(screen.getByRole('columnheader', { name: new RegExp(header) })).getAllByRole('button')[0]!);

describe('DataTable CSV export', () => {
  afterEach(() => vi.restoreAllMocks());

  it('AC-38: header row + all rows in sort/filter order, CRLF separated', async () => {
    const user = userEvent.setup();
    const ref = createRef<DataTableHandle>();
    render(<DataTable ref={ref} caption="People" data={people} columns={cols} paginator defaultPageSize={2} defaultFilters={{ team: { matchMode: 'notEquals', value: 'green' } }} />);
    await sortBy(user, 'Score');
    await sortBy(user, 'Score');
    const csv = ref.current!.exportCsv({ download: false });
    expect(csv).toBe(['Name,Team,Score', 'Carla,Red,40', 'Björn,Blue,25', 'Élodie,Blue,25', 'Anna,Red,10'].join('\r\n'));
  });

  it('AC-39: RFC 4180 quoting; null/undefined empty', () => {
    expect(escapeCsvValue('He said "hi"')).toBe('"He said ""hi"""');
    expect(escapeCsvValue('a,b')).toBe('"a,b"');
    expect(escapeCsvValue('line\nbreak')).toBe('"line\nbreak"');
    expect(escapeCsvValue(null)).toBe('');
    expect(escapeCsvValue(undefined)).toBe('');
    const ref = createRef<DataTableHandle>();
    render(<DataTable ref={ref} caption="X" data={[{ id: 1, name: 'Smith, "J"', team: 'R', score: null, joined: new Date(0) }]} columns={cols} />);
    expect(ref.current!.exportCsv({ download: false }).split('\r\n')[1]).toBe('"Smith, ""J""",R,');
  });

  it('AC-40: formula-injection guard; numbers exempt', () => {
    expect(escapeCsvValue('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(escapeCsvValue('+1')).toBe("'+1");
    expect(escapeCsvValue('-1')).toBe("'-1");
    expect(escapeCsvValue('@cmd')).toBe("'@cmd");
    expect(escapeCsvValue('\tx')).toBe("'\tx");
    expect(escapeCsvValue('\rx')).toBe('"\'\rx"');
    expect(escapeCsvValue(-5)).toBe('-5');
  });

  it('AC-41: exportValue, exportable:false, hidden columns and selectionOnly', () => {
    const ref = createRef<DataTableHandle>();
    const columns: Column<Person>[] = [
      { field: 'name', header: 'Name', exportValue: (p) => p.name.toUpperCase() },
      { field: 'team', header: 'Team', exportable: false },
      { field: 'score', header: 'Score' },
      { field: 'joined', header: 'Joined' },
    ];
    render(<DataTable ref={ref} caption="People" data={people} columns={columns} defaultHiddenColumns={['joined']} selectionMode="multiple" defaultSelection={[3, 1]} />);
    expect(ref.current!.exportCsv({ download: false, selectionOnly: true })).toBe(['Name,Score', 'ANNA,10', 'CARLA,40'].join('\r\n'));
  });

  it('AC-42: download creates a UTF-8 CSV Blob with BOM named {exportFilename}.csv', async () => {
    let blob: Blob | null = null;
    const createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return 'blob:x';
    });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    let downloaded = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloaded = this.download;
    });
    const ref = createRef<DataTableHandle>();
    render(<DataTable ref={ref} caption="People" data={people} columns={cols} exportFilename="people" />);
    const csv = ref.current!.exportCsv();
    expect(downloaded).toBe('people.csv');
    expect(blob!.type).toBe('text/csv;charset=utf-8');
    const bytes = new Uint8Array(await blob!.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe(csv);
    ref.current!.exportCsv({ filename: 'other' });
    expect(downloaded).toBe('other.csv');
  });
});

describe('DataTable state persistence', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  const stored = (storage: Storage = sessionStorage) => JSON.parse(storage.getItem('users') ?? 'null');

  it('AC-43: changes are written to sessionStorage (localStorage with stateStorage="local")', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DataTable caption="People" data={people} columns={personColumns} stateKey="users" paginator defaultPageSize={2} pageSizeOptions={[]} />);
    expect(sessionStorage.getItem('users')).toBeNull();
    await sortBy(user, 'Name');
    expect(stored().sort).toEqual([{ field: 'name', order: 1 }]);
    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(stored().page).toBe(1);
    await user.click(screen.getByRole('button', { name: /^Filter Team/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Red' }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(stored().filters).toEqual({ team: { matchMode: 'in', value: ['Red'] } });
    expect(stored().page).toBe(0);
    expect(stored()).toEqual(expect.objectContaining({ pageSize: 2, columnOrder: ['name', 'team', 'score', 'joined'], hiddenColumns: [], expandedRows: [], columnWidths: {}, globalFilter: '' }));
    unmount();

    render(<DataTable caption="People" data={people} columns={personColumns} stateKey="users" stateStorage="local" columnToggle />);
    await user.click(screen.getByRole('button', { name: 'Columns' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Team' }));
    expect(stored(localStorage).hiddenColumns).toEqual(['team']);
  });

  it('AC-43: date filter values round-trip through storage', () => {
    const text = serializeState({ filters: { joined: { matchMode: 'dateIs', value: new Date(2024, 0, 15) } } });
    sessionStorage.setItem('users', text);
    const state = readState('users', 'session', ['joined']);
    expect(state.filters!.joined!.value).toBeInstanceOf(Date);
    expect((state.filters!.joined!.value as Date).getDate()).toBe(15);
  });

  it('AC-44: remount restores state before the first lazy load; controlled props win', () => {
    sessionStorage.setItem('users', serializeState({ sort: [{ field: 'score', order: -1 }], page: 2, pageSize: 10, filters: { name: { matchMode: 'contains', value: 'a' } }, globalFilter: 'x', hiddenColumns: ['team'] }));
    const onLazyLoad = vi.fn();
    const { unmount } = render(<DataTable caption="People" data={people} columns={personColumns} stateKey="users" lazy paginator totalRecords={100} onLazyLoad={onLazyLoad} />);
    expect(onLazyLoad).toHaveBeenCalledTimes(1);
    expect(onLazyLoad).toHaveBeenCalledWith({ first: 20, rows: 10, sort: [{ field: 'score', order: -1 }], filters: { name: { matchMode: 'contains', value: 'a' } }, globalFilter: 'x' });
    expect(screen.queryByRole('columnheader', { name: /Team/ })).not.toBeInTheDocument();
    unmount();

    render(<DataTable caption="People" data={people} columns={personColumns} stateKey="users" sort={[]} hiddenColumns={[]} />);
    expect(screen.getByRole('columnheader', { name: /Team/ })).toBeInTheDocument();
    expect(names()).toEqual([]); // uncontrolled stored filters (name ~ 'a', global 'x') still apply
  });

  it('AC-45: corrupt / mismatched JSON ignored, unknown ids dropped, storage errors caught', () => {
    sessionStorage.setItem('users', '{not json');
    expect(() => render(<DataTable caption="A" data={people} columns={personColumns} stateKey="users" />)).not.toThrow();
    expect(names()).toHaveLength(5);
    document.body.innerHTML = '';

    sessionStorage.setItem('users', JSON.stringify({ v: 99, page: 3 }));
    expect(readState('users', 'session', ['name'])).toEqual({});
    sessionStorage.setItem('users', JSON.stringify({ v: 1, page: 'x', sort: 'bad', columnOrder: ['ghost', 'score', 'name'], columnWidths: { ghost: 10, name: 120, team: -1 }, hiddenColumns: ['ghost'] }));
    expect(readState('users', 'session', ['name', 'team', 'score'])).toEqual({ columnOrder: ['score', 'name'], columnWidths: { name: 120 }, hiddenColumns: [] });

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => render(<DataTable caption="B" data={people} columns={personColumns} stateKey="users" defaultSort={[]} />)).not.toThrow();
  });

  it('AC-46: resetState removes the entry and restores defaults', async () => {
    const user = userEvent.setup();
    const ref = createRef<DataTableHandle>();
    render(<DataTable ref={ref} caption="People" data={people} columns={personColumns} stateKey="users" />);
    await sortBy(user, 'Name');
    await sortBy(user, 'Name');
    expect(names()[0]).toBe('Élodie');
    expect(sessionStorage.getItem('users')).not.toBeNull();
    act(() => ref.current!.resetState());
    expect(sessionStorage.getItem('users')).toBeNull();
    expect(names()).toEqual(['Anna', 'Björn', 'Carla', 'Dan', 'Élodie']);
    expect(ref.current!.getElement()).toBe(screen.getByRole('table'));
  });
});
