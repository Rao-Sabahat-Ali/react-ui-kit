import { useState } from 'react';
import { PaymentCardForm, type CardFormState } from './PaymentCardForm';
import { TEST_CARD_NUMBERS } from './card';
import { useSimulatedProvider } from './simulatedProvider';

function HostedDemo() {
  const provider = useSimulatedProvider();
  const [done, setDone] = useState(false);
  return (
    <div style={{ maxWidth: '26rem' }}>
      <p className="text-body-secondary small">
        Simulated provider: the typed text stays in a native input appended to each slot, the way a real provider keeps it in an iframe. Use the test number {TEST_CARD_NUMBERS.visa}, any future date, any 3 digits. Test data only.
      </p>
      <PaymentCardForm fields={provider.fields} onReady={provider.onReady} onFocusRequest={provider.onFocusRequest} onSubmit={() => setDone(true)} submitLabel="Pay 86,40 kr" />
      {done && <p role="status" className="mt-3 mb-0">Submitted without card data: the page only learns the form is complete.</p>}
    </div>
  );
}

function RawDemo() {
  const [state, setState] = useState<CardFormState | null>(null);
  const [submitted, setSubmitted] = useState('');
  return (
    <div style={{ maxWidth: '26rem' }}>
      <p className="text-body-secondary small">
        Raw mode widens your PCI scope: use it for tokenisation APIs and tests only. Test numbers: {TEST_CARD_NUMBERS.visa} (Visa), {TEST_CARD_NUMBERS.mastercard} (Mastercard), {TEST_CARD_NUMBERS.amex} (American Express). Test data only.
      </p>
      <PaymentCardForm mode="raw" collectPostalCode onChange={setState} onSubmit={(values) => setSubmitted(`Tokenise ${values.brand} ending ${values.number.slice(-4)} with your provider, then discard the values.`)} submitLabel="Pay 86,40 kr" />
      <p className="small text-body-secondary mt-3 mb-0">
        onChange payload: {state ? `brand ${state.brand}, complete ${String(state.complete)}, last4 "${state.last4}", ${Object.keys(state.errors).length} errors` : 'none yet'}
      </p>
      {submitted && <p role="status" className="small mb-0">{submitted}</p>}
    </div>
  );
}

export const examples = [
  {
    title: 'Hosted fields (recommended)',
    description: 'Labelled slots your payment provider mounts its iframes into. Provider state drives focus, invalid and error styling.',
    code: `const { fields, onReady, onFocusRequest } = useProvider(); // your provider's mount and focus calls\n<PaymentCardForm\n  fields={fields}\n  onReady={(slot, element) => provider.mount(slot, element)}\n  onFocusRequest={(slot) => provider.focus(slot)}\n  onSubmit={confirmPayment}\n  submitLabel="Pay 86,40 kr"\n/>`,
    render: () => <HostedDemo />,
  },
  {
    title: 'Raw mode (tokenisation APIs and tests)',
    description: 'Real inputs with brand detection, Luhn, expiry and CVC validation. onChange never carries card data.',
    code: `<PaymentCardForm mode="raw" collectPostalCode onChange={(state) => setState(state)} onSubmit={(values) => tokenise(values)} />`,
    render: () => <RawDemo />,
  },
  {
    title: 'Disabled and without the note',
    code: `<PaymentCardForm disabled note={null} />`,
    render: () => (
      <div style={{ maxWidth: '26rem' }}>
        <PaymentCardForm disabled note={null} />
      </div>
    ),
  },
];
