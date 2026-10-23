import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../locale/LocaleProvider';
import { DateFormat } from './DateFormat';

const V = '2026-10-20T09:30:00Z';
const d = (s: string) => new Date(s).getTime();
const wrap = (locale: string, ui: React.ReactNode) => <LocaleProvider locale={locale}>{ui}</LocaleProvider>;
const time = (c: HTMLElement) => c.querySelector('time')!;

describe('DateFormat', () => {
  afterEach(() => vi.useRealTimers());

  it('AC-1: renders time.ui-date-format with ISO dateTime', () => {
    const { container } = render(<DateFormat value={V} />);
    expect(time(container)).toHaveClass('ui-date-format');
    expect(time(container)).toHaveAttribute('datetime', new Date(V).toISOString());
  });

  it('AC-2: date format per locale', () => {
    const en = render(wrap('en-US', <DateFormat value={V} timeZone="UTC" />));
    expect(time(en.container)).toHaveTextContent('Oct 20, 2026');
    en.unmount();
    const de = render(wrap('de-DE', <DateFormat value={V} timeZone="UTC" />));
    expect(time(de.container)).toHaveTextContent('20.10.2026');
  });

  it('AC-3: datetime includes time, time renders only time', () => {
    const dt = render(wrap('en-US', <DateFormat value={V} format="datetime" timeZone="UTC" />));
    expect(time(dt.container).textContent).toMatch(/Oct 20, 2026.*9:30/);
    dt.unmount();
    const t = render(wrap('en-US', <DateFormat value={V} format="time" timeZone="UTC" />));
    expect(time(t.container).textContent).toMatch(/^9:30/);
    expect(time(t.container).textContent).not.toMatch(/2026/);
  });

  it('AC-4: timeZone shifts text while dateTime stays UTC', () => {
    const { container } = render(wrap('en-US', <DateFormat value="2026-10-20T20:30:00Z" format="datetime" timeZone="Asia/Tokyo" />));
    expect(time(container).textContent).toMatch(/Oct 21, 2026.*5:30/);
    expect(time(container)).toHaveAttribute('datetime', '2026-10-20T20:30:00.000Z');
  });

  it('AC-5: relative past, future and yesterday', () => {
    const now = d(V);
    const past = render(wrap('en', <DateFormat value={now - 3 * 86400000} now={now} format="relative" />));
    expect(time(past.container)).toHaveTextContent('3 days ago');
    past.unmount();
    const fut = render(wrap('en', <DateFormat value={now + 2 * 3600000} now={now} format="relative" />));
    expect(time(fut.container)).toHaveTextContent('in 2 hours');
    fut.unmount();
    const y = render(wrap('en', <DateFormat value={now - 86400000} now={now} format="relative" numeric="auto" />));
    expect(time(y.container)).toHaveTextContent('yesterday');
  });

  it('AC-6: unit thresholds', () => {
    const now = d(V);
    const cases: [number, RegExp][] = [
      [30 * 1000, /30 seconds ago/],
      [10 * 60 * 1000, /10 minutes ago/],
      [5 * 3600 * 1000, /5 hours ago/],
      [40 * 86400000, /last month|1 month ago/],
      [400 * 86400000, /last year|1 year ago/],
    ];
    for (const [ms, re] of cases) {
      const { container, unmount } = render(wrap('en', <DateFormat value={now - ms} now={now} format="relative" />));
      expect(time(container).textContent).toMatch(re);
      unmount();
    }
  });

  it('AC-7: title defaults to full absolute and can be disabled', () => {
    const on = render(wrap('en-US', <DateFormat value={V} timeZone="UTC" />));
    expect(time(on.container).getAttribute('title')).toMatch(/Tuesday, October 20, 2026/);
    on.unmount();
    const off = render(<DateFormat value={V} title={false} />);
    expect(time(off.container)).not.toHaveAttribute('title');
  });

  it('AC-8: auto picks relative within threshold, absolute beyond', () => {
    const now = d(V);
    const near = render(wrap('en-US', <DateFormat value={now - 86400000 * 2} now={now} format="auto" timeZone="UTC" />));
    expect(time(near.container)).toHaveTextContent('2 days ago');
    near.unmount();
    const far = render(wrap('en-US', <DateFormat value={now - 86400000 * 30} now={now} format="auto" timeZone="UTC" />));
    expect(time(far.container)).toHaveTextContent('Sep 20, 2026');
  });

  it('AC-9: invalid, null and undefined render fallback without <time>', () => {
    for (const v of ['not a date', null, undefined]) {
      const { container, unmount } = render(<DateFormat value={v} />);
      expect(container.querySelector('time')).toBeNull();
      expect(container).toHaveTextContent('—');
      unmount();
    }
  });

  it('AC-10: live re-renders on the interval and clears on unmount', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(V));
    const value = Date.now() - 60_000;
    const { container, unmount } = render(wrap('en', <DateFormat value={value} format="relative" live />));
    expect(time(container)).toHaveTextContent('1 minute ago');
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(time(container)).toHaveTextContent('2 minutes ago');
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('AC-11: locale defaults to the provider locale', () => {
    const now = d(V);
    const { container } = render(wrap('fr', <DateFormat value={now - 3 * 86400000} now={now} format="relative" />));
    expect(time(container)).toHaveTextContent('il y a 3 jours');
  });
});
