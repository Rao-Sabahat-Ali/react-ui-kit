import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEvent, ReactNode, Ref } from 'react';
import { cx } from '../../utils/cx';
import type { Intent, Size } from '../../types';
import { Icon, type IconName } from '../Icon/Icon';
import { Spinner } from '../Spinner/Spinner';

export type ButtonVariant = Intent | 'light' | 'dark' | 'link';
export type ButtonAppearance = 'solid' | 'outline' | 'text';

interface CommonProps {
  variant?: ButtonVariant;
  appearance?: ButtonAppearance;
  size?: Size;
  icon?: IconName | ReactNode;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
  loadingText?: string;
  block?: boolean;
  rounded?: boolean;
  badge?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Icon-only buttons must have an accessible name (enforced by type). */
type LabelProps = { children: ReactNode; 'aria-label'?: string } | { children?: undefined; 'aria-label': string };

type NativeButton = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'disabled'> & {
  as?: 'button';
  ref?: Ref<HTMLButtonElement>;
};
type NativeAnchor = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'aria-label'> & {
  as: 'a';
  href: string;
  ref?: Ref<HTMLAnchorElement>;
};

export type ButtonProps = CommonProps & LabelProps & (NativeButton | NativeAnchor);

function variantClass(variant: ButtonVariant, appearance: ButtonAppearance): string {
  if (variant === 'link') return 'btn-link';
  if (appearance === 'outline') return `btn-outline-${variant}`;
  if (appearance === 'text') return `ui-button--text ui-button--text-${variant}`;
  return `btn-${variant}`;
}

export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    appearance = 'solid',
    size = 'md',
    icon,
    iconPosition = 'start',
    loading = false,
    loadingText,
    block = false,
    rounded = false,
    badge,
    disabled = false,
    className,
    children,
    ...rest
  } = props;

  const iconOnly = children === undefined || children === null;
  const classes = cx(
    'btn',
    'ui-button',
    variantClass(variant, appearance),
    size === 'sm' && 'btn-sm',
    size === 'lg' && 'btn-lg',
    block && 'w-100',
    rounded && 'rounded-pill',
    iconOnly && 'ui-button--icon-only',
    loading && 'ui-button--loading',
    className,
  );

  const iconNode = icon === undefined ? null : typeof icon === 'string' ? <Icon name={icon} className="ui-button__icon" /> : <span className="ui-button__icon" aria-hidden="true">{icon}</span>;
  const label = loading && loadingText ? loadingText : children;
  const content = (
    <>
      {loading ? <Spinner decorative size="sm" className="ui-button__spinner" /> : iconPosition === 'start' && iconNode}
      {!iconOnly && <span className="ui-button__label">{label}</span>}
      {!loading && iconPosition === 'end' && iconNode}
      {badge !== undefined && <span className="badge ui-badge text-bg-light ui-button__badge">{badge}</span>}
    </>
  );

  if (rest.as === 'a') {
    const { as: _as, href, onClick, ref, ...anchorRest } = rest;
    const inactive = disabled || loading;
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      if (inactive) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    };
    return (
      <a
        ref={ref}
        className={cx(classes, disabled && 'disabled')}
        href={disabled ? undefined : href}
        aria-disabled={disabled || undefined}
        aria-busy={loading || undefined}
        tabIndex={disabled ? -1 : anchorRest.tabIndex}
        onClick={handleClick}
        {...anchorRest}
      >
        {content}
      </a>
    );
  }

  const { as: _as, type = 'button', onClick, ref, ...buttonRest } = rest as NativeButton;
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // Loading buttons stay focusable (no `disabled`) but ignore activation.
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };
  return (
    <button ref={ref} type={type} className={classes} disabled={disabled} aria-busy={loading || undefined} onClick={handleClick} {...buttonRest}>
      {content}
    </button>
  );
}
