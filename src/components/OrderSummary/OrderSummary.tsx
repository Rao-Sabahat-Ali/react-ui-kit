import { useEffect, useId, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { EmptyState } from '../EmptyState/EmptyState';
import { Icon } from '../Icon/Icon';
import { Skeleton } from '../Skeleton/Skeleton';

export interface OrderLine {
  id: string;
  name: ReactNode;
  quantity: number;
  /** Major units (86.4 means 86.40). */
  unitPrice: number;
  /** Shown struck through when it is higher than `unitPrice`. */
  originalUnitPrice?: number;
  /** Defaults to `quantity × unitPrice`. */
  total?: number;
  description?: ReactNode;
  /** Product image node; give it explicit size and `alt`. */
  image?: ReactNode;
}

export interface OrderSummaryProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  lines?: OrderLine[];
  /** ISO 4217 code. */
  currency: string;
  /** `Intl` locale; defaults to the LocaleProvider locale. */
  locale?: string;
  subtotal?: number;
  /** `0` reads "Free", `null` reads "Calculated at next step", `undefined` hides the row. */
  shipping?: number | null;
  /** Amount >= 0, shown as a deduction. A negative or non-finite value is ignored (row hidden, not subtracted). */
  discount?: number;
  discountLabel?: ReactNode;
  tax?: number;
  /** The tax is already part of the prices: shown as "Including tax", not added. */
  taxIncluded?: boolean;
  /** Override the computed total (when the server is the source of truth). */
  total?: number;
  /** Slot for a promo-code field, between items and totals. */
  promo?: ReactNode;
  collapsible?: 'never' | 'below-lg' | 'always';
  defaultExpanded?: boolean;
  loading?: boolean;
  title?: ReactNode;
  titleAs?: 'h2' | 'h3' | 'h4';
}

const FALLBACK_DIGITS = 2;

/** Fraction digits of the currency (0 for JPY, 3 for BHD). Falls back to 2 for an unknown or malformed ISO code. */
export function currencyFractionDigits(currency: string, locale = 'en'): number {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? FALLBACK_DIGITS;
  } catch {
    return FALLBACK_DIGITS;
  }
}

/**
 * Converts a major-unit amount to integer minor units by rounding the DECIMAL representation half away from zero, not
 * `n * 10 ** digits` (which gives `1.005 * 100 === 100.49999999999999`). `toMinorUnits(1.005, 2)` is 101,
 * `toMinorUnits(0.145, 2)` is 15. Returns `NaN` for a non-finite input.
 */
export function toMinorUnits(amount: number, digits: number): number {
  if (!Number.isFinite(amount)) return NaN;
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(String(amount));
  if (!match) return NaN;
  const [, sign, whole, fraction = '', exponent = '0'] = match;
  const all = whole! + fraction;
  const point = whole!.length + Number(exponent) + digits; // position of the decimal point in `all` once scaled
  let integer: bigint;
  let roundUp: boolean;
  if (point <= 0) {
    integer = 0n;
    roundUp = point === 0 && all[0]! >= '5';
  } else {
    const head = all.length >= point ? all.slice(0, point) : all.padEnd(point, '0');
    integer = BigInt(head);
    roundUp = all.length > point && all[point]! >= '5';
  }
  const rounded = Number(roundUp ? integer + 1n : integer);
  return sign ? -rounded : rounded;
}

/** Formats a major-unit amount with `Intl` (for example `formatMoney(86.4, 'SEK', 'sv-SE')` gives "86,40 kr"). An invalid currency code or locale falls back to a plain number plus the code instead of throwing. */
export function formatMoney(amount: number, currency: string, locale = 'en'): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(safe);
  } catch {
    return `${safe.toFixed(FALLBACK_DIGITS)} ${String(currency).slice(0, 8)}`.trim();
  }
}

const isAmount = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const isQuantity = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;

const warned = new Set<string>();
function warnOnce(message: string) {
  if (!import.meta.env?.DEV || warned.has(message)) return;
  warned.add(message);
  console.warn(`[react-ui-kit] OrderSummary: ${message}`);
}

type TotalsInput = Pick<OrderSummaryProps, 'lines' | 'currency' | 'locale' | 'subtotal' | 'shipping' | 'discount' | 'tax' | 'taxIncluded' | 'total'>;

/** Everything `OrderSummary` shows, in integer minor units. `OrderSummary` and your pay button must use this one calculation. */
export interface OrderTotals {
  digits: number;
  lineMinor: number[];
  subtotal: number;
  /** `null` when shipping is pending or absent or invalid. */
  shipping: number | null;
  /** `0` hides the discount row and is not part of the maths. */
  discount: number;
  /** `null` hides the tax row. */
  tax: number | null;
  /** Never negative. */
  total: number;
}

