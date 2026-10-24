/**
 * Dependency-free 1D barcode encoders: Code 128 (sets A/B/C, automatic switching), EAN-13, EAN-8, UPC-A,
 * Code 39 and Interleaved 2 of 5. Each returns the bar/space pattern as a string of modules
 * (`1` = bar, `0` = space) plus where the human-readable digits belong. Pure functions.
 */

export type BarcodeFormat = 'code128' | 'ean13' | 'ean8' | 'upca' | 'code39' | 'itf';
export type BarcodeErrorCode = 'empty' | 'invalid-character' | 'invalid-length' | 'check-digit';

export const BARCODE_FORMATS: readonly BarcodeFormat[] = ['code128', 'ean13', 'ean8', 'upca', 'code39', 'itf'];

export class BarcodeError extends Error {
  readonly code: BarcodeErrorCode;
  constructor(code: BarcodeErrorCode, message: string) {
    super(message);
    this.name = 'BarcodeError';
    this.code = code;
  }
}

/** A run of human-readable text under the bars. `x` is in modules from the start of the symbol. */
export interface BarcodeText {
  text: string;
  x: number;
  anchor: 'start' | 'middle' | 'end';
}

export interface BarcodeEncoding {
  format: BarcodeFormat;
  /** The value actually encoded: check digits added, Code 39 upper-cased. */
  value: string;
  /** Module pattern, `1` bar and `0` space, from the first bar to the last bar (no quiet zone). */
  bits: string;
  /** Human-readable placement; EAN/UPC split into groups with outside digits. */
  text: BarcodeText[];
  /** Module ranges `[start, end)` of guard bars that extend below the others (EAN/UPC). */
  guards: [number, number][];
  /** Recommended quiet zone on each side, in modules. */
  quietZone: number;
  /** Code 128 symbol values including start, checksum and stop (empty for other formats). */
  codes: number[];
}

// ---------------------------------------------------------------------------------------------
// Code 128
// ---------------------------------------------------------------------------------------------

/** Bar/space widths of the 107 Code 128 symbols (stop has seven elements). */
export const CODE128_PATTERNS: readonly string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const START_A = 103;
const START_B = 104;
const START_C = 105;
const CODE_A = 101;
const CODE_B = 100;
const CODE_C = 99;
const STOP = 106;

const isDigit = (code: number) => code >= 48 && code <= 57;

/** Code 128 symbol values (start, data, checksum, stop) for an ASCII string, switching sets to stay short. */
export function code128Codes(value: string): number[] {
  if (value === '') throw new BarcodeError('empty', 'Nothing to encode');
  const chars: number[] = [];
  for (const ch of value) {
    const c = ch.codePointAt(0)!;
    if (c > 127) throw new BarcodeError('invalid-character', `Code 128 here supports ASCII only (found "${ch}")`);
    chars.push(c);
  }
  const n = chars.length;
  const codes: number[] = [];
  let set: 'A' | 'B' | 'C' | undefined;
  const begin = (next: 'A' | 'B' | 'C') => {
    codes.push(next === 'A' ? START_A : next === 'B' ? START_B : START_C);
    set = next;
  };
  const change = (next: 'A' | 'B' | 'C') => {
    if (set === undefined) begin(next);
    else if (set !== next) {
      codes.push(next === 'A' ? CODE_A : next === 'B' ? CODE_B : CODE_C);
      set = next;
    }
  };
  const single = (c: number) => {
    const desired = c < 32 ? 'A' : c >= 96 ? 'B' : set === 'A' ? 'A' : 'B';
    change(desired);
    codes.push(desired === 'A' ? (c < 32 ? c + 64 : c - 32) : c - 32);
  };

  for (let i = 0; i < n; ) {
    let run = 0;
    while (i + run < n && isDigit(chars[i + run]!)) run++;
    const edge = i === 0 || i + run === n;
    if (run >= (set === 'C' ? 2 : edge ? 4 : 6)) {
      if (run % 2 === 1 && set !== 'C') {
        single(chars[i]!); // the odd leading digit goes in the current (or a fresh B) set
        i++;
        run--;
      }
      const even = run - (run % 2);
      change('C');
      for (let k = 0; k < even; k += 2) codes.push((chars[i + k]! - 48) * 10 + (chars[i + k + 1]! - 48));
      i += even;
      continue;
    }
    single(chars[i]!);
    i++;
  }
  let sum = codes[0]!;
  for (let i = 1; i < codes.length; i++) sum += i * codes[i]!;
  codes.push(sum % 103, STOP);
  return codes;
}

