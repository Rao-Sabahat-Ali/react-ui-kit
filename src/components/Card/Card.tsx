import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { cx } from '../../utils/cx';
import { safeUrl } from '../../utils/url';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  titleAs?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  subtitle?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  media?: ReactNode;
  actions?: ReactNode;
  variant?: 'default' | 'outline' | 'elevated' | 'subtle';
  interactive?: boolean;
  href?: string;
  as?: 'div' | 'article' | 'section';
}

export function Card({ title, titleAs: TitleTag = 'h3', subtitle, header, footer, media, actions, variant = 'default', interactive = false, href, as = 'div', className, children, ...rest }: CardProps) {
  const Root = as as ElementType;
  const link = safeUrl(href);
  const titleNode = title !== undefined && (
    <TitleTag className="card-title ui-card__title">
      {link ? (
        <a href={link} className="stretched-link ui-card__link">
          {title}
        </a>
      ) : (
        title
      )}
    </TitleTag>
  );
  const hasHeading = titleNode || subtitle || actions;

  return (
    <Root className={cx('card ui-card', `ui-card--${variant}`, (interactive || link) && 'ui-card--interactive', className)} {...rest}>
      {media && <div className="card-img-top ui-card__media">{media}</div>}
      {header && <div className="card-header ui-card__header">{header}</div>}
      <div className="card-body ui-card__body">
        {hasHeading && (
          <div className="ui-card__heading">
            <div className="ui-card__titles">
              {titleNode}
              {subtitle && <p className="card-subtitle text-body-secondary ui-card__subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="ui-card__actions">{actions}</div>}
          </div>
        )}
        {children}
      </div>
      {footer && <div className="card-footer ui-card__footer">{footer}</div>}
    </Root>
  );
}
