import { useState } from 'react';
import { Steps } from './Steps';

const items = [{ label: 'Cart' }, { label: 'Shipping', description: 'Address and method' }, { label: 'Payment' }, { label: 'Review' }];

function Interactive() {
  const [active, setActive] = useState(1);
  return <Steps items={items} activeIndex={active} readOnly={false} onSelect={setActive} ariaLabel="Checkout progress" />;
}

export const examples = [
  {
    title: 'Read-only progress',
    code: `<Steps items={items} activeIndex={2} ariaLabel="Checkout progress" />`,
    render: () => <Steps items={items} activeIndex={2} ariaLabel="Checkout progress" />,
  },
  {
    title: 'Clickable and vertical',
    code: `<Steps items={items} activeIndex={active} readOnly={false} onSelect={setActive} />\n<Steps orientation="vertical" items={[…, { label: 'Payment', status: 'error' }]} />`,
    render: () => (
      <div className="d-flex flex-column gap-4">
        <Interactive />
        <Steps orientation="vertical" activeIndex={2} items={[{ label: 'Cart' }, { label: 'Shipping' }, { label: 'Payment', status: 'error', description: 'Card declined' }]} ariaLabel="Order status" />
      </div>
    ),
  },
];
