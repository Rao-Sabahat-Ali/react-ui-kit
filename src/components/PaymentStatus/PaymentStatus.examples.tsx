import { PaymentStatus } from './PaymentStatus';

const noop = () => {};

export const examples = [
  {
    title: 'Processing and requires action',
    description: 'Processing is announced politely and is busy; requires action asks for a bank confirmation (3-D Secure).',
    code: `<PaymentStatus status="processing" />\n<PaymentStatus status="requires_action" onContinue={confirm} />`,
    render: () => (
      <div className="row g-3">
        <div className="col-md-6"><PaymentStatus status="processing" titleAs="h3" /></div>
        <div className="col-md-6"><PaymentStatus status="requires_action" titleAs="h3" onContinue={noop} /></div>
      </div>
    ),
  },
  {
    title: 'Succeeded with a reference',
    code: `<PaymentStatus status="succeeded" reference="ORD-48213" onContinue={goShopping} continueLabel="Continue shopping" />`,
    render: () => <PaymentStatus status="succeeded" titleAs="h3" reference="ORD-48213" onContinue={noop} continueLabel="Continue shopping" />,
  },
  {
    title: 'Failed and canceled',
    description: 'Failed announces assertively and offers a retry and another method. Entered details should be kept.',
    code: `<PaymentStatus status="failed" description="Your bank declined the payment." onRetry={retry} onUseAnotherMethod={change} />\n<PaymentStatus status="canceled" onRetry={retry} />`,
    render: () => (
      <div className="row g-3">
        <div className="col-md-6"><PaymentStatus status="failed" titleAs="h3" description="Your bank declined the payment. You have not been charged." reference="pay_8F2K" onRetry={noop} onUseAnotherMethod={noop} /></div>
        <div className="col-md-6"><PaymentStatus status="canceled" titleAs="h3" onRetry={noop} /></div>
      </div>
    ),
  },
];
