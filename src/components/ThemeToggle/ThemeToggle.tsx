import { useLocale } from '../../locale/LocaleProvider';
import { useTheme } from '../../theme/ThemeProvider';
import { Button, type ButtonAppearance } from '../Button/Button';
import type { Size } from '../../types';

export interface ThemeToggleProps {
  size?: Size;
  appearance?: ButtonAppearance;
  className?: string;
}

/** Light/dark toggle button bound to ThemeProvider. Menu mode (with "system") arrives with Menu. */
export function ThemeToggle({ size = 'md', appearance = 'text', className }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { t } = useLocale();
  const dark = resolvedTheme === 'dark';
  return (
    <Button
      variant="secondary"
      appearance={appearance}
      size={size}
      icon={dark ? 'moon' : 'sun'}
      aria-label={t('darkMode')}
      aria-pressed={dark}
      onClick={toggleTheme}
      className={className}
    />
  );
}
