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
  /** Positive amount; shown as a deduction. */
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

const minorDigits = (currency: string, locale: string): number => new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;

/** Formats a major-unit amount with `Intl` (for example `formatMoney(86.4, 'SEK', 'sv-SE')` gives "86,40 kr"). */
export function formatMoney(amount: number, currency: string, locale = 'en'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
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

  const digits = minorDigits(currency, locale);
  const scale = 10 ** digits;
  const toMinor = (n: number) => Math.round(n * scale);
  const fmt = (minor: number) => formatMoney(minor / scale, currency, locale);

  const lineMinor = lines.map((line) => (line.total !== undefined ? toMinor(line.total) : toMinor(line.unitPrice) * line.quantity));
  const subtotal = subtotalProp !== undefined ? toMinor(subtotalProp) : lineMinor.reduce((a, b) => a + b, 0);
  const shippingMinor = typeof shipping === 'number' ? toMinor(shipping) : 0;
  const discountMinor = discount ? toMinor(discount) : 0;
  const taxMinor = tax !== undefined ? toMinor(tax) : 0;
  const total = totalProp !== undefined ? toMinor(totalProp) : subtotal + shippingMinor - discountMinor + (taxIncluded ? 0 : taxMinor);
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
                            {t('orderQuantityEach', { quantity: line.quantity, price: unit })}
                            <span className="visually-hidden"> ({t('orderWasNow', { was: fmt(toMinor(line.originalUnitPrice!)), now: unit })})</span>
                          </>
                        ) : (
                          t('orderQuantityEach', { quantity: line.quantity, price: unit })
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
          {shipping !== undefined && (
            <tr className="ui-order-summary__row">
              <th scope="row">{t('orderShipping')}</th>
              <td className="ui-order-summary__amount">{shipping === null ? <span className="ui-order-summary__pending">{t('orderShippingPending')}</span> : shippingMinor === 0 ? t('orderFree') : fmt(shippingMinor)}</td>
            </tr>
          )}
          {discount !== undefined && discount > 0 && (
            <tr className="ui-order-summary__row">
              <th scope="row">{discountLabel ?? t('orderDiscount')}</th>
              <td className="ui-order-summary__amount">{`−${fmt(discountMinor)}`}</td>
            </tr>
          )}
          {tax !== undefined && (
            <tr className="ui-order-summary__row">
              <th scope="row">{taxIncluded ? t('orderTaxIncluded') : t('orderTax')}</th>
              <td className="ui-order-summary__amount">{fmt(taxMinor)}</td>
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
