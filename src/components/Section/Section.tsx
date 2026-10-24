import { useId, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { cx } from '../../utils/cx';

export interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  titleAs?: 'h2' | 'h3' | 'h4';
  description?: ReactNode;
  actions?: ReactNode;
  /** Draw a hairline above the section (between settings groups). */
  separated?: boolean;
  ref?: Ref<HTMLElement>;
}

/** A titled part of a page: heading, optional description and actions, then content. */
export function Section({ title, titleAs: Title = 'h2', description, actions, separated = false, className, children, ref, ...rest }: SectionProps) {
  const headingId = useId();
  const hasHeaderExtras = description !== undefined || actions !== undefined;
  return (
    <section ref={ref} aria-labelledby={headingId} className={cx('ui-section', separated && 'ui-section--separated', className)} {...rest}>
      <header className="ui-section__header">
        <div className="ui-section__heading">
          <Title id={headingId} className="ui-section__title">
            {title}
          </Title>
          {description !== undefined && <p className="ui-section__description">{description}</p>}
        </div>
        {actions !== undefined && <div className="ui-section__actions">{actions}</div>}
      </header>
      {hasHeaderExtras || children ? <div className="ui-section__body">{children}</div> : null}
    </section>
  );
}
