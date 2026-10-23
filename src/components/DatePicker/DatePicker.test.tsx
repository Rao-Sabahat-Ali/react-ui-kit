import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Field } from '../Field/Field';
import { DatePicker } from './DatePicker';

const cell = (iso: string) => document.querySelector<HTMLButtonElement>(`[data-date="${iso}"]`);
const focusedIso = () => (document.activeElement as HTMLElement | null)?.getAttribute('data-date');
const openPicker = () => userEvent.click(screen.getByRole('button', { name: 'Choose date' }));

afterEach(() => {
  vi.useRealTimers();
});

describe('DatePicker', () => {
  it('AC-1: opening focuses the selected date (or today) in the grid', async () => {
    const { unmount } = render(
      <Field label="Due">
        <DatePicker defaultValue={new Date(2026, 9, 23)} locale="en-US" />
      </Field>,
    );
    const toggle = screen.getByRole('button', { name: 'Choose date' });
    expect(toggle).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.getByRole('textbox', { name: 'Due' })).toHaveValue('10/23/2026');
    await openPicker();
    const dialog = screen.getByRole('dialog', { name: 'Choose date' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('grid', { name: 'October 2026' })).toBeInTheDocument();
    expect(focusedIso()).toBe('2026-10-23');
    expect(document.activeElement).toHaveAccessibleName('Friday, October 23, 2026');
    unmount();

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 15, 12));
    render(<DatePicker aria-label="Start" locale="en-US" />);
    await openPicker();
    expect(focusedIso()).toBe('2026-03-15');
    expect(cell('2026-03-15')).toHaveAttribute('aria-current', 'date');
  });

  it('AC-2: arrow and page keys navigate across month and year boundaries', async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Due" defaultValue={new Date(2026, 0, 31)} locale="en-US" firstDayOfWeek={0} />);
    await user.click(screen.getByRole('button', { name: 'Choose date' }));
    expect(focusedIso()).toBe('2026-01-31');
    await user.keyboard('{ArrowRight}');
    expect(focusedIso()).toBe('2026-02-01');
    expect(screen.getByRole('grid', { name: 'February 2026' })).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(focusedIso()).toBe('2026-01-30');
    await user.keyboard('{ArrowDown}');
    expect(focusedIso()).toBe('2026-02-06');
    await user.keyboard('{ArrowUp}');
    expect(focusedIso()).toBe('2026-01-30');
    await user.keyboard('{PageDown}');
    expect(focusedIso()).toBe('2026-02-28'); // clamped
    await user.keyboard('{PageUp}{PageUp}');
    expect(focusedIso()).toBe('2025-12-28');
    await user.keyboard('{Shift>}{PageDown}{/Shift}');
    expect(focusedIso()).toBe('2026-12-28');
    await user.keyboard('{Home}');
    expect(focusedIso()).toBe('2026-12-27'); // Sunday
    await user.keyboard('{End}');
    expect(focusedIso()).toBe('2027-01-02'); // Saturday, crosses year
    expect(screen.getByRole('grid', { name: 'January 2027' })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('textbox')).toHaveValue('1/2/2027');
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('AC-3: range mode — first click sets start, second sets end (swapped if earlier); hover previews', async () => {
    const onChange = vi.fn();
    render(<DatePicker selectionMode="range" inline aria-label="Stay" defaultValue={[new Date(2026, 9, 1), new Date(2026, 9, 2)]} locale="en-US" onChange={onChange} />);
    await userEvent.click(cell('2026-10-20')!);
    expect(onChange).toHaveBeenLastCalledWith([new Date(2026, 9, 20), null]);
    await userEvent.hover(cell('2026-10-15')!);
    expect(cell('2026-10-17')).toHaveClass('ui-date-picker__day--preview');
    expect(cell('2026-10-14')).not.toHaveClass('ui-date-picker__day--preview');
    await userEvent.click(cell('2026-10-15')!);
    expect(onChange).toHaveBeenLastCalledWith([new Date(2026, 9, 15), new Date(2026, 9, 20)]);
    expect(cell('2026-10-17')).toHaveClass('ui-date-picker__day--in-range');
    expect(cell('2026-10-15')!.closest('td')).toHaveAttribute('aria-selected', 'true');
  });

  it('AC-4: min/max and disabled dates are not selectable', async () => {
    const onChange = vi.fn();
    render(
      <DatePicker
        inline
        aria-label="Day"
        defaultValue={new Date(2026, 9, 15)}
        minDate={new Date(2026, 9, 10)}
        maxDate={new Date(2026, 9, 25)}
        disabledDates={(d) => d.getDay() === 0}
        locale="en-US"
        onChange={onChange}
      />,
    );
    for (const iso of ['2026-10-09', '2026-10-26', '2026-10-18']) {
      expect(cell(iso)).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(cell(iso)!);
    }
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(cell('2026-10-19')!);
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 9, 19));
  });

  it('AC-5: typed input parses the locale format; invalid input sets invalid without throwing', async () => {
    const onChange = vi.fn();
    render(<DatePicker aria-label="Born" locale="en-GB" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, '23/10/2026{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 9, 23));
    expect(input).not.toHaveAttribute('aria-invalid');
    await userEvent.clear(input);
    await userEvent.type(input, '31/02/2026');
    await userEvent.tab();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveClass('is-invalid');
    expect(onChange).toHaveBeenCalledTimes(1);
    await userEvent.clear(input);
    await userEvent.type(input, 'not a date{Enter}');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    await userEvent.clear(input);
    await userEvent.tab();
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('AC-6: month and year views select at their granularity', async () => {
    const onMonth = vi.fn();
    const { unmount } = render(<DatePicker inline view="month" aria-label="Month" defaultValue={new Date(2026, 9, 1)} locale="en-US" onChange={onMonth} />);
    expect(screen.queryByRole('grid', { name: /October 2026/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Mar' }));
    expect(onMonth).toHaveBeenCalledWith(new Date(2026, 2, 1));
    unmount();

    const onYear = vi.fn();
    render(<DatePicker view="year" aria-label="Year" defaultValue={new Date(2026, 0, 1)} locale="en-US" onChange={onYear} />);
    expect(screen.getByRole('textbox')).toHaveValue('2026');
    await openPicker();
    expect(document.activeElement).toHaveTextContent('2026');
    await userEvent.keyboard('{ArrowRight}{Enter}');
    expect(onYear).toHaveBeenCalledWith(new Date(2027, 0, 1));
    expect(screen.getByRole('textbox')).toHaveValue('2027');
  });

  it('AC-6: header buttons drill from date to month/year views and back', async () => {
    const onChange = vi.fn();
    render(<DatePicker inline aria-label="Day" defaultValue={new Date(2026, 9, 23)} locale="en-US" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Choose year, 2026' }));
    await userEvent.click(screen.getByRole('button', { name: '2020' }));
    await userEvent.click(screen.getByRole('button', { name: 'Feb' }));
    expect(screen.getByRole('grid', { name: 'February 2020' })).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("AC-7: week starts on the locale's first day; month names come from Intl", () => {
    const { unmount } = render(<DatePicker inline aria-label="US" defaultValue={new Date(2026, 9, 1)} locale="en-US" />);
    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('abbr', 'Sunday');
    unmount();
    render(<DatePicker inline aria-label="SV" defaultValue={new Date(2026, 9, 1)} locale="sv-SE" />);
    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('abbr', 'måndag');
    expect(screen.getByRole('grid', { name: 'oktober 2026' })).toBeInTheDocument();
  });

  it('AC-8: time spinbuttons update hours and minutes with arrows', async () => {
    const onChange = vi.fn();
    render(<DatePicker inline showTime hourFormat="24" aria-label="When" defaultValue={new Date(2026, 9, 23, 23, 59)} locale="en-GB" onChange={onChange} />);
    const hours = screen.getByRole('spinbutton', { name: 'Hours' });
    const minutes = screen.getByRole('spinbutton', { name: 'Minutes' });
    expect(hours).toHaveAttribute('aria-valuenow', '23');
    hours.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 9, 23, 22, 59));
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 9, 23, 0, 59)); // wraps
    minutes.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith(new Date(2026, 9, 23, 0, 0));
    expect(minutes).toHaveAttribute('aria-valuenow', '0');
  });

  it('Escape closes and focuses the input; multiple mode toggles dates', async () => {
    const onChange = vi.fn();
    render(<DatePicker selectionMode="multiple" aria-label="Days" defaultValue={[new Date(2026, 9, 5)]} locale="en-US" onChange={onChange} />);
    await openPicker();
    await userEvent.click(cell('2026-10-07')!);
    expect(onChange).toHaveBeenLastCalledWith([new Date(2026, 9, 5), new Date(2026, 9, 7)]);
    await userEvent.click(cell('2026-10-05')!);
    expect(onChange).toHaveBeenLastCalledWith([new Date(2026, 9, 7)]);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('presets and button bar', async () => {
    const onChange = vi.fn();
    const range: [Date, Date] = [new Date(2026, 9, 1), new Date(2026, 9, 7)];
    render(<DatePicker selectionMode="range" inline showButtonBar aria-label="Period" presets={[{ label: 'First week', value: range }]} locale="en-US" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'First week' }));
    expect(onChange).toHaveBeenLastCalledWith(range);
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
