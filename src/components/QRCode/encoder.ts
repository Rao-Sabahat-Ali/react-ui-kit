/**
 * Dependency-free QR Code (ISO/IEC 18004) encoder: numeric, alphanumeric and byte (UTF-8) modes with
 * automatic mode selection, versions 1–40, error correction L/M/Q/H, Reed–Solomon over GF(256), all eight
 * mask patterns with the standard penalty-score selection, format and version information.
 * Pure functions only: no DOM, no React, nothing is sent anywhere.
 */

export type QrEcc = 'L' | 'M' | 'Q' | 'H';
export type QrMode = 'numeric' | 'alphanumeric' | 'byte';
export type QrErrorCode = 'too-long' | 'empty' | 'invalid-option';

export const QR_ECC_LEVELS: readonly QrEcc[] = ['L', 'M', 'Q', 'H'];
export const QR_MIN_VERSION = 1;
export const QR_MAX_VERSION = 40;

/** Typed encoder failure. `too-long` means the value does not fit version 40 at the requested level. */
export class QrError extends Error {
  readonly code: QrErrorCode;
  constructor(code: QrErrorCode, message: string) {
    super(message);
    this.name = 'QrError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------------------------
// Tables (ISO/IEC 18004:2015 tables 9 and 13). Index 0 is unused so arrays are indexed by version.
// ---------------------------------------------------------------------------------------------

const ECC_CODEWORDS_PER_BLOCK: Record<QrEcc, readonly number[]> = {
  L: [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [0, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [0, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};

const NUM_BLOCKS: Record<QrEcc, readonly number[]> = {
  L: [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  M: [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [0, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [0, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
};

/** 2-bit ECC indicator used in the format information (L=01, M=00, Q=11, H=10). */
const ECC_FORMAT_BITS: Record<QrEcc, number> = { L: 1, M: 0, Q: 3, H: 2 };

const ALPHANUMERIC_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

// ---------------------------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------------------------

export function qrSize(version: number): number {
  return version * 4 + 17;
}

/** Number of modules that can hold data or error-correction bits (everything but function patterns). */
export function numRawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

/** Number of 8-bit data codewords (after removing error-correction codewords) for a version and level. */
export function numDataCodewords(version: number, ecc: QrEcc): number {
  return Math.floor(numRawDataModules(version) / 8) - ECC_CODEWORDS_PER_BLOCK[ecc][version]! * NUM_BLOCKS[ecc][version]!;
}

export function eccCodewordsPerBlock(version: number, ecc: QrEcc): number {
  return ECC_CODEWORDS_PER_BLOCK[ecc][version]!;
}

export function numBlocks(version: number, ecc: QrEcc): number {
  return NUM_BLOCKS[ecc][version]!;
}

/** Centre coordinates of the alignment patterns along one axis (empty for version 1). */
export function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = qrSize(version) - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

// ---------------------------------------------------------------------------------------------
// Modes and bit streams
// ---------------------------------------------------------------------------------------------

const MODE_BITS: Record<QrMode, number> = { numeric: 0b0001, alphanumeric: 0b0010, byte: 0b0100 };
const CHAR_COUNT_BITS: Record<QrMode, readonly [number, number, number]> = {
  numeric: [10, 12, 14],
  alphanumeric: [9, 11, 13],
  byte: [8, 16, 16],
};

/** Width of the character-count field for a mode at a version (versions 1–9, 10–26, 27–40). */
export function charCountBits(mode: QrMode, version: number): number {
  return CHAR_COUNT_BITS[mode][version <= 9 ? 0 : version <= 26 ? 1 : 2];
}

export function isNumeric(text: string): boolean {
  return /^[0-9]*$/.test(text);
}

export function isAlphanumeric(text: string): boolean {
  return /^[0-9A-Z $%*+\-./:]*$/.test(text);
}

/** Smallest mode that can represent the text: numeric, then alphanumeric, then UTF-8 bytes. */
export function selectMode(text: string): QrMode {
  if (text !== '' && isNumeric(text)) return 'numeric';
  if (text !== '' && isAlphanumeric(text)) return 'alphanumeric';
  return 'byte';
}

/** UTF-8 encoding without TextEncoder; lone surrogates become U+FFFD like the platform encoder. */
export function utf8Bytes(text: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let cp = text.charCodeAt(i);
    if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        cp = 0x10000 + ((cp - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }
    if (cp >= 0xd800 && cp <= 0xdfff) cp = 0xfffd;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
  }
  return out;
}

function appendBits(bits: number[], value: number, length: number): void {
  for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
}

/** Payload bits (without mode indicator and character count) and the character count for a mode. */
function segmentData(text: string, mode: QrMode): { bits: number[]; count: number } {
  const bits: number[] = [];
  if (mode === 'numeric') {
    if (!isNumeric(text)) throw new QrError('invalid-option', 'Numeric mode only accepts the digits 0-9');
    for (let i = 0; i < text.length; ) {
      const n = Math.min(text.length - i, 3);
      appendBits(bits, parseInt(text.slice(i, i + n), 10), n * 3 + 1);
      i += n;
    }
    return { bits, count: text.length };
  }
  if (mode === 'alphanumeric') {
    if (!isAlphanumeric(text)) throw new QrError('invalid-option', 'Alphanumeric mode only accepts 0-9, A-Z, space and $%*+-./:');
    for (let i = 0; i < text.length; ) {
      if (i + 1 < text.length) {
        appendBits(bits, ALPHANUMERIC_CHARSET.indexOf(text[i]!) * 45 + ALPHANUMERIC_CHARSET.indexOf(text[i + 1]!), 11);
        i += 2;
      } else {
        appendBits(bits, ALPHANUMERIC_CHARSET.indexOf(text[i]!), 6);
        i += 1;
      }
    }
    return { bits, count: text.length };
  }
  const bytes = utf8Bytes(text);
  for (const b of bytes) appendBits(bits, b, 8);
  return { bits, count: bytes.length };
}

/** Largest number of characters (bytes for byte mode) that fit a version at a level in a mode. */
export function qrCapacity(version: number, ecc: QrEcc, mode: QrMode): number {
  const bits = numDataCodewords(version, ecc) * 8 - 4 - charCountBits(mode, version);
  if (bits < 0) return 0;
  const max = 2 ** charCountBits(mode, version) - 1;
  let chars: number;
  if (mode === 'numeric') {
    const rem = bits % 10;
    chars = Math.floor(bits / 10) * 3 + (rem >= 7 ? 2 : rem >= 4 ? 1 : 0);
  } else if (mode === 'alphanumeric') {
    chars = Math.floor(bits / 11) * 2 + (bits % 11 >= 6 ? 1 : 0);
  } else {
    chars = Math.floor(bits / 8);
  }
  return Math.min(chars, max);
}

// ---------------------------------------------------------------------------------------------
// Reed–Solomon over GF(2^8) with the QR polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11D)
// ---------------------------------------------------------------------------------------------

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255]!;
})();

export function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a]! + GF_LOG[b]!]!;
}

/** `alpha^exponent` in GF(256). */
export function gfExp(exponent: number): number {
  return GF_EXP[((exponent % 255) + 255) % 255]!;
}

/** Discrete logarithm base alpha (undefined for 0). */
export function gfLog(value: number): number {
  if (value <= 0 || value > 255) throw new RangeError('gfLog: value out of range');
  return GF_LOG[value]!;
}

/** Coefficients (highest degree first, leading 1 omitted) of the generator polynomial of the given degree. */
export function rsGenerator(degree: number): number[] {
  if (degree < 1 || degree > 255) throw new RangeError('Degree out of range');
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j]!, root);
      if (j + 1 < degree) result[j]! ^= result[j + 1]!;
    }
    root = gfMultiply(root, 2);
  }
  return result;
}