/**
 * Validates and sums an order in integer minor units. Invalid input never produces NaN or a negative total: a
 * non-integer or negative `quantity` counts as 0, a non-finite or negative amount is ignored (its row is hidden),
 * and the total is clamped at 0. The discount row is shown if and only if it is part of the total.
 */
export function calculateOrderTotals({ lines = [], currency, locale = 'en', subtotal: subtotalProp, shipping, discount, tax, taxIncluded = false, total: totalProp }: TotalsInput): OrderTotals {
  const digits = currencyFractionDigits(currency, locale);
  const toMinor = (n: number) => toMinorUnits(n, digits);
  const quantityOf = (line: OrderLine) => {
    if (isQuantity(line.quantity)) return line.quantity;
    warnOnce(`line "${line.id}" has an invalid quantity (must be a whole number >= 0); counted as 0.`);
    return 0;
  };
  const unitOf = (line: OrderLine) => {
    if (isAmount(line.unitPrice)) return toMinor(line.unitPrice);
    warnOnce(`line "${line.id}" has an invalid unitPrice (must be a finite number >= 0); counted as 0.`);
    return 0;
  };
  const lineMinor = lines.map((line) => {
    if (line.total !== undefined) {
      if (isAmount(line.total)) return toMinor(line.total);
      warnOnce(`line "${line.id}" has an invalid total; computed from quantity and unitPrice instead.`);
    }
    return unitOf(line) * quantityOf(line);
  });
  const checked = (name: string, value: number | undefined): number | undefined => {
    if (value === undefined) return undefined;
    if (isAmount(value)) return toMinor(value);
    warnOnce(`${name} must be a finite number >= 0; ignored.`);
    return undefined;
  };
  const subtotalOverride = checked('subtotal', subtotalProp);
  const subtotal = subtotalOverride ?? lineMinor.reduce((a, b) => a + b, 0);
  const shippingMinor = shipping === null ? null : (checked('shipping', shipping) ?? null);
  const discountMinor = checked('discount', discount) ?? 0;
  const taxMinor = checked('tax', tax) ?? null;
  const totalOverride = checked('total', totalProp);
  const computed = subtotal + (shippingMinor ?? 0) - discountMinor + (taxIncluded ? 0 : (taxMinor ?? 0));
  return { digits, lineMinor, subtotal, shipping: shippingMinor, discount: discountMinor, tax: taxMinor, total: Math.max(0, totalOverride ?? computed) };
}

/**
 * Line items and totals. A real table (caption, column headers, tfoot rows with row headers) because items are records
 * with comparable columns; the total row is set apart by weight and one rule, not a box. Amounts are summed in integer
 * minor units to avoid floating point drift.
 */
