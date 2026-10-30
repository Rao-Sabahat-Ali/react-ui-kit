import { useRef, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { useAssemble } from '../../motion/useAssemble';
import { cx } from '../../utils/cx';
import { Icon, type IconName } from '../Icon/Icon';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: IconName;
  /** Replaces the icon (e.g. a `Scene3D variant="empty-state"` or an `Image`). The empty state sizes the slot and clips overflow; the media brings its own text alternative. */
  media?: ReactNode;
  title: ReactNode;
  /** Use `'h1'` when the empty state is the whole page. */
  titleAs?: 'h1' | 'h2' | 'h3' | 'h4';
  description?: ReactNode;
  action?: ReactNode;
  variant?: 'empty' | 'no-results' | 'error' | 'first-run';
  size?: 'sm' | 'md';
  /** Announce the error variant to assistive tech. */
  live?: boolean;
  /** Assemble the parts in when the state appears (motion v2). Default true; off under reduced motion automatically. */
  assemble?: boolean;
  ref?: Ref<HTMLDivElement>;
}

const DEFAULT_ICON: Record<NonNullable<EmptyStateProps['variant']>, IconName> = {
  empty: 'info',
  'no-results': 'search',
  error: 'alert-circle',
  'first-run': 'star',
};

export function EmptyState({ icon, media, title, titleAs: Title = 'h3', description, action, variant = 'empty', size = 'md', live = false, assemble = true, className, ref, ...rest }: EmptyStateProps) {
  const own = useRef<HTMLDivElement | null>(null);
  useAssemble(own, { enabled: assemble });
  return (
    <div
      ref={(node) => {
        own.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      role={variant === 'error' && live ? 'alert' : undefined}
      className={cx('ui-empty-state text-center', `ui-empty-state--${variant}`, `ui-empty-state--${size}`, className)}
      {...rest}
    >
      {media ? (
        <div className="ui-empty-state__media" data-assemble>
          {media}
        </div>
      ) : (
        <span className="ui-empty-state__icon" data-assemble>
          <Icon name={icon ?? DEFAULT_ICON[variant]} />
        </span>
      )}
      <Title className="ui-empty-state__title" data-assemble>
        {title}
      </Title>
      {description && (
        <p className="ui-empty-state__description" data-assemble>
          {description}
        </p>
      )}
      {action && (
        <div className="ui-empty-state__action" data-assemble>
          {action}
        </div>
      )}
    </div>
  );
}