/** Remainder of `data(x) * x^degree` divided by the generator: the error-correction codewords. */
export function rsRemainder(data: readonly number[], generator: readonly number[]): number[] {
  const result = new Array<number>(generator.length).fill(0);
  for (const b of data) {
    const factor = b ^ result.shift()!;
    result.push(0);
    generator.forEach((coef, i) => {
      result[i]! ^= gfMultiply(coef, factor);
    });
  }
  return result;
}

/** Split data codewords into blocks, add error correction and interleave (ISO/IEC 18004 §7.6). */
export function addEccAndInterleave(data: readonly number[], version: number, ecc: QrEcc): number[] {
  if (data.length !== numDataCodewords(version, ecc)) throw new RangeError('Invalid data length');
  const blocks = NUM_BLOCKS[ecc][version]!;
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecc][version]!;
  const rawCodewords = Math.floor(numRawDataModules(version) / 8);
  const numShort = blocks - (rawCodewords % blocks);
  const shortLen = Math.floor(rawCodewords / blocks);
  const generator = rsGenerator(blockEccLen);
  const dataBlocks: number[][] = [];
  const eccBlocks: number[][] = [];
  for (let i = 0, k = 0; i < blocks; i++) {
    const len = shortLen - blockEccLen + (i < numShort ? 0 : 1);
    const block = data.slice(k, k + len);
    k += len;
    dataBlocks.push(block);
    eccBlocks.push(rsRemainder(block, generator));
  }
  const result: number[] = [];
  const longest = shortLen - blockEccLen + 1;
  for (let i = 0; i < longest; i++) {
    for (const block of dataBlocks) if (i < block.length) result.push(block[i]!);
  }
  for (let i = 0; i < blockEccLen; i++) {
    for (const block of eccBlocks) result.push(block[i]!);
  }
  return result;
}