export function OrderSummary({
  lines = [],
  currency,
  locale: localeProp,
  subtotal: subtotalProp,
  shipping,
  discount,
  discountLabel,
  tax,
  taxIncluded = false,
  total: totalProp,
  promo,
  collapsible = 'never',
  defaultExpanded = false,
  loading = false,
  title,
  titleAs: Title = 'h2',
  className,
  ...rest
}: OrderSummaryProps) {
  const { t, locale: contextLocale } = useLocale();
  const uid = useId();
  const locale = localeProp ?? contextLocale;
  const wide = useMediaQuery('(min-width: 992px)');
  const [expanded, setExpanded] = useState(defaultExpanded);

  const totals = calculateOrderTotals({ lines, currency, locale, subtotal: subtotalProp, shipping, discount, tax, taxIncluded, total: totalProp });
  const { digits, lineMinor, subtotal, discount: discountMinor, total } = totals;
  const toMinor = (n: number) => toMinorUnits(isAmount(n) ? n : 0, digits);
  const fmt = (minor: number) => formatMoney(minor / 10 ** digits, currency, locale);
  const totalText = fmt(total);

  // Announce changes to the total (never the first render).
  const [announcement, setAnnouncement] = useState('');
  const previous = useRef(totalText);
  useEffect(() => {
    if (previous.current !== totalText) {
      previous.current = totalText;
      if (!loading) setAnnouncement(t('orderTotalUpdated', { total: totalText }));
    }
  }, [totalText, loading, t]);

  const collapses = collapsible === 'always' || (collapsible === 'below-lg' && !wide);
  const open = !collapses || expanded;
  const headingId = `${uid}-title`;
  const bodyId = `${uid}-body`;
  const heading = title ?? t('orderSummary');

  const content = loading ? (
    <div aria-busy="true" className="ui-order-summary__loading">
      <span className="visually-hidden" role="status">
        {t('orderLoading')}
      </span>
      <Skeleton lines={3} />
      <Skeleton width="100%" height="1.5rem" className="d-block mt-4" />
    </div>
  ) : lines.length === 0 ? (
    <EmptyState size="sm" titleAs="h3" title={t('orderEmptyTitle')} description={t('orderEmptyDescription')} />
  ) : (
    <>
      <table className="ui-order-summary__table" aria-labelledby={headingId}>
        <caption className="visually-hidden">{t('orderSummaryCaption')}</caption>
        <thead className="visually-hidden">
          <tr>
            <th scope="col">{t('orderItem')}</th>
            <th scope="col">{t('orderTotalColumn')}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => {
            const discounted = line.originalUnitPrice !== undefined && toMinor(line.originalUnitPrice) > toMinor(line.unitPrice);
            const quantity = isQuantity(line.quantity) ? line.quantity : 0;
            const unit = fmt(toMinor(line.unitPrice));
            return (
              <tr key={line.id} className="ui-order-summary__line">
                <th scope="row">
                  <div className="ui-order-summary__item">
                    {line.image && <span className="ui-order-summary__image">{line.image}</span>}
                    <span className="ui-order-summary__text">
                      <span className="ui-order-summary__name">{line.name}</span>
                      {line.description && <span className="ui-order-summary__meta">{line.description}</span>}
                      <span className="ui-order-summary__meta">
                        {discounted ? (
                          <>
                            <del className="ui-order-summary__was" aria-hidden="true">
                              {fmt(toMinor(line.originalUnitPrice!))}
                            </del>{' '}
                            {t('orderQuantityEach', { quantity, price: unit })}
                            <span className="visually-hidden"> ({t('orderWasNow', { was: fmt(toMinor(line.originalUnitPrice!)), now: unit })})</span>
                          </>
                        ) : (
                          t('orderQuantityEach', { quantity, price: unit })
                        )}
                      </span>
                    </span>

                  </div>
                </th>
                <td className="ui-order-summary__amount">{fmt(lineMinor[i]!)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="ui-order-summary__row">
            <th scope="row">{t('orderSubtotal')}</th>
            <td className="ui-order-summary__amount">{fmt(subtotal)}</td>
          </tr>
          {(shipping === null || totals.shipping !== null) && (
            <tr className="ui-order-summary__row">
              <th scope="row">{t('orderShipping')}</th>
              <td className="ui-order-summary__amount">{totals.shipping === null ? <span className="ui-order-summary__pending">{t('orderShippingPending')}</span> : totals.shipping === 0 ? t('orderFree') : fmt(totals.shipping)}</td>
            </tr>
          )}
          {discountMinor > 0 && (
            <tr className="ui-order-summary__row">
              <th scope="row">{discountLabel ?? t('orderDiscount')}</th>
              <td className="ui-order-summary__amount">{`−${fmt(discountMinor)}`}</td>
            </tr>
          )}
          {totals.tax !== null && (
            <tr className="ui-order-summary__row">
              <th scope="row">{taxIncluded ? t('orderTaxIncluded') : t('orderTax')}</th>
              <td className="ui-order-summary__amount">{fmt(totals.tax)}</td>
            </tr>
          )}
          {promo && (
            <tr className="ui-order-summary__promo-row">
              <td colSpan={2} className="ui-order-summary__promo">
                {promo}
              </td>
            </tr>
          )}
          <tr className="ui-order-summary__row ui-order-summary__total-row">
            <th scope="row">{t('orderTotal')}</th>
            <td className="ui-order-summary__amount">{totalText}</td>
          </tr>
        </tfoot>
      </table>
    </>
  );

  return (
    <section aria-labelledby={headingId} className={cx('ui-order-summary', collapses && 'ui-order-summary--collapsible', open && 'ui-order-summary--open', className)} {...rest}>
      {collapses && (
        <button type="button" className="ui-order-summary__toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setExpanded((v) => !v)}>
          <span className="ui-order-summary__toggle-label">
            {open ? t('orderHide') : t('orderShow')}
            <Icon name={open ? 'chevron-up' : 'chevron-down'} size="sm" />
          </span>
          <span className="ui-order-summary__toggle-total">{totalText}</span>
        </button>
      )}
      <div id={bodyId} hidden={!open} className="ui-order-summary__body">
        <Title id={headingId} className={cx('ui-order-summary__title', collapses && 'visually-hidden')}>
          {heading}
        </Title>
        {content}
      </div>
      <span className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </span>
    </section>
  );
}
