import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../locale/LocaleProvider';
import { Countdown } from './Countdown';

const T0 = new Date('2026-01-01T00:00:00Z').getTime();
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
  act(() => void document.dispatchEvent(new Event('visibilitychange')));
};

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });
  afterEach(() => {
    setHidden(false);
    vi.useRealTimers();
  });

  it('AC-1: role=timer with a name, aria-live off and no status region by default', () => {
    render(<Countdown label="Offer ends in" duration={5000} />);
    const timer = screen.getByRole('timer', { name: 'Offer ends in' });
    expect(timer).toHaveAttribute('aria-live', 'off');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('AC-2: counts down to target, formats and never goes below zero', () => {
    const target = T0 + (((1 * 24 + 2) * 60 + 3) * 60 + 4) * 1000;
    const { rerender } = render(<Countdown label="t" target={target} />);
    expect(screen.getByRole('timer')).toHaveTextContent('01:02:03:04');
    advance(1000);
    expect(screen.getByRole('timer')).toHaveTextContent('01:02:03:03');
    rerender(<Countdown label="t" target={target} format="hh:mm:ss" />);
    expect(screen.getByRole('timer')).toHaveTextContent('26:03:03');
    rerender(<Countdown label="t" target={target} format="mm:ss" />);
    expect(screen.getByRole('timer')).toHaveTextContent('1563:03');
    rerender(<Countdown label="t" target={T0 - 5000} />);
    expect(screen.getByRole('timer')).toHaveTextContent('00:00:00:00');
  });

  it('AC-3: duration counts down from mount', () => {
    render(<Countdown label="t" duration={65_000} format="mm:ss" />);
    expect(screen.getByRole('timer')).toHaveTextContent('01:05');
    advance(5000);
    expect(screen.getByRole('timer')).toHaveTextContent('01:00');
  });

  it('AC-4: onComplete fires once and completedContent replaces the value', () => {
    const onComplete = vi.fn();
    render(<Countdown label="t" duration={2000} onComplete={onComplete} completedContent="Expired" />);
    expect(onComplete).not.toHaveBeenCalled();
    advance(2000);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('timer')).toHaveTextContent('Expired');
    advance(5000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('AC-5: paused freezes the value and resuming continues from it', () => {
    const { rerender } = render(<Countdown label="t" duration={60_000} format="mm:ss" />);
    advance(10_000);
    expect(screen.getByRole('timer')).toHaveTextContent('00:50');
    rerender(<Countdown label="t" duration={60_000} format="mm:ss" paused />);
    advance(30_000);
    expect(screen.getByRole('timer')).toHaveTextContent('00:50');
    rerender(<Countdown label="t" duration={60_000} format="mm:ss" />);
    expect(screen.getByRole('timer')).toHaveTextContent('00:50');
    advance(5000);
    expect(screen.getByRole('timer')).toHaveTextContent('00:45');
  });

  it('AC-6: elapsed mode counts up from since', () => {
    render(<Countdown label="Running for" mode="elapsed" since={T0 - 3_725_000} format="hh:mm:ss" />);
    expect(screen.getByRole('timer')).toHaveTextContent('01:02:05');
    advance(3000);
    expect(screen.getByRole('timer')).toHaveTextContent('01:02:08');
  });

  it('AC-7: words format uses locale unit formatting and the two largest non-zero units', () => {
    const target = T0 + ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000;
    const { rerender } = render(<Countdown label="t" target={target} format="words" />);
    expect(screen.getByRole('timer')).toHaveTextContent('2d 3h');
    rerender(
      <LocaleProvider locale="de">
        <Countdown label="t" target={target} format="words" />
      </LocaleProvider>,
    );
    expect(screen.getByRole('timer').textContent).toBe(new Intl.NumberFormat('de', { style: 'unit', unit: 'day', unitDisplay: 'narrow' }).format(2) + ' ' + new Intl.NumberFormat('de', { style: 'unit', unit: 'hour', unitDisplay: 'narrow' }).format(3));
    rerender(<Countdown label="t" target={T0 + 45_000} format="words" />);
    expect(screen.getByRole('timer')).toHaveTextContent('45s');
  });

  it('AC-8: no tick while hidden; recomputes and completes when visible again', () => {
    const onComplete = vi.fn();
    render(<Countdown label="t" duration={10_000} format="mm:ss" onComplete={onComplete} />);
    setHidden(true);
    const clear = vi.spyOn(window, 'clearInterval');
    expect(clear).not.toHaveBeenCalled();
    advance(3000);
    expect(screen.getByRole('timer')).toHaveTextContent('00:10');
    vi.setSystemTime(T0 + 20_000);
    setHidden(false);
    expect(screen.getByRole('timer')).toHaveTextContent('00:00');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('AC-9: announceAt announces once per threshold and at completion; the timer stays silent', () => {
    render(<Countdown label="t" duration={12_000} announceAt={[10, 3]} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toBeEmptyDOMElement();
    advance(2000);
    expect(status).toHaveTextContent('10 seconds remaining');
    advance(1000);
    expect(status).toHaveTextContent('10 seconds remaining');
    advance(6000);
    expect(status).toHaveTextContent('3 seconds remaining');
    expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'off');
    expect(screen.getByRole('timer')).not.toContainElement(status);
  });

  it('AC-10: value is in a <time> with ISO duration, tabular numerals, interval cleared on unmount', () => {
    const { unmount } = render(<Countdown label="t" duration={90_061_000} />);
    const time = screen.getByRole('timer').querySelector('time')!;
    expect(time).toHaveAttribute('datetime', 'P1DT1H1M1S');
    expect(time).toHaveClass('ui-tabular');
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
