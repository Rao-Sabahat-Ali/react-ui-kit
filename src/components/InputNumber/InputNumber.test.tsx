import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../locale/LocaleProvider';
import { InputNumber } from './InputNumber';

describe('InputNumber', () => {
  afterEach(() => vi.useRealTimers());

  it('AC-1: formats per locale and mode on blur', async () => {
    render(<InputNumber aria-label="Amount" defaultValue={null} />);
    const input = screen.getByRole('spinbutton', { name: 'Amount' });
    await userEvent.type(input, '1234.5');
    await userEvent.tab();
    expect(input).toHaveValue('1,234.5');
    expect(input).toHaveAttribute('aria-valuenow', '1234.5');
    expect(input).toHaveAttribute('aria-valuetext', '1,234.5');
  });

  it('AC-1: currency and percent modes, locale-aware parsing', async () => {
    const { unmount } = render(<InputNumber aria-label="Price" mode="currency" currency="USD" defaultValue={1234.5} />);
    expect(screen.getByRole('spinbutton')).toHaveValue('$1,234.50');
    unmount();
    render(<InputNumber aria-label="Rate" mode="percent" defaultValue={0.25} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue('25%');
    await userEvent.clear(input);
    await userEvent.type(input, '40');
    await userEvent.tab();
    expect(input).toHaveValue('40%');
    expect(input).toHaveAttribute('aria-valuenow', '0.4');
  });

  it('AC-1: parses localised input (sv grouping and decimal comma)', async () => {
    const onChange = vi.fn();
    render(
      <LocaleProvider locale="sv-SE">
        <InputNumber aria-label="Belopp" onChange={onChange} />
      </LocaleProvider>,
    );
    const input = screen.getByRole('spinbutton');
    await userEvent.type(input, '1 234,5');
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledWith(1234.5);
  });

  it('AC-2: clamps to min/max on commit', async () => {
    const onChange = vi.fn();
    render(<InputNumber aria-label="Qty" min={1} max={10} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    await userEvent.type(input, '50');
    await userEvent.tab();
    expect(input).toHaveValue('10');
    expect(onChange).toHaveBeenLastCalledWith(10);
    await userEvent.clear(input);
    await userEvent.type(input, '-4');
    await userEvent.tab();
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('AC-3: arrow keys step, Shift steps by 10, Home/End jump to bounds', async () => {
    const onChange = vi.fn();
    render(<InputNumber aria-label="Qty" defaultValue={5} min={0} max={100} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    input.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(input).toHaveValue('6');
    await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}');
    expect(input).toHaveValue('16');
    await userEvent.keyboard('{ArrowDown}');
    expect(input).toHaveValue('15');
    await userEvent.keyboard('{End}');
    expect(input).toHaveValue('100');
    await userEvent.keyboard('{Home}');
    expect(input).toHaveValue('0');
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('AC-3: buttons are labelled, skip tab order, step and repeat while held', () => {
    vi.useFakeTimers();
    render(<InputNumber aria-label="Qty" showButtons defaultValue={0} />);
    const up = screen.getByRole('button', { name: 'Increase' });
    expect(up).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('button', { name: 'Decrease' })).toHaveAttribute('tabindex', '-1');
    fireEvent.pointerDown(up, { button: 0 });
    expect(screen.getByRole('spinbutton')).toHaveValue('1');
    act(() => {
      vi.advanceTimersByTime(400 + 60 * 3);
    });
    expect(screen.getByRole('spinbutton')).toHaveValue('4');
    fireEvent.pointerUp(up);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('spinbutton')).toHaveValue('4');
  });

  it('AC-3: a click on a button steps once', async () => {
    render(<InputNumber aria-label="Qty" showButtons buttonLayout="horizontal" defaultValue={2} />);
    await userEvent.click(screen.getByRole('button', { name: 'Decrease' }));
    expect(screen.getByRole('spinbutton')).toHaveValue('1');
  });

  it('AC-4: emits null when cleared and allowEmpty', async () => {
    const onChange = vi.fn();
    render(<InputNumber aria-label="Qty" defaultValue={3} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    await userEvent.clear(input);
    await userEvent.tab();
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(input).toHaveValue('');
    expect(input).not.toHaveAttribute('aria-valuenow');
  });

  it('AC-4: allowEmpty=false restores the previous value', async () => {
    render(<InputNumber aria-label="Qty" defaultValue={3} allowEmpty={false} />);
    const input = screen.getByRole('spinbutton');
    await userEvent.clear(input);
    await userEvent.tab();
    expect(input).toHaveValue('3');
  });

  it('AC-5: float steps avoid binary errors', async () => {
    render(<InputNumber aria-label="Val" defaultValue={0.1} step={0.1} maxFractionDigits={2} />);
    const input = screen.getByRole('spinbutton');
    input.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(input).toHaveAttribute('aria-valuenow', '0.2');
    await userEvent.keyboard('{ArrowUp}');
    expect(input).toHaveAttribute('aria-valuenow', '0.3');
  });

  it('onValueInput fires on every keystroke', async () => {
    const onValueInput = vi.fn();
    render(<InputNumber aria-label="Qty" onValueInput={onValueInput} />);
    await userEvent.type(screen.getByRole('spinbutton'), '12');
    expect(onValueInput).toHaveBeenNthCalledWith(1, 1);
    expect(onValueInput).toHaveBeenNthCalledWith(2, 12);
  });
});
