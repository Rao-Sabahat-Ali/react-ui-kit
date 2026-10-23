import type { CSSProperties, MouseEvent, ReactNode, Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Size } from '../../types';
import { Button, type ButtonAppearance, type ButtonVariant } from '../Button/Button';
import type { IconName } from '../Icon/Icon';
import { Menu } from '../Menu/Menu';
import type { MenuItem, NavigateHandler } from '../Menu/types';

export interface SplitButtonProps {
  /** Main action label. */
  label: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  items: MenuItem[];
  /** Toggle's accessible name (locale "More actions"). */
  menuLabel?: string;
  variant?: Exclude<ButtonVariant, 'link'>;
  appearance?: ButtonAppearance;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  onNavigate?: NavigateHandler;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  id?: string;
  className?: string;
  style?: CSSProperties;
  /** Ref to the main action button. */
  ref?: Ref<HTMLButtonElement>;
}

function toggleClasses(variant: string, appearance: ButtonAppearance) {
  if (appearance === 'outline') return `btn-outline-${variant}`;
  if (appearance === 'text') return `ui-button--text ui-button--text-${variant}`;
  return `btn-${variant}`;
}

/** Default action + menu of alternatives (APG Menu Button for the toggle). */
export function SplitButton({
  label,
  onClick,
  items,
  menuLabel,
  variant = 'primary',
  appearance = 'solid',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  onNavigate,
  open,
  defaultOpen,
  onOpenChange,
  id,
  className,
  style,
  ref,
}: SplitButtonProps) {
  const { t } = useLocale();
  const inactive = disabled || loading;
  return (
    <div role="group" id={id} className={cx('btn-group ui-split-button', className)} style={style}>
      <Button ref={ref} variant={variant} appearance={appearance} size={size} icon={icon} loading={loading} disabled={inactive} onClick={onClick} className="ui-split-button__main">
        {label}
      </Button>
      <Menu
        popup
        items={items}
        placement="bottom-end"
        onNavigate={onNavigate}
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        trigger={
          <button
            type="button"
            aria-label={menuLabel ?? t('moreActions')}
            disabled={inactive}
            className={cx('btn dropdown-toggle dropdown-toggle-split ui-button ui-split-button__toggle', toggleClasses(variant, appearance), size === 'sm' && 'btn-sm', size === 'lg' && 'btn-lg')}
          />
        }
      />
    </div>
  );
}
