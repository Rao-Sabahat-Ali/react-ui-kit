import { useMemo, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';

export interface NumberFormatOptionsProps {
  format?: 'decimal' | 'currency' | 'percent' | 'unit';
  currency?: string;
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
  unit?: string;
  notation?: 'standard' | 'compact' | 'scientific' | 'engineering';
  compactDisplay?: 'short' | 'long';
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  signDisplay?: 'auto' | 'always' | 'exceptZero' | 'never';
  options?: Intl.NumberFormatOptions;
}

export interface NumberFormatProps extends NumberFormatOptionsProps, Omit<HTMLAttributes<HTMLElement>, 'title'> {
  value: number | bigint | null | undefined;
  locale?: string;
  tabular?: boolean;
  colorize?: boolean;
  fallback?: ReactNode;
  title?: string | boolean;
  ref?: Ref<HTMLElement>;
}

function warn(message: string) {
  if (import.meta.env?.DEV) console.warn(`[react-ui-kit] NumberFormat: ${message}`);
}

/** Map component props to `Intl.NumberFormatOptions` (options escape hatch merged last). */
export function toIntlOptions(p: NumberFormatOptionsProps): Intl.NumberFormatOptions {
  const out: Intl.NumberFormatOptions = {};
  const format = p.format ?? 'decimal';
  if (format === 'currency') {
    if (p.currency) {
      out.style = 'currency';
      out.currency = p.currency;
      if (p.currencyDisplay) out.currencyDisplay = p.currencyDisplay;
    } else warn('format="currency" requires a `currency` code; falling back to decimal.');
  } else if (format === 'unit') {
    if (p.unit) {
      out.style = 'unit';
      out.unit = p.unit;
    } else warn('format="unit" requires a `unit`; falling back to decimal.');
  } else if (format === 'percent') out.style = 'percent';
  if (p.notation) out.notation = p.notation;
  if (p.notation === 'compact' && p.compactDisplay) out.compactDisplay = p.compactDisplay;
  if (p.minimumFractionDigits !== undefined) out.minimumFractionDigits = p.minimumFractionDigits;
  if (p.maximumFractionDigits !== undefined) out.maximumFractionDigits = p.maximumFractionDigits;
  if (p.signDisplay) out.signDisplay = p.signDisplay;
  return { ...out, ...p.options };
}

const cache = new Map<string, Intl.NumberFormat>();

function getFormatter(options: Intl.NumberFormatOptions, locale: string): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options, Object.keys(options).sort())}`;
  let nf = cache.get(key);
  if (!nf) {
    try {
      nf = new Intl.NumberFormat(locale, options);
    } catch {
      warn('invalid Intl options; falling back to defaults.');
      nf = new Intl.NumberFormat(locale);
    }
    cache.set(key, nf);
  }
  return nf;
}

/** Memoised `Intl.NumberFormat` keyed by locale + options (shared instances across components). */
export function useNumberFormatter(options: Intl.NumberFormatOptions = {}, locale?: string): Intl.NumberFormat {
  const ctx = useLocale().locale;
  const loc = locale ?? ctx;
  const key = JSON.stringify(options, Object.keys(options).sort());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getFormatter(options, loc), [key, loc]);
}

export function formatNumber(value: number | bigint, options: Intl.NumberFormatOptions = {}, locale = 'en'): string {
  return getFormatter(options, locale).format(value);
}

export function NumberFormat({
  value,
  format,
  currency,
  currencyDisplay,
  unit,
  notation,
  compactDisplay,
  minimumFractionDigits,
  maximumFractionDigits,
  signDisplay,
  options,
  locale,
  tabular = false,
  colorize = false,
  fallback = '—',
  title = false,
  className,
  ref,
  ...rest
}: NumberFormatProps) {
  const { t } = useLocale();
  const intl = toIntlOptions({ format, currency, currencyDisplay, unit, notation, compactDisplay, minimumFractionDigits, maximumFractionDigits, signDisplay, options });
  if (colorize && (!intl.signDisplay || intl.signDisplay === 'auto' || intl.signDisplay === 'never')) intl.signDisplay = 'exceptZero';
  const formatter = useNumberFormatter(intl, locale);
  const fullFormatter = useNumberFormatter({ ...intl, notation: 'standard', compactDisplay: undefined }, locale);

  const missing = value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value));
  if (missing) {
    return (
      <span ref={ref} className={cx('ui-number-format ui-number-format--empty', className)} {...rest}>
        <span aria-hidden="true">{fallback}</span>
        <span className="visually-hidden">{t('notAvailable')}</span>
      </span>
    );
  }

  const text = formatter.format(value);
  const full = typeof title === 'string' ? title : title ? fullFormatter.format(value) : undefined;
  const sign = typeof value === 'bigint' ? (value > 0n ? 1 : value < 0n ? -1 : 0) : Math.sign(value);

  return (
    <data
      ref={ref as Ref<HTMLDataElement>}
      value={String(value)}
      title={full}
      aria-label={full}
      className={cx(
        'ui-number-format',
        tabular && 'ui-number-format--tabular',
        colorize && sign > 0 && 'ui-number-format--positive',
        colorize && sign < 0 && 'ui-number-format--negative',
        className,
      )}
      {...rest}
    >
      {text}
    </data>
  );
}
