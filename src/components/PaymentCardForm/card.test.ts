import { describe, expect, it } from 'vitest';
import {
  TEST_CARD_NUMBERS,
  cvcLengthFor,
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  getCardLast4,
  luhnCheck,
  maskCardNumber,
  validateExpiry,
} from './card';

// Published TEST numbers only. They are never charged.
describe('card utilities', () => {
  it('AC-14: luhnCheck accepts published test numbers and rejects altered ones', () => {
    for (const n of Object.values(TEST_CARD_NUMBERS)) expect(luhnCheck(n), n).toBe(true);
    expect(luhnCheck('4242-4242-4242-4242')).toBe(true);
    expect(luhnCheck('4242 4242 4242 4241')).toBe(false);
    expect(luhnCheck('4242 4242 4242 424a')).toBe(false);
    expect(luhnCheck('')).toBe(false);
    expect(luhnCheck('0')).toBe(false);
  });

  it.each([
    ['4242424242424242', 'visa'],
    ['4222222222222', 'visa'],
    ['5555555555554444', 'mastercard'],
    ['5105105105105100', 'mastercard'],
    ['2223003122003222', 'mastercard'],
    ['2221000000000009', 'mastercard'],
    ['2720990000000007', 'mastercard'],
    ['2720', 'mastercard'],
    ['2721', 'unknown'],
    ['378282246310005', 'amex'],
    ['341111111111111', 'amex'],
    ['6011111111111117', 'discover'],
    ['6500000000000002', 'discover'],
    ['6445644564456445', 'discover'],
    ['6440000000000000', 'discover'],
    ['6500', 'discover'],
    ['30569309025904', 'diners'],
    ['38520000023237', 'diners'],
    ['3095000000000000', 'diners'],
    ['3530111333300000', 'jcb'],
    ['3528000000000000', 'jcb'],
    ['3589000000000000', 'jcb'],
    ['6200000000000005', 'unionpay'],
    ['6759649826438453', 'maestro'],
    ['5018000000000009', 'maestro'],
    ['6304000000000000', 'maestro'],
    ['5600000000000000', 'maestro'],
    ['3', 'unknown'],
    ['6', 'unknown'],
    ['9999', 'unknown'],
    ['', 'unknown'],
  ])('AC-14: detectCardBrand(%s) is %s', (number, brand) => {
    expect(detectCardBrand(number)).toBe(brand);
  });

  it('AC-14: detects the brand while typing when only one is still possible', () => {
    expect(detectCardBrand('4')).toBe('visa');
    expect(detectCardBrand('37')).toBe('amex');
    expect(detectCardBrand('35')).toBe('jcb');
    expect(detectCardBrand('22')).toBe('mastercard');
  });

  it('AC-14: formatCardNumber groups per brand and drops non-digits and extra digits', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatCardNumber('4242-4242 4242.4242 99')).toBe('4242 4242 4242 4242 99');
    expect(formatCardNumber('378282246310005')).toBe('3782 822463 10005');
    expect(formatCardNumber('37828224631000599')).toBe('3782 822463 10005');
    expect(formatCardNumber('30569309025904')).toBe('3056 930902 5904');
    expect(formatCardNumber('4242')).toBe('4242');
    expect(formatCardNumber('42424')).toBe('4242 4');
    expect(formatCardNumber('abc')).toBe('');
  });

  it('AC-14: maskCardNumber keeps only the last four digits', () => {
    expect(maskCardNumber('4242 4242 4242 4242')).toBe('•••• •••• •••• 4242');
    expect(maskCardNumber('378282246310005')).toBe('•••• •••••• •0005');
    expect(maskCardNumber('4242 4242 4242 4242').replace(/\D/g, '')).toBe('4242');
    expect(maskCardNumber('4242').replace(/\d/g, '')).toBe('••••');
    expect(maskCardNumber('')).toBe('');
  });

  it('AC-14: getCardLast4 only reports a complete number', () => {
    expect(getCardLast4('4242 4242 4242 4242')).toBe('4242');
    expect(getCardLast4('4242 4242 42')).toBe('');
  });

  it('AC-14: cvcLengthFor is 4 for amex and 3 otherwise', () => {
    expect(cvcLengthFor('amex')).toBe(4);
    for (const b of ['visa', 'mastercard', 'discover', 'diners', 'jcb', 'unionpay', 'maestro', 'unknown'] as const) expect(cvcLengthFor(b)).toBe(3);
  });

  describe('validateExpiry', () => {
    const now = new Date(2026, 9, 24); // 24 Oct 2026
    it('AC-14: valid through the end of the expiry month', () => {
      expect(validateExpiry('10 / 26', now)).toMatchObject({ valid: true, month: 10, year: 2026 });
      expect(validateExpiry('1026', now).valid).toBe(true);
      expect(validateExpiry('12/2030', now)).toMatchObject({ valid: true, year: 2030 });
      expect(validateExpiry('09 / 26', now)).toMatchObject({ valid: false, reason: 'expired' });
      expect(validateExpiry('12 / 25', now).reason).toBe('expired');
    });
    it('AC-14: rejects empty, incomplete, bad months and far future', () => {
      expect(validateExpiry('', now).reason).toBe('empty');
      expect(validateExpiry('1', now).reason).toBe('incomplete');
      expect(validateExpiry('12 / 2', now).reason).toBe('incomplete');
      expect(validateExpiry('13 / 30', now).reason).toBe('month');
      expect(validateExpiry('00 / 30', now).reason).toBe('month');
      expect(validateExpiry('01 / 60', now).reason).toBe('far');
    });
  });

  describe('formatExpiry', () => {
    it('AC-7: prefixes zero, inserts the separator and fixes impossible months', () => {
      expect(formatExpiry('1')).toBe('1');
      expect(formatExpiry('4')).toBe('04 / ');
      expect(formatExpiry('04')).toBe('04 / ');
      expect(formatExpiry('1230')).toBe('12 / 30');
      expect(formatExpiry('13')).toBe('01 / 3');
      expect(formatExpiry('12/30')).toBe('12 / 30');
      expect(formatExpiry('123099')).toBe('12 / 30');
    });
    it('AC-7: backspace over the separator removes a digit', () => {
      expect(formatExpiry('12 /', '12 / ')).toBe('1');
      expect(formatExpiry('12 / ', '12 / 3')).toBe('12 / ');
    });
  });
});
