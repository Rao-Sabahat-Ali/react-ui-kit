/*
 * Pure card helpers (no React, no side effects). They never log, store or send what they are given.
 * Examples and tests use published TEST numbers only (4242 4242 4242 4242, 5555 5555 5555 4444, 3782 822463 10005).
 */

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'diners' | 'jcb' | 'unionpay' | 'maestro' | 'unknown';

export interface CardBrandInfo {
  /** Plain-text name; the kit never ships brand logos. */
  label: string;
  /** Valid PAN lengths. */
  lengths: readonly number[];
  /** Security code length. */
  cvc: number;
}

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const CARD_BRAND_INFO: Record<CardBrand, CardBrandInfo> = {
  visa: { label: 'Visa', lengths: [13, 16, 19], cvc: 3 },
  mastercard: { label: 'Mastercard', lengths: [16], cvc: 3 },
  amex: { label: 'American Express', lengths: [15], cvc: 4 },
  discover: { label: 'Discover', lengths: range(16, 19), cvc: 3 },
  diners: { label: 'Diners Club', lengths: [14, 15, 16, 17, 18, 19], cvc: 3 },
  jcb: { label: 'JCB', lengths: range(16, 19), cvc: 3 },
  unionpay: { label: 'UnionPay', lengths: range(16, 19), cvc: 3 },
  maestro: { label: 'Maestro', lengths: range(12, 19), cvc: 3 },
  unknown: { label: '', lengths: range(13, 19), cvc: 3 },
};

export const CARD_BRAND_LABELS: Record<CardBrand, string> = Object.fromEntries(Object.entries(CARD_BRAND_INFO).map(([brand, info]) => [brand, info.label])) as Record<CardBrand, string>;

/** Prefix ranges (inclusive, same digit count) per brand, in match priority order. */
const BIN_RANGES: readonly (readonly [CardBrand, readonly (readonly [string, string])[]])[] = [
  ['amex', [['34', '34'], ['37', '37']]],
  ['visa', [['4', '4']]],
  ['mastercard', [['51', '55'], ['2221', '2720']]],
  ['discover', [['6011', '6011'], ['65', '65'], ['644', '649']]],
  ['diners', [['300', '305'], ['3095', '3095'], ['36', '36'], ['38', '39']]],
  ['jcb', [['3528', '3589']]],
  ['unionpay', [['62', '62']]],
  ['maestro', [['50', '50'], ['56', '58'], ['6304', '6304'], ['6759', '6759'], ['6761', '6763']]],
];

const MAX_LENGTH = 19;

