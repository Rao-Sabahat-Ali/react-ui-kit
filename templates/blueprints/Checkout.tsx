import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Button,
  Field,
  Icon,
  InputText,
  Message,
  OrderSummary,
  PageHeader,
  PaymentCardForm,
  PaymentMethodSelector,
  PaymentStatus,
  RadioGroup,
  Select,
  Stepper,
  calculateOrderTotals,
  cardDigits,
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  formatMoney,
  isValidCardLength,
  luhnCheck,
  registerIcons,
  useToast,
  validateExpiry,
  type HostedFieldState,
  type HostedSlot,
} from '@sabahat/react-ui-kit';
import { CheckoutFigure } from './figures';
import { CART_LINES, COUNTRIES, CURRENCY, DELIVERY_METHODS, LOCALE, ORDER_REFERENCE, TAX } from './Checkout.data';

/*
 * Blueprint: Checkout (profile `ecommerce`, pattern `checkout`).
 * Four steps with a linear Stepper (contact, delivery, payment, review), then a confirmation. Guest first, an order
 * summary on every step (right column from lg, a collapsible bar above), the amount on the final button, payment
 * state shown with PaymentStatus, and entered data kept when a payment fails.
 *
 * UI only. This sample never talks to a payment provider and never touches card data: in the Card method the kit renders
 * hosted-field slots and `useSimulatedHostedFields` below imitates a provider by appending a native input to each slot
 * (a real provider mounts an iframe there). Replace that hook with your provider's SDK. The server must create the
 * payment, recompute amounts, handle 3-D Secure and confirm the result by webhook (rules/security.md, Payments).
 * Demo: any email; test card number 4242 4242 4242 4242, any future date, any 3 digits (test data only).
 */

export type CheckoutState = 'ready' | 'loading' | 'failed' | 'requires-action';

export interface CheckoutProps {
  appName?: string;
  /** Docs preview: `loading` skeletons the totals, `failed` declines the first attempt, `requires-action` asks for 3-D Secure. */
  previewState?: { state: CheckoutState };
  /** Called from the confirmation; defaults to an info toast. */
  onContinueShopping?: () => void;
}

registerIcons({
  'credit-card': 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM3 10h18M7 15h3',
  wallet: 'M4 7a2 2 0 0 1 2-2h12v3M4 7v10a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6a2 2 0 0 1-2-1zM16 13.5h2',
  bank: 'M3 10l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18',
  invoice: 'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6',
});

type StepValue = 'contact' | 'delivery' | 'payment' | 'review';
type Phase = 'editing' | 'processing' | 'requires_action' | 'failed' | 'succeeded';

const isEmail = (v: string) => {
  const value = v.trim();
  return !/\s/.test(value) && /^[^@]+@[^@]+\.[^@]+$/.test(value);
};
const MEASURE = { maxWidth: '36rem' } as const;

/** One line of copy per step with its drawn part beside it from lg up (hidden on narrow screens so the first field stays near the top). */
const lead = (step: StepValue, copy: string) => (
  <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
    <p className="text-body-secondary mb-0">{copy}</p>
    <div className="d-none d-lg-block flex-shrink-0">
      <CheckoutFigure step={step} />
    </div>
  </div>
);

/* ------------------------------------------------------------------------------ simulated provider */

const SLOT_COPY: Record<HostedSlot, { label: string; placeholder: string; autocomplete: string }> = {
  number: { label: 'Card number', placeholder: '1234 1234 1234 1234', autocomplete: 'cc-number' },
  expiry: { label: 'Expiry date', placeholder: 'MM / YY', autocomplete: 'cc-exp' },
  cvc: { label: 'Security code', placeholder: 'CVC', autocomplete: 'cc-csc' },
};

function evaluate(slot: HostedSlot, value: string, blurred: boolean): HostedFieldState {
  let complete = false;
  let invalid = false;
  let message = '';
  let required = '';
  if (slot === 'number') {
    const digits = cardDigits(value);
    const known = isValidCardLength(detectCardBrand(digits), digits.length);
    complete = known && luhnCheck(digits);
    invalid = known && !complete;
    message = invalid ? 'Your card number is invalid.' : 'Your card number is incomplete.';
    required = 'Enter your card number.';
  } else if (slot === 'expiry') {
    const result = validateExpiry(value);
    complete = result.valid;
    invalid = !result.valid && result.reason !== 'incomplete' && result.reason !== 'empty';
    message = result.reason === 'expired' ? 'The expiry date is in the past.' : result.reason === 'incomplete' ? 'The expiry date is incomplete.' : 'The expiry date is invalid.';
    required = 'Enter the expiry date.';
  } else {
    complete = cardDigits(value).length >= 3;
    message = 'The security code is incomplete.';
    required = 'Enter the security code.';
  }
  return { empty: value === '', complete, invalid, error: blurred && !complete ? (value === '' ? required : message) : undefined };
}