function patternToBits(widths: string): string {
  let bits = '';
  [...widths].forEach((w, i) => {
    bits += (i % 2 === 0 ? '1' : '0').repeat(Number(w));
  });
  return bits;
}

function encodeCode128(value: string): BarcodeEncoding {
  const codes = code128Codes(value);
  return {
    format: 'code128',
    value,
    bits: codes.map((c) => patternToBits(CODE128_PATTERNS[c]!)).join(''),
    text: [],
    guards: [],
    quietZone: 10,
    codes,
  };
}

// ---------------------------------------------------------------------------------------------
// EAN-13, EAN-8, UPC-A
// ---------------------------------------------------------------------------------------------

const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const EAN_R = EAN_L.map((p) => [...p].map((b) => (b === '1' ? '0' : '1')).join(''));
/** Left-half parity (L or G) selected by the first digit of an EAN-13. */
export const EAN13_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

/** Modulo-10 check digit (weights 3,1,3,1… from the rightmost data digit) shared by EAN-13/8 and UPC-A. */
export function eanCheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const weight = (digits.length - i) % 2 === 1 ? 3 : 1;
    sum += Number(digits[i]) * weight;
  }
  return (10 - (sum % 10)) % 10;
}

function digitsWithCheck(value: string, dataLength: number, name: string): string {
  if (value === '') throw new BarcodeError('empty', 'Nothing to encode');
  if (!/^[0-9]+$/.test(value)) throw new BarcodeError('invalid-character', `${name} only accepts digits`);
  if (value.length === dataLength) return value + String(eanCheckDigit(value));
  if (value.length === dataLength + 1) {
    if (Number(value[dataLength]) !== eanCheckDigit(value.slice(0, dataLength))) {
      throw new BarcodeError('check-digit', `Check digit should be ${eanCheckDigit(value.slice(0, dataLength))}`);
    }
    return value;
  }
  throw new BarcodeError('invalid-length', `${name} needs ${dataLength} digits (check digit is added) or ${dataLength + 1} with the check digit`);
}

const GUARD = '101';
const CENTER = '01010';

function encodeEan13Like(format: 'ean13' | 'upca', value: string): BarcodeEncoding {
  const digits = format === 'ean13' ? digitsWithCheck(value, 12, 'EAN-13') : digitsWithCheck(value, 11, 'UPC-A');
  const full = format === 'upca' ? `0${digits}` : digits; // UPC-A is EAN-13 with a leading zero
  const parity = EAN13_PARITY[Number(full[0])]!;
  let bits = GUARD;
  for (let i = 0; i < 6; i++) {
    const d = Number(full[1 + i]);
    bits += parity[i] === 'L' ? EAN_L[d]! : EAN_G[d]!;
  }
  bits += CENTER;
  for (let i = 0; i < 6; i++) bits += EAN_R[Number(full[7 + i])]!;
  bits += GUARD;
  const text: BarcodeText[] =
    format === 'ean13'
      ? [
          { text: full[0]!, x: -2, anchor: 'end' },
          { text: full.slice(1, 7), x: 24, anchor: 'middle' },
          { text: full.slice(7), x: 71, anchor: 'middle' },
        ]
      : [
          { text: digits[0]!, x: -2, anchor: 'end' },
          { text: digits.slice(1, 6), x: 27.5, anchor: 'middle' },
          { text: digits.slice(6, 11), x: 67.5, anchor: 'middle' },
          { text: digits[11]!, x: 97, anchor: 'start' },
        ];
  return { format, value: digits, bits, text, guards: [[0, 3], [45, 50], [92, 95]], quietZone: format === 'ean13' ? 11 : 9, codes: [] };
}

