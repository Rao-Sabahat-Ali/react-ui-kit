/** Responsive value helper shared by Stack and Grid (Bootstrap breakpoints). */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type Responsive<T> = T | Partial<Record<Breakpoint, T>>;

export const BREAKPOINTS: readonly Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

export function isResponsiveObject<T>(value: Responsive<T>): value is Partial<Record<Breakpoint, T>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Normalise to `[breakpoint, value]` entries in ascending breakpoint order. */
export function responsiveEntries<T>(value: Responsive<T> | undefined): [Breakpoint, T][] {
  if (value === undefined) return [];
  if (!isResponsiveObject(value)) return [['xs', value as T]];
  const out: [Breakpoint, T][] = [];
  for (const bp of BREAKPOINTS) {
    const v = value[bp];
    if (v !== undefined) out.push([bp, v]);
  }
  return out;
}

/** `prefix-value` for xs, `prefix-bp-value` otherwise. */
export function bpClass(prefix: string, bp: Breakpoint, value: string | number | true): string {
  const infix = bp === 'xs' ? '' : `-${bp}`;
  return value === true ? `${prefix}${infix}` : `${prefix}${infix}-${value}`;
}
