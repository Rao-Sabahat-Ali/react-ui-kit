import { Fragment, useSyncExternalStore, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import type { MessageKey } from '../../locale/en';
import { cx } from '../../utils/cx';

export type KbdPlatform = 'auto' | 'apple' | 'other';

export interface KbdProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  keys?: string | string[];
  /** A single literal key, used when `keys` is omitted. */
  children?: ReactNode;
  platform?: KbdPlatform;
  symbols?: boolean;
  separator?: ReactNode;
  size?: 'sm' | 'md';
  ref?: Ref<HTMLElement>;
}

type Names = Record<'keyCtrl' | 'keyShift' | 'keyAlt' | 'keyCommand' | 'keyOption' | 'keyEnter' | 'keyEscape', string>;
const DEFAULT_NAMES: Names = {
  keyCtrl: 'Ctrl',
  keyShift: 'Shift',
  keyAlt: 'Alt',
  keyCommand: 'Command',
  keyOption: 'Option',
  keyEnter: 'Enter',
  keyEscape: 'Esc',
};

const ARROWS: Record<string, { symbol: string; name: string }> = {
  arrowup: { symbol: '↑', name: 'Up arrow' },
  arrowdown: { symbol: '↓', name: 'Down arrow' },
  arrowleft: { symbol: '←', name: 'Left arrow' },
  arrowright: { symbol: '→', name: 'Right arrow' },
};

export function detectApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || nav.platform || '';
  return /Mac|iPhone|iPad/.test(platform);
}

const subscribe = () => () => {};

/** Resolve `auto` to `apple`/`other`. Renders `other` on the server and corrects on hydration. */
export function useIsApple(platform: KbdPlatform): boolean {
  const detected = useSyncExternalStore(subscribe, detectApplePlatform, () => false);
  return platform === 'auto' ? detected : platform === 'apple';
}

interface ResolvedKey {
  text: string;
  /** Spelled-out name for symbol keys. */
  label?: string;
}

function resolveKey(key: string, apple: boolean, symbols: boolean, names: Names): ResolvedKey {
  const lower = key.toLowerCase();
  const sym = (symbol: string, name: string): ResolvedKey => (symbols ? { text: symbol, label: name } : { text: name });
  switch (lower) {
    case 'mod':
    case 'cmd':
    case 'command':
    case 'meta':
      return apple ? sym('⌘', names.keyCommand) : { text: names.keyCtrl };
    case 'ctrl':
    case 'control':
      return apple ? sym('⌃', names.keyCtrl) : { text: names.keyCtrl };
    case 'alt':
    case 'option':
      return apple ? sym('⌥', names.keyOption) : { text: names.keyAlt };
    case 'shift':
      return sym('⇧', names.keyShift);
    case 'enter':
    case 'return':
      return sym('↵', names.keyEnter);
    case 'backspace':
      return sym('⌫', 'Backspace');
    case 'escape':
    case 'esc':
      return { text: names.keyEscape };
    default: {
      const arrow = ARROWS[lower];
      if (arrow) return { text: arrow.symbol, label: arrow.name };
      return { text: key.length === 1 ? key.toUpperCase() : key };
    }
  }
}

const ARIA_NAMES: Record<string, string> = { mod: 'Meta', cmd: 'Meta', command: 'Meta', meta: 'Meta', ctrl: 'Control', control: 'Control', alt: 'Alt', option: 'Alt', shift: 'Shift', enter: 'Enter', return: 'Enter', backspace: 'Backspace', escape: 'Escape', esc: 'Escape' };

/** Label for display and `aria-keyshortcuts` value for a key combo (English names). */
export function formatShortcut(keys: string[], platform: KbdPlatform = 'auto'): { label: string; ariaKeyShortcuts: string } {
  const apple = platform === 'auto' ? detectApplePlatform() : platform === 'apple';
  const label = keys.map((k) => resolveKey(k, apple, apple, DEFAULT_NAMES).text).join(apple ? '' : '+');
  const aria = keys
    .map((k) => {
      const lower = k.toLowerCase();
      if (!apple && lower === 'mod') return 'Control';
      if (ARROWS[lower]) return k.charAt(0).toUpperCase() + k.slice(1);
      return ARIA_NAMES[lower] ?? (k.length === 1 ? k.toUpperCase() : k);
    })
    .join('+');
  return { label, ariaKeyShortcuts: aria };
}

export function Kbd({ keys, children, platform = 'auto', symbols, separator, size = 'md', className, ref, ...rest }: KbdProps) {
  const { t } = useLocale();
  const apple = useIsApple(platform);
  const useSymbols = symbols ?? apple;
  const names: Names = {
    keyCtrl: t('keyCtrl' satisfies MessageKey),
    keyShift: t('keyShift'),
    keyAlt: t('keyAlt'),
    keyCommand: t('keyCommand'),
    keyOption: t('keyOption'),
    keyEnter: t('keyEnter'),
    keyEscape: t('keyEscape'),
  };
  const list = keys === undefined ? [] : Array.isArray(keys) ? keys : [keys];
  const sep: ReactNode = separator !== undefined ? separator : apple && useSymbols ? null : '+';

  const rendered =
    keys === undefined
      ? [<kbd key="child" className="ui-kbd__key">{children}</kbd>]
      : list.map((k, i) => {
          const r = resolveKey(k, apple, useSymbols, names);
          return (
            <Fragment key={`${k}-${i}`}>
              {i > 0 && sep !== null && sep !== false && (
                <span className="ui-kbd__separator" aria-hidden="true">
                  {sep}
                </span>
              )}
              <kbd className="ui-kbd__key" aria-label={r.label}>
                {r.text}
              </kbd>
            </Fragment>
          );
        });

  return (
    <kbd ref={ref} className={cx('ui-kbd', size === 'sm' && 'ui-kbd--sm', className)} {...rest}>
      {rendered}
    </kbd>
  );
}