// ---------------------------------------------------------------------------------------------
// Format and version information (BCH codes)
// ---------------------------------------------------------------------------------------------

/** 15-bit format information: BCH(15,5) of [ecc(2) | mask(3)] xor 0x5412. */
export function formatBits(ecc: QrEcc, mask: number): number {
  const data = (ECC_FORMAT_BITS[ecc] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

/** 18-bit version information (versions 7–40): BCH(18,6). */
export function versionBits(version: number): number {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (version << 12) | rem;
}

// ---------------------------------------------------------------------------------------------
// Masks and penalty score
// ---------------------------------------------------------------------------------------------

export function maskApplies(mask: number, row: number, col: number): boolean {
  switch (mask) {
    case 0: return (row + col) % 2 === 0;
    case 1: return row % 2 === 0;
    case 2: return col % 3 === 0;
    case 3: return (row + col) % 3 === 0;
    case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    case 7: return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
    default: throw new RangeError('Mask must be 0-7');
  }
}

/** ISO/IEC 18004 §7.8.3 penalty score of a finished symbol (lower is better). */
export function penaltyScore(modules: Uint8Array, size: number): number {
  const at = (x: number, y: number) => modules[y * size + x]!;
  let result = 0;

  // Rule 1: runs of five or more same-coloured modules in a row or column.
  for (let a = 0; a < size; a++) {
    for (const horizontal of [true, false]) {
      let run = 1;
      for (let b = 1; b < size; b++) {
        const cur = horizontal ? at(b, a) : at(a, b);
        const prev = horizontal ? at(b - 1, a) : at(a, b - 1);
        if (cur === prev) {
          run++;
          if (run === 5) result += PENALTY_N1;
          else if (run > 5) result++;
        } else {
          run = 1;
        }
      }
    }
  }

  // Rule 2: 2x2 blocks of one colour.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = at(x, y);
      if (c === at(x + 1, y) && c === at(x, y + 1) && c === at(x + 1, y + 1)) result += PENALTY_N2;
    }
  }

  // Rule 3: 1:1:3:1:1 finder-like pattern with four light modules on one side (inside the symbol only).
  const A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  for (let a = 0; a < size; a++) {
    for (let b = 0; b + 11 <= size; b++) {
      for (const horizontal of [true, false]) {
        let matchA = true;
        let matchB = true;
        for (let k = 0; k < 11 && (matchA || matchB); k++) {
          const v = horizontal ? at(b + k, a) : at(a, b + k);
          if (v !== A[k]) matchA = false;
          if (v !== B[k]) matchB = false;
        }
        if (matchA) result += PENALTY_N3;
        if (matchB) result += PENALTY_N3;
      }
    }
  }

  // Rule 4: deviation of the dark-module proportion from 50 %, in steps of 5 %.
  let dark = 0;
  for (const m of modules) dark += m;
  const total = size * size;
  result += Math.floor(Math.abs(dark * 20 - total * 10) / total) * PENALTY_N4;
  return result;
}

