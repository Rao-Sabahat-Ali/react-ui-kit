import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Scheduler, type SchedulerProps } from './Scheduler';
import type { SchedulerEvent } from './schedulerUtils';

const D = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const anchor = D(2026, 10, 15);
const time = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' });
const range = (a: Date, b: Date) => `${time.format(a)} – ${time.format(b)}`;

const setup = (props: Partial<SchedulerProps> = {}) => render(<Scheduler defaultDate={anchor} firstDayOfWeek={0} {...props} />);
const cell = (label: RegExp | string) => screen.getByRole('gridcell', { name: label });
const activeCell = () => screen.getAllByRole('gridcell').filter((c) => c.getAttribute('tabindex') === '0');
const lastCall = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)![0] as Date;

afterEach(() => vi.useRealTimers());

describe('Scheduler', () => {
  it('AC-1: month grid has 7 Intl column headers starting at firstDayOfWeek and 5 or 6 week rows', () => {
    const { unmount } = setup({ firstDayOfWeek: 1 });
    expect(screen.getByRole('grid')).toBeInTheDocument();
    const heads = screen.getAllByRole('columnheader').map((h) => h.textContent);
    const fmt = new Intl.DateTimeFormat('en', { weekday: 'short' });
    expect(heads).toEqual([2, 3, 4, 5, 6, 7, 8].map((d) => fmt.format(new Date(2023, 0, d)))); // Mon..Sun
    expect(heads).toHaveLength(7);
    expect(screen.getAllByRole('row')).toHaveLength(1 + 5);
    unmount();
    setup({ defaultDate: D(2026, 8, 10), firstDayOfWeek: 0 });
    expect(screen.getAllByRole('row')).toHaveLength(1 + 6);
  });

  it('AC-2: title shows the month, and the week range in week view', () => {
    const { unmount } = setup();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('October 2026');
    unmount();
    setup({ defaultView: 'week' });
    const expected = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).formatRange(D(2026, 10, 11), D(2026, 10, 17));
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(expected);
    expect(screen.getByRole('grid').getAttribute('aria-labelledby')).toBe(screen.getByRole('heading', { level: 2 }).id);
  });

  it("AC-3: today's cell has aria-current and exactly one cell is tabbable", () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(D(2026, 10, 20, 12));
    setup();
    expect(cell(/Tuesday, October 20, 2026/)).toHaveAttribute('aria-current', 'date');
    expect(document.querySelectorAll('[aria-current="date"]')).toHaveLength(1);
    expect(activeCell()).toHaveLength(1);
    expect(activeCell()[0]).toHaveAccessibleName(/Thursday, October 15, 2026/);
  });

  it('AC-4: arrow keys move focus by day/week; crossing the month calls onDateChange', async () => {
    const onDateChange = vi.fn();
    setup({ defaultDate: D(2026, 10, 30), onDateChange });
    const user = userEvent.setup();
    activeCell()[0]!.focus();
    await user.keyboard('{ArrowLeft}');
    expect(cell(/October 29, 2026/)).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(onDateChange).toHaveBeenLastCalledWith(D(2026, 11, 5));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('November 2026');
    expect(cell(/Thursday, November 5, 2026/)).toHaveFocus();
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(lastCall(onDateChange)).toEqual(D(2026, 10, 29));
    expect(cell(/Thursday, October 22, 2026/)).toHaveFocus();
  });

  it('AC-5: PageUp/PageDown, Shift+Page and Home/End', async () => {
    const onDateChange = vi.fn();
    setup({ onDateChange });
    const user = userEvent.setup();
    activeCell()[0]!.focus();
    await user.keyboard('{Home}');
    expect(cell(/Sunday, October 11, 2026/)).toHaveFocus();
    await user.keyboard('{End}');
    expect(cell(/Saturday, October 17, 2026/)).toHaveFocus();
    await user.keyboard('{PageDown}');
    expect(lastCall(onDateChange)).toEqual(D(2026, 11, 17));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('November 2026');
    await user.keyboard('{PageUp}{PageUp}');
    expect(lastCall(onDateChange)).toEqual(D(2026, 9, 17));
    await user.keyboard('{Shift>}{PageUp}{/Shift}');
    expect(lastCall(onDateChange)).toEqual(D(2025, 9, 17));
    expect(cell(/September 17, 2025/)).toHaveFocus();
  });

  it('AC-5: week view PageDown moves by one week', async () => {
    const onDateChange = vi.fn();
    setup({ defaultView: 'week', onDateChange });
    const user = userEvent.setup();
    activeCell()[0]!.focus();
    await user.keyboard('{PageDown}');
    expect(lastCall(onDateChange)).toEqual(D(2026, 10, 22));
  });

  it('AC-6: in RTL ArrowLeft moves to the next day and ArrowRight to the previous', async () => {
    render(
      <div dir="rtl">
        <Scheduler defaultDate={anchor} firstDayOfWeek={0} />
      </div>,
    );
    const user = userEvent.setup();
    activeCell()[0]!.focus();
    await user.keyboard('{ArrowLeft}');
    expect(cell(/October 16, 2026/)).toHaveFocus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(cell(/October 14, 2026/)).toHaveFocus();
  });

  it('AC-7: Today button focuses today; prev/next buttons are named per view', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(D(2026, 10, 20, 12));
    const onDateChange = vi.fn();
    setup({ onDateChange, defaultDate: D(2026, 12, 5) });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(lastCall(onDateChange)).toEqual(D(2026, 10, 20));
    expect(cell(/Tuesday, October 20, 2026/)).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('November 2026');
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('October 2026');
  });

  it('AC-7: week view uses week labels', () => {
    setup({ defaultView: 'week' });
    expect(screen.getByRole('button', { name: 'Previous week' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next week' })).toBeInTheDocument();
  });

  it('AC-8: events render as buttons in the days they span with title and time range', () => {
    const events: SchedulerEvent[] = [
      { id: 'a', title: 'Standup', start: D(2026, 10, 20, 9), end: D(2026, 10, 20, 9, 30) },
      { id: 'b', title: 'Conference', start: D(2026, 10, 12), end: D(2026, 10, 15), allDay: true },
    ];
    setup({ events });
    expect(within(cell(/October 20, 2026/)).getByRole('button', { name: `Standup, ${range(D(2026, 10, 20, 9), D(2026, 10, 20, 9, 30))}` })).toBeInTheDocument();
    for (const d of [12, 13, 14]) expect(within(cell(new RegExp(`October ${d}, 2026`))).getByRole('button', { name: 'Conference, All day' })).toBeInTheDocument();
    expect(within(cell(/October 15, 2026/)).queryByRole('button')).not.toBeInTheDocument();
    expect(within(cell(/October 11, 2026/)).queryByRole('button')).not.toBeInTheDocument();
    expect(cell(/October 20, 2026/)).toHaveAccessibleName(/1 event/);
  });

  it('AC-8: description is exposed via aria-describedby', () => {
    setup({ events: [{ id: 'a', title: 'Review', start: D(2026, 10, 20, 9), end: D(2026, 10, 20, 10), description: 'Bring slides' }] });
    expect(screen.getByRole('button', { name: /Review/ })).toHaveAccessibleDescription('Bring slides');
  });

  it('AC-9: click or Enter on an event calls onEventClick once; Enter/Space on a cell calls onDateSelect', async () => {
    const onEventClick = vi.fn();
    const onDateSelect = vi.fn();
    const ev: SchedulerEvent = { id: 'a', title: 'Standup', start: D(2026, 10, 15, 9), end: D(2026, 10, 15, 10) };
    setup({ events: [ev], onEventClick, onDateSelect });
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: /Standup/ });
    await user.click(button);
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(onEventClick.mock.calls[0]![0]).toBe(ev);
    expect(onDateSelect).not.toHaveBeenCalled();
    button.focus();
    await user.keyboard('{Enter}');
    expect(onEventClick).toHaveBeenCalledTimes(2);
    expect(onDateSelect).not.toHaveBeenCalled();
    cell(/October 21, 2026/).focus();
    await user.keyboard('{Enter}');
    expect(onDateSelect).toHaveBeenLastCalledWith(D(2026, 10, 21));
    await user.keyboard(' ');
    expect(onDateSelect).toHaveBeenCalledTimes(2);
  });

  it('AC-9: Tab moves from the active cell into its events and Escape returns', async () => {
    setup({ events: [{ id: 'a', title: 'Standup', start: D(2026, 10, 15, 9), end: D(2026, 10, 15, 10) }] });
    const user = userEvent.setup();
    activeCell()[0]!.focus();
    await user.tab();
    expect(screen.getByRole('button', { name: /Standup/ })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(activeCell()[0]).toHaveFocus();
  });

  it('AC-10: "+n more" opens a list of all events; Escape returns focus to the cell', async () => {
    const events: SchedulerEvent[] = ['A', 'B', 'C', 'D'].map((t, i) => ({ id: t, title: `Event ${t}`, start: D(2026, 10, 15, 9 + i), end: D(2026, 10, 15, 10 + i) }));
    setup({ events, maxEventsPerDay: 2 });
    const user = userEvent.setup();
    expect(within(cell(/October 15, 2026/)).getAllByRole('button', { name: /Event/ })).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: '+2 more' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByRole('button')).toHaveLength(4);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(cell(/October 15, 2026/)).toHaveFocus();
  });

  it('AC-11: week view has 7 columns, an all-day row, slots and positions a 09:00–10:30 event across 3 slots', () => {
    const events: SchedulerEvent[] = [
      { id: 'a', title: 'Workshop', start: D(2026, 10, 14, 9), end: D(2026, 10, 14, 10, 30) },
      { id: 'b', title: 'Holiday', start: D(2026, 10, 13), end: D(2026, 10, 14), allDay: true },
    ];
    setup({ defaultView: 'week', events });
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
    expect(screen.getByRole('rowheader', { name: 'All day' })).toBeInTheDocument();
    expect(screen.getAllByRole('rowheader')).toHaveLength(1 + 48);
    const slot = screen.getByRole('gridcell', { name: new RegExp(`October 14, 2026, ${time.format(D(2026, 10, 14, 9)).replace(/[()]/g, '')}`) });
    const event = within(slot).getByRole('button', { name: /Workshop/ });
    expect(event).toHaveAttribute('data-slot-span', '3');
    expect(event).toHaveAttribute('data-slot-start', '18');
    expect(event.style.getPropertyValue('--ui-slot-span')).toBe('3');
    const allDay = screen.getByRole('gridcell', { name: /October 13, 2026, All day/ });
    expect(within(allDay).getByRole('button', { name: /Holiday/ })).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell').filter((c) => c.getAttribute('tabindex') === '0')).toHaveLength(1);
  });

  it('AC-11: slotDuration changes the number of slots; Enter on a slot passes the slot range', async () => {
    const onDateSelect = vi.fn();
    setup({ defaultView: 'week', slotDuration: 60, dayStartHour: 8, dayEndHour: 18, onDateSelect });
    expect(screen.getAllByRole('rowheader')).toHaveLength(1 + 10);
    const user = userEvent.setup();
    activeCell()[0]!.focus();
    await user.keyboard('{Enter}');
    const [date, slot] = onDateSelect.mock.calls[0]!;
    expect(date).toEqual(D(2026, 10, 15));
    expect(slot).toEqual({ start: D(2026, 10, 15, 8), end: D(2026, 10, 15, 9) });
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onDateSelect.mock.calls[1]![1]).toEqual({ start: D(2026, 10, 15, 9), end: D(2026, 10, 15, 10) });
  });

  it('AC-12: the view switch calls onViewChange and keeps the anchor date visible', async () => {
    const onViewChange = vi.fn();
    const onDateChange = vi.fn();
    setup({ onViewChange, onDateChange });
    await userEvent.click(screen.getByRole('radio', { name: 'Week' }));
    expect(onViewChange).toHaveBeenCalledWith('week');
    expect(onDateChange).not.toHaveBeenCalled();
    expect(activeCell()[0]).toHaveAccessibleName(/October 15, 2026/);
  });

  it('AC-12: a single view hides the switch', () => {
    setup({ views: ['month'] });
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('AC-13: onRangeChange fires on mount and on period changes with [start, end)', async () => {
    const onRangeChange = vi.fn();
    setup({ onRangeChange });
    expect(onRangeChange).toHaveBeenCalledTimes(1);
    expect(onRangeChange).toHaveBeenLastCalledWith({ start: D(2026, 9, 27), end: D(2026, 11, 1) });
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(onRangeChange).toHaveBeenLastCalledWith({ start: D(2026, 11, 1), end: D(2026, 12, 6) });
    await userEvent.click(screen.getByRole('radio', { name: 'Week' }));
    expect(onRangeChange).toHaveBeenLastCalledWith({ start: D(2026, 11, 15), end: D(2026, 11, 22) });
  });

  it('AC-14: ISO string events are parsed and invalid dates are skipped with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setup({
      events: [
        { id: 'a', title: 'Iso timed', start: '2026-10-20T09:00:00', end: '2026-10-20T10:00:00' },
        { id: 'b', title: 'Iso day', start: '2026-10-22', end: '2026-10-23', allDay: true },
        { id: 'c', title: 'Broken', start: 'not a date', end: 'also not' },
      ],
    });
    expect(within(cell(/October 20, 2026/)).getByRole('button', { name: /Iso timed/ })).toBeInTheDocument();
    expect(within(cell(/October 22, 2026/)).getByRole('button', { name: /Iso day/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Broken/ })).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"c"'));
    warn.mockRestore();
  });

  it('AC-15: loading sets aria-busy on the grid', () => {
    setup({ loading: true });
    expect(screen.getByRole('grid')).toHaveAttribute('aria-busy', 'true');
  });

  it('AC-16: an event on the DST change day appears on that day only', () => {
    setup({
      defaultDate: D(2026, 3, 10),
      timeZone: 'America/New_York',
      events: [{ id: 'dst', title: 'Night shift', start: '2026-03-08T06:00:00Z', end: '2026-03-08T08:00:00Z' }],
    });
    expect(screen.getAllByRole('button', { name: /Night shift/ })).toHaveLength(1);
    expect(within(cell(/March 8, 2026/)).getByRole('button', { name: /Night shift/ })).toBeInTheDocument();
  });

  it('AC-16: PageDown from Jan 31 lands on Feb 28 (29 in a leap year)', async () => {
    const onDateChange = vi.fn();
    const { unmount } = setup({ defaultDate: D(2026, 1, 31), onDateChange });
    const user = userEvent.setup();
    activeCell()[0]!.focus();
    await user.keyboard('{PageDown}');
    expect(lastCall(onDateChange)).toEqual(D(2026, 2, 28));
    unmount();
    const spy = vi.fn();
    setup({ defaultDate: D(2028, 1, 31), onDateChange: spy });
    activeCell()[0]!.focus();
    await user.keyboard('{PageDown}');
    expect(lastCall(spy)).toEqual(D(2028, 2, 29));
  });

  it('AC-17: imports only React and internal modules', () => {
    for (const file of ['Scheduler.tsx', 'schedulerUtils.ts']) {
      const source = readFileSync(`${process.cwd()}/src/components/Scheduler/${file}`, 'utf8');
      const specifiers = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1]!);
      for (const spec of specifiers) expect(spec === 'react' || spec.startsWith('.')).toBe(true);
    }
  });
});
