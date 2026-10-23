import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cx } from '../../utils/cx';
import { Icon, type IconName } from '../Icon/Icon';

interface IconFieldBase extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  icon: IconName | ReactNode;
  iconPosition?: 'start' | 'end';
  /** The input control; it receives padding to clear the icon. */
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export type IconFieldProps = IconFieldBase &
  ({ onIconClick?: undefined; iconLabel?: string } | { onIconClick: () => void; /** Accessible name of the icon button. */ iconLabel: string });

export function IconField({ icon, iconPosition = 'start', onIconClick, iconLabel, className, children, ref, ...rest }: IconFieldProps) {
  const glyph = typeof icon === 'string' ? <Icon name={icon} /> : icon;
  return (
    <div ref={ref} className={cx('position-relative ui-icon-field', `ui-icon-field--${iconPosition}`, className)} {...rest}>
      {children}
      {onIconClick ? (
        <button type="button" className={cx('ui-icon-field__icon', 'ui-icon-field__icon--button')} aria-label={iconLabel} onClick={onIconClick}>
          {glyph}
        </button>
      ) : (
        <span className="ui-icon-field__icon" aria-hidden="true">
          {glyph}
        </span>
      )}
    </div>
  );
}
