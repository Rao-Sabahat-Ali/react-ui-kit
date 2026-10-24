import { createPortal } from 'react-dom';
import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentCardForm, type CardFormState, type CardFormValues, type HostedSlot } from './PaymentCardForm';
import { HostedField, PAYMENT_FIELD_VARIABLES, paymentFieldStyle, type HostedFieldState } from './HostedField';
import { PAYMENT_RAW_MODE_NOTICE, TEST_CARD_NUMBERS } from './card';

// TEST DATA ONLY: published test card numbers.
const VISA = TEST_CARD_NUMBERS.visa;
const AMEX = TEST_CARD_NUMBERS.amex;
const NOW = new Date(2026, 9, 24);
const CVC = '314';

const noop = () => {};

describe('PaymentCardForm hosted mode', () => {
  it('AC-1: renders labelled slots and calls onReady once per slot with an empty container', () => {
    const onReady = vi.fn();
    render(<PaymentCardForm onReady={onReady} />);
    expect(screen.getByRole('group', { name: 'Card details' })).toBeInTheDocument();
    const slots = (['Card number', 'Expiry date', 'Security code'] as const).map((name) => screen.getByRole('group', { name }));
    expect(onReady).toHaveBeenCalledTimes(3);
    expect(onReady.mock.calls.map((c) => c[0])).toEqual(['number', 'expiry', 'cvc']);
    onReady.mock.calls.forEach((call, i) => {
      expect(call[1]).toBe(slots[i]);
      expect(call[1].childElementCount).toBe(0);
    });
    expect(document.querySelectorAll('input')).toHaveLength(0);
  });

  it('AC-2: provider state props become data attributes and the error is linked and polite', () => {
    const fields: Partial<Record<HostedSlot, HostedFieldState>> = { number: { focused: true, invalid: true, error: 'Your card number is invalid.' }, expiry: { complete: true }, cvc: { empty: true } };
    render(<PaymentCardForm fields={fields} />);
    const number = screen.getByRole('group', { name: 'Card number' });
    const root = number.closest('.ui-hosted-field')!;
    expect(root).toHaveAttribute('data-focused', 'true');
    expect(root).toHaveAttribute('data-invalid', 'true');
    expect(screen.getByRole('group', { name: 'Expiry date' }).closest('.ui-hosted-field')).toHaveAttribute('data-complete', 'true');
    expect(screen.getByRole('group', { name: 'Security code' }).closest('.ui-hosted-field')).toHaveAttribute('data-empty', 'true');
    const error = screen.getByText('Your card number is invalid.');
    expect(number).toHaveAccessibleDescription('Your card number is invalid.');
    expect(error).toHaveAttribute('aria-live', 'polite');
  });

  it('AC-1: HostedField exposes its container through ref and onLabelClick', async () => {
    const ref = createRef<HTMLDivElement>();
    const onLabelClick = vi.fn();
    render(<HostedField label="Card number" ref={ref} onLabelClick={onLabelClick} />);
    expect(ref.current).toBe(screen.getByRole('group', { name: 'Card number' }));
    await userEvent.click(screen.getByText('Card number'));
    expect(onLabelClick).toHaveBeenCalled();
  });

  it('AC-3: paymentFieldStyle resolves theme variables to concrete values', () => {
    const host = document.createElement('div');
    host.className = 'ui-hosted-field';
    host.style.setProperty('--ui-payment-field-color', 'rgb(27, 26, 23)');
    host.style.setProperty('--ui-payment-field-placeholder', 'rgb(120, 110, 100)');
    host.style.setProperty('--ui-payment-field-invalid', 'rgb(160, 30, 30)');
    host.style.setProperty('--ui-payment-field-font-family', 'Instrument Sans');
    host.style.setProperty('--ui-payment-field-font-size', '1rem');
    host.style.setProperty('--ui-payment-field-line-height', '1.5');
    document.body.append(host);
    const style = paymentFieldStyle(host);
    expect(style.base).toMatchObject({ color: 'rgb(27, 26, 23)', fontFamily: 'Instrument Sans', fontSize: '1rem', lineHeight: '1.5', '::placeholder': { color: 'rgb(120, 110, 100)' } });
    expect(style.invalid.color).toBe('rgb(160, 30, 30)');
    expect(PAYMENT_FIELD_VARIABLES).toContain('--ui-payment-field-color');
    host.remove();
  });

  it('AC-4: submit with incomplete slots shows a summary, requests focus and does not submit', async () => {
    const onSubmit = vi.fn();
    const onFocusRequest = vi.fn();
    render(<PaymentCardForm onSubmit={onSubmit} onFocusRequest={onFocusRequest} fields={{ number: { complete: true }, expiry: { empty: true }, cvc: { invalid: true, error: 'Your security code is incomplete.' } }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Pay' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onFocusRequest).toHaveBeenCalledWith('expiry');
    const summary = screen.getByRole('alert');
    expect(within(summary).getByText('2 problems need fixing')).toBeInTheDocument();
    await userEvent.click(within(summary).getByRole('link', { name: 'Your security code is incomplete.' }));
    expect(onFocusRequest).toHaveBeenLastCalledWith('cvc');
  });

  it('AC-4: calls onSubmit without values when every slot is complete', async () => {
    const onSubmit = vi.fn();
    render(<PaymentCardForm onSubmit={onSubmit} fields={{ number: { complete: true }, expiry: { complete: true }, cvc: { complete: true } }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Pay' }));
    expect(onSubmit).toHaveBeenCalledWith();
  });

  it('AC-13: the note slot is visible by default, replaceable and removable', () => {
    const { rerender } = render(<PaymentCardForm />);
    expect(screen.getByText('We never store your card number')).toBeVisible();
    rerender(<PaymentCardForm note="Processed by Example Pay" />);
    expect(screen.getByText('Processed by Example Pay')).toBeVisible();
    rerender(<PaymentCardForm note={null} />);
    expect(screen.queryByText(/store/)).toBeNull();
    expect(PAYMENT_RAW_MODE_NOTICE).toMatch(/PCI/);
  });
});

function Raw(props: Partial<React.ComponentProps<typeof PaymentCardForm>> & { onSubmit?: (v: CardFormValues) => void; onChange?: (s: CardFormState) => void }) {
  return <PaymentCardForm mode="raw" now={NOW} onSubmit={noop} {...props} />;
}

async function fill(user: ReturnType<typeof userEvent.setup>, number: string, expiry = '12 / 30', cvc = CVC, name = 'Ada Lovelace') {
  await user.type(screen.getByLabelText(/Card number/), number);
  await user.type(screen.getByLabelText(/Expiry date/), expiry);
  await user.type(screen.getByLabelText(/Security code/), cvc);
  await user.type(screen.getByLabelText(/Name on card/), name);
}

describe('PaymentCardForm raw mode', () => {
  it('AC-5: groups digits per brand, drops non-digits (typing and paste) and shows the brand as text', async () => {
    const user = userEvent.setup();
    render(<Raw />);
    const number = screen.getByLabelText(/Card number/);
    await user.type(number, '4242a4242-4242 4242999');
    expect(number).toHaveValue('4242 4242 4242 4242 999');
    expect(screen.getByText('Visa')).toBeInTheDocument();
    await user.clear(number);
    await user.click(number);
    await user.paste('3782-822463-10005 extra');
    expect(number).toHaveValue('3782 822463 10005');
    expect(screen.getByText('American Express')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Card type: American Express');
    expect(document.querySelectorAll('img, svg[role="img"]')).toHaveLength(0);
  });

  it('AC-5: editing in the middle keeps the caret after the edited digit', async () => {
    const user = userEvent.setup();
    render(<Raw />);
    const number = screen.getByLabelText(/Card number/) as HTMLInputElement;
    await user.type(number, '42424242');
    number.setSelectionRange(2, 2);
    await user.keyboard('9');
    expect(number).toHaveValue('4294 2424 2');
    expect(number.selectionStart).toBe(3);
  });

  it('AC-6: validates Luhn, expiry, CVC length and name after blur, linked with aria-describedby', async () => {
    const user = userEvent.setup();
    render(<Raw />);
    const number = screen.getByLabelText(/Card number/);
    await user.type(number, '4242 4242 4242 4241');
    expect(screen.queryByText(/does not look right/)).toBeNull();
    await user.tab();
    expect(screen.getByText('Check your card number, it does not look right')).toBeInTheDocument();
    expect(number).toHaveAccessibleDescription('Check your card number, it does not look right');
    expect(number).toBeInvalid();
    await user.type(number, '{Backspace}2');
    expect(screen.queryByText(/does not look right/)).toBeNull();

    const expiry = screen.getByLabelText(/Expiry date/);
    await user.type(expiry, '0925');
    await user.tab();
    expect(screen.getByText('This card has expired')).toBeInTheDocument();

    const cvc = screen.getByLabelText(/Security code/);
    await user.type(cvc, '12');
    await user.tab();
    expect(screen.getByText('The security code has 3 digits')).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Name on card/));
    await user.tab();
    expect(screen.getByText('Enter the name on the card')).toBeInTheDocument();
  });

  it('AC-6: amex needs a 4 digit code and visa a 3 digit code', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Raw onChange={onChange} />);
    await fill(user, AMEX, '12 / 30', '123');
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ brand: 'amex', complete: false, errors: { cvc: 'invalid' } }));
    await user.type(screen.getByLabelText(/Security code/), '4');
    expect(screen.getByLabelText(/Security code/)).toHaveValue('1234');
    await user.type(screen.getByLabelText(/Security code/), '5');
    expect(screen.getByLabelText(/Security code/)).toHaveValue('1234');
    expect(onChange).toHaveBeenLastCalledWith({ brand: 'amex', complete: true, errors: {}, last4: '0005' });
  });

  it('AC-7: expiry formats as MM / YY and backspace removes the separator', async () => {
    const user = userEvent.setup();
    render(<Raw />);
    const expiry = screen.getByLabelText(/Expiry date/);
    await user.type(expiry, '4');
    expect(expiry).toHaveValue('04 / ');
    await user.type(expiry, '{Backspace}');
    expect(expiry).toHaveValue('0');
    await user.clear(expiry);
    await user.type(expiry, '1230');
    expect(expiry).toHaveValue('12 / 30');
    await user.type(expiry, '{Backspace}{Backspace}');
    expect(expiry).toHaveValue('12 / ');
    await user.type(expiry, '{Backspace}');
    expect(expiry).toHaveValue('1');
  });

  it('AC-8: submit with problems shows a linked summary and focuses the first invalid field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Raw onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Pay' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Card number/)).toHaveFocus();
    const summary = screen.getByRole('alert');
    expect(within(summary).getByText('4 problems need fixing')).toBeInTheDocument();
    await user.click(within(summary).getByRole('link', { name: 'Enter the name on the card' }));
    expect(screen.getByLabelText(/Name on card/)).toHaveFocus();
  });

  it('AC-8: valid submit passes raw digits and parsed expiry to onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Raw onSubmit={onSubmit} collectPostalCode />);
    await fill(user, VISA);
    await user.type(screen.getByLabelText(/Postal code/), '111 22');
    await user.click(screen.getByRole('button', { name: 'Pay' }));
    expect(onSubmit).toHaveBeenCalledWith({ number: '4242424242424242', expiryMonth: 12, expiryYear: 2030, cvc: CVC, holderName: 'Ada Lovelace', postalCode: '111 22', brand: 'visa' });
  });

  it('AC-9: onChange payloads never contain the number, expiry or security code', async () => {
    const user = userEvent.setup();
    const payloads: CardFormState[] = [];
    render(<Raw onChange={(s) => payloads.push(s)} />);
    await fill(user, VISA);
    expect(payloads.length).toBeGreaterThan(1);
    for (const payload of payloads) {
      expect(Object.keys(payload).sort()).toEqual(['brand', 'complete', 'errors', 'last4']);
      const json = JSON.stringify(payload);
      expect(json).not.toContain('4242424242424242');
      expect(json).not.toContain('4242 4242');
      expect(json).not.toContain(CVC);
      expect(json).not.toContain('12 / 30');
    }
    expect(payloads.at(-1)).toEqual({ brand: 'visa', complete: true, errors: {}, last4: '4242' });
    // A partial number never reports last4.
    expect(payloads.find((p) => p.brand === 'visa' && p.last4 === '')).toBeDefined();
  });

  it('AC-10: inputs carry the right autocomplete, inputmode and text-entry hints', () => {
    render(<Raw collectPostalCode />);
    const expectations: [RegExp, string][] = [
      [/Card number/, 'cc-number'],
      [/Expiry date/, 'cc-exp'],
      [/Security code/, 'cc-csc'],
      [/Name on card/, 'cc-name'],
      [/Postal code/, 'off'],
    ];
    for (const [label, autocomplete] of expectations) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute('autocomplete', autocomplete);
      expect(input).not.toHaveAttribute('type', 'number');
      expect(input).not.toHaveAttribute('name');
      expect(input).toHaveAttribute('spellcheck', 'false');
    }
    for (const label of [/Card number/, /Expiry date/, /Security code/]) {
      expect(screen.getByLabelText(label)).toHaveAttribute('inputmode', 'numeric');
      expect(screen.getByLabelText(label)).toHaveAttribute('autocapitalize', 'off');
    }
    expect(screen.getByLabelText(/Name on card/)).toHaveAttribute('autocapitalize', 'words');
  });
});

