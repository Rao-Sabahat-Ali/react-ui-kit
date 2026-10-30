import { useMemo } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { useTheme } from '../../theme/ThemeProvider';
import type { ThemeSetting } from '../../theme/profiles.generated';
import { Button, type ButtonAppearance } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import { Menu } from '../Menu/Menu';
import type { MenuItem } from '../Menu/types';
import type { Size } from '../../types';

/** TODO: move to locale keys `theme`, `themeLight`, `themeDark`, `themeSystem` (not yet in en.ts). */

export interface ThemeToggleProps {
  /** `toggle`: light/dark button (`aria-pressed`). `menu`: menu button with light/dark/system radio items. */
  mode?: 'toggle' | 'menu';
  size?: Size;
  appearance?: ButtonAppearance;
  className?: string;
}

/** The sun and the moon in one slot; the one that is not current turns away and fades (CSS, transform + opacity). */
function ThemeIcons({ dark }: { dark: boolean }) {
  return (
    <span className="ui-theme-toggle__icons">
      <Icon name="sun" className="ui-theme-toggle__icon" data-active={!dark} />
      <Icon name="moon" className="ui-theme-toggle__icon ui-theme-toggle__icon--moon" data-active={dark} />
    </span>
  );
}

/** Light/dark (or light/dark/system) control bound to ThemeProvider. */
export function ThemeToggle({ mode = 'toggle', size = 'md', appearance = 'text', className }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const { t } = useLocale();
  const LABELS = useMemo(() => ({ theme: t('theme'), light: t('themeLight'), dark: t('themeDark'), system: t('themeSystem') }), [t]);
  const dark = resolvedTheme === 'dark';

  const items = useMemo<MenuItem[]>(
    () =>
      (['light', 'dark', 'system'] as ThemeSetting[]).map((value) => ({
        key: value,
        label: LABELS[value as keyof typeof LABELS],
        icon: value === 'light' ? 'sun' : value === 'dark' ? 'moon' : 'settings',
        group: 'theme',
        checked: theme === value,
        command: () => setTheme(value),
      })),
    [theme, setTheme, LABELS],
  );

  if (mode === 'menu') {
    return (
      <Menu
        popup
        items={items}
        placement="bottom-end"
        trigger={<Button variant="secondary" appearance={appearance} size={size} icon={<ThemeIcons dark={dark} />} aria-label={LABELS.theme} className={className} />}
      />
    );
  }

  return (
    <Button
      variant="secondary"
      appearance={appearance}
      size={size}
      icon={<ThemeIcons dark={dark} />}
      aria-label={t('darkMode')}
      aria-pressed={dark}
      onClick={toggleTheme}
      className={className}
    />
  );
}
