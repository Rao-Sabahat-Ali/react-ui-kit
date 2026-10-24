import { render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { LocaleProvider, useLocale } from './LocaleProvider';

const wrap = (props: { locale: string; messages?: Record<string, string>; dir?: 'ltr' | 'rtl' }) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <LocaleProvider {...props}>{children}</LocaleProvider>;
  };

describe('LocaleProvider', () => {
  it('AC-1: t interpolates {vars} and falls back to English for missing keys', () => {
    const { result } = renderHook(() => useLocale(), { wrapper: wrap({ locale: 'sv', messages: { selectRow: 'Markera rad {index}' } }) });
    expect(result.current.t('selectRow', { index: 3 })).toBe('Markera rad 3');
    expect(result.current.t('close')).toBe('Close');
    expect(result.current.t('paginationReport', { first: 1, last: 10, total: 42 })).toBe('1–10 of 42');
    expect(result.current.t('selectRow', {})).toBe('Markera rad {index}');
    expect(result.current.tp('resultsCount', 1)).toBe('1 result');
    expect(result.current.tp('resultsCount', 5)).toBe('5 results');
  });

  it('AC-1: works without a provider (English defaults)', () => {
    const { result } = renderHook(() => useLocale());
    expect(result.current.locale).toBe('en');
    expect(result.current.t('cancel')).toBe('Cancel');
  });

  it('AC-2: wraps children in an element with dir and lang; RTL locales are auto-detected', () => {
    for (const [locale, dir] of [['ar', 'rtl'], ['he-IL', 'rtl'], ['fa', 'rtl'], ['ur', 'rtl'], ['ckb', 'rtl'], ['sv', 'ltr'], ['en-GB', 'ltr']] as const) {
      const { unmount } = render(<LocaleProvider locale={locale}><p>hello</p></LocaleProvider>);
      const wrapper = screen.getByText('hello').parentElement!;
      expect(wrapper).toHaveAttribute('dir', dir);
      expect(wrapper).toHaveAttribute('lang', locale);
      unmount();
    }
  });

  it('AC-2: an explicit dir wins over the locale', () => {
    render(<LocaleProvider locale="ar" dir="ltr"><p>hello</p></LocaleProvider>);
    expect(screen.getByText('hello').parentElement).toHaveAttribute('dir', 'ltr');
  });
});
