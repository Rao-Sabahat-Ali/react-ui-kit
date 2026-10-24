import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import type { MessageKey } from '../../locale/en';
import { cx } from '../../utils/cx';
import { Button } from '../Button/Button';
import { Field, useFieldControl } from '../Field/Field';
import { Message } from '../Message/Message';
import {
  CARD_BRAND_LABELS,
  cardDigits,
  cvcLengthFor,
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  getCardLast4,
  isValidCardLength,
  luhnCheck,
  validateExpiry,
  type CardBrand,
} from './card';
import { HostedField, type HostedFieldState } from './HostedField';

/*
 * UI only. The kit never talks to a payment provider and never stores card data.
 * mode="hosted" (default): provider iframes mount into HostedField slots, card data never enters this page.
 * mode="raw": real inputs for tokenisation APIs and tests; this widens your PCI DSS scope (see PAYMENT_RAW_MODE_NOTICE).
 * Nothing here logs, persists (storage, cookies, URL) or puts card data into attributes; state is cleared after submit and on unmount.
 * Raw mode inputs are UNCONTROLLED: React never writes the number, expiry or security code into the DOM `value` attribute
 * (attribute selectors, session replay and MutationObserver tools cannot read them), and React state holds no card data.
 * Do not nest this component inside another <form>; if you do it renders a div role="group" and handles Enter and Pay itself.
 */

export type HostedSlot = 'number' | 'expiry' | 'cvc';
export type CardField = HostedSlot | 'holderName' | 'postalCode';
export type CardFieldError = 'required' | 'incomplete' | 'invalid' | 'expired';

/** What `onChange` reports in raw mode. Never contains the number, expiry or security code. */
export interface CardFormState {
  brand: CardBrand;
  complete: boolean;
  errors: Partial<Record<CardField, CardFieldError>>;
  /** Last four digits once the number has a complete length, otherwise `''`. */
  last4: string;
}

/** The only place raw card data leaves the component (raw mode `onSubmit`). */
export interface CardFormValues {
  /** Digits only. */
  number: string;
  expiryMonth: number;
  expiryYear: number;
  cvc: string;
  holderName: string;
  postalCode: string;
  brand: CardBrand;
}

