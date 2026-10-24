import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataTable } from './DataTable';
import { names, people, personColumns, type Person } from './DataTable.fixtures';
import { containsBase, filterRows, matchValue } from './filters';
import type { Column, FilterMeta } from './types';

const filterButton = (header: string) => screen.getByRole('button', { name: new RegExp(`^Filter ${header}`) });

async function openFilter(user: ReturnType<typeof userEvent.setup>, header: string) {
  await user.click(filterButton(header));
  return screen.getByRole('dialog', { name: `Filter ${header}` });
}

describe('DataTable filters', () => {
  afterEach(() => vi.useRealTimers());

  it('AC-12: text filter menu with match mode, contains (case-insensitive) and onFilterChange', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<DataTable caption="People" data={people} columns={personColumns} onFilterChange={onFilterChange} />);
    const button = filterButton('Name');
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    const dialog = await openFilter(user, 'Name');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(within(dialog).getByRole('combobox', { name: 'Match mode' })).toHaveValue(String(0));
    const input = within(dialog).getByRole('textbox', { name: 'Filter Name' });
    expect(input).toHaveFocus();
    await user.type(input, 'AR');
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }));
    expect(names()).toEqual(['Carla']);
    expect(onFilterChange).toHaveBeenLastCalledWith({ name: { matchMode: 'contains', value: 'AR' } });
  });

  it('AC-13: startsWith / equals / notEquals / endsWith match modes', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" data={people} columns={personColumns} />);
    const run = async (mode: string, text: string) => {
      const dialog = await openFilter(user, 'Name');
      await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Match mode' }), mode);
      const input = within(dialog).getByRole('textbox', { name: 'Filter Name' });
      await user.clear(input);
      await user.type(input, text);
      await user.click(within(dialog).getByRole('button', { name: 'Apply' }));
      return names();
    };
    expect(await run('Starts with', 'a')).toEqual(['Anna']);
    expect(await run('Ends with', 'a')).toEqual(['Anna', 'Carla']);
    expect(await run('Equals', 'dan')).toEqual(['Dan']);
    expect(await run('Not equals', 'dan')).toEqual(['Anna', 'Björn', 'Carla', 'Élodie']);
  });

  it('AC-14: select filter — `in` keeps rows whose value is one of the selected values', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<DataTable caption="People" data={people} columns={personColumns} onFilterChange={onFilterChange} />);
    const dialog = await openFilter(user, 'Team');
    expect(within(dialog).getByRole('combobox', { name: 'Match mode' })).toHaveDisplayValue('Is one of');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Red' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Green' }));
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }));
    expect(names()).toEqual(['Anna', 'Carla', 'Dan']);
    expect(onFilterChange).toHaveBeenLastCalledWith({ team: { matchMode: 'in', value: ['Red', 'Green'] } });
    // Equals mode uses a Select with the filter options.
    const again = await openFilter(user, 'Team');
    await user.selectOptions(within(again).getByRole('combobox', { name: 'Match mode' }), 'Equals');
    await user.selectOptions(within(again).getByRole('combobox', { name: 'Filter Team' }), 'Blue');
    await user.click(within(again).getByRole('button', { name: 'Apply' }));
    expect(names()).toEqual(['Björn', 'Élodie']);
  });

  it('AC-15: number filter modes incl. inclusive between; non-numeric input ignored', () => {
    const cols = personColumns;
    const run = (filters: FilterMeta) => filterRows(people, { filters, columns: cols, globalFilter: '' }).map((p) => p.name);
    expect(run({ score: { matchMode: 'equals', value: 25 } })).toEqual(['Björn', 'Élodie']);
    expect(run({ score: { matchMode: 'lt', value: 25 } })).toEqual(['Anna']);
    expect(run({ score: { matchMode: 'lte', value: 25 } })).toEqual(['Anna', 'Björn', 'Élodie']);
    expect(run({ score: { matchMode: 'gt', value: 25 } })).toEqual(['Carla']);
    expect(run({ score: { matchMode: 'gte', value: 25 } })).toEqual(['Björn', 'Carla', 'Élodie']);
    expect(run({ score: { matchMode: 'between', value: [10, 25] } })).toEqual(['Anna', 'Björn', 'Élodie']);
    expect(run({ score: { matchMode: 'gt', value: 'abc' } })).toHaveLength(5);
  });

  it('AC-15: number filter through the menu (InputNumber)', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" data={people} columns={personColumns} />);
    const dialog = await openFilter(user, 'Score');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Match mode' }), 'Greater than');
    await user.type(within(dialog).getByRole('spinbutton', { name: 'Filter Score' }), '20');
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }));
    expect(names()).toEqual(['Björn', 'Carla', 'Élodie']);
  });

  it('AC-16: date filter — dateIs (same local day), dateBefore, dateAfter, between', async () => {
    const run = (filters: FilterMeta) => filterRows(people, { filters, columns: personColumns, globalFilter: '' }).map((p) => p.name);
    expect(run({ joined: { matchMode: 'dateIs', value: new Date(2024, 0, 15) } })).toEqual(['Anna', 'Dan']);
    expect(run({ joined: { matchMode: 'dateIsNot', value: new Date(2024, 0, 15) } })).toEqual(['Björn', 'Carla', 'Élodie']);
    expect(run({ joined: { matchMode: 'dateBefore', value: new Date(2024, 0, 15) } })).toEqual(['Élodie']);
    expect(run({ joined: { matchMode: 'dateAfter', value: new Date(2024, 0, 15) } })).toEqual(['Björn', 'Carla']);
    expect(run({ joined: { matchMode: 'between', value: [new Date(2024, 0, 15), new Date(2024, 1, 1)] } })).toEqual(['Anna', 'Björn', 'Dan']);
    // The menu offers an inline calendar.
    const user = userEvent.setup();
    render(<DataTable caption="People" data={people} columns={personColumns} />);
    const dialog = await openFilter(user, 'Joined');
    expect(within(dialog).getByRole('combobox', { name: 'Match mode' })).toHaveDisplayValue('Date is');
    expect(within(dialog).getByRole('grid')).toBeInTheDocument();
  });

  it('AC-17: Clear removes the filter; Escape closes and returns focus to the filter button', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(<DataTable caption="People" data={people} columns={personColumns} defaultFilters={{ name: { matchMode: 'contains', value: 'an' }, score: { matchMode: 'gt', value: 0 } }} onFilterChange={onFilterChange} />);
    expect(names()).toEqual(['Anna']); // Dan has no score
    const dialog = await openFilter(user, 'Name');
    await user.click(within(dialog).getByRole('button', { name: 'Clear' }));
    expect(onFilterChange).toHaveBeenLastCalledWith({ score: { matchMode: 'gt', value: 0 } });
    expect(names()).toEqual(['Anna', 'Björn', 'Carla', 'Élodie']);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await openFilter(user, 'Name');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(filterButton('Name')).toHaveFocus();
  });

  it('AC-18: active filter changes the accessible name and adds the active class', () => {
    render(<DataTable caption="People" data={people} columns={personColumns} defaultFilters={{ name: { matchMode: 'contains', value: 'a' } }} />);
    const button = screen.getByRole('button', { name: 'Filter Name, active' });
    expect(button).toHaveClass('ui-data-table__filter--active');
    expect(screen.getByRole('button', { name: 'Filter Team' })).not.toHaveClass('ui-data-table__filter--active');
  });

  it('AC-19: filtering resets the page to 0 and the paginator total reflects the filtered count', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<DataTable caption="People" data={people} columns={personColumns} paginator defaultPageSize={2} pageSizeOptions={[]} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(names()).toEqual(['Carla', 'Dan']);
    const dialog = await openFilter(user, 'Team');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Blue' }));
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }));
    expect(onPageChange).toHaveBeenLastCalledWith(0, 2);
    expect(names()).toEqual(['Björn', 'Élodie']);
    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument();
    expect(screen.getByText(/of 2/)).toBeInTheDocument();
  });

  it('AC-20: filterDisplay="row" renders a labelled filter input per filterable column', async () => {
    const user = userEvent.setup();
    render(<DataTable caption="People" data={people} columns={personColumns} filterDisplay="row" />);
    const filterRow = document.querySelector('.ui-data-table__filter-row')!;
    expect(filterRow.closest('thead')).not.toBeNull();
    expect(within(filterRow as HTMLElement).getByRole('textbox', { name: 'Filter Name' })).toBeInTheDocument();
    expect(within(filterRow as HTMLElement).getByRole('combobox', { name: 'Filter Team' })).toBeInTheDocument();
    expect(within(filterRow as HTMLElement).getByRole('spinbutton', { name: 'Filter Score' })).toBeInTheDocument();
    expect(within(filterRow as HTMLElement).getByLabelText('Filter Joined')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Filter / })).not.toBeInTheDocument();
    await user.type(within(filterRow as HTMLElement).getByRole('textbox', { name: 'Filter Name' }), 'ar');
    expect(names()).toEqual(['Carla']);
    await user.selectOptions(within(filterRow as HTMLElement).getByRole('combobox', { name: 'Filter Team' }), 'Blue');
    expect(names()).toEqual([]);
  });

  it('AC-21: global filter is case/accent-insensitive across globalFilterFields, AND-ed with column filters', async () => {
    const user = userEvent.setup();
    const onGlobalFilterChange = vi.fn();
    render(
      <DataTable
        caption="People"
        data={people}
        columns={personColumns}
        globalFilterFields={['name', 'team']}
        onGlobalFilterChange={onGlobalFilterChange}
        defaultFilters={{ score: { matchMode: 'gte', value: 25 } }}
      />,
    );
    await user.type(screen.getByRole('searchbox', { name: 'Search table' }), 'ELO');
    expect(onGlobalFilterChange).toHaveBeenLastCalledWith('ELO');
    expect(names()).toEqual(['Élodie']);
    await user.clear(screen.getByRole('searchbox', { name: 'Search table' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search table' }), 'red');
    expect(names()).toEqual(['Carla']); // Anna is Red but fails score >= 25
    expect(containsBase('Björn', 'BJORN', 'en')).toBe(true);
  });

  it('AC-22: custom filterFn replaces the built-in predicate', () => {
    const filterFn = vi.fn((value: unknown, filterValue: unknown) => String(value).length === filterValue);
    const cols: Column<Person>[] = [{ field: 'name', header: 'Name', filterable: true, filterFn }];
    render(<DataTable caption="People" data={people} columns={cols} filters={{ name: { matchMode: 'equals', value: 3 } }} />);
    expect(names()).toEqual(['Dan']);
    expect(filterFn).toHaveBeenCalledWith('Anna', 3, people[0]);
    expect(matchValue('x', { matchMode: 'contains', value: 'X' }, 'text')).toBe(true);
  });
});

describe('DataTable lazy mode', () => {
  afterEach(() => vi.useRealTimers());

  it('AC-23: onLazyLoad on mount with defaults', () => {
    const onLazyLoad = vi.fn();
    render(<DataTable caption="People" data={people.slice(0, 2)} columns={personColumns} lazy paginator defaultPageSize={2} totalRecords={5} onLazyLoad={onLazyLoad} />);
    expect(onLazyLoad).toHaveBeenCalledTimes(1);
    expect(onLazyLoad).toHaveBeenCalledWith({ first: 0, rows: 2, sort: [], filters: {}, globalFilter: '' });
  });

  it('AC-24: page, sort and filter changes call onLazyLoad; data rendered as given', async () => {
    const user = userEvent.setup();
    const onLazyLoad = vi.fn();
    const pageData = [people[2]!, people[0]!];
    render(<DataTable caption="People" data={pageData} columns={personColumns} lazy paginator defaultPageSize={2} pageSizeOptions={[]} totalRecords={5} onLazyLoad={onLazyLoad} />);
    expect(names()).toEqual(['Carla', 'Anna']);
    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(onLazyLoad).toHaveBeenLastCalledWith(expect.objectContaining({ first: 2, rows: 2 }));
    await user.click(within(screen.getByRole('columnheader', { name: /Name/ })).getAllByRole('button')[0]!);
    expect(onLazyLoad).toHaveBeenLastCalledWith(expect.objectContaining({ first: 0, sort: [{ field: 'name', order: 1 }] }));
    expect(names()).toEqual(['Carla', 'Anna']); // no client-side sort
    const dialog = await openFilter(user, 'Name');
    await user.type(within(dialog).getByRole('textbox', { name: 'Filter Name' }), 'zzz');
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }));
    expect(onLazyLoad).toHaveBeenLastCalledWith(expect.objectContaining({ first: 0, filters: { name: { matchMode: 'contains', value: 'zzz' } } }));
    expect(names()).toEqual(['Carla', 'Anna']); // no client-side filter
  });

  it('AC-25: global filter typing is debounced (300 ms)', async () => {
    vi.useFakeTimers();
    const onLazyLoad = vi.fn();
    render(<DataTable caption="People" data={people} columns={personColumns} lazy globalFilterInput totalRecords={5} onLazyLoad={onLazyLoad} />);
    onLazyLoad.mockClear();
    const search = screen.getByRole('searchbox', { name: 'Search table' });
    for (const value of ['a', 'ab', 'abc']) {
      fireEvent.change(search, { target: { value } });
      act(() => {
        vi.advanceTimersByTime(100);
      });
    }
    expect(onLazyLoad).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(onLazyLoad).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onLazyLoad).toHaveBeenCalledTimes(1);
    expect(onLazyLoad).toHaveBeenCalledWith(expect.objectContaining({ globalFilter: 'abc', first: 0 }));
  });

  it('AC-26: lazy paginator uses totalRecords', () => {
    function Harness() {
      const [rows] = useState(people.slice(0, 2));
      return <DataTable caption="People" data={rows} columns={personColumns} lazy paginator defaultPageSize={2} pageSizeOptions={[]} totalRecords={50} onLazyLoad={() => {}} />;
    }
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Page 25' })).toBeInTheDocument();
    expect(screen.getByText(/of 50/)).toBeInTheDocument();
  });
});
