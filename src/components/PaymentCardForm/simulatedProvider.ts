import { useCallback, useRef, useState } from 'react';
import { cardDigits, detectCardBrand, formatCardNumber, formatExpiry, isValidCardLength, luhnCheck, validateExpiry } from './card';
import type { HostedFieldState } from './HostedField';
import type { HostedSlot } from './PaymentCardForm';

/*
 * Docs and tests only (not exported from the package): imitates a payment provider's hosted fields. A real provider
 * mounts a cross-origin iframe into the container, so the page never sees what is typed. This helper keeps the typed
 * text inside a native input it appends to the container, and reports only provider-style state to React.
 */

const COPY: Record<HostedSlot, { label: string; placeholder: string; autocomplete: string }> = {
  number: { label: 'Card number', placeholder: '1234 1234 1234 1234', autocomplete: 'cc-number' },
  expiry: { label: 'Expiry date', placeholder: 'MM / YY', autocomplete: 'cc-exp' },
  cvc: { label: 'Security code', placeholder: 'CVC', autocomplete: 'cc-csc' },
};

function evaluate(slot: HostedSlot, value: string, blurred: boolean): Omit<HostedFieldState, 'focused'> {
  const empty = value === '';
  let complete = false;
  let invalid = false;
  let message = '';
  let required = '';
  if (slot === 'number') {
    const digits = cardDigits(value);
    const brand = detectCardBrand(digits);
    complete = isValidCardLength(brand, digits.length) && luhnCheck(digits);
    invalid = isValidCardLength(brand, digits.length) && !luhnCheck(digits);
    message = invalid ? 'Your card number is invalid.' : 'Your card number is incomplete.';
    required = 'Enter your card number.';
  } else if (slot === 'expiry') {
    const result = validateExpiry(value);
    complete = result.valid;
    invalid = !result.valid && result.reason !== 'incomplete' && result.reason !== 'empty';
    message = result.reason === 'expired' ? "Your card's expiry date is in the past." : result.reason === 'incomplete' ? "Your card's expiry date is incomplete." : "Your card's expiry date is invalid.";
    required = 'Enter the expiry date.';
  } else {
    complete = cardDigits(value).length >= 3;
    message = 'Your card’s security code is incomplete.';
    required = 'Enter the security code.';
  }
  return { empty, complete, invalid, error: blurred && !complete ? (empty ? required : message) : undefined };
}

export function useSimulatedProvider() {
  const inputs = useRef<Partial<Record<HostedSlot, HTMLInputElement>>>({});
  const blurred = useRef<Partial<Record<HostedSlot, boolean>>>({});
  // Like a provider's elements group, the typed text outlives the slot's container (a step change unmounts it).
  const kept = useRef<Partial<Record<HostedSlot, string>>>({});
  const [fields, setFields] = useState<Partial<Record<HostedSlot, HostedFieldState>>>({});

  const report = useCallback((slot: HostedSlot, focused: boolean) => {
    const value = inputs.current[slot]?.value ?? '';
    const state = { focused, ...evaluate(slot, value, Boolean(blurred.current[slot])) };
    setFields((prev) => ({ ...prev, [slot]: state }));
    return state;
  }, []);

  const onReady = useCallback(
    (slot: HostedSlot, element: HTMLElement) => {
      if (element.firstChild) return;
      const copy = COPY[slot];
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

  const onFocusRequest = useCallback((slot: HostedSlot) => inputs.current[slot]?.focus(), []);

  /** Like a provider's validate call: shows every error, focuses the first incomplete slot, returns whether all are complete. */
  const validate = useCallback((): boolean => {
    let first: HostedSlot | null = null;
    for (const slot of ['number', 'expiry', 'cvc'] as const) {
      blurred.current[slot] = true;
      const state = report(slot, false);
      if (!state.complete && first === null) first = slot;
    }
    if (first) inputs.current[first]?.focus();
    return first === null;
  }, [report]);

  return { fields, onReady, onFocusRequest, validate };
}
