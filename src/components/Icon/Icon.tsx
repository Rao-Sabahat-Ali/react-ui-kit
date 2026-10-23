import type { SVGProps } from 'react';
import { cx } from '../../utils/cx';
import { builtInIcons, type BuiltInIconName, type IconDefinition } from './icons';

// `string & {}` keeps autocomplete for built-in names while allowing registered ones.
export type IconName = BuiltInIconName | (string & {});

const registry = new Map<string, IconDefinition>(Object.entries(builtInIcons));
const warned = new Set<string>();

/** Add or replace icons. Value is path data (stroked) or a full definition. */
export function registerIcons(icons: Record<string, string | IconDefinition>): void {
  for (const [name, def] of Object.entries(icons)) registry.set(name, typeof def === 'string' ? { d: def } : def);
}

export function hasIcon(name: string): boolean {
  return registry.has(name);
}

const SIZES = { sm: 16, md: 20, lg: 24 } as const;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'ref'> {
  name: IconName;
  size?: keyof typeof SIZES | number;
  /** Accessible label; omit for decorative icons. */
  label?: string;
  directional?: boolean;
}

export function Icon({ name, size, label, directional, className, ...rest }: IconProps) {
  const def = registry.get(name);
  if (!def) {
    if (import.meta.env?.DEV && !warned.has(name)) {
      warned.add(name);
      console.warn(`[react-ui-kit] Unknown icon "${name}". Register it with registerIcons().`);
    }
    return null;
  }
  const dimension = size === undefined ? '1em' : typeof size === 'number' ? size : SIZES[size];
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={dimension}
      height={dimension}
      fill={def.fill ? 'currentColor' : 'none'}
      stroke={def.fill ? 'none' : 'currentColor'}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      className={cx('ui-icon', (directional ?? def.directional) && 'ui-icon--directional', className)}
      {...a11y}
      {...rest}
    >
      <path d={def.d} />
    </svg>
  );
}
