import { describe, expect, it } from 'vitest';
import {
  addEccAndInterleave,
  alignmentPositions,
  buildDataCodewords,
  eccCodewordsPerBlock,
  encodeQr,
  formatBits,
  gfExp,
  gfLog,
  gfMultiply,
  maskApplies,
  numBlocks,
  numDataCodewords,
  numRawDataModules,
  penaltyScore,
  qrCapacity,
  QrError,
  rsGenerator,
  rsRemainder,
  selectMode,
  utf8Bytes,
  versionBits,
  QR_ECC_LEVELS,
} from './encoder';

const rows = (modules: Uint8Array, size: number) =>
  Array.from({ length: size }, (_, y) => [...modules.slice(y * size, (y + 1) * size)].map((m) => (m ? '#' : '.')).join(''));

describe('QR encoder', () => {
  it('AC-27: selects numeric, then alphanumeric, then byte mode', () => {
    expect(selectMode('0123456789')).toBe('numeric');
    expect(selectMode('HELLO WORLD $%*+-./:')).toBe('alphanumeric');
    expect(selectMode('Hello')).toBe('byte');
    expect(selectMode('https://example.com')).toBe('byte');
    expect(selectMode('')).toBe('byte');
    expect(encodeQr('12345').mode).toBe('numeric');
    expect(encodeQr('AB-12').mode).toBe('alphanumeric');
    expect(encodeQr('ab-12').mode).toBe('byte');
  });

  it('AC-27: byte mode encodes UTF-8 (åäö, emoji, surrogate pairs)', () => {
    expect(utf8Bytes('åäö')).toEqual([0xc3, 0xa5, 0xc3, 0xa4, 0xc3, 0xb6]);
    expect(utf8Bytes('€')).toEqual([0xe2, 0x82, 0xac]);
    expect(utf8Bytes('😀')).toEqual([0xf0, 0x9f, 0x98, 0x80]);
    expect(utf8Bytes('\ud800')).toEqual([0xef, 0xbf, 0xbd]); // lone surrogate -> U+FFFD
    // "åäö" is 6 bytes: mode 0100, count 00000110, then the bytes.
    const data = buildDataCodewords('åäö', 'byte', 1, 'L');
    expect(data.slice(0, 3)).toEqual([0x40 | 0x0, 0x6c, 0x3a]);
    expect(encodeQr('Hej åäö 😀').mode).toBe('byte');
  });

  it('AC-28: capacities match ISO/IEC 18004', () => {
    expect([qrCapacity(1, 'L', 'numeric'), qrCapacity(1, 'L', 'alphanumeric'), qrCapacity(1, 'L', 'byte')]).toEqual([41, 25, 17]);
    expect([qrCapacity(1, 'M', 'numeric'), qrCapacity(1, 'M', 'alphanumeric'), qrCapacity(1, 'M', 'byte')]).toEqual([34, 20, 14]);
    expect([qrCapacity(1, 'H', 'numeric'), qrCapacity(1, 'H', 'alphanumeric'), qrCapacity(1, 'H', 'byte')]).toEqual([17, 10, 7]);
    expect([qrCapacity(40, 'L', 'numeric'), qrCapacity(40, 'L', 'alphanumeric'), qrCapacity(40, 'L', 'byte')]).toEqual([7089, 4296, 2953]);
    expect([qrCapacity(40, 'H', 'numeric'), qrCapacity(40, 'H', 'alphanumeric'), qrCapacity(40, 'H', 'byte')]).toEqual([3057, 1852, 1273]);
    expect(qrCapacity(10, 'Q', 'byte')).toBe(151);
  });

  it('AC-28: data codeword counts follow the standard tables', () => {
    expect(numDataCodewords(1, 'L')).toBe(19);
    expect(numDataCodewords(1, 'M')).toBe(16);
    expect(numDataCodewords(1, 'Q')).toBe(13);
    expect(numDataCodewords(1, 'H')).toBe(9);
    expect(numDataCodewords(40, 'L')).toBe(2956);
    expect(numDataCodewords(40, 'H')).toBe(1276);
    expect(numRawDataModules(1)).toBe(208);
    expect(numRawDataModules(7)).toBe(1568);
    expect(numRawDataModules(40)).toBe(29648);
    // Every version/level splits into whole blocks whose sizes add up to the raw codeword count.
    for (let v = 1; v <= 40; v++) {
      for (const ecc of QR_ECC_LEVELS) {
        expect(numDataCodewords(v, ecc) + eccCodewordsPerBlock(v, ecc) * numBlocks(v, ecc)).toBe(Math.floor(numRawDataModules(v) / 8));
      }
    }
  });

  it('AC-28: picks the smallest version, and throws a typed error when the value is too long', () => {
    expect(encodeQr('A'.repeat(25), { ecc: 'L' }).version).toBe(1);
    expect(encodeQr('A'.repeat(26), { ecc: 'L' }).version).toBe(2);
    expect(encodeQr('9'.repeat(7089), { ecc: 'L' }).version).toBe(40);
    expect(encodeQr('x'.repeat(2953), { ecc: 'L' }).version).toBe(40);
    try {
      encodeQr('x'.repeat(2954), { ecc: 'L' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(QrError);
      expect((error as QrError).code).toBe('too-long');
    }
    expect(() => encodeQr('x'.repeat(1274), { ecc: 'H' })).toThrow(QrError);
    expect(() => encodeQr('hello world', { maxVersion: 1, ecc: 'H' })).toThrow(/does not fit/);
    expect(() => encodeQr('')).toThrowError(expect.objectContaining({ code: 'empty' }));
    expect(() => encodeQr('x', { ecc: 'Z' as never })).toThrowError(expect.objectContaining({ code: 'invalid-option' }));
    expect(() => encodeQr('x', { mask: 9 })).toThrowError(expect.objectContaining({ code: 'invalid-option' }));
    expect(() => encodeQr('abc', { mode: 'numeric' })).toThrowError(expect.objectContaining({ code: 'invalid-option' }));
  });

  it('AC-28: boostEcc raises the level while the version stays', () => {
    expect(encodeQr('HELLO', { ecc: 'L', boostEcc: true }).ecc).toBe('H');
    expect(encodeQr('HELLO', { ecc: 'L' }).ecc).toBe('L');
    const full = encodeQr('x'.repeat(17), { ecc: 'L', boostEcc: true });
    expect(full.version).toBe(1);
    expect(full.ecc).toBe('L');
  });

  it('AC-29: GF(256) arithmetic uses the QR polynomial 0x11D', () => {
    expect([gfExp(0), gfExp(1), gfExp(7), gfExp(8), gfExp(9)]).toEqual([1, 2, 128, 29, 58]);
    expect(gfExp(255)).toBe(1);
    expect(gfLog(2)).toBe(1);
    expect(gfLog(29)).toBe(8);
    expect(gfMultiply(0, 77)).toBe(0);
    expect(gfMultiply(2, 128)).toBe(29);
    expect(gfMultiply(0x57, 0x83)).toBe(gfMultiply(0x83, 0x57));
    for (let a = 1; a < 256; a += 17) expect(gfMultiply(a, gfExp(255 - gfLog(a)))).toBe(1);
    expect(() => gfLog(0)).toThrow(RangeError);
  });

  it('AC-29: Reed–Solomon generator polynomials (alpha exponents from ISO/IEC 18004 Annex A)', () => {
    expect(rsGenerator(7).map(gfLog)).toEqual([87, 229, 146, 149, 238, 102, 21]);
    expect(rsGenerator(10).map(gfLog)).toEqual([251, 67, 46, 61, 118, 70, 64, 94, 32, 45]);
    expect(rsGenerator(17).map(gfLog)).toEqual([43, 139, 206, 78, 43, 239, 123, 206, 214, 147, 24, 99, 150, 39, 243, 163, 136]);
    expect(() => rsGenerator(0)).toThrow(RangeError);
  });

  it('AC-29: "01234567" at version 1-M gives the ISO/IEC 18004 Annex I codewords', () => {
    const data = buildDataCodewords('01234567', 'numeric', 1, 'M');
    expect(data).toEqual([16, 32, 12, 86, 97, 128, 236, 17, 236, 17, 236, 17, 236, 17, 236, 17]);
    expect(rsRemainder(data, rsGenerator(10))).toEqual([165, 36, 212, 193, 237, 54, 199, 135, 44, 85]);
    expect(addEccAndInterleave(data, 1, 'M')).toEqual([...data, 165, 36, 212, 193, 237, 54, 199, 135, 44, 85]);
  });

  it('AC-29: "HELLO WORLD" at version 1-M (alphanumeric) gives the textbook codewords', () => {
    const data = buildDataCodewords('HELLO WORLD', 'alphanumeric', 1, 'M');
    expect(data).toEqual([32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17]);
    expect(rsRemainder(data, rsGenerator(10))).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });

  it('AC-29: multi-block symbols interleave data and error-correction codewords', () => {
    // Version 5-Q has 2 blocks of 15 and 2 of 16 data codewords, 18 EC codewords each.
    const data = Array.from({ length: numDataCodewords(5, 'Q') }, (_, i) => (i * 7 + 3) & 255);
    const out = addEccAndInterleave(data, 5, 'Q');
    expect(out).toHaveLength(134);
    expect(out.slice(0, 4)).toEqual([data[0], data[15], data[30], data[46]]);
    // The last data codeword column only exists in the two longer blocks.
    expect(out.slice(60, 62)).toEqual([data[45], data[61]]);
    expect(() => addEccAndInterleave([1, 2, 3], 1, 'M')).toThrow(RangeError);
  });

  it('AC-30: format information for all 32 level/mask pairs', () => {
    const expected: Record<string, string[]> = {
      L: ['111011111000100', '111001011110011', '111110110101010', '111100010011101', '110011000101111', '110001100011000', '110110001000001', '110100101110110'],
      M: ['101010000010010', '101000100100101', '101111001111100', '101101101001011', '100010111111001', '100000011001110', '100111110010111', '100101010100000'],
      Q: ['011010101011111', '011000001101000', '011111100110001', '011101000000110', '010010010110100', '010000110000011', '010111011011010', '010101111101101'],
      H: ['001011010001001', '001001110111110', '001110011100111', '001100111010000', '000011101100010', '000001001010101', '000110100001100', '000100000111011'],
    };
    for (const ecc of QR_ECC_LEVELS) {
      for (let mask = 0; mask < 8; mask++) expect(formatBits(ecc, mask).toString(2).padStart(15, '0')).toBe(expected[ecc]![mask]);
    }
  });

  it('AC-30: version information for versions 7, 8 and 40', () => {
    expect(versionBits(7).toString(2).padStart(18, '0')).toBe('000111110010010100');
    expect(versionBits(8).toString(2).padStart(18, '0')).toBe('001000010110111100');
    expect(versionBits(40).toString(2).padStart(18, '0')).toBe('101000110001101001');
    // The symbol carries the version twice (6x3 blocks), bit 0 at the bottom-left of the top-right block.
    const sym = encodeQr('x'.repeat(120), { ecc: 'L', minVersion: 7, maxVersion: 7 });
    const bits = versionBits(7);
    for (let i = 0; i < 18; i++) {
      const bit = (bits >>> i) & 1;
      expect(sym.modules[Math.floor(i / 3) * sym.size + (sym.size - 11 + (i % 3))]).toBe(bit);
      expect(sym.modules[(sym.size - 11 + (i % 3)) * sym.size + Math.floor(i / 3)]).toBe(bit);
    }
  });

  it('AC-30: the format information in the symbol decodes back to level and mask', () => {
    for (const ecc of QR_ECC_LEVELS) {
      const sym = encodeQr('HELLO', { ecc });
      const bits = formatBits(ecc, sym.mask);
      // First copy around the top-left finder.
      const first = [0, 1, 2, 3, 4, 5].map((i) => sym.modules[i * sym.size + 8]);
      first.push(sym.modules[7 * sym.size + 8]!, sym.modules[8 * sym.size + 8]!, sym.modules[8 * sym.size + 7]!);
      for (let i = 9; i < 15; i++) first.push(sym.modules[8 * sym.size + (14 - i)]);
      expect(first.map((b, i) => (b ?? 0) << i).reduce((a, b) => a | b, 0)).toBe(bits);
    }
  });

  it('AC-31: the chosen mask has the lowest penalty and a forced mask is honoured', () => {
    for (const text of ['HELLO WORLD', 'https://example.com/a/b?c=d', '0123456789012345678901234567890123456789']) {
      const auto = encodeQr(text, { ecc: 'M' });
      const scores = Array.from({ length: 8 }, (_, mask) => penaltyScore(encodeQr(text, { ecc: 'M', mask }).modules, auto.size));
      expect(auto.penalty).toBe(Math.min(...scores));
      expect(scores[auto.mask]).toBe(auto.penalty);
      expect(scores.indexOf(Math.min(...scores))).toBe(auto.mask);
    }
    expect(encodeQr('HELLO', { mask: 5 }).mask).toBe(5);
  });

  it('AC-31: mask patterns follow the standard formulas', () => {
    expect(maskApplies(0, 0, 0)).toBe(true);
    expect(maskApplies(0, 0, 1)).toBe(false);
    expect(maskApplies(1, 2, 5)).toBe(true);
    expect(maskApplies(2, 5, 3)).toBe(true);
    expect(maskApplies(3, 1, 2)).toBe(true);
    expect(maskApplies(4, 1, 1)).toBe(true);
    expect(maskApplies(4, 2, 0)).toBe(false);
    expect(maskApplies(5, 2, 3)).toBe(true);
    expect(maskApplies(6, 1, 1)).toBe(true);
    expect(maskApplies(6, 3, 1)).toBe(false);
    expect(maskApplies(7, 1, 2)).toBe(false);
    expect(() => maskApplies(8, 0, 0)).toThrow(RangeError);
  });

  it('AC-31: penalty rules score runs, blocks, finder-like patterns and balance', () => {
    const size = 21;
    const blank = new Uint8Array(size * size);
    // All light: rule 1 (runs), rule 2 (blocks) and rule 4 (balance 0 % dark) all fire.
    const runs = 2 * size * (3 + (size - 5));
    const blocks = 3 * (size - 1) ** 2;
    const balance = Math.floor(Math.abs(0 * 20 - size * size * 10) / (size * size)) * 10;
    expect(penaltyScore(blank, size)).toBe(runs + blocks + balance);
    // A checkerboard has no runs, blocks, finder-like patterns or imbalance.
    const checker = new Uint8Array(size * size);
    for (let i = 0; i < checker.length; i++) checker[i] = (Math.floor(i / size) + (i % size)) % 2;
    expect(penaltyScore(checker, size)).toBe(0);
    // Whole-symbol scores of the golden matrices below (rules 1-4 combined).
    const sym = encodeQr('HELLO WORLD', { ecc: 'Q', mask: 6 });
    expect(penaltyScore(sym.modules, sym.size)).toBe(314);
    expect(penaltyScore(encodeQr('01234567', { ecc: 'M', mask: 0 }).modules, 21)).toBe(297);
  });

  it('AC-31: finder, timing, alignment and dark-module structure', () => {
    const sym = encodeQr('x'.repeat(100), { ecc: 'M', minVersion: 7 });
    const { size } = sym;
    expect(sym.version).toBeGreaterThanOrEqual(7);
    const at = (x: number, y: number) => sym.get(x, y);
    for (const [ox, oy] of [[0, 0], [size - 7, 0], [0, size - 7]] as const) {
      for (let i = 0; i < 7; i++) {
        expect([at(ox + i, oy), at(ox + i, oy + 6), at(ox, oy + i), at(ox + 6, oy + i)]).toEqual([true, true, true, true]);
      }
      expect(at(ox + 3, oy + 3)).toBe(true);
      expect(at(ox + 1, oy + 1)).toBe(false);
      expect(at(ox + 5, oy + 5)).toBe(false);
    }
    for (let i = 8; i < size - 8; i++) {
      expect(at(6, i)).toBe(i % 2 === 0);
      expect(at(i, 6)).toBe(i % 2 === 0);
    }
    expect(at(8, size - 8)).toBe(true); // always-dark module
    const align = alignmentPositions(sym.version);
    expect(align[0]).toBe(6);
    expect(align.at(-1)).toBe(size - 7);
    const centre = align[1]!;
    expect(at(centre, centre)).toBe(true);
    expect(at(centre + 1, centre)).toBe(false);
    expect(at(centre + 2, centre + 2)).toBe(true);
    expect(sym.isFunction[6 * size + 6]).toBe(1);
    expect(sym.isFunction[(size - 1) * size + (size - 1)]).toBe(0);
    expect(sym.get(-1, 0)).toBe(false);
  });

  it('AC-31: alignment pattern positions match the standard table', () => {
    expect(alignmentPositions(1)).toEqual([]);
    expect(alignmentPositions(2)).toEqual([6, 18]);
    expect(alignmentPositions(7)).toEqual([6, 22, 38]);
    expect(alignmentPositions(14)).toEqual([6, 26, 46, 66]);
    expect(alignmentPositions(32)).toEqual([6, 34, 60, 86, 112, 138]);
    expect(alignmentPositions(40)).toEqual([6, 30, 58, 86, 114, 142, 170]);
  });

  it('AC-32: golden matrix "01234567" at M (verified against jsQR, ZXing and an independent encoder)', () => {
    const sym = encodeQr('01234567', { ecc: 'M' });
    expect(sym.version).toBe(1);
    expect(sym.mask).toBe(0);
    expect(rows(sym.modules, sym.size)).toEqual([
      '#######...###.#######',
      '#.....#.###...#.....#',
      '#.###.#..##...#.###.#',
      '#.###.#..#.##.#.###.#',
      '#.###.#.##.##.#.###.#',
      '#.....#....#..#.....#',
      '#######.#.#.#.#######',
      '.....................',
      '#.#.#.#...#.#...#..#.',
      '##.#....#.##.#.#...#.',
      '...##.###.##.###.###.',
      '##..##.#.#.###.##..#.',
      '..#..###.###.###....#',
      '........#.#...#....#.',
      '#######.....#...#...#',
      '#.....#...#...#..#.##',
      '#.###.#.###.#.#.###.#',
      '#.###.#..#.#.#.#.###.',
      '#.###.#.##.#.###..#.#',
      '#.....#....###.###...',
      '#######.#..#.###..#.#',
    ]);
  });

  it('AC-32: golden matrix "HELLO WORLD" at Q', () => {
    const sym = encodeQr('HELLO WORLD', { ecc: 'Q' });
    expect(sym.mask).toBe(6);
    expect(rows(sym.modules, sym.size)).toEqual([
      '#######....#..#######',
      '#.....#.##..#.#.....#',
      '#.###.#..#.##.#.###.#',
      '#.###.#.#####.#.###.#',
      '#.###.#.##.#..#.###.#',
      '#.....#..#..#.#.....#',
      '#######.#.#.#.#######',
      '........##.##........',
      '.#.####.##..###.##.#.',
      '#.####.#....####.###.',
      '..#.#.##...#..##.....',
      '#.##.#...#.##...##...',
      '##.########.###.#####',
      '........#...#..#.#...',
      '#######..##..##..####',
      '#.....#.#.#..#..#.###',
      '#.###.#.##.#..#...###',
      '#.###.#.#.###...#.#..',
      '#.###.#..#....#....##',
      '#.....#.###..###..##.',
      '#######..#.#.......#.',
    ]);
  });
});
