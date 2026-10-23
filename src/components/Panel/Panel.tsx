import { useId, type ElementType, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { Icon } from '../Icon/Icon';

export interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onToggle'> {
  header?: ReactNode;
  /** Header actions rendered at the end of the header. */
  icons?: ReactNode;
  toggleable?: boolean;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  footer?: ReactNode;
  headerAs?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  ref?: Ref<HTMLDivElement>;
}

export function Panel({ header, icons, toggleable = false, collapsed, defaultCollapsed = false, onToggle, footer, headerAs = 'h3', className, children, ref, ...rest }: PanelProps) {
  const { t } = useLocale();
  const uid = useId();
  const bodyId = `${uid}-body`;
  const [isCollapsed, setCollapsed] = useControllableState(collapsed, defaultCollapsed, onToggle);
  const collapsedNow = toggleable && isCollapsed;
  const Heading = headerAs as ElementType;
  const hasHeader = header !== undefined || icons !== undefined || toggleable;

  return (
    <div ref={ref} className={cx('card ui-panel', collapsedNow && 'ui-panel--collapsed', className)} {...rest}>
      {hasHeader && (
        <div className="card-header ui-panel__header">
          <Heading className="ui-panel__title">{header}</Heading>
          <div className="ui-panel__actions">
            {icons}
            {toggleable && (
              <button type="button" className="btn btn-sm ui-panel__toggle" aria-expanded={!collapsedNow} aria-controls={bodyId} aria-label={collapsedNow ? t('expand') : t('collapse')} onClick={() => setCollapsed(!isCollapsed)}>
                <Icon name={collapsedNow ? 'chevron-down' : 'chevron-up'} />
              </button>
            )}
          </div>
        </div>
      )}
      <div id={bodyId} className="card-body ui-panel__body" hidden={collapsedNow}>
        {children}
      </div>
      {footer && !collapsedNow && <div className="card-footer ui-panel__footer">{footer}</div>}
    </div>
  );
}