// ---------------------------------------------------------------------------------------------
// Symbol construction
// ---------------------------------------------------------------------------------------------

export interface QrEncodeOptions {
  /** Error-correction level. Default `M`. */
  ecc?: QrEcc;
  /** Smallest version to consider (1–40). Default 1. */
  minVersion?: number;
  /** Largest version to consider (1–40). Default 40. */
  maxVersion?: number;
  /** Force a mask pattern 0–7 instead of choosing the lowest penalty. */
  mask?: number;
  /** Force a mode instead of choosing automatically. */
  mode?: QrMode;
  /** Raise the level (up to H) while the version stays the same. Default false. */
  boostEcc?: boolean;
}

export interface QrSymbol {
  version: number;
  ecc: QrEcc;
  mask: number;
  mode: QrMode;
  /** Modules per side. */
  size: number;
  /** Row-major, 1 = dark. */
  modules: Uint8Array;
  /** Row-major, 1 = finder/separator/timing/alignment/format/version module (not data). */
  isFunction: Uint8Array;
  /** Data codewords before error correction (after padding). */
  dataCodewords: number[];
  /** Final interleaved codewords (data + error correction). */
  codewords: number[];
  /** Penalty score of the chosen mask. */
  penalty: number;
  get(x: number, y: number): boolean;
}

function drawFunctionPatterns(version: number, ecc: QrEcc): { modules: Uint8Array; isFunction: Uint8Array } {
  const size = qrSize(version);
  const modules = new Uint8Array(size * size);
  const isFunction = new Uint8Array(size * size);
  const set = (x: number, y: number, dark: boolean) => {
    modules[y * size + x] = dark ? 1 : 0;
    isFunction[y * size + x] = 1;
  };
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, dist !== 2 && dist !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  const align = alignmentPositions(version);
  const last = align.length - 1;
  align.forEach((cx, i) => {
    align.forEach((cy, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    });
  });
  drawFormat(modules, isFunction, size, ecc, 0);
  if (version >= 7) {
    const bits = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, bit);
      set(b, a, bit);
    }
  }
  return { modules, isFunction };
}

function drawFormat(modules: Uint8Array, isFunction: Uint8Array, size: number, ecc: QrEcc, mask: number): void {
  const bits = formatBits(ecc, mask);
  const bit = (i: number) => ((bits >>> i) & 1) === 1;
  const set = (x: number, y: number, dark: boolean) => {
    modules[y * size + x] = dark ? 1 : 0;
    isFunction[y * size + x] = 1;
  };
  for (let i = 0; i <= 5; i++) set(8, i, bit(i));
  set(8, 7, bit(6));
  set(8, 8, bit(7));
  set(7, 8, bit(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
  set(8, size - 8, true); // the always-dark module
}

function placeCodewords(modules: Uint8Array, isFunction: Uint8Array, size: number, codewords: readonly number[]): void {
  let i = 0;
  const totalBits = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunction[y * size + x] && i < totalBits) {
          modules[y * size + x] = (codewords[i >>> 3]! >>> (7 - (i & 7))) & 1;
          i++;
        }
      }
    }
  }
}

function applyMask(modules: Uint8Array, isFunction: Uint8Array, size: number, mask: number): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isFunction[y * size + x] && maskApplies(mask, y, x)) modules[y * size + x]! ^= 1;
    }
  }
}

/** Build the data codewords (mode, count, payload, terminator, padding) for a chosen version and level. */
export function buildDataCodewords(text: string, mode: QrMode, version: number, ecc: QrEcc): number[] {
  const { bits, count } = segmentData(text, mode);
  const capacityBits = numDataCodewords(version, ecc) * 8;
  const stream: number[] = [];
  appendBits(stream, MODE_BITS[mode], 4);
  appendBits(stream, count, charCountBits(mode, version));
  for (const b of bits) stream.push(b);
  if (stream.length > capacityBits) throw new QrError('too-long', 'Data does not fit the chosen version');
  appendBits(stream, 0, Math.min(4, capacityBits - stream.length));
  appendBits(stream, 0, (8 - (stream.length % 8)) % 8);
  const codewords: number[] = [];
  for (let i = 0; i < stream.length; i += 8) {
    let byte = 0;
    for (let k = 0; k < 8; k++) byte = (byte << 1) | stream[i + k]!;
    codewords.push(byte);
  }
  for (let pad = 0xec; codewords.length < capacityBits / 8; pad ^= 0xec ^ 0x11) codewords.push(pad);
  return codewords;
}

