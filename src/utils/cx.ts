export type ClassValue = string | false | null | undefined | 0;

/** Join truthy class names. Tiny replacement for the `clsx` package. */
export function cx(...values: ClassValue[]): string {
  let out = '';
  for (const value of values) {
    if (value) out = out ? `${out} ${value}` : value;
  }
  return out;
}
