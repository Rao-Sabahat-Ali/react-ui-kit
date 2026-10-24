import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderSummary, formatMoney, type OrderLine } from './OrderSummary';

const lines: OrderLine[] = [
  { id: 'mug', name: 'Stoneware mug', quantity: 2, unitPrice: 21, description: 'Sand' },
  { id: 'tee', name: 'Linen tee', quantity: 1, unitPrice: 36 },
];

function setViewport(wide: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: query.includes('min-width') ? wide : false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
}

describe('OrderSummary', () => {
  beforeEach(() => setViewport(true));
  afterEach(() => vi.restoreAllMocks());

  it('AC-1: a table with caption, headers and a row per line', () => {
    render(<OrderSummary currency="SEK" locale="sv-SE" lines={lines} />);
    const table = screen.getByRole('table', { name: 'Order summary' });
    expect(within(table).getByText('Items in your order with quantity and price').tagName).toBe('CAPTION');
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Item', 'Total']);
    const mug = within(table).getByRole('row', { name: /Stoneware mug/ });
    expect(mug).toHaveTextContent('Sand');
    expect(mug).toHaveTextContent('2 × 21,00 kr');
    expect(within(mug).getByRole('cell')).toHaveTextContent('42,00 kr');
    expect(within(table).getByRole('rowheader', { name: /Linen tee/ })).toBeInTheDocument();
  });

  it('AC-2: totals use Intl formatting for the locale, tabular figures, and absent rows are hidden', () => {
    const { rerender } = render(<OrderSummary currency="SEK" locale="sv-SE" lines={lines} shipping={4} discount={5} discountLabel="Code SPRING" tax={4.4} />);
    const rowValue = (name: string) => within(screen.getByRole('rowheader', { name })).getByText(name).closest('tr')!.querySelector('td')!;
    expect(rowValue('Subtotal')).toHaveTextContent('78,00 kr');
    expect(rowValue('Shipping')).toHaveTextContent('4,00 kr');
    expect(rowValue('Code SPRING')).toHaveTextContent('−5,00 kr');
    expect(rowValue('Tax')).toHaveTextContent('4,40 kr');
    expect(rowValue('Total')).toHaveTextContent('81,40 kr');
    expect(rowValue('Total')).toHaveClass('ui-order-summary__amount');
    rerender(<OrderSummary currency="USD" locale="en-US" lines={lines} />);
    expect(rowValue('Total')).toHaveTextContent('$78.00');
    expect(screen.queryByRole('rowheader', { name: 'Shipping' })).toBeNull();
    expect(screen.queryByRole('rowheader', { name: 'Tax' })).toBeNull();
    expect(formatMoney(86.4, 'SEK', 'sv-SE')).toBe('86,40 kr');
  });

  it('AC-3: computed in minor units; free, pending and included tax', () => {
    const { rerender } = render(<OrderSummary currency="USD" locale="en-US" lines={[{ id: 'a', name: 'A', quantity: 3, unitPrice: 0.1 }, { id: 'b', name: 'B', quantity: 1, unitPrice: 0.2 }]} />);
    expect(screen.getByRole('rowheader', { name: 'Total' }).closest('tr')).toHaveTextContent('$0.50');
    rerender(<OrderSummary currency="USD" locale="en-US" lines={lines} shipping={0} tax={15.6} taxIncluded />);
    expect(screen.getByRole('rowheader', { name: 'Shipping' }).closest('tr')).toHaveTextContent('Free');
    expect(screen.getByRole('rowheader', { name: 'Including tax' }).closest('tr')).toHaveTextContent('$15.60');
    expect(screen.getByRole('rowheader', { name: 'Total' }).closest('tr')).toHaveTextContent('$78.00');
    rerender(<OrderSummary currency="USD" locale="en-US" lines={lines} shipping={null} />);
    expect(screen.getByRole('rowheader', { name: 'Shipping' }).closest('tr')).toHaveTextContent('Calculated at next step');
    rerender(<OrderSummary currency="USD" locale="en-US" lines={lines} total={99} />);
    expect(screen.getByRole('rowheader', { name: 'Total' }).closest('tr')).toHaveTextContent('$99.00');
  });

  it('AC-4: the total row is emphasised and the promo slot sits between items and totals', () => {
    render(<OrderSummary currency="SEK" locale="sv-SE" lines={lines} promo={<label>Promo code <input /></label>} />);
    expect(screen.getByRole('rowheader', { name: 'Total' }).closest('tr')).toHaveClass('ui-order-summary__total-row');
    const rows = screen.getAllByRole('row');
    const promo = rows.findIndex((r) => r.querySelector('input'));
    expect(promo).toBeGreaterThan(rows.findIndex((r) => r.textContent?.includes('Subtotal')));
    expect(promo).toBeLessThan(rows.findIndex((r) => r.classList.contains('ui-order-summary__total-row')));
  });

  it('AC-5: below lg shows a disclosure with the total, at lg no button; always collapses', async () => {
    const user = userEvent.setup();
    setViewport(false);
    const { unmount } = render(<OrderSummary currency="SEK" locale="sv-SE" lines={lines} shipping={4} tax={4.4} collapsible="below-lg" />);
    const toggle = screen.getByRole('button', { name: /Show summary/ });
    expect(toggle).toHaveTextContent('86,40');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('table')).toBeNull();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveTextContent('Hide summary');
    expect(screen.getByRole('table', { name: 'Order summary' })).toBeVisible();
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toContainElement(screen.getByRole('table'));
    await user.click(toggle);
    expect(screen.queryByRole('table')).toBeNull();
    unmount();

    setViewport(true);
    const { unmount: unmountWide } = render(<OrderSummary currency="SEK" lines={lines} collapsible="below-lg" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('table')).toBeVisible();
    unmountWide();
    render(<OrderSummary currency="SEK" lines={lines} collapsible="always" defaultExpanded />);
    expect(screen.getByRole('button', { name: /Hide summary/ })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeVisible();
  });

  it('AC-6: loading shows a status and skeletons; no lines shows the empty state', () => {
    const { rerender, container } = render(<OrderSummary currency="SEK" lines={lines} loading />);
    expect(screen.getAllByRole('status').some((s) => s.textContent === 'Loading order summary')).toBe(true);
    expect(screen.queryByRole('table')).toBeNull();
    expect(container.querySelector('.ui-skeleton')).not.toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    rerender(<OrderSummary currency="SEK" lines={[]} />);
    expect(screen.getByRole('heading', { name: 'Your order is empty' })).toBeInTheDocument();
  });

  it('AC-7: a changed total is announced politely, the first render is silent', () => {
    const { rerender, container } = render(<OrderSummary currency="SEK" locale="sv-SE" lines={lines} shipping={4} />);
    const live = () => container.querySelector('[aria-live="polite"]')!;
    expect(live().textContent).toBe('');
    rerender(<OrderSummary currency="SEK" locale="sv-SE" lines={lines} shipping={9} />);
    expect(live().textContent).toContain('Total updated to 87,00');
  });

  it('AC-8: a discounted unit price is struck and spoken as was/now', () => {
    render(<OrderSummary currency="USD" locale="en-US" lines={[{ id: 'a', name: 'Mug', quantity: 1, unitPrice: 21, originalUnitPrice: 24 }]} />);
    const row = screen.getByRole('row', { name: /Mug/ });
    expect(row.querySelector('del')).toHaveTextContent('$24.00');
    expect(row).toHaveTextContent('was $24.00, now $21.00');
  });
});
