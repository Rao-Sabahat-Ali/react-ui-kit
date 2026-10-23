import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../locale/LocaleProvider';
import { NumberFormat, useNumberFormatter } from './NumberFormat';

const inLocale = (locale: string, ui: React.ReactNode) => <LocaleProvider locale={locale}>{ui}</LocaleProvider>;

describe('NumberFormat', () => {
  it('AC-1: formats with the provider locale', () => {
    const first = render(inLocale('en-US', <NumberFormat value={1234.5} />));
    expect(first.container.querySelector('data')).toHaveTextContent('1,234.5');
    first.unmount();
    const second = render(inLocale('de-DE', <NumberFormat value={1234.5} />));
    expect(second.container.querySelector('data')).toHaveTextContent('1.234,5');
  });

  it('AC-2: currency', () => {
    const { container } = render(inLocale('en-US', <NumberFormat value={1234.5} format="currency" currency="EUR" />));
    expect(container.querySelector('data')).toHaveTextContent('€1,234.50');
  });

  it('AC-3: percent with fraction digits', () => {
    const { container } = render(inLocale('en-US', <NumberFormat value={0.256} format="percent" maximumFractionDigits={1} />));
    expect(container.querySelector('data')).toHaveTextContent('25.6%');
  });

  it('AC-4: compact notation, with title exposes full value', () => {
    const { container } = render(inLocale('en-US', <NumberFormat value={1234567} notation="compact" title />));
    const el = container.querySelector('data')!;
    expect(el).toHaveTextContent('1.2M');
    expect(el).toHaveAttribute('title', '1,234,567');
    expect(el).toHaveAttribute('aria-label', '1,234,567');
  });

  it('AC-5: locale prop overrides provider locale', () => {
    const { container } = render(inLocale('en-US', <NumberFormat value={1234.5} locale="de-DE" />));
    expect(container.querySelector('data')).toHaveTextContent('1.234,5');
  });

  it('AC-6: null, undefined and NaN render fallback with hidden Not available', () => {
    for (const v of [null, undefined, NaN]) {
      const { container, unmount } = render(<NumberFormat value={v} />);
      expect(container).toHaveTextContent('—');
      expect(screen.getByText('Not available')).toHaveClass('visually-hidden');
      unmount();
    }
  });

  it('AC-7: root is <data> with raw value', () => {
    const { container } = render(<NumberFormat value={1234.5} />);
    const el = container.firstElementChild!;
    expect(el.tagName).toBe('DATA');
    expect(el).toHaveAttribute('value', '1234.5');
  });

  it('AC-8: tabular modifier', () => {
    const { container } = render(<NumberFormat value={1} tabular />);
    expect(container.firstElementChild).toHaveClass('ui-number-format--tabular');
  });

  it('AC-9: colorize adds sign classes and forces visible sign', () => {
    const pos = render(inLocale('en-US', <NumberFormat value={5} colorize />));
    expect(pos.container.querySelector('data')).toHaveClass('ui-number-format--positive');
    expect(pos.container.querySelector('data')).toHaveTextContent('+5');
    pos.unmount();
    const neg = render(inLocale('en-US', <NumberFormat value={-5} colorize />));
    expect(neg.container.querySelector('data')).toHaveClass('ui-number-format--negative');
    neg.unmount();
    const zero = render(inLocale('en-US', <NumberFormat value={0} colorize />));
    const el = zero.container.querySelector('data')!;
    expect(el).not.toHaveClass('ui-number-format--positive');
    expect(el).not.toHaveClass('ui-number-format--negative');
  });

  it('AC-10: currency without code warns and falls back to decimal', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(inLocale('en-US', <NumberFormat value={1234.5} format="currency" />));
    expect(container.querySelector('data')).toHaveTextContent('1,234.5');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('AC-11: formatter instances are memoised across renders and equal options', () => {
    const { result, rerender } = renderHook(({ o }) => useNumberFormatter(o, 'en-US'), { initialProps: { o: { maximumFractionDigits: 2 } as Intl.NumberFormatOptions } });
    const first = result.current;
    rerender({ o: { maximumFractionDigits: 2 } });
    expect(result.current).toBe(first);
    const other = renderHook(() => useNumberFormatter({ maximumFractionDigits: 2 }, 'en-US'));
    expect(other.result.current).toBe(first);
  });
});
