import { useState } from 'react';
import { Button, EmptyState, PageHeader, Section, Skeleton, Tag, Timeline, ToggleButton, useToast } from '@sabahat/react-ui-kit';

/*
 * Blueprint: Article / detail page (pattern `article-detail`; sample content is one order).
 * The page itself is the container: header with back link, meta tags and actions, then hairline-separated Sections for
 * each facet. Facts that compare sit in a plain captioned table, prose is capped at 70ch, there is a loading and a
 * not-found state, and the follow toggle uses aria-pressed with an Undo Toast.
 */

export type OrderDetailState = 'ready' | 'loading' | 'not-found';

export interface OrderDetailProps {
  /** Forces a state; used by the docs to demo loading and not found. */
  state?: OrderDetailState;
  /** Called with the back link href; defaults to an info toast. */
  onNavigate?: (href: string) => void;
}

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 });
const ITEMS = [
  { sku: 'BH-120', name: 'Birch shelf 120', quantity: 4, unitPrice: 890 },
  { sku: 'WB-040', name: 'Wall bracket set', quantity: 4, unitPrice: 145 },
  { sku: 'OL-500', name: 'Linseed oil 0.5 l', quantity: 2, unitPrice: 189 },
  { sku: 'DL-001', name: 'Delivery to Gothenburg', quantity: 1, unitPrice: 295 },
];
const EVENTS = [
  { at: '2026-10-23T14:12:00Z', title: 'Order placed', detail: 'Paid by card in the web shop.' },
  { at: '2026-10-23T15:03:00Z', title: 'Receipt sent', detail: 'Emailed to orders@ostrahamnen.example.' },
  { at: '2026-10-24T07:30:00Z', title: 'Packed', detail: 'Picked and packed at the Borås warehouse.' },
  { at: '2026-10-24T11:45:00Z', title: 'Handed to carrier', detail: 'Tracking number 8620 4417 0023.' },
];
const dateTime = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

export function OrderDetail({ state = 'ready', onNavigate }: OrderDetailProps) {
  const toast = useToast();
  const [following, setFollowing] = useState(false);
  const subtotal = ITEMS.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const vat = Math.round(subtotal * 0.25);

  if (state === 'not-found') {
    return (
      <>
        <h1 className="visually-hidden">Order not found</h1>
        <EmptyState
          variant="no-results"
          titleAs="h2"
          title="We could not find that order"
          description="It may have been deleted, or the number is mistyped."
          action={
            <Button appearance="outline" variant="secondary" onClick={() => onNavigate?.('/orders')}>
              Search orders
            </Button>
          }
        />
      </>
    );
  }

  if (state === 'loading') {
    return (
      <div aria-busy="true">
        <h1 className="visually-hidden">Loading order</h1>
        <span className="visually-hidden" role="status">
          Loading order
        </span>
        <Skeleton shape="text" width="40%" height="2.5rem" />
        <Skeleton lines={2} className="mt-3 mb-5" />
        <Skeleton shape="rect" height="12rem" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        back={{ href: '/orders', label: 'Orders' }}
        onNavigate={(href, e) => {
          e.preventDefault();
          if (onNavigate) onNavigate(href);
          else toast.info('Orders is not part of the blueprint');
        }}
        title="Order ORD-2561"
        meta={
          <>
            <Tag value="Paid" severity="success" />
            <Tag value="Web shop" />
          </>
        }
        description="Placed by Östra Hamnen Café on 23 October 2026."
        actions={
          <>
            <ToggleButton
              pressed={following}
              onLabel="Following"
              offLabel="Follow order"
              onChange={(next) => {
                setFollowing(next);
                if (next) toast.success('You will be notified about ORD-2561', { action: { label: 'Undo', onClick: () => setFollowing(false) } });
              }}
            />
            <Button appearance="outline" variant="secondary" onClick={() => toast.info('Preparing ORD-2561.pdf')}>
              Download PDF
            </Button>
            <Button onClick={() => toast.success('Receipt sent to orders@ostrahamnen.example')}>Send receipt</Button>
          </>
        }
      />

      <Section title="Summary">
        <dl className="row gx-0 mb-0" style={{ maxWidth: '48rem' }}>
          <dt className="col-sm-4 pe-3 fw-normal text-body-secondary">Customer</dt>
          <dd className="col-sm-8">Östra Hamnen Café</dd>
          <dt className="col-sm-4 pe-3 fw-normal text-body-secondary">Contact</dt>
          <dd className="col-sm-8">Elin Karlsson, orders@ostrahamnen.example</dd>
          <dt className="col-sm-4 pe-3 fw-normal text-body-secondary">Delivery address</dt>
          <dd className="col-sm-8">Skeppsbron 14, 411 21 Göteborg</dd>
          <dt className="col-sm-4 pe-3 fw-normal text-body-secondary">Payment</dt>
          <dd className="col-sm-8">Card, paid 23 October 2026</dd>
        </dl>
      </Section>

      <Section title="Items" separated>
        <div className="table-responsive" role="region" aria-label="Items in order ORD-2561" tabIndex={0}>
          <table className="table">
            <caption className="visually-hidden">Items in order ORD-2561</caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col" className="text-end">
                  Quantity
                </th>
                <th scope="col" className="text-end">
                  Unit price
                </th>
                <th scope="col" className="text-end">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {ITEMS.map((item) => (
                <tr key={item.sku}>
                  <th scope="row" className="fw-normal">
                    {item.name} <span className="text-body-secondary">({item.sku})</span>
                  </th>
                  <td className="text-end">{item.quantity}</td>
                  <td className="text-end">{money.format(item.unitPrice)}</td>
                  <td className="text-end">{money.format(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={3} className="text-end fw-normal">
                  Subtotal
                </th>
                <td className="text-end">{money.format(subtotal)}</td>
              </tr>
              <tr>
                <th scope="row" colSpan={3} className="text-end fw-normal">
                  VAT 25%
                </th>
                <td className="text-end">{money.format(vat)}</td>
              </tr>
              <tr>
                <th scope="row" colSpan={3} className="text-end">
                  Total
                </th>
                <td className="text-end fw-semibold">{money.format(subtotal + vat)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>

      <Section title="Delivery" separated>
        <div style={{ maxWidth: '36rem' }}>
          <Timeline
            aria-label="Delivery events"
            value={EVENTS}
            date={(e) => e.at}
            opposite={(e) => dateTime.format(new Date(e.at))}
            content={(e) => (
              <>
                <strong>{e.title}</strong>
                <div className="small text-body-secondary">{e.detail}</div>
              </>
            )}
          />
        </div>
      </Section>

      <Section title="Notes" separated>
        <p style={{ maxWidth: '70ch' }}>
          The café reopens on Monday and asked for delivery before 10:00. The carrier has been told to ring the bell at the side entrance, since the main door is under renovation
          until the end of the month.
        </p>
      </Section>
    </>
  );
}