function requiredBits(mode: QrMode, count: number, payloadBits: number, version: number): number {
  return count < 2 ** charCountBits(mode, version) ? 4 + charCountBits(mode, version) + payloadBits : Number.POSITIVE_INFINITY;
}

/**
 * Encode text into a QR symbol. Throws `QrError`: `empty` for an empty string, `too-long` when the text does
 * not fit version 40 at the requested level (or within `maxVersion`), `invalid-option` for bad options.
 */
export function encodeQr(text: string, options: QrEncodeOptions = {}): QrSymbol {
  const { minVersion = QR_MIN_VERSION, maxVersion = QR_MAX_VERSION, boostEcc = false } = options;
  let ecc: QrEcc = options.ecc ?? 'M';
  if (!QR_ECC_LEVELS.includes(ecc)) throw new QrError('invalid-option', 'Error correction must be L, M, Q or H');
  if (!Number.isInteger(minVersion) || !Number.isInteger(maxVersion) || minVersion < QR_MIN_VERSION || maxVersion > QR_MAX_VERSION || minVersion > maxVersion) {
    throw new QrError('invalid-option', 'Version range must be within 1-40');
  }
  if (options.mask !== undefined && (!Number.isInteger(options.mask) || options.mask < 0 || options.mask > 7)) {
    throw new QrError('invalid-option', 'Mask must be 0-7');
  }
  if (text === '') throw new QrError('empty', 'There is nothing to encode');

  const mode = options.mode ?? selectMode(text);
  const { bits, count } = segmentData(text, mode);

  let version = 0;
  for (let v = minVersion; v <= maxVersion; v++) {
    if (requiredBits(mode, count, bits.length, v) <= numDataCodewords(v, ecc) * 8) {
      version = v;
      break;
    }
  }
  if (version === 0) {
    throw new QrError('too-long', `Value does not fit a QR code at level ${ecc} (${count} ${mode === 'byte' ? 'bytes' : 'characters'}, at most ${qrCapacity(maxVersion, ecc, mode)})`);
  }
  if (boostEcc) {
    for (const level of ['M', 'Q', 'H'] as const) {
      if (QR_ECC_LEVELS.indexOf(level) > QR_ECC_LEVELS.indexOf(ecc) && requiredBits(mode, count, bits.length, version) <= numDataCodewords(version, level) * 8) ecc = level;
    }
  }

  const dataCodewords = buildDataCodewords(text, mode, version, ecc);
  const codewords = addEccAndInterleave(dataCodewords, version, ecc);
  const size = qrSize(version);
  const { modules, isFunction } = drawFunctionPatterns(version, ecc);
  placeCodewords(modules, isFunction, size, codewords);

  let bestMask = options.mask ?? 0;
  let bestPenalty = Number.POSITIVE_INFINITY;
  const masks = options.mask === undefined ? [0, 1, 2, 3, 4, 5, 6, 7] : [options.mask];
  for (const mask of masks) {
    applyMask(modules, isFunction, size, mask);
    drawFormat(modules, isFunction, size, ecc, mask);
    const penalty = penaltyScore(modules, size);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
    }
    applyMask(modules, isFunction, size, mask); // undo
  }
  applyMask(modules, isFunction, size, bestMask);
  drawFormat(modules, isFunction, size, ecc, bestMask);

  return {
    version,
    ecc,
    mask: bestMask,
    mode,
    size,
    modules,
    isFunction,
    dataCodewords,
    codewords,
    penalty: bestPenalty,
    get: (x, y) => x >= 0 && y >= 0 && x < size && y < size && modules[y * size + x] === 1,
  };
}
