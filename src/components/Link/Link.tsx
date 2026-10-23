import { isValidElement, type AnchorHTMLAttributes, type ElementType, type MouseEvent, type ReactNode, type Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { safeUrl as baseSafeUrl } from '../../utils/url';
import type { Intent } from '../../types';
import { Icon, type IconName } from '../Icon/Icon';

/** Returns the URL when its scheme is http, https, mailto, tel, relative or hash; otherwise `'#'`. */
export function safeLinkUrl(url: string): string {
  return baseSafeUrl(url) ?? '#';
}

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'> {
  href: string;
  onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  external?: boolean;
  newTab?: boolean;
  showExternalIcon?: boolean;
  variant?: Intent | 'body';
  underline?: 'always' | 'hover' | 'none';
  icon?: IconName | ReactNode;
  current?: boolean | 'page' | 'step' | 'location';
  disabled?: boolean;
  labels?: Partial<{ opensInNewTab: string }>;
  as?: ElementType;
  children?: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
}

function isExternalHref(href: string): boolean {
  if (!/^(https?:)?\/\//i.test(href.trim())) return false;
  if (typeof window === 'undefined') return true;
  try {
    return new URL(href, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function mergeRel(rel: string | undefined): string {
  const tokens = new Set((rel ?? '').split(/\s+/).filter(Boolean));
  tokens.add('noopener');
  tokens.add('noreferrer');
  return Array.from(tokens).join(' ');
}

export function Link({
  href,
  onNavigate,
  external,
  newTab,
  showExternalIcon = true,
  variant = 'primary',
  underline = 'always',
  icon,
  current,
  disabled = false,
  labels,
  as: Root = 'a',
  className,
  children,
  rel,
  target,
  download,
  onClick,
  ref,
  ...rest
}: LinkProps) {
  const { t } = useLocale();
  const safe = safeLinkUrl(href);
  if (safe !== href.trim() && safe === '#' && import.meta.env?.DEV) {
    console.warn('[react-ui-kit] Link: unsafe href was replaced with "#".');
  }
  const isExternal = external ?? isExternalHref(safe);
  const opensNewTab = !disabled && (newTab ?? isExternal);
  const finalTarget = opensNewTab ? '_blank' : target;
  const finalRel = opensNewTab || finalTarget === '_blank' ? mergeRel(rel) : rel;
  const showIcon = opensNewTab && showExternalIcon;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
    const navigable = !isExternal && !opensNewTab && download === undefined;
    if (onNavigate && navigable && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && (!finalTarget || finalTarget === '_self')) {
      event.preventDefault();
      onNavigate(safe, event);
    }
  };

  const iconNode =
    icon === undefined || icon === null || icon === false ? null : typeof icon === 'string' ? <Icon name={icon} className="ui-link__icon" /> : isValidElement(icon) ? <span className="ui-link__icon">{icon}</span> : <span className="ui-link__icon">{icon}</span>;

  return (
    <Root
      ref={ref}
      href={disabled ? undefined : safe}
      target={finalTarget}
      rel={finalRel}
      download={download}
      aria-current={current ? (current === true ? 'page' : current) : undefined}
      aria-disabled={disabled ? 'true' : undefined}
      role={disabled ? 'link' : undefined}
      tabIndex={disabled ? -1 : undefined}
      className={cx(
        'ui-link',
        variant === 'body' ? 'ui-link--body' : `link-${variant}`,
        underline === 'none' && 'link-underline-opacity-0',
        underline === 'hover' && 'link-underline-opacity-0 link-underline-opacity-100-hover',
        icon !== undefined && icon !== null && icon !== false && 'icon-link',
        disabled && 'ui-link--disabled',
        className,
      )}
      onClick={handleClick}
      {...rest}
    >
      {iconNode}
      <span className="ui-link__label">{children}</span>
      {showIcon && <Icon name="external-link" size="sm" className="ui-link__external" />}
      {opensNewTab && ' '}
      {opensNewTab && <span className="ui-link__external-text visually-hidden">{labels?.opensInNewTab ?? t('opensInNewTab')}</span>}
    </Root>
  );
}
