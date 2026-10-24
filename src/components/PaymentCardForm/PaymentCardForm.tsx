import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import type { MessageKey } from '../../locale/en';
import { cx } from '../../utils/cx';
import { Button } from '../Button/Button';
import { Field } from '../Field/Field';
import { InputText } from '../InputText/InputText';
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
  /** Focus the provider field (label click, error summary link, failed submit). */
  onFocusRequest?: (field: HostedSlot) => void;
  /** Called when every slot is complete. Receives no card data. */
  onSubmit?: () => void;
}

export interface PaymentCardFormRawProps extends CommonProps {
  mode: 'raw';
  collectHolderName?: boolean;
  collectPostalCode?: boolean;
  onChange?: (state: CardFormState) => void;
  onSubmit?: (values: CardFormValues) => void;
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

function Wrapper({ onSubmit, children, className, id, label }: { onSubmit: ((event: FormEvent) => void) | undefined; children: ReactNode; className?: string; id?: string; label?: ReactNode }) {
  if (!onSubmit) return <div className={className} id={id}>{children}</div>;
  // No `name` attributes anywhere inside, and the submit is always intercepted, so nothing is ever posted natively.
  return (
    <form noValidate method="post" className={className} id={id} onSubmit={onSubmit} aria-label={typeof label === 'string' ? label : undefined}>
      {children}
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

function HostedCardForm({ legend, note, fields, onReady, onFocusRequest, onSubmit, submitLabel, submitting = false, disabled = false, className, id: idProp }: PaymentCardFormHostedProps) {
  const { t } = useLocale();
  const uid = useId();
  const base = idProp ?? uid;
  const ids = { number: `${base}-number`, expiry: `${base}-expiry`, cvc: `${base}-cvc` };
  const [problems, setProblems] = useState<Problem[]>([]);

  const collect = (): Problem[] =>
    SLOTS.flatMap((slot) => {
      const state = fields?.[slot];
      const copy = HOSTED_MESSAGES[slot];
      if (state?.error) return [{ field: slot, message: state.error }];
      if (state?.complete && !state.invalid) return [];
      const empty = state?.empty ?? !state?.complete;
      return [{ field: slot, message: t(state?.invalid || !empty ? copy.incomplete : copy.empty) }];
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = collect();
    setProblems(found);
    if (found.length > 0) return onFocusRequest?.(found[0]!.field as HostedSlot);
    onSubmit?.();
  };

  const field = (slot: HostedSlot) => (
    <HostedField
      id={ids[slot]}
      label={t(HOSTED_MESSAGES[slot].label)}
      disabled={disabled}
      {...fields?.[slot]}
      onReady={(element) => onReady?.(slot, element)}
      onLabelClick={() => onFocusRequest?.(slot)}
    />
  );

  return (
    <Wrapper onSubmit={onSubmit ? submit : undefined} className={cx('ui-payment-card', className)} label={typeof legend === 'string' ? legend : t('paymentCardDetails')}>
      <fieldset className="ui-payment-card__fieldset" disabled={disabled}>
        <legend className="form-label fs-6 ui-payment-card__legend">{legend ?? t('paymentCardDetails')}</legend>
        {problems.length > 0 && <ErrorSummary problems={problems} ids={ids} onPick={(f) => onFocusRequest?.(f as HostedSlot)} />}
        <div className="ui-payment-card__number">{field('number')}</div>
        <div className="row g-3">
          <div className="col-6 ui-payment-card__expiry">{field('expiry')}</div>
          <div className="col-6 ui-payment-card__cvc">{field('cvc')}</div>
        </div>
        <CardNote note={note} />
      </fieldset>
      {onSubmit && (
        <Button type="submit" loading={submitting} className="ui-payment-card__submit">
          {submitLabel ?? t('paymentPay')}
        </Button>
      )}
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

function RawCardForm({
  legend,
  note,
  collectHolderName = true,
  collectPostalCode = false,
  onChange,
  onSubmit,
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

  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [holderName, setHolderName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [touched, setTouched] = useState<Partial<Record<CardField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const refs = {
    number: useRef<HTMLInputElement>(null),
    expiry: useRef<HTMLInputElement>(null),
    cvc: useRef<HTMLInputElement>(null),
    holderName: useRef<HTMLInputElement>(null),
    postalCode: useRef<HTMLInputElement>(null),
  };
  const caret = useRef<number | null>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  // Latest values for the submit handler only. Emptied on unmount so nothing outlives the component.
  const latest = useRef({ number, expiry, cvc, holderName, postalCode });
  latest.current = { number, expiry, cvc, holderName, postalCode };
  useEffect(
    () => () => {
      latest.current = { number: '', expiry: '', cvc: '', holderName: '', postalCode: '' };
    },
    [],
  );

  const digits = cardDigits(number);
  const brand = detectCardBrand(digits);
  const brandLabel = CARD_BRAND_LABELS[brand];
  const cvcMax = brand === 'unknown' ? 4 : cvcLengthFor(brand);

  const errors: Errors = {};
  if (!digits) errors.number = 'required';
  else if (!isValidCardLength(brand, digits.length)) errors.number = 'incomplete';
  else if (!luhnCheck(digits)) errors.number = 'invalid';
  const expiryResult = validateExpiry(expiry, now);
  if (!expiryResult.valid) errors.expiry = expiryResult.reason === 'empty' ? 'required' : expiryResult.reason === 'incomplete' ? 'incomplete' : expiryResult.reason === 'expired' ? 'expired' : 'invalid';
  const cvcDigits = cardDigits(cvc);
  if (!cvcDigits) errors.cvc = 'required';
  else if (brand === 'unknown' ? cvcDigits.length < 3 : cvcDigits.length !== cvcLengthFor(brand)) errors.cvc = 'invalid';
  if (collectHolderName && !holderName.trim()) errors.holderName = 'required';
  if (collectPostalCode && !postalCode.trim()) errors.postalCode = 'required';

  const complete = Object.keys(errors).length === 0;
  const last4 = getCardLast4(digits, brand);

  // Payload: brand, completeness, error codes and last4 only.
  const payloadKey = JSON.stringify([brand, complete, errors, last4]);
  useEffect(() => {
    changeRef.current?.({ brand, complete, errors, last4 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadKey]);

  useLayoutEffect(() => {
    const el = refs.number.current;
    if (caret.current !== null && el && document.activeElement === el) el.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  });

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
  const ORDER: CardField[] = ['number', 'expiry', 'cvc', 'holderName', 'postalCode'];
  const visible = (field: CardField) => (touched[field] || submitted ? errors[field] : undefined);
  const shownError = (field: CardField) => {
    const code = visible(field);
    return code ? message(field, code) : undefined;
  };
  const touch = (field: CardField) => setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  const problems: Problem[] = submitted ? ORDER.filter((f) => errors[f]).map((f) => ({ field: f, message: message(f, errors[f]!) })) : [];

  const handleNumber = (value: string, event?: { target: HTMLInputElement }) => {
    const nextDigits = cardDigits(value);
    const nextBrand = detectCardBrand(nextDigits);
    const formatted = formatCardNumber(nextDigits, nextBrand);
    const target = event?.target;
    if (target && target.selectionStart !== null) caret.current = caretFor(formatted, cardDigits(value.slice(0, target.selectionStart)).length);
    setNumber(formatted);
  };

  const reset = () => {
    setNumber('');
    setExpiry('');
    setCvc('');
    setHolderName('');
    setPostalCode('');
    setTouched({});
    setSubmitted(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    const first = ORDER.find((f) => errors[f]);
    if (first) {
      refs[first].current?.focus();
      return;
    }
    const current = latest.current;
    onSubmit?.({
      number: cardDigits(current.number),
      expiryMonth: expiryResult.month!,
      expiryYear: expiryResult.year!,
      cvc: cardDigits(current.cvc),
      holderName: current.holderName.trim(),
      postalCode: current.postalCode.trim(),
      brand,
    });
    if (clearOnSubmit) reset();
  };

  const legendText = legend ?? t('paymentCardDetails');

  return (
    <Wrapper onSubmit={onSubmit ? submit : undefined} className={cx('ui-payment-card ui-payment-card--raw', className)} label={typeof legend === 'string' ? legend : t('paymentCardDetails')}>
      <fieldset className="ui-payment-card__fieldset" disabled={disabled}>
        <legend className="form-label fs-6 ui-payment-card__legend">{legendText}</legend>
        {problems.length > 0 && <ErrorSummary problems={problems} ids={ids} onPick={(f) => refs[f].current?.focus()} />}
        <div className="ui-payment-card__number">
          <Field id={ids.number} label={t('paymentCardNumber')} required error={shownError('number')}>
            <InputText
              ref={refs.number}
              value={number}
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
              <InputText
                ref={refs.expiry}
                value={expiry}
                onChange={(value) => setExpiry(formatExpiry(value, expiry))}
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
              <InputText
                ref={refs.cvc}
                value={cvc}
                onChange={(value) => setCvc(cardDigits(value).slice(0, cvcMax))}
                onBlur={() => touch('cvc')}
                inputMode="numeric"
                autoComplete="cc-csc"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </Field>
          </div>
        </div>
        {collectHolderName && (
          <div className="ui-payment-card__name">
            <Field id={ids.holderName} label={t('paymentHolderName')} required error={shownError('holderName')}>
              <InputText ref={refs.holderName} value={holderName} onChange={setHolderName} onBlur={() => touch('holderName')} autoComplete="cc-name" autoCapitalize="words" autoCorrect="off" spellCheck={false} />
            </Field>
          </div>
        )}
        {collectPostalCode && (
          <div className="ui-payment-card__postal">
            <Field id={ids.postalCode} label={t('paymentPostalCode')} required error={shownError('postalCode')}>
              <InputText ref={refs.postalCode} value={postalCode} onChange={setPostalCode} onBlur={() => touch('postalCode')} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
            </Field>
          </div>
        )}
        <CardNote note={note} />
      </fieldset>
      {onSubmit && (
        <Button type="submit" loading={submitting} className="ui-payment-card__submit">
          {submitLabel ?? t('paymentPay')}
        </Button>
      )}
    </Wrapper>
  );
}
