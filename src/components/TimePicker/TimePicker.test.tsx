import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../locale/LocaleProvider';
import { Field } from '../Field/Field';
import { TimePicker } from './TimePicker';

const hours = () => screen.getByRole('spinbutton', { name: 'Hours' });
const minutes = () => screen.getByRole('spinbutton', { name: 'Minutes' });

describe('TimePicker', () => {
  it('AC-1: renders hours/minutes, locale picks 12/24h, hourFormat overrides', () => {
    const { unmount } = render(<TimePicker aria-label="At" defaultValue="14:05" locale="en-GB" />);
    expect(screen.getByRole('group', { name: 'At' })).toBeInTheDocument();
    expect(hours()).toHaveAttribute('aria-valuenow', '14');
    expect(minutes()).toHaveAttribute('aria-valuenow', '5');
    expect(screen.queryByRole('spinbutton', { name: 'AM/PM' })).toBeNull();
    unmount();
    const us = render(<TimePicker aria-label="At" defaultValue="14:05" locale="en-US" />);
    expect(hours()).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByRole('spinbutton', { name: 'AM/PM' })).toHaveAttribute('aria-valuetext', 'PM');
    us.unmount();
    render(<TimePicker aria-label="At" defaultValue="14:05" locale="en-US" hourFormat="24" />);
    expect(screen.queryByRole('spinbutton', { name: 'AM/PM' })).toBeNull();
    expect(hours()).toHaveAttribute('aria-valuenow', '14');
  });

  it('AC-2: arrows change and wrap, calling onChange with HH:mm', async () => {
    const onChange = vi.fn();
    render(<TimePicker aria-label="At" defaultValue="23:59" locale="en-GB" onChange={onChange} />);
    hours().focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith('00:59');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith('22:59');
    minutes().focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith('22:00');
  });

  it('AC-3: step sets the minute increment', async () => {
    const onChange = vi.fn();
    render(<TimePicker aria-label="At" defaultValue="10:00" locale="en-GB" step={15} onChange={onChange} />);
    minutes().focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith('10:15');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith('10:45');
  });

  it('AC-4: PageUp/PageDown and Home/End', async () => {
    const onChange = vi.fn();
    render(<TimePicker aria-label="At" defaultValue="10:30" locale="en-GB" onChange={onChange} />);
    minutes().focus();
    await userEvent.keyboard('{PageUp}');
    expect(onChange).toHaveBeenLastCalledWith('10:40');
    await userEvent.keyboard('{PageDown}{PageDown}');
    expect(onChange).toHaveBeenLastCalledWith('10:20');
    await userEvent.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('10:00');
    await userEvent.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('10:59');
    hours().focus();
    await userEvent.keyboard('{PageUp}');
    expect(onChange).toHaveBeenLastCalledWith('16:59');
    await userEvent.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('23:59');
  });

  it('AC-5: typing sets the segment and advances focus', async () => {
    const onChange = vi.fn();
    render(<TimePicker aria-label="At" defaultValue="00:00" locale="en-GB" onChange={onChange} />);
    hours().focus();
    await userEvent.keyboard('1');
    expect(onChange).toHaveBeenLastCalledWith('01:00');
    expect(hours()).toHaveFocus(); // 1x still possible
    await userEvent.keyboard('7');
    expect(onChange).toHaveBeenLastCalledWith('17:00');
    expect(minutes()).toHaveFocus();
    await userEvent.keyboard('9');
    expect(onChange).toHaveBeenLastCalledWith('17:09');
    expect(minutes()).toHaveFocus(); // 9 → 9x invalid, but last segment has nowhere to go
    hours().focus();
    await userEvent.keyboard('5');
    expect(onChange).toHaveBeenLastCalledWith('05:09');
    expect(minutes()).toHaveFocus(); // 5 cannot start a valid two-digit hour
  });

  it('AC-6: showSeconds adds a Seconds spinbutton and HH:mm:ss value', async () => {
    const onChange = vi.fn();
    render(<TimePicker aria-label="At" showSeconds defaultValue="08:30:15" locale="en-GB" onChange={onChange} />);
    const seconds = screen.getByRole('spinbutton', { name: 'Seconds' });
    expect(seconds).toHaveAttribute('aria-valuenow', '15');
    seconds.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith('08:30:16');
  });

  it('AC-7: min/max clamp every change', async () => {
    const onChange = vi.fn();
    render(<TimePicker aria-label="At" defaultValue="17:30" locale="en-GB" min="09:00" max="18:00" onChange={onChange} />);
    hours().focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith('18:00');
    await userEvent.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('09:00');
  });

  it('AC-8: controlled waits for the parent; uncontrolled updates itself; null shows placeholders', async () => {
    const onChange = vi.fn();
    const { unmount } = render(<TimePicker aria-label="At" value="10:00" locale="en-GB" onChange={onChange} />);
    hours().focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenCalledWith('11:00');
    expect(hours()).toHaveAttribute('aria-valuenow', '10');
    unmount();

    function Harness() {
      const [v, setV] = useState<string | null>(null);
      return <TimePicker aria-label="At" value={v} onChange={setV} locale="en-GB" />;
    }
    render(<Harness />);
    expect(hours()).toHaveAttribute('aria-valuetext', 'Empty');
    expect(hours()).not.toHaveAttribute('aria-valuenow');
    expect(hours()).toHaveTextContent('––');
    hours().focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(hours()).toHaveAttribute('aria-valuenow', '0');
    expect(minutes()).toHaveAttribute('aria-valuenow', '0');
  });

  it('AC-8: uncontrolled defaultValue updates itself', async () => {
    render(<TimePicker aria-label="At" defaultValue="10:00" locale="en-GB" />);
    hours().focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(hours()).toHaveAttribute('aria-valuenow', '11');
  });

  it('AC-9: 12-hour hours 1-12, period toggle and 24-hour value', async () => {
    const onChange = vi.fn();
    render(<TimePicker aria-label="At" defaultValue="23:10" locale="en-US" onChange={onChange} />);
    expect(hours()).toHaveAttribute('aria-valuemin', '1');
    expect(hours()).toHaveAttribute('aria-valuemax', '12');
    expect(hours()).toHaveAttribute('aria-valuenow', '11');
    hours().focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith('12:10'); // 12 PM
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith('13:10'); // 1 PM
    const period = screen.getByRole('spinbutton', { name: 'AM/PM' });
    period.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith('01:10');
    await userEvent.keyboard('p');
    expect(onChange).toHaveBeenLastCalledWith('13:10');
    await userEvent.keyboard('a');
    expect(onChange).toHaveBeenLastCalledWith('01:10');
  });

  it('AC-10: Backspace/Delete clears', async () => {
    const onChange = vi.fn();
    render(<TimePicker aria-label="At" defaultValue="10:00" locale="en-GB" onChange={onChange} />);
    minutes().focus();
    await userEvent.keyboard('{Backspace}');
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(hours()).toHaveAttribute('aria-valuetext', 'Empty');
  });

  it('AC-11: integrates with Field (label, focus, description, invalid)', async () => {
    render(
      <Field label="Opens at" help="Local time" error="Required">
        <TimePicker locale="en-GB" />
      </Field>,
    );
    const group = screen.getByRole('group', { name: 'Opens at' });
    expect(group).toHaveAccessibleDescription(/Local time/);
    expect(hours()).toHaveAttribute('aria-invalid', 'true');
    await userEvent.click(screen.getByText('Opens at'));
    expect(hours()).toHaveFocus();
  });

  it('AC-12: disabled is not focusable or changeable; readOnly is focusable but unchanging', async () => {
    const onChange = vi.fn();
    const { unmount } = render(<TimePicker aria-label="At" disabled defaultValue="10:00" locale="en-GB" onChange={onChange} />);
    expect(hours()).toHaveAttribute('aria-disabled', 'true');
    expect(hours()).toHaveAttribute('tabindex', '-1');
    hours().focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).not.toHaveBeenCalled();
    unmount();
    render(<TimePicker aria-label="At" readOnly defaultValue="10:00" locale="en-GB" onChange={onChange} />);
    await userEvent.tab();
    expect(hours()).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('AC-13: ArrowLeft/Right move between segments, reversed in RTL', async () => {
    const { unmount } = render(<TimePicker aria-label="At" defaultValue="10:00" locale="en-GB" />);
    hours().focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(minutes()).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(hours()).toHaveFocus();
    unmount();
    render(
      <div dir="rtl">
        <TimePicker aria-label="At" defaultValue="10:00" locale="en-GB" />
      </div>,
    );
    hours().focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(minutes()).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(hours()).toHaveFocus();
  });

  it('AC-14: name renders a hidden input following the value', async () => {
    const { container } = render(<TimePicker aria-label="At" name="opens" defaultValue="09:15" locale="en-GB" />);
    const input = container.querySelector<HTMLInputElement>('input[type="hidden"][name="opens"]')!;
    expect(input.value).toBe('09:15');
    hours().focus();
    await userEvent.keyboard('{Backspace}');
    expect(input.value).toBe('');
  });

  it('AC-15: strings come from LocaleProvider messages', () => {
    render(
      <LocaleProvider locale="en-US" messages={{ hours: 'Stunden', minutes: 'Minuten', amPm: 'Tageszeit', pm: 'nachm.', am: 'vorm.', emptyValue: 'Leer' }}>
        <TimePicker aria-label="At" defaultValue="15:00" />
        <TimePicker aria-label="Empty" />
      </LocaleProvider>,
    );
    expect(screen.getAllByRole('spinbutton', { name: 'Stunden' })).toHaveLength(2);
    expect(screen.getAllByRole('spinbutton', { name: 'Minuten' })).toHaveLength(2);
    expect(screen.getAllByRole('spinbutton', { name: 'Tageszeit' })[0]).toHaveAttribute('aria-valuetext', 'nachm.');
    expect(screen.getAllByRole('spinbutton', { name: 'Stunden' })[1]).toHaveAttribute('aria-valuetext', 'Leer');
  });
});