interface CommonProps {
  legend?: ReactNode;
  /** Visible reassurance under the fields. `null` hides it. State only what your system really does. */
  note?: ReactNode | null;
  /** Label of the submit button, rendered when `onSubmit` is set. */
  submitLabel?: ReactNode;
  submitting?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export interface PaymentCardFormHostedProps extends CommonProps {
  mode?: 'hosted';
  /** Provider state per slot. */
  fields?: Partial<Record<HostedSlot, HostedFieldState>>;
  /** Called once per slot with the container to mount the provider element into. */
  onReady?: (field: HostedSlot, element: HTMLDivElement) => void;
  /** Called when the slot unmounts (also when a parent such as PaymentMethodSelector removes the panel). Unmount your provider element here. */
  onDestroy?: (field: HostedSlot, element: HTMLDivElement) => void;
  /** Focus the provider field (label click, error summary link, failed submit). Without it the slot container itself receives focus. */
  onFocusRequest?: (field: HostedSlot) => void;
  /** Called when every slot is complete. Receives no card data. */
  onSubmit?: () => void;
}

export interface PaymentCardFormRawProps extends CommonProps {
  mode: 'raw';
  collectHolderName?: boolean;
  collectPostalCode?: boolean;
  onChange?: (state: CardFormState) => void;
  /** May return a promise. While it is pending the fields are disabled. Fields are cleared when it settles, even if it throws. */
  onSubmit?: (values: CardFormValues) => void | Promise<void>;
  /** Receives an error thrown (or rejected) by `onSubmit`. Without it the error is rethrown after the fields are cleared; it is never swallowed. */
  onError?: (error: unknown) => void;
  /** Clear every field after `onSubmit` (default `true`). */
  clearOnSubmit?: boolean;
  /** Clock for expiry validation. */
  now?: Date;
}

export type PaymentCardFormProps = PaymentCardFormHostedProps | PaymentCardFormRawProps;

export function PaymentCardForm(props: PaymentCardFormProps) {
  return props.mode === 'raw' ? <RawCardForm {...props} /> : <HostedCardForm {...props} />;
}

interface Problem {
  field: CardField;
  message: ReactNode;
}

function ErrorSummary({ problems, ids, onPick }: { problems: Problem[]; ids: Record<string, string>; onPick: (field: CardField) => void }) {
  const { tp } = useLocale();
  return (
    <Message severity="danger" live="assertive" title={tp('paymentProblems', problems.length)} className="ui-payment-card__summary">
      <ul className="mb-0 ps-3">
        {problems.map((problem) => (
          <li key={problem.field}>
            <a
              href={`#${ids[problem.field]}`}
              onClick={(event) => {
                event.preventDefault();
                onPick(problem.field);
              }}
            >
              {problem.message}
            </a>
          </li>
        ))}
      </ul>
    </Message>
  );
}

function CardNote({ note }: { note: ReactNode | null | undefined }) {
  const { t } = useLocale();
  if (note === null) return null;
  return <p className="form-text ui-payment-card__note">{note ?? t('paymentCardNote')}</p>;
}

interface SubmitEventLike {
  preventDefault(): void;
  stopPropagation(): void;
}

/**
 * Renders a real `<form>` unless the component sits inside another form (nested forms are invalid HTML and React would
 * bubble the submit to the parent's `onSubmit`). Detection happens in a layout effect, before paint; children mount once,
 * after the decision. Inside a parent form it renders a `div role="group"` and handles Enter and the Pay button itself.
 * Either way the submit is stopped here: the parent form never sees it.
 */
function Wrapper({ onSubmit, footer, children, className, id, label }: { onSubmit: ((event?: SubmitEventLike) => void) | undefined; footer: (nested: boolean) => ReactNode; children: ReactNode; className?: string; id?: string; label?: ReactNode }) {
  const probe = useRef<HTMLDivElement>(null);
  const [nested, setNested] = useState<boolean | null>(null);
  useLayoutEffect(() => {
    setNested(Boolean(probe.current?.parentElement?.closest('form')));
  }, []);
  const ariaLabel = typeof label === 'string' ? label : undefined;
  if (!onSubmit) {
    return (
      <div className={className} id={id}>
        {children}
        {footer(false)}
      </div>
    );
  }
  if (nested === null) return <div ref={probe} className={className} id={id} />;
  if (nested) {
    return (
      // Delegated Enter handling for the inputs inside (a nested <form> is not allowed); the keys are reachable on the inputs themselves.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
      <div
        role="group"
        aria-label={ariaLabel}
        className={className}
        id={id}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || event.defaultPrevented || event.nativeEvent.isComposing || !(event.target instanceof HTMLInputElement)) return;
          onSubmit(event);
        }}
      >
        {children}
        {footer(true)}
      </div>
    );
  }
  // No `name` attributes anywhere inside, and the submit is always intercepted, so nothing is ever posted natively.
  return (
    <form noValidate method="post" className={className} id={id} onSubmit={onSubmit} aria-label={ariaLabel}>
      {children}
      {footer(false)}
    </form>
  );
}

/* ----------------------------------------------------------------------------------------------- hosted */

const HOSTED_MESSAGES: Record<HostedSlot, { label: MessageKey; empty: MessageKey; incomplete: MessageKey }> = {
  number: { label: 'paymentCardNumber', empty: 'paymentErrorNumberRequired', incomplete: 'paymentErrorNumberIncomplete' },
  expiry: { label: 'paymentExpiry', empty: 'paymentErrorExpiryRequired', incomplete: 'paymentErrorExpiryInvalid' },
  cvc: { label: 'paymentCvc', empty: 'paymentErrorCvcRequired', incomplete: 'paymentErrorCvcRequired' },
};
const SLOTS: HostedSlot[] = ['number', 'expiry', 'cvc'];