function encodeEan8(value: string): BarcodeEncoding {
  const digits = digitsWithCheck(value, 7, 'EAN-8');
  let bits = GUARD;
  for (let i = 0; i < 4; i++) bits += EAN_L[Number(digits[i])]!;
  bits += CENTER;
  for (let i = 4; i < 8; i++) bits += EAN_R[Number(digits[i])]!;
  bits += GUARD;
  return {
    format: 'ean8',
    value: digits,
    bits,
    text: [
      { text: digits.slice(0, 4), x: 17, anchor: 'middle' },
      { text: digits.slice(4), x: 50, anchor: 'middle' },
    ],
    guards: [[0, 3], [31, 36], [64, 67]],
    quietZone: 7,
    codes: [],
  };
}

// ---------------------------------------------------------------------------------------------
// Code 39
// ---------------------------------------------------------------------------------------------

/** Element widths per character (bar, space, bar, … 9 elements): `1` wide, `0` narrow. */
const CODE39: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000', '4': '000110001', '5': '100110000',
  '6': '001110000', '7': '000100101', '8': '100100100', '9': '001100100', A: '100001001', B: '001001001',
  C: '101001000', D: '000011001', E: '100011000', F: '001011000', G: '000001101', H: '100001100',
  I: '001001100', J: '000011100', K: '100000011', L: '001000011', M: '101000010', N: '000010011',
  O: '100010010', P: '001010010', Q: '000000111', R: '100000110', S: '001000110', T: '000010110',
  U: '110000001', V: '011000001', W: '111000000', X: '010010001', Y: '110010000', Z: '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '*': '010010100', $: '010101000', '/': '010100010',
  '+': '010001010', '%': '000101010',
};
export const CODE39_CHARSET = Object.keys(CODE39).filter((c) => c !== '*').join('');
export const CODE39_PATTERNS = CODE39;

function code39Char(c: string): string {
  let bits = '';
  [...CODE39[c]!].forEach((w, i) => {
    bits += (i % 2 === 0 ? '1' : '0').repeat(w === '1' ? 3 : 1);
  });
  return bits;
}

function encodeCode39(raw: string): BarcodeEncoding {
  if (raw === '') throw new BarcodeError('empty', 'Nothing to encode');
  const value = raw.toUpperCase();
  for (const ch of value) {
    if (!(ch in CODE39) || ch === '*') throw new BarcodeError('invalid-character', `Code 39 supports 0-9, A-Z, space and -.$/+% (found "${ch}")`);
  }
  const bits = ['*', ...value, '*'].map(code39Char).join('0');
  return { format: 'code39', value, bits, text: [], guards: [], quietZone: 10, codes: [] };
}

// ---------------------------------------------------------------------------------------------
// Interleaved 2 of 5
// ---------------------------------------------------------------------------------------------

/** Five elements per digit, `1` wide, `0` narrow. */
export const ITF_PATTERNS = ['00110', '10001', '01001', '11000', '00101', '10100', '01100', '00011', '10010', '01010'];

function encodeItf(value: string): BarcodeEncoding {
  if (value === '') throw new BarcodeError('empty', 'Nothing to encode');
  if (!/^[0-9]+$/.test(value)) throw new BarcodeError('invalid-character', 'Interleaved 2 of 5 only accepts digits');
  if (value.length % 2 !== 0) throw new BarcodeError('invalid-length', 'Interleaved 2 of 5 needs an even number of digits');
  let bits = '1010';
  for (let i = 0; i < value.length; i += 2) {
    const bars = ITF_PATTERNS[Number(value[i])]!;
    const spaces = ITF_PATTERNS[Number(value[i + 1])]!;
    for (let k = 0; k < 5; k++) {
      bits += '1'.repeat(bars[k] === '1' ? 3 : 1);
      bits += '0'.repeat(spaces[k] === '1' ? 3 : 1);
    }
  }
  bits += '11101';
  return { format: 'itf', value, bits, text: [], guards: [], quietZone: 10, codes: [] };
}

// ---------------------------------------------------------------------------------------------

/** Validate and encode. Throws `BarcodeError`. */
export function encodeBarcode(format: BarcodeFormat, value: string): BarcodeEncoding {
  switch (format) {
    case 'code128':
      return encodeCode128(value);
    case 'ean13':
      return encodeEan13Like('ean13', value);
    case 'upca':
      return encodeEan13Like('upca', value);
    case 'ean8':
      return encodeEan8(value);
    case 'code39':
      return encodeCode39(value);
    case 'itf':
      return encodeItf(value);
    default:
      throw new BarcodeError('invalid-character', `Unknown format "${String(format)}"`);
  }
}
