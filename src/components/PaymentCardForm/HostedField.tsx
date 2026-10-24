import { useEffect, useId, useRef, type ReactNode, type Ref } from 'react';
import { canUseDOM } from '../../utils/dom';
import { cx } from '../../utils/cx';

/** State a payment provider reports for one hosted field (Stripe Elements `change`, Adyen `onFieldValid`, …). */
export interface HostedFieldState {
  focused?: boolean;
  invalid?: boolean;
  complete?: boolean;
  empty?: boolean;
  /** Provider error text, shown under the field and announced politely. */
  error?: ReactNode;
}

export interface HostedFieldProps extends HostedFieldState {
  label: ReactNode;
  id?: string;
  help?: ReactNode;
  disabled?: boolean;
  /** Called once with the empty container; mount the provider's iframe or element inside it. */
  onReady?: (element: HTMLDivElement) => void;
  /** The label was clicked: call the provider's `focus()`. */
  onLabelClick?: () => void;
  className?: string;
  /** The container element (same one `onReady` receives). */
  ref?: Ref<HTMLDivElement>;
}

/**
 * A labelled, styled mount point for a payment provider's hosted field. The kit renders no inputs here, so card data
 * never enters this page. Give the provider element an accessible name (for example the same label text).
 */
export function HostedField({ label, id: idProp, help, disabled = false, focused, invalid, complete, empty, error, onReady, onLabelClick, className, ref }: HostedFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const labelId = `${id}-label`;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = `${id}-error`;
  const elementRef = useRef<HTMLDivElement | null>(null);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    if (elementRef.current) readyRef.current?.(elementRef.current);
  }, []);

  const setRefs = (node: HTMLDivElement | null) => {
    elementRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const flag = (on: boolean | undefined) => (on ? 'true' : undefined);
  const describedBy = [helpId, error ? errorId : undefined].filter(Boolean).join(' ') || undefined;

  return (
    <div
      className={cx('ui-hosted-field ui-field mb-3', disabled && 'ui-hosted-field--disabled', className)}
      data-focused={flag(focused)}
      data-invalid={flag(invalid || Boolean(error))}
      data-complete={flag(complete)}
      data-empty={flag(empty)}
    >
      {/* Mouse convenience only: keyboard users reach the provider field with Tab. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <span id={labelId} className="form-label ui-field__label ui-hosted-field__label" onClick={onLabelClick}>
        {label}
      </span>
      <div ref={setRefs} id={id} role="group" aria-labelledby={labelId} aria-describedby={describedBy} className="ui-hosted-field__control" />
      {help && (
        <div id={helpId} className="form-text ui-field__help">
          {help}
        </div>
      )}
      <div id={errorId} aria-live="polite" className={error ? 'invalid-feedback d-block ui-field__error' : undefined}>
        {error}
      </div>
    </div>
  );
}

/** Names of the custom properties declared on `.ui-hosted-field`, resolved from `--ui-*` tokens (theme aware). */
export const PAYMENT_FIELD_VARIABLES = [
  '--ui-payment-field-color',
  '--ui-payment-field-placeholder',
  '--ui-payment-field-invalid',
  '--ui-payment-field-font-family',
  '--ui-payment-field-font-size',
  '--ui-payment-field-line-height',
] as const;

/** Style object in the shape Stripe Elements, Adyen and similar providers accept for their hosted fields. */
export interface PaymentFieldStyle {
  base: {
    color: string;
    fontFamily: string;
    fontSize: string;
    lineHeight: string;
    '::placeholder': { color: string };
  };
  invalid: { color: string };
}

/**
 * Resolves the theme into concrete values. Provider iframes live on another origin and cannot read your CSS variables,
 * so read them here (after the theme is applied, again when it changes) and pass the result to the provider.
 * Pass the container from `onReady`, or any element inside the theme, as `source`.
 */
export function paymentFieldStyle(source?: Element | null): PaymentFieldStyle {
  const empty = { color: '' };
  if (!canUseDOM) return { base: { color: '', fontFamily: '', fontSize: '', lineHeight: '', '::placeholder': empty }, invalid: empty };
  const element = source ?? document.querySelector('.ui-hosted-field') ?? document.documentElement;
  const computed = window.getComputedStyle(element);
  const read = (name: (typeof PAYMENT_FIELD_VARIABLES)[number]) => computed.getPropertyValue(name).trim();
  return {
    base: {
      color: read('--ui-payment-field-color'),
      fontFamily: read('--ui-payment-field-font-family'),
      fontSize: read('--ui-payment-field-font-size'),
      lineHeight: read('--ui-payment-field-line-height'),
      '::placeholder': { color: read('--ui-payment-field-placeholder') },
    },
    invalid: { color: read('--ui-payment-field-invalid') },
  };
}