/** Digits of any input; spaces, dashes and every other character are dropped (paste sanitising). */
export function cardDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Luhn checksum. Accepts spaces and dashes; anything else non-numeric fails. */
export function luhnCheck(value: string): boolean {
  if (!/^[\d\s-]+$/.test(value)) return false;
  const digits = cardDigits(value);
  if (digits.length < 2) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * Brand from the leading digits (BIN ranges). Works while typing: a prefix that can only still become one brand
 * returns it; an ambiguous prefix ("3", "6") returns `'unknown'`.
 */
export function detectCardBrand(value: string): CardBrand {
  const d = cardDigits(value);
  if (!d) return 'unknown';
  for (const [brand, ranges] of BIN_RANGES) {
    for (const [lo, hi] of ranges) {
      if (d.length < lo.length) continue;
      const prefix = Number(d.slice(0, lo.length));
      if (prefix >= Number(lo) && prefix <= Number(hi)) return brand;
    }
  }
  const possible = new Set<CardBrand>();
  for (const [brand, ranges] of BIN_RANGES) {
    for (const [lo, hi] of ranges) {
      if (d.length >= lo.length) continue;
      const scale = 10 ** (lo.length - d.length);
      const n = Number(d);
      if (n >= Math.floor(Number(lo) / scale) && n <= Math.floor(Number(hi) / scale)) possible.add(brand);
    }
  }
  return possible.size === 1 ? [...possible][0]! : 'unknown';
}

export function cardMaxLength(brand: CardBrand): number {
  return Math.max(...CARD_BRAND_INFO[brand].lengths);
}

/** Whether `length` digits is a complete number for the brand. */
export function isValidCardLength(brand: CardBrand, length: number): boolean {
  return CARD_BRAND_INFO[brand].lengths.includes(length);
}

function gapsFor(brand: CardBrand, length: number): number[] {
  if (brand === 'amex' || (brand === 'diners' && length <= 14)) return [4, 10];
  return range(1, Math.floor((MAX_LENGTH - 1) / 4)).map((i) => i * 4);
}

/** Groups digits for display: 4-4-4-4, American Express 4-6-5, 14-digit Diners Club 4-6-4. Drops non-digits and extra digits. */
export function formatCardNumber(value: string, brand: CardBrand = detectCardBrand(value)): string {
  const d = cardDigits(value).slice(0, cardMaxLength(brand));
  const gaps = gapsFor(brand, d.length);
  let out = '';
  for (let i = 0; i < d.length; i++) {
    if (gaps.includes(i)) out += ' ';
    out += d[i];
  }
  return out;
}

/** Hides every digit except the last four ("•••• •••• •••• 4242"). Four digits or fewer are hidden entirely. */
export function maskCardNumber(value: string, brand: CardBrand = detectCardBrand(value)): string {
  const d = cardDigits(value);
  const keep = d.length > 4 ? 4 : 0;
  const formatted = formatCardNumber(d, brand);
  let seen = 0;
  let out = '';
  for (let i = formatted.length - 1; i >= 0; i--) {
    const ch = formatted[i]!;
    if (ch === ' ') out = ` ${out}`;
    else {
      out = (seen < keep ? ch : '•') + out;
      seen++;
    }
  }
  return out;
}

/** Last four digits of a complete-length number, otherwise `''` (so a partial entry never leaks as "last4"). */
export function getCardLast4(value: string, brand: CardBrand = detectCardBrand(value)): string {
  const d = cardDigits(value);
  return isValidCardLength(brand, d.length) ? d.slice(-4) : '';
}

/** Security code length: 4 for American Express, 3 otherwise. */
export function cvcLengthFor(brand: CardBrand): number {
  return CARD_BRAND_INFO[brand].cvc;
}

export interface ExpiryResult {
  valid: boolean;
  month: number | null;
  year: number | null;
  reason?: 'empty' | 'incomplete' | 'month' | 'expired' | 'far';
}

const FAR_YEARS = 20;

/**
 * Validates `MM / YY`, `MM/YY`, `MMYY` or `MM/YYYY`. A card is valid through the end of its expiry month.
 * Pass `now` for deterministic tests.
 */
export function validateExpiry(value: string, now: Date = new Date()): ExpiryResult {
  const d = cardDigits(value);
  if (!d) return { valid: false, month: null, year: null, reason: 'empty' };
  if (d.length < 4 || d.length === 5) return { valid: false, month: null, year: null, reason: 'incomplete' };
  const month = Number(d.slice(0, 2));
  const rest = d.slice(2);
  const year = rest.length === 2 ? 2000 + Number(rest) : Number(rest.slice(0, 4));
  if (month < 1 || month > 12) return { valid: false, month: null, year, reason: 'month' };
  const nowIndex = now.getFullYear() * 12 + now.getMonth();
  const index = year * 12 + (month - 1);
  if (index < nowIndex) return { valid: false, month, year, reason: 'expired' };
  if (index > nowIndex + FAR_YEARS * 12) return { valid: false, month, year, reason: 'far' };
  return { valid: true, month, year };
}

/**
 * Formats typing into `MM / YY`. Months 2-9 get a leading zero ("4" becomes "04 / "), "13" becomes "01 / 3",
 * and backspacing over the separator removes the previous digit instead of re-adding the separator.
 */
export function formatExpiry(input: string, previous = ''): string {
  let d = cardDigits(input).slice(0, 4);
  const prevDigits = cardDigits(previous);
  if (input.length < previous.length && d === prevDigits.slice(0, 4) && d.length === prevDigits.length) d = d.slice(0, -1);
  if (d.length > 0 && d[0]! > '1') d = `0${d}`.slice(0, 4);
  else if (d.length > 1 && d[0] === '1' && d[1]! > '2') d = `01${d.slice(1)}`.slice(0, 4);
  if (d.length < 2) return d;
  return `${d.slice(0, 2)} / ${d.slice(2)}`;
}

/** Published test numbers used by docs and tests. TEST DATA ONLY, never charged. */
export const TEST_CARD_NUMBERS = {
  visa: '4242 4242 4242 4242',
  mastercard: '5555 5555 5555 4444',
  mastercard2Series: '2223 0031 2200 3222',
  amex: '3782 822463 10005',
  discover: '6011 1111 1111 1117',
  diners: '3056 930902 5904',
  jcb: '3530 1113 3330 0000',
  unionpay: '6200 0000 0000 0005',
  maestro: '6759 6498 2643 8453',
} as const;

/**
 * PCI scope notice for `PaymentCardForm mode="raw"`. Show it in your own docs or dev tooling; the component does not log it.
 */
export const PAYMENT_RAW_MODE_NOTICE =
  'PaymentCardForm mode="raw" passes card numbers through your page\'s JavaScript, which brings your site into a larger PCI DSS scope (SAQ A-EP or D). Use mode="hosted" with your payment provider\'s hosted fields in production; use raw mode only with a tokenisation API you are assessed for, in tests, or with published test card numbers.';