describe('PaymentCardForm security (AC-11, AC-12)', () => {
  let spies: ReturnType<typeof vi.spyOn>[];
  let setItem: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    spies = (['log', 'info', 'warn', 'error', 'debug', 'trace'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    setItem = vi.spyOn(Storage.prototype, 'setItem');
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    spies.forEach((s) => s.mockRestore());
    setItem.mockRestore();
  });

  const sensitive = ['4242424242424242', '4242 4242', CVC, '12 / 30', '1230'];

  it('AC-11: no console output, storage, cookie or URL writes while typing, pasting, blurring and submitting', async () => {
    const user = userEvent.setup();
    const before = { href: window.location.href, history: window.history.length };
    const cookie = vi.spyOn(document, 'cookie', 'set');
    render(<Raw onSubmit={noop} />);
    await fill(user, VISA);
    await user.clear(screen.getByLabelText(/Card number/));
    await user.click(screen.getByLabelText(/Card number/));
    await user.paste(AMEX);
    await user.click(screen.getByRole('button', { name: 'Pay' }));
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage).toHaveLength(0);
    expect(sessionStorage).toHaveLength(0);
    expect(cookie).not.toHaveBeenCalled();
    expect(document.cookie).toBe('');
    expect({ href: window.location.href, history: window.history.length }).toEqual(before);
    cookie.mockRestore();
  });

  it('AC-11: card inputs are uncontrolled: no DOM attribute (inputs included) ever holds the values, typed or pasted', async () => {
    const user = userEvent.setup();
    const { container } = render(<Raw collectPostalCode />);
    const number = screen.getByLabelText(/Card number/) as HTMLInputElement;
    const expiry = screen.getByLabelText(/Expiry date/) as HTMLInputElement;
    const cvc = screen.getByLabelText(/Security code/) as HTMLInputElement;
    const holder = screen.getByLabelText(/Name on card/) as HTMLInputElement;
    const postal = screen.getByLabelText(/Postal code/) as HTMLInputElement;
    await fill(user, VISA);
    await user.type(postal, '111 22');
    await user.click(holder);
    await user.tab();
    // The live values are really there (so the attribute checks below are not vacuous) ...
    expect([number.value, expiry.value, cvc.value, holder.value, postal.value]).toEqual([VISA, '12 / 30', CVC, 'Ada Lovelace', '111 22']);
    // ... but only as DOM properties.
    for (const input of [number, expiry, cvc, holder, postal]) expect(input.getAttribute('value'), input.id).toBeNull();
    // Paste path too.
    await user.clear(number);
    await user.click(number);
    await user.paste(AMEX);
    await user.clear(cvc);
    await user.click(cvc);
    await user.paste('9876');
    expect(number.value).toBe(AMEX);
    expect(cvc.value).toBe('9876');
    for (const input of [number, expiry, cvc]) expect(input.getAttribute('value'), `${input.id} after paste`).toBeNull();
    // No attribute on any element (INPUT included) and no text contains a secret.
    for (const el of container.querySelectorAll('*')) {
      for (const attr of el.getAttributeNames()) {
        for (const secret of sensitive) expect(el.getAttribute(attr), `${el.tagName}[${attr}]`).not.toContain(secret);
      }
    }
    for (const secret of sensitive) expect(container.textContent).not.toContain(secret);
    for (const secret of ['3782822463', '3782 822463', '9876', '4242', CVC, '12 / 30']) expect(container.outerHTML).not.toContain(secret);
    expect(container.querySelectorAll('input[value]')).toHaveLength(0);
  });

  it('AC-12: values are cleared in the still-mounted inputs after submit by default', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Raw onSubmit={onSubmit} />);
    const inputs = [/Card number/, /Expiry date/, /Security code/, /Name on card/].map((label) => screen.getByLabelText(label) as HTMLInputElement);
    await fill(user, VISA);
    expect(inputs.map((i) => i.value)).toEqual([VISA, '12 / 30', CVC, 'Ada Lovelace']);
    await user.click(screen.getByRole('button', { name: 'Pay' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0].number).toBe('4242424242424242');
    expect(inputs.map((i) => i.value)).toEqual(['', '', '', '']);
    expect(screen.queryByRole('alert')).toBeNull();
    // Nothing is retained: typing again starts from scratch and the formatter has no memory of the old expiry.
    await user.type(inputs[1]!, '4');
    expect(inputs[1]!.value).toBe('04 / ');
  });

  it('AC-12: an input is emptied when the form unmounts', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Raw />);
    const inputs = [/Card number/, /Expiry date/, /Security code/, /Name on card/].map((label) => screen.getByLabelText(label) as HTMLInputElement);
    await fill(user, VISA);
    expect(inputs[0]!.value).toBe(VISA);
    unmount();
    // The detached elements are still referenced here: their values must already be gone.
    expect(inputs.map((i) => i.value)).toEqual(['', '', '', '']);
    expect(document.body.innerHTML).not.toContain('4242');
    render(<Raw />);
    expect(screen.getByLabelText(/Card number/)).toHaveValue('');
  });

  it('AC-12: clearOnSubmit={false} keeps the values', async () => {
    const user = userEvent.setup();
    render(<Raw clearOnSubmit={false} />);
    await fill(user, VISA);
    await user.click(screen.getByRole('button', { name: 'Pay' }));
    expect(screen.getByLabelText(/Card number/)).toHaveValue(VISA);
  });

  it('AC-11: submit is always intercepted so nothing is posted natively', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<Raw onSubmit={onSubmit} />);
    const form = container.querySelector('form')!;
    expect(form).toHaveAttribute('method', 'post');
    await fill(user, VISA);
    // fireEvent returns false when the default action was prevented.
    expect(fireEvent.submit(form)).toBe(false);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('PaymentCardForm submit isolation (AC-15, AC-16)', () => {
  let errors: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => errors.mockRestore());

  const complete = { number: { complete: true }, expiry: { complete: true }, cvc: { complete: true } };

  it('AC-15: a submit never reaches a parent onSubmit through the React tree (portal) and renders a real form', async () => {
    const user = userEvent.setup();
    const parent = vi.fn((e: React.FormEvent) => e.preventDefault());
    const own = vi.fn();
    render(
      <form onSubmit={parent}>
        {createPortal(<PaymentCardForm onSubmit={own} fields={complete} />, document.body)}
      </form>,
    );
    expect(document.body.querySelector('form form')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Pay' }));
    expect(own).toHaveBeenCalledTimes(1);
    expect(parent).not.toHaveBeenCalled();
  });

  it('AC-15: inside an ancestor <form> hosted mode renders no nested form, Pay triggers its own onSubmit and the parent is untouched', async () => {
    const user = userEvent.setup();
    const parent = vi.fn((e: React.FormEvent) => e.preventDefault());
    const own = vi.fn();
    const { container } = render(
      <form onSubmit={parent}>
        <PaymentCardForm onSubmit={own} fields={complete} />
      </form>,
    );
    expect(container.querySelectorAll('form')).toHaveLength(1);
    expect(container.querySelector('div[role="group"][aria-label="Card details"]')).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Pay' }));
    expect(own).toHaveBeenCalledTimes(1);
    expect(parent).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  });

  it('AC-15: inside an ancestor <form> raw mode submits on Enter and on Pay without submitting the parent', async () => {
    const user = userEvent.setup();
    const parent = vi.fn((e: React.FormEvent) => e.preventDefault());
    const own = vi.fn();
    const { container } = render(
      <form onSubmit={parent}>
        <PaymentCardForm mode="raw" now={NOW} onSubmit={own} clearOnSubmit={false} />
      </form>,
    );
    expect(container.querySelectorAll('form')).toHaveLength(1);
    await fill(user, VISA);
    await user.type(screen.getByLabelText(/Name on card/), '{Enter}');
    expect(own).toHaveBeenCalledTimes(1);
    expect(own.mock.calls[0]![0].number).toBe('4242424242424242');
    await user.click(screen.getByRole('button', { name: 'Pay' }));
    expect(own).toHaveBeenCalledTimes(2);
    expect(parent).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  });

  it('AC-15: Enter in a raw-mode field of a standalone form submits once', async () => {
    const user = userEvent.setup();
    const own = vi.fn();
    render(<PaymentCardForm mode="raw" now={NOW} onSubmit={own} />);
    await fill(user, VISA);
    await user.type(screen.getByLabelText(/Name on card/), '{Enter}');
    expect(own).toHaveBeenCalledTimes(1);
  });

  it('AC-16: onSubmit that throws still clears the fields and the error reaches onError', async () => {
    const user = userEvent.setup();
    const boom = new Error('boom');
    const onError = vi.fn();
    render(<Raw onSubmit={() => { throw boom; }} onError={onError} />);
    const inputs = [/Card number/, /Expiry date/, /Security code/, /Name on card/].map((label) => screen.getByLabelText(label) as HTMLInputElement);
    await fill(user, VISA);
    await user.click(screen.getByRole('button', { name: 'Pay' }));
    expect(onError).toHaveBeenCalledWith(boom);
    expect(inputs.map((i) => i.value)).toEqual(['', '', '', '']);
  });

  it('AC-16: without onError a thrown error is rethrown, not swallowed, and the fields are still cleared', async () => {
    const user = userEvent.setup();
    const seen: unknown[] = [];
    const listener = (e: ErrorEvent) => {
      seen.push(e.error);
      e.preventDefault();
    };
    window.addEventListener('error', listener);
    try {
      render(<Raw onSubmit={() => { throw new Error('boom'); }} />);
      await fill(user, VISA);
      await user.click(screen.getByRole('button', { name: 'Pay' }));
    } finally {
      window.removeEventListener('error', listener);
    }
    expect(seen.map((e) => (e as Error).message)).toContain('boom');
    expect(screen.getByLabelText(/Card number/)).toHaveValue('');
  });

  it('AC-16: an async onSubmit disables the fields while in flight, then clears them even when it rejects', async () => {
    const user = userEvent.setup();
    let reject!: (e: unknown) => void;
    const onError = vi.fn();
    const { container } = render(<Raw onSubmit={() => new Promise<void>((_, r) => { reject = r; })} onError={onError} />);
    const number = screen.getByLabelText(/Card number/) as HTMLInputElement;
    await fill(user, VISA);
    await user.click(screen.getByRole('button', { name: 'Pay' }));
    expect(container.querySelector('fieldset')).toBeDisabled();
    expect(number).toBeDisabled();
    expect(number.value).toBe(VISA);
    await act(async () => reject(new Error('declined')));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(number).toBeEnabled();
    expect(number.value).toBe('');
  });

  it('AC-16: the fieldset is disabled while the submitting prop is set (hosted and raw)', () => {
    const { container, rerender } = render(<PaymentCardForm onSubmit={noop} submitting />);
    expect(container.querySelector('fieldset')).toBeDisabled();
    rerender(<PaymentCardForm mode="raw" onSubmit={noop} submitting />);
    expect(container.querySelector('fieldset')).toBeDisabled();
  });
});