function HostedCardForm({ legend, note, fields, onReady, onDestroy, onFocusRequest, onSubmit, submitLabel, submitting = false, disabled = false, className, id: idProp }: PaymentCardFormHostedProps) {
  const { t } = useLocale();
  const uid = useId();
  const base = idProp ?? uid;
  const ids = { number: `${base}-number`, expiry: `${base}-expiry`, cvc: `${base}-cvc` };
  const [problems, setProblems] = useState<Problem[]>([]);
  const slotElements = useRef<Partial<Record<HostedSlot, HTMLDivElement | null>>>({});

  const collect = (): Problem[] =>
    SLOTS.flatMap((slot) => {
      const state = fields?.[slot];
      const copy = HOSTED_MESSAGES[slot];
      if (state?.error) return [{ field: slot, message: state.error }];
      if (state?.complete && !state.invalid) return [];
      const empty = state?.empty ?? !state?.complete;
      return [{ field: slot, message: t(state?.invalid || !empty ? copy.incomplete : copy.empty) }];
    });

  // Without `onFocusRequest` the slot container takes focus (tabIndex -1), so error summary links always move focus.
  const focusSlot = (slot: HostedSlot) => {
    if (onFocusRequest) onFocusRequest(slot);
    else slotElements.current[slot]?.focus();
  };

  const submit = (event?: SubmitEventLike) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (submitting) return;
    const found = collect();
    setProblems(found);
    if (found.length > 0) return focusSlot(found[0]!.field as HostedSlot);
    onSubmit?.();
  };

  const field = (slot: HostedSlot) => (
    <HostedField
      id={ids[slot]}
      label={t(HOSTED_MESSAGES[slot].label)}
      disabled={disabled}
      {...fields?.[slot]}
      ref={(node) => {
        slotElements.current[slot] = node;
      }}
      onReady={(element) => onReady?.(slot, element)}
      onDestroy={onDestroy ? (element) => onDestroy(slot, element) : undefined}
      onLabelClick={() => focusSlot(slot)}
    />
  );

  return (
    <Wrapper
      onSubmit={onSubmit ? submit : undefined}
      className={cx('ui-payment-card', className)}
      label={typeof legend === 'string' ? legend : t('paymentCardDetails')}
      footer={(nested) =>
        onSubmit && (
          <Button type={nested ? 'button' : 'submit'} onClick={nested ? () => submit() : undefined} loading={submitting} className="ui-payment-card__submit">
            {submitLabel ?? t('paymentPay')}
          </Button>
        )
      }
    >
      <fieldset className="ui-payment-card__fieldset" disabled={disabled || submitting}>
        <legend className="form-label fs-6 ui-payment-card__legend">{legend ?? t('paymentCardDetails')}</legend>
        {problems.length > 0 && <ErrorSummary problems={problems} ids={ids} onPick={(f) => focusSlot(f as HostedSlot)} />}
        <div className="ui-payment-card__number">{field('number')}</div>
        <div className="row g-3">
          <div className="col-6 ui-payment-card__expiry">{field('expiry')}</div>
          <div className="col-6 ui-payment-card__cvc">{field('cvc')}</div>
        </div>
        <CardNote note={note} />
      </fieldset>
    </Wrapper>
  );
}

/* ------------------------------------------------------------------------------------------------- raw */

type Errors = Partial<Record<CardField, CardFieldError>>;

function caretFor(formatted: string, digitsBefore: number): number {
  if (digitsBefore <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]!)) seen++;
    if (seen === digitsBefore) return i + 1;
  }
  return formatted.length;
}

const ORDER: CardField[] = ['number', 'expiry', 'cvc', 'holderName', 'postalCode'];
type RawValues = Record<CardField, string>;
const EMPTY_VALUES: RawValues = { number: '', expiry: '', cvc: '', holderName: '', postalCode: '' };

