/** Preset single-character patterns for key filtering. */
export const KEY_FILTER_PRESETS = {
  /** Integers, including a minus sign. */
  int: /[\d-]/,
  /** Positive integers. */
  pint: /\d/,
  /** Numbers with decimal point and minus sign. */
  num: /[\d\-.]/,
  /** Positive numbers with decimal point. */
  pnum: /[\d.]/,
  money: /[\d\-.,]/,
  hex: /[0-9a-f]/i,
  alpha: /[a-z_]/i,
  alphanum: /[a-z0-9_]/i,
  email: /[a-z0-9_.\-@]/i,
} as const;

export type KeyFilterPreset = keyof typeof KEY_FILTER_PRESETS;
export type KeyFilterPattern = KeyFilterPreset | RegExp;
