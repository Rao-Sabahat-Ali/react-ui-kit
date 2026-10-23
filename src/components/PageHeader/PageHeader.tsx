import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { routerLinkHandler } from '../../utils/navigation';
import { safeUrl } from '../../utils/url';
import { Icon } from '../Icon/Icon';

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  actions?: ReactNode;
  meta?: ReactNode;
  tabs?: ReactNode;
  back?: { href: string; label: string };
  onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
}

export function PageHeader({ title, description, breadcrumb, actions, meta, tabs, back, onNavigate, className, ...rest }: PageHeaderProps) {
  const { t } = useLocale();
  return (
    <header className={cx('ui-page-header', className)} {...rest}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label={t('breadcrumb')}>
          <ol className="breadcrumb ui-page-header__breadcrumb">
            {breadcrumb.map((crumb, i) => {
              const last = i === breadcrumb.length - 1;
              const href = safeUrl(crumb.href);
              return (
                <li key={`${crumb.label}-${i}`} className={cx('breadcrumb-item', last && 'active')} aria-current={last ? 'page' : undefined}>
                  {href && !last ? (
                    <a href={href} onClick={routerLinkHandler(href, onNavigate)}>
                      {crumb.label}
                    </a>
                  ) : (
                    crumb.label
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      {back && (
        <a href={safeUrl(back.href) ?? '#'} className="ui-page-header__back" onClick={routerLinkHandler(back.href, onNavigate)}>
          <Icon name="arrow-left" size="sm" />
          {back.label}
        </a>
      )}
      <div className="ui-page-header__row">
        <div className="ui-page-header__titles">
          <h1 className="ui-page-header__title">{title}</h1>
          {meta && <div className="ui-page-header__meta">{meta}</div>}
          {description && <p className="ui-page-header__description">{description}</p>}
        </div>
        {actions && <div className="ui-page-header__actions">{actions}</div>}
      </div>
      {tabs && <div className="ui-page-header__tabs">{tabs}</div>}
    </header>
  );
}