/** Imitates a payment provider's hosted fields. The typed text stays inside native inputs appended to the slots. */
function useSimulatedHostedFields() {
  const inputs = useRef<Partial<Record<HostedSlot, HTMLInputElement>>>({});
  const blurred = useRef<Partial<Record<HostedSlot, boolean>>>({});
  // Like a provider's elements group, the typed text outlives the slot's container (a step change unmounts it).
  const kept = useRef<Partial<Record<HostedSlot, string>>>({});
  const [fields, setFields] = useState<Partial<Record<HostedSlot, HostedFieldState>>>({});

  const report = useCallback((slot: HostedSlot, focused: boolean) => {
    const state = { focused, ...evaluate(slot, inputs.current[slot]?.value ?? '', Boolean(blurred.current[slot])) };
    setFields((prev) => ({ ...prev, [slot]: state }));
    return state;
  }, []);

  const onReady = useCallback(
    (slot: HostedSlot, element: HTMLElement) => {
      if (element.firstChild) return;
      const copy = SLOT_COPY[slot];
      const input = document.createElement('input');
      input.className = 'ui-hosted-field__input';
      input.setAttribute('aria-label', copy.label);
      input.setAttribute('inputmode', 'numeric');
      input.setAttribute('autocomplete', copy.autocomplete);
      input.setAttribute('spellcheck', 'false');
      input.placeholder = copy.placeholder;
      input.value = kept.current[slot] ?? '';
      input.addEventListener('input', () => {
        if (slot === 'number') input.value = formatCardNumber(input.value);
        else if (slot === 'expiry') input.value = formatExpiry(input.value);
        else input.value = cardDigits(input.value).slice(0, 4);
        kept.current[slot] = input.value;
        report(slot, true);
      });
      input.addEventListener('focus', () => report(slot, true));
      input.addEventListener('blur', () => {
        blurred.current[slot] = true;
        report(slot, false);
      });
      inputs.current[slot] = input;
      element.append(input);
      report(slot, false);
    },
    [report],
  );

  const focus = useCallback((slot: HostedSlot) => inputs.current[slot]?.focus(), []);

  /** Shows every error, focuses the first incomplete slot and returns whether the card is complete. */
  const validate = useCallback((): boolean => {
    let first: HostedSlot | null = null;
    for (const slot of ['number', 'expiry', 'cvc'] as const) {
      blurred.current[slot] = true;
      if (!report(slot, false).complete && first === null) first = slot;
    }
    if (first) inputs.current[first]?.focus();
    return first === null;
  }, [report]);

  return { fields, onReady, focus, validate };
}

/* ------------------------------------------------------------------------------------------ screen */

