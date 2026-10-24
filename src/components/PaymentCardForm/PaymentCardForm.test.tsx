import { createRef, useState } from 'react';
import { act, render, screen, within } from '@testing-library/react';
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

  it('AC-11: values appear in no DOM attribute except the inputs, and never in text', async () => {
    const user = userEvent.setup();
    const { container } = render(<Raw />);
    await fill(user, VISA);
    await user.click(screen.getByLabelText(/Name on card/));
    await user.tab();
    for (const el of container.querySelectorAll('*')) {
      if (el.tagName === 'INPUT') continue;
      for (const attr of el.getAttributeNames()) {
        for (const secret of sensitive) expect(el.getAttribute(attr), `${el.tagName}[${attr}]`).not.toContain(secret);
      }
    }
    for (const secret of sensitive) expect(container.textContent).not.toContain(secret);
    // The inputs themselves hold the values and nothing else repeats them.
    expect(container.querySelectorAll('input[value*="4242"]')).toHaveLength(1);
  });

  it('AC-12: values are cleared after submit by default and on unmount', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { unmount, container } = render(<Raw onSubmit={onSubmit} />);
    await fill(user, VISA);
    await user.click(screen.getByRole('button', { name: 'Pay' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    for (const label of [/Card number/, /Expiry date/, /Security code/, /Name on card/]) expect(screen.getByLabelText(label)).toHaveValue('');
    expect(screen.queryByRole('alert')).toBeNull();

    await user.type(screen.getByLabelText(/Card number/), VISA);
    unmount();
    expect(container.querySelectorAll('input')).toHaveLength(0);
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
    const submitEvents: boolean[] = [];
    const { container } = render(<Raw onSubmit={noop} />);
    document.addEventListener('submit', (e) => submitEvents.push(e.defaultPrevented));
    await fill(user, VISA);
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Pay' }));
    });
    expect(submitEvents).toEqual([true]);
    expect(container.querySelector('form')).toHaveAttribute('method', 'post');
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