describe('PaymentCardForm hosted lifecycle and focus (AC-17, AC-18)', () => {
  it('AC-17: under StrictMode onReady fires once per slot when there is no onDestroy', () => {
    const onReady = vi.fn();
    render(
      <StrictMode>
        <PaymentCardForm onReady={onReady} />
      </StrictMode>,
    );
    expect(onReady.mock.calls.map((c) => c[0])).toEqual(['number', 'expiry', 'cvc']);
  });

  it('AC-17: onDestroy pairs with onReady (StrictMode remount, then unmount) and receives the same element', () => {
    const live = new Set<HTMLDivElement>();
    const onReady = vi.fn((_f: HostedSlot, el: HTMLDivElement) => live.add(el));
    const onDestroy = vi.fn((_f: HostedSlot, el: HTMLDivElement) => live.delete(el));
    const { unmount } = render(
      <StrictMode>
        <PaymentCardForm onReady={onReady} onDestroy={onDestroy} />
      </StrictMode>,
    );
    expect(live.size).toBe(3);
    expect(onReady.mock.calls.length - onDestroy.mock.calls.length).toBe(3);
    unmount();
    expect(live.size).toBe(0);
    expect(onDestroy.mock.calls.length).toBe(onReady.mock.calls.length);
    for (const [, el] of onDestroy.mock.calls) expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('AC-18: error summary links and label clicks focus the slot container when onFocusRequest is omitted', async () => {
    const user = userEvent.setup();
    render(<PaymentCardForm onSubmit={noop} fields={{ number: { complete: true }, expiry: { complete: true }, cvc: { empty: true } }} />);
    await user.click(screen.getByRole('button', { name: 'Pay' }));
    const slot = screen.getByRole('group', { name: 'Security code' });
    expect(slot).toHaveAttribute('tabindex', '-1');
    expect(slot).toHaveFocus();
    (screen.getByRole('group', { name: 'Card number' }) as HTMLElement).focus();
    await user.click(within(screen.getByRole('alert')).getByRole('link'));
    expect(slot).toHaveFocus();
    await user.click(screen.getByText('Expiry date'));
    expect(screen.getByRole('group', { name: 'Expiry date' })).toHaveFocus();
  });
});

describe('PaymentCardForm controlled usage', () => {
  it('works inside a parent that re-renders on every change', async () => {
    const user = userEvent.setup();
    function Parent() {
      const [state, setState] = useState<CardFormState | null>(null);
      return (
        <>
          <PaymentCardForm mode="raw" now={NOW} onChange={setState} />
          <output>{state ? `${state.brand}:${state.complete}` : 'none'}</output>
        </>
      );
    }
    render(<Parent />);
    await user.type(screen.getByLabelText(/Card number/), '5555');
    expect(screen.getByText('mastercard:false')).toBeInTheDocument();
  });
});
