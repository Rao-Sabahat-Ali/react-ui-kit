import { useState } from 'react';
import { registerIcons } from '../Icon/Icon';
import { Tag } from '../Tag/Tag';
import { PaymentCardForm } from '../PaymentCardForm/PaymentCardForm';
import { useSimulatedProvider } from '../PaymentCardForm/simulatedProvider';
import { PaymentMethodSelector } from './PaymentMethodSelector';

// The kit ships no payment brand logos or payment icons: register generic ones (or pass your own node as `icon`).
registerIcons({
  'credit-card': 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM3 10h18M7 15h3',
  wallet: 'M4 7a2 2 0 0 1 2-2h12v3M4 7v10a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6a2 2 0 0 1-2-1zM16 13.5h2',
  bank: 'M3 10l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18',
});

function CheckoutDemo() {
  const [method, setMethod] = useState<string | null>('card');
  const provider = useSimulatedProvider();
  return (
    <div style={{ maxWidth: '32rem' }}>
      <PaymentMethodSelector
        value={method}
        onChange={setMethod}
        methods={[
          { id: 'card', label: 'Card', description: 'Visa, Mastercard, American Express', icon: 'credit-card', children: <PaymentCardForm fields={provider.fields} onReady={provider.onReady} onFocusRequest={provider.onFocusRequest} /> },
          { id: 'wallet', label: 'Digital wallet', description: 'Confirm on your phone', icon: 'wallet', badge: <Tag value="Fastest" />, children: <p className="mb-0 text-body-secondary">You will confirm the payment in your wallet app.</p> },
          { id: 'transfer', label: 'Bank transfer', icon: 'bank', description: 'We ship when the payment arrives' },
          { id: 'invoice', label: 'Invoice', disabled: true, disabledReason: 'Available for orders over 500 kr' },
        ]}
      />
    </div>
  );
}

export const examples = [
  {
    title: 'Methods with a revealed card form',
    description: 'Arrow keys move the selection, the card form mounts only while Card is selected, and an unavailable method says why. The kit ships no brand logos: pass your own licensed icon node if you need one.',
    code: `<PaymentMethodSelector\n  value={method}\n  onChange={setMethod}\n  methods={[\n    { id: 'card', label: 'Card', icon: 'credit-card', children: <PaymentCardForm /> },\n    { id: 'wallet', label: 'Digital wallet', badge: <Tag value="Fastest" /> },\n    { id: 'invoice', label: 'Invoice', disabled: true, disabledReason: 'Available for orders over 500 kr' },\n  ]}\n/>`,
    render: () => <CheckoutDemo />,
  },
  {
    title: 'Hidden legend and error',
    code: `<PaymentMethodSelector legend="Pay with" legendHidden error="Choose a payment method" methods={methods} />`,
    render: () => (
      <div style={{ maxWidth: '32rem' }}>
        <PaymentMethodSelector legend="Pay with" legendHidden error="Choose a payment method" methods={[{ id: 'card', label: 'Card' }, { id: 'transfer', label: 'Bank transfer' }]} />
      </div>
    ),
  },
];