export function Checkout({ appName = 'Nordic Tools', previewState, onContinueShopping }: CheckoutProps) {
  const toast = useToast();
  const demo = previewState?.state ?? 'ready';
  const [step, setStep] = useState<StepValue>('contact');
  const [phase, setPhase] = useState<Phase>('editing');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState({ name: '', street: '', postcode: '', city: '', country: 'SE' });
  const [delivery, setDelivery] = useState('standard');
  const [method, setMethod] = useState<string | null>('card');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const attempts = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const refs = { email: useRef<HTMLInputElement>(null), name: useRef<HTMLInputElement>(null), street: useRef<HTMLInputElement>(null), postcode: useRef<HTMLInputElement>(null), city: useRef<HTMLInputElement>(null) };
  const provider = useSimulatedHostedFields();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const chosen = DELIVERY_METHODS.find((d) => d.value === delivery) ?? DELIVERY_METHODS[0]!;
  // The pay button amount comes from the same calculation as <OrderSummary>, never from a second sum.
  const totals = calculateOrderTotals({ lines: CART_LINES, currency: CURRENCY, locale: LOCALE, shipping: chosen.price, tax: TAX });
  const total = totals.total / 10 ** totals.digits;
  const money = (n: number) => formatMoney(n, CURRENCY, LOCALE);
  const loadingTotals = demo === 'loading';

  const methodLabel = { card: 'Card', wallet: 'Digital wallet', transfer: 'Bank transfer', invoice: 'Invoice' }[method ?? 'card'] ?? 'Card';

  const submitContact = (event: FormEvent) => {
    event.preventDefault();
    if (!isEmail(email)) {
      setErrors({ email: 'Enter an email like name@example.com' });
      return refs.email.current?.focus();
    }
    setErrors({});
    setStep('delivery');
  };

  const submitDelivery = (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!address.name.trim()) next.name = 'Enter your full name';
    if (!address.street.trim()) next.street = 'Enter your street address';
    if (!address.postcode.trim()) next.postcode = 'Enter your postcode';
    if (!address.city.trim()) next.city = 'Enter your city';
    setErrors(next);
    const first = (['name', 'street', 'postcode', 'city'] as const).find((k) => next[k]);
    if (first) return refs[first].current?.focus();
    setStep('payment');
  };

  const submitPayment = (event: FormEvent) => {
    event.preventDefault();
    if (method === null) return setErrors({ method: 'Choose how you want to pay' });
    if (method === 'card' && !provider.validate()) return;
    setErrors({});
    setStep('review');
  };

  const settle = (next: Phase, after: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPhase(next), after);
  };

  const placeOrder = () => {
    setPhase('processing');
    const attempt = attempts.current++;
    if (demo === 'requires-action' && attempt === 0) settle('requires_action', 900);
    else if (demo === 'failed' && attempt === 0) settle('failed', 900);
    else settle('succeeded', 900);
  };

  const summary = (
    <div className="sticky-lg-top" style={{ top: 'var(--ui-space-6)' }}>
      <OrderSummary
        key={phase === 'editing' && step === 'review' ? 'open' : 'closed'}
        lines={CART_LINES}
        currency={CURRENCY}
        locale={LOCALE}
        shipping={step === 'contact' ? null : chosen.price}
        tax={TAX}
        loading={loadingTotals}
        collapsible="below-lg"
        defaultExpanded={phase === 'editing' && step === 'review'}
      />
    </div>
  );

  const back = (to: StepValue) => (
    <Button appearance="outline" variant="secondary" onClick={() => setStep(to)}>
      Back
    </Button>
  );

  let body;
  if (phase === 'editing') {
    body = (
      <Stepper linear value={step} onChange={(v) => setStep(v as StepValue)} headingLevel={2}>
        <Stepper.Step value="contact" label="Contact">
          <form noValidate onSubmit={submitContact} style={MEASURE} aria-label="Contact">
            {lead('contact', 'You are checking out as a guest. No account needed.')}
            <Field id="checkout-email" label="Email" required error={errors.email} help="We send your receipt here.">
              <InputText ref={refs.email} type="email" autoComplete="email" value={email} onChange={setEmail} />
            </Field>
            <div className="d-flex flex-wrap align-items-center gap-3 mt-4">
              <Button type="submit">Continue as guest</Button>
              <Button appearance="text" variant="secondary" onClick={() => toast.info('Sign in is not part of this blueprint')}>
                Have an account? Sign in
              </Button>
            </div>
          </form>
        </Stepper.Step>

        <Stepper.Step value="delivery" label="Delivery">
          <form noValidate onSubmit={submitDelivery} style={MEASURE} aria-label="Delivery">
            {lead('delivery', 'Where should we send it, and how fast?')}
            <Field id="checkout-name" label="Full name" required error={errors.name}>
              <InputText ref={refs.name} autoComplete="shipping name" value={address.name} onChange={(name) => setAddress((a) => ({ ...a, name }))} />
            </Field>
            <Field id="checkout-street" label="Address" required error={errors.street}>
              <InputText ref={refs.street} autoComplete="shipping street-address" value={address.street} onChange={(street) => setAddress((a) => ({ ...a, street }))} />
            </Field>
            <div className="row g-3">
              <div className="col-5">
                <Field id="checkout-postcode" label="Postcode" required error={errors.postcode}>
                  <InputText ref={refs.postcode} autoComplete="shipping postal-code" inputMode="numeric" value={address.postcode} onChange={(postcode) => setAddress((a) => ({ ...a, postcode }))} />
                </Field>
              </div>
              <div className="col-7">
                <Field id="checkout-city" label="City" required error={errors.city}>
                  <InputText ref={refs.city} autoComplete="shipping address-level2" value={address.city} onChange={(city) => setAddress((a) => ({ ...a, city }))} />
                </Field>
              </div>
            </div>
            <Field id="checkout-country" label="Country" required>
              <Select<string> native options={COUNTRIES} value={address.country} onChange={(country) => setAddress((a) => ({ ...a, country: country ?? 'SE' }))} />
            </Field>
            <RadioGroup<string>
              legend="Delivery method"
              value={delivery}
              onChange={setDelivery}
              options={DELIVERY_METHODS.map((d) => ({ value: d.value, label: d.label, description: `${money(d.price)} · ${d.arrives}` }))}
            />
            <div className="d-flex flex-wrap gap-2 mt-4">
              {back('contact')}
              <Button type="submit">Continue to payment</Button>
            </div>
          </form>
        </Stepper.Step>

        <Stepper.Step value="payment" label="Payment">
          <form noValidate onSubmit={submitPayment} style={MEASURE} aria-label="Payment">
            {lead('payment', 'Choose how you want to pay.')}
            <PaymentMethodSelector
              legend="Payment method"
              legendHidden
              value={method}
              onChange={(id) => {
                setMethod(id);
                setErrors({});
              }}
              error={errors.method}
              methods={[
                {
                  id: 'card',
                  label: 'Card',
                  description: 'Pay securely with your debit or credit card',
                  icon: 'credit-card',
                  children: <PaymentCardForm fields={provider.fields} onReady={provider.onReady} onFocusRequest={provider.focus} legend="Card details" />,
                },
                { id: 'wallet', label: 'Digital wallet', description: 'Confirm in your wallet app', icon: 'wallet', children: <p className="mb-0 text-body-secondary">You confirm the payment in your wallet app after you place the order.</p> },
                { id: 'transfer', label: 'Bank transfer', description: 'We ship when the payment arrives', icon: 'bank', children: <p className="mb-0 text-body-secondary">You get the bank details on the next page. Transfers usually arrive within one business day.</p> },
                { id: 'invoice', label: 'Invoice', description: 'Pay within 14 days', icon: 'invoice', children: <p className="mb-0 text-body-secondary">The invoice is sent by email. A small invoice fee may apply.</p> },
              ]}
            />
            <div className="d-flex flex-wrap gap-2 mt-4">
              {back('delivery')}
              <Button type="submit">Review order</Button>
            </div>
          </form>
        </Stepper.Step>

        <Stepper.Step value="review" label="Review">
          <div style={MEASURE}>
            {lead('review', 'Check your order, then place it.')}
            <ul className="list-unstyled mb-4">
              {[
                { key: 'contact', label: 'Contact', value: email, to: 'contact' as const },
                { key: 'delivery', label: 'Delivery', value: `${address.name}, ${address.street}, ${address.postcode} ${address.city} · ${chosen.label}, ${chosen.arrives}`, to: 'delivery' as const },
                { key: 'payment', label: 'Payment', value: methodLabel, to: 'payment' as const },
              ].map((row) => (
                <li key={row.key} className="d-flex justify-content-between align-items-start gap-3 py-3 border-top">
                  <div className="min-w-0">
                    <div className="small text-body-secondary">{row.label}</div>
                    <div className="text-break">{row.value}</div>
                  </div>
                  <Button size="sm" appearance="text" variant="secondary" aria-label={`Edit ${row.label.toLowerCase()}`} onClick={() => setStep(row.to)}>
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
            <Button size="lg" block loading={loadingTotals} onClick={placeOrder}>
              {`Place order · ${money(total)}`}
            </Button>
            <div className="mt-3">{back('payment')}</div>
          </div>
        </Stepper.Step>
      </Stepper>
    );
  } else if (phase === 'processing') {
    body = <PaymentStatus status="processing" />;
  } else if (phase === 'requires_action') {
    body = <PaymentStatus status="requires_action" onContinue={() => { setPhase('processing'); settle('succeeded', 700); }} description="Your bank needs you to confirm this payment (3-D Secure). In a real shop its page opens here." />;
  } else if (phase === 'failed') {
    body = (
      <PaymentStatus
        status="failed"
        description="Your bank declined the payment, so nothing was charged. Your details are kept."
        onRetry={() => { setPhase('editing'); setStep('review'); }}
        onUseAnotherMethod={() => { setPhase('editing'); setStep('payment'); }}
      />
    );
  } else {
    body = (
      <PaymentStatus
        status="succeeded"
        title="Thank you, your order is placed"
        description={`A receipt is on its way to ${email || 'your inbox'}. We email you again when it ships.`}
        reference={ORDER_REFERENCE}
        onContinue={onContinueShopping ?? (() => toast.info('The shop is not part of this blueprint'))}
        continueLabel="Continue shopping"
      />
    );
  }

  return (
    <div>
      <header className="d-flex justify-content-between align-items-center gap-3 border-bottom px-3 px-lg-5 py-3">
        <span className="fs-5 fw-semibold" style={{ fontFamily: 'var(--ui-font-family-heading)' }}>
          {appName}
        </span>
        <span className="d-inline-flex align-items-center gap-1 small text-body-secondary">
          <Icon name="check-circle" size="sm" />
          Secure checkout
        </span>
      </header>
      <main id="main" className="container-xl px-3 px-lg-5 py-4 pb-5">
        <PageHeader title={phase === 'succeeded' ? 'Order confirmed' : 'Checkout'} />
        {demo === 'failed' && phase === 'editing' && attempts.current === 0 && (
          <Message severity="info" className="mb-4">
            Preview: the first payment attempt is declined, the second succeeds.
          </Message>
        )}
        <div className="row g-4 g-lg-5">
          <div className="col-lg-5 order-lg-2">{summary}</div>
          <div className="col-lg-7 order-lg-1">{body}</div>
        </div>
      </main>
    </div>
  );
}
