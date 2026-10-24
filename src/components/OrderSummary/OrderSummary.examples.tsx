import { useState } from 'react';
import { InputText } from '../InputText/InputText';
import { Button } from '../Button/Button';
import { OrderSummary, type OrderLine } from './OrderSummary';

const LINES: OrderLine[] = [
  { id: 'mug', name: 'Stoneware mug', description: 'Sand', quantity: 2, unitPrice: 21 },
  { id: 'towel', name: 'Linen tea towel', quantity: 1, unitPrice: 36, originalUnitPrice: 42 },
];

function WithPromo() {
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState(false);
  const promoField = (
    <div className="d-flex gap-2">
      <InputText aria-label="Promo code" placeholder="Promo code" value={code} onChange={setCode} />
      <Button appearance="outline" variant="secondary" onClick={() => setApplied(code.trim() !== '')}>Apply</Button>
    </div>
  );
  return (
    <div style={{ maxWidth: '24rem' }}>
      <OrderSummary
        currency="SEK"
        locale="sv-SE"
        lines={LINES}
        shipping={4}
        discount={applied ? 5 : undefined}
        discountLabel={applied ? 'Code SPRING' : undefined}
        tax={4.4}
        promo={promoField}
      />
    </div>
  );
}

export const examples = [
  {
    title: 'Totals with a promo code',
    description: 'A real table: items, then subtotal, shipping, discount, tax and a total set apart by weight. The total change is announced politely.',
    code: `<OrderSummary currency="SEK" locale="sv-SE" lines={lines} shipping={4} tax={4.4} promo={<PromoField />} />`,
    render: () => <WithPromo />,
  },
  {
    title: 'Collapsible below lg',
    description: 'Resize below 992 px: a bar "Show summary 86,40 kr" with aria-expanded replaces the open table.',
    code: `<OrderSummary currency="SEK" locale="sv-SE" lines={lines} shipping={4} tax={4.4} collapsible="below-lg" />`,
    render: () => (
      <div style={{ maxWidth: '24rem' }}>
        <OrderSummary currency="SEK" locale="sv-SE" lines={LINES} shipping={4} tax={4.4} collapsible="below-lg" />
      </div>
    ),
  },
  {
    title: 'Loading, shipping pending and empty',
    code: `<OrderSummary currency="SEK" lines={lines} loading />\n<OrderSummary currency="SEK" lines={lines} shipping={null} />\n<OrderSummary currency="SEK" lines={[]} />`,
    render: () => (
      <div className="row g-4">
        <div className="col-md-4"><OrderSummary currency="SEK" locale="sv-SE" lines={LINES} loading titleAs="h3" /></div>
        <div className="col-md-4"><OrderSummary currency="SEK" locale="sv-SE" lines={LINES} shipping={null} titleAs="h3" /></div>
        <div className="col-md-4"><OrderSummary currency="SEK" locale="sv-SE" lines={[]} titleAs="h3" /></div>
      </div>
    ),
  },
];
