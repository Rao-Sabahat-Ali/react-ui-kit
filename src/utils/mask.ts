/**
 * Input mask engine (InputMask spec): `9` digit, `a` letter, `*` alphanumeric, `?` makes the
 * rest optional, anything else is a literal.
 */
export interface MaskSlot {
  literal?: string;
  test?: RegExp;
  optional: boolean;
}

const TOKENS: Record<string, RegExp> = { '9': /\d/, a: /\p{L}/u, '*': /[\p{L}\d]/u };

export function compileMask(mask: string): MaskSlot[] {
  const slots: MaskSlot[] = [];
  let optional = false;
  for (const ch of mask) {
    if (ch === '?') {
      optional = true;
      continue;
    }
    slots.push(TOKENS[ch] ? { test: TOKENS[ch], optional } : { literal: ch, optional });
  }
  return slots;
}

/** Apply raw input characters to the mask. Returns the masked text (with slot chars) and the raw value. */
export function applyMask(input: string, slots: MaskSlot[], slotChar = '_'): { masked: string; raw: string; complete: boolean; filled: number } {
  const chars = [...input].filter((c) => slots.some((s) => s.test?.test(c)));
  let i = 0;
  let masked = '';
  let raw = '';
  let filled = 0;
  for (const slot of slots) {
    if (slot.literal !== undefined) {
      masked += slot.literal;
      continue;
    }
    while (i < chars.length && !slot.test!.test(chars[i]!)) i++;
    if (i < chars.length) {
      masked += chars[i];
      raw += chars[i];
      filled = masked.length;
      i++;
    } else {
      masked += slotChar;
    }
  }
  const required = slots.filter((s) => s.test && !s.optional).length;
  const requiredFilled = slots.filter((s) => s.test && !s.optional).slice(0, raw.length).length;
  return { masked, raw, complete: raw.length >= required && requiredFilled === required, filled };
}

/** Strip literals and slot chars from a masked string. */
export function unmask(masked: string, slots: MaskSlot[], slotChar = '_'): string {
  return [...masked].filter((c, i) => slots[i]?.test && c !== slotChar).join('');
}