/**
 * Uncontrolled text input for card data. No `value` prop is ever passed, so React never mirrors the content into the
 * DOM `value` attribute; the component reads `ref.current.value` and formats by assigning `el.value` in its handlers.
 */
function CardInput({ inputRef, suffix, ...rest }: InputHTMLAttributes<HTMLInputElement> & { inputRef: (node: HTMLInputElement | null) => void; suffix?: ReactNode }) {
  const control = useFieldControl({});
  const input = (
    <input
      {...rest}
      ref={inputRef}
      id={control.id}
      type="text"
      required={control.required || undefined}
      aria-invalid={control.invalid || undefined}
      aria-describedby={control.describedBy}
      className={cx('form-control ui-input-text', control.invalid && 'is-invalid', !suffix && rest.className)}
    />
  );
  if (!suffix) return input;
  return (
    <div className={cx('input-group ui-input-text__group', control.invalid && 'has-validation')}>
      {input}
      <span className="input-group-text ui-input-text__addon">{suffix}</span>
    </div>
  );
}

function RawCardForm({
  legend,
  note,
  collectHolderName = true,
  collectPostalCode = false,
  onChange,
  onSubmit,
  onError,
  clearOnSubmit = true,
  now,
  submitLabel,
  submitting = false,
  disabled = false,
  className,
  id: idProp,
}: PaymentCardFormRawProps) {
  const { t } = useLocale();
  const uid = useId();
  const base = idProp ?? uid;
  const ids: Record<CardField, string> = { number: `${base}-number`, expiry: `${base}-expiry`, cvc: `${base}-cvc`, holderName: `${base}-name`, postalCode: `${base}-postal` };

  const [touched, setTouched] = useState<Partial<Record<CardField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  // The live inputs are the only holder of card data. Callback refs are stable; when an input unmounts it is emptied.
  const elements = useRef<Partial<Record<CardField, HTMLInputElement | null>>>({});
  const binders = useMemo(
    () =>
      Object.fromEntries(
        ORDER.map((field) => [
          field,
          (node: HTMLInputElement | null) => {
            if (node) elements.current[field] = node;
            else {
              const previous = elements.current[field];
              if (previous) previous.value = '';
              elements.current[field] = null;
            }
          },
        ]),
      ) as Record<CardField, (node: HTMLInputElement | null) => void>,
    [],
  );
  const read = (): RawValues => {
    const out = { ...EMPTY_VALUES };
    for (const field of ORDER) out[field] = elements.current[field]?.value ?? '';
    return out;
  };
  const previousExpiry = useRef('');
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  /** Derived, non-sensitive facts about the current values. */
  const validate = (values: RawValues) => {
    const digits = cardDigits(values.number);
    const brand = detectCardBrand(digits);
    const errors: Errors = {};
    if (!digits) errors.number = 'required';
    else if (!isValidCardLength(brand, digits.length)) errors.number = 'incomplete';
    else if (!luhnCheck(digits)) errors.number = 'invalid';
    const expiry = validateExpiry(values.expiry, now);
    if (!expiry.valid) errors.expiry = expiry.reason === 'empty' ? 'required' : expiry.reason === 'incomplete' ? 'incomplete' : expiry.reason === 'expired' ? 'expired' : 'invalid';
    const cvcDigits = cardDigits(values.cvc);
    if (!cvcDigits) errors.cvc = 'required';
    else if (brand === 'unknown' ? cvcDigits.length < 3 : cvcDigits.length !== cvcLengthFor(brand)) errors.cvc = 'invalid';
    if (collectHolderName && !values.holderName.trim()) errors.holderName = 'required';
    if (collectPostalCode && !values.postalCode.trim()) errors.postalCode = 'required';
    return { digits, brand, errors, expiry, complete: Object.keys(errors).length === 0, last4: getCardLast4(digits, brand) };
  };

  // React state keeps only brand, error codes and last4 (what `onChange` reports anyway), never the number, expiry or code.
  const [view, setView] = useState(() => {
    const { brand, errors, complete, last4 } = validate(EMPTY_VALUES);
    return { brand, errors, complete, last4 };
  });
  const refresh = () => {
    const { brand, errors, complete, last4 } = validate(read());
    setView((prev) => (JSON.stringify([prev.brand, prev.errors, prev.complete, prev.last4]) === JSON.stringify([brand, errors, complete, last4]) ? prev : { brand, errors, complete, last4 }));
  };
  const nowTime = now?.getTime();
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowTime, collectHolderName, collectPostalCode]);

  const { brand, errors, complete, last4 } = view;
  const brandLabel = CARD_BRAND_LABELS[brand];

  // Payload: brand, completeness, error codes and last4 only.
  const payloadKey = JSON.stringify([brand, complete, errors, last4]);
  useEffect(() => {
    changeRef.current?.({ brand, complete, errors, last4 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadKey]);

  const message = (field: CardField, code: CardFieldError): string => {
    switch (field) {
      case 'number':
        return t(code === 'required' ? 'paymentErrorNumberRequired' : code === 'incomplete' ? 'paymentErrorNumberIncomplete' : 'paymentErrorNumberInvalid');
      case 'expiry':
        return t(code === 'expired' ? 'paymentErrorExpiryExpired' : code === 'invalid' ? 'paymentErrorExpiryInvalid' : 'paymentErrorExpiryRequired');
      case 'cvc':
        return code === 'required' ? t('paymentErrorCvcRequired') : t('paymentErrorCvcInvalid', { count: brand === 'unknown' ? 3 : cvcLengthFor(brand) });
      case 'holderName':
        return t('paymentErrorNameRequired');
      default:
        return t('paymentErrorPostalRequired');
    }
  };
  const visible = (field: CardField) => (touched[field] || submitted ? errors[field] : undefined);
  const shownError = (field: CardField) => {
    const code = visible(field);
    return code ? message(field, code) : undefined;
  };
  const touch = (field: CardField) => setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  const problems: Problem[] = submitted ? ORDER.filter((f) => errors[f]).map((f) => ({ field: f, message: message(f, errors[f]!) })) : [];

  const handleNumber = (event: ChangeEvent<HTMLInputElement>) => {
    const el = event.target;
    const value = el.value;
    const nextDigits = cardDigits(value);
    const formatted = formatCardNumber(nextDigits, detectCardBrand(nextDigits));
    if (formatted !== value) {
      const position = el.selectionStart;
      el.value = formatted;
      if (position !== null) {
        const caret = caretFor(formatted, cardDigits(value.slice(0, position)).length);
        el.setSelectionRange(caret, caret);
      }
    }
    refresh();
  };

  const handleExpiry = (event: ChangeEvent<HTMLInputElement>) => {
    const el = event.target;
    const formatted = formatExpiry(el.value, previousExpiry.current);
    if (formatted !== el.value) el.value = formatted;
    previousExpiry.current = formatted;
    refresh();
  };

  const handleCvc = (event: ChangeEvent<HTMLInputElement>) => {
    const el = event.target;
    const numberBrand = detectCardBrand(cardDigits(elements.current.number?.value ?? ''));
    const max = numberBrand === 'unknown' ? 4 : cvcLengthFor(numberBrand);
    const next = cardDigits(el.value).slice(0, max);
    if (next !== el.value) el.value = next;
    refresh();
  };

  const reset = () => {
    for (const field of ORDER) {
      const el = elements.current[field];
      if (el) el.value = '';
    }
    previousExpiry.current = '';
    setTouched({});
    setSubmitted(false);
    refresh();
  };

  const submit = (event?: SubmitEventLike) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (busy || submitting) return;
    setSubmitted(true);
    const values = read();
    const result = validate(values);
    const first = ORDER.find((f) => result.errors[f]);
    if (first) {
      elements.current[first]?.focus();
      return;
    }
    const payload: CardFormValues = {
      number: result.digits,
      expiryMonth: result.expiry.month!,
      expiryYear: result.expiry.year!,
      cvc: cardDigits(values.cvc),
      holderName: values.holderName.trim(),
      postalCode: values.postalCode.trim(),
      brand: result.brand,
    };
    const finish = () => {
      if (clearOnSubmit) reset();
    };
    const fail = (error: unknown) => {
      if (onError) onError(error);
      else throw error;
    };
    let returned: void | Promise<void>;
    try {
      returned = onSubmit?.(payload);
    } catch (error) {
      finish();
      return fail(error);
    }
    if (returned && typeof (returned as Promise<void>).then === 'function') {
      setBusy(true);
      (returned as Promise<void>).then(
        () => {
          setBusy(false);
          finish();
        },
        (error: unknown) => {
          setBusy(false);
          finish();
          fail(error);
        },
      );
      return;
    }
    finish();
  };

  const legendText = legend ?? t('paymentCardDetails');

  return (
    <Wrapper
      onSubmit={onSubmit ? submit : undefined}
      className={cx('ui-payment-card ui-payment-card--raw', className)}
      label={typeof legend === 'string' ? legend : t('paymentCardDetails')}
      footer={(nested) =>
        onSubmit && (
          <Button type={nested ? 'button' : 'submit'} onClick={nested ? () => submit() : undefined} loading={submitting || busy} className="ui-payment-card__submit">
            {submitLabel ?? t('paymentPay')}
          </Button>
        )
      }
    >
      <fieldset className="ui-payment-card__fieldset" disabled={disabled || submitting || busy}>
        <legend className="form-label fs-6 ui-payment-card__legend">{legendText}</legend>
        {problems.length > 0 && <ErrorSummary problems={problems} ids={ids} onPick={(f) => elements.current[f]?.focus()} />}
        <div className="ui-payment-card__number">
          <Field id={ids.number} label={t('paymentCardNumber')} required error={shownError('number')}>
            <CardInput
              inputRef={binders.number}
              onChange={handleNumber}
              onBlur={() => touch('number')}
              suffix={<span className="ui-payment-card__brand">{brandLabel}</span>}
              inputMode="numeric"
              autoComplete="cc-number"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="1234 1234 1234 1234"
            />
          </Field>
          <span className="visually-hidden" role="status">
            {brandLabel ? t('paymentCardType', { brand: brandLabel }) : ''}
          </span>
        </div>
        <div className="row g-3">
          <div className="col-6 ui-payment-card__expiry">
            <Field id={ids.expiry} label={t('paymentExpiry')} required error={shownError('expiry')}>
              <CardInput
                inputRef={binders.expiry}
                onChange={handleExpiry}
                onBlur={() => touch('expiry')}
                inputMode="numeric"
                autoComplete="cc-exp"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={t('paymentExpiryPlaceholder')}
              />
            </Field>
          </div>
          <div className="col-6 ui-payment-card__cvc">
            <Field id={ids.cvc} label={t('paymentCvc')} required error={shownError('cvc')}>
              <CardInput inputRef={binders.cvc} onChange={handleCvc} onBlur={() => touch('cvc')} inputMode="numeric" autoComplete="cc-csc" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
            </Field>
          </div>
        </div>
        {collectHolderName && (
          <div className="ui-payment-card__name">
            <Field id={ids.holderName} label={t('paymentHolderName')} required error={shownError('holderName')}>
              <CardInput inputRef={binders.holderName} onChange={refresh} onBlur={() => touch('holderName')} autoComplete="cc-name" autoCapitalize="words" autoCorrect="off" spellCheck={false} />
            </Field>
          </div>
        )}
        {collectPostalCode && (
          <div className="ui-payment-card__postal">
            <Field id={ids.postalCode} label={t('paymentPostalCode')} required error={shownError('postalCode')}>
              <CardInput inputRef={binders.postalCode} onChange={refresh} onBlur={() => touch('postalCode')} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
            </Field>
          </div>
        )}
        <CardNote note={note} />
      </fieldset>
    </Wrapper>
  );
}
