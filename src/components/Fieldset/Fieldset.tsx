import { useId, type FieldsetHTMLAttributes, type ReactNode, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { usePresence } from '../../motion/usePresence';
import { cx } from '../../utils/cx';
import { Icon } from '../Icon/Icon';

export interface FieldsetProps extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, 'onToggle'> {
  legend: ReactNode;
  toggleable?: boolean;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  variant?: 'plain' | 'bordered';
  ref?: Ref<HTMLFieldSetElement>;
}

export function Fieldset({ legend, toggleable = false, collapsed, defaultCollapsed = false, onToggle, variant = 'bordered', className, children, ref, ...rest }: FieldsetProps) {
  const { t } = useLocale();
  const contentId = useId();
  const [isCollapsed, setCollapsed] = useControllableState(collapsed, defaultCollapsed, onToggle);
  const collapsedNow = toggleable && isCollapsed;
  const { present, state, exiting } = usePresence(!collapsedNow);

  return (
    <fieldset ref={ref} className={cx('ui-fieldset', `ui-fieldset--${variant}`, toggleable && 'ui-fieldset--toggleable', collapsedNow && 'ui-fieldset--collapsed', className)} {...rest}>
      <legend className="ui-fieldset__legend">
        {toggleable ? (
          <button type="button" className="ui-fieldset__toggle" aria-expanded={!collapsedNow} aria-controls={contentId} onClick={() => setCollapsed(!isCollapsed)} title={collapsedNow ? t('expand') : t('collapse')}>
            <Icon name="chevron-down" className="ui-fieldset__chevron" />
            <span className="ui-fieldset__legend-text">{legend}</span>
          </button>
        ) : (
          legend
        )}
      </legend>
      <div id={contentId} className="ui-fieldset__content" hidden={!present} inert={exiting} data-state={state}>
        {children}
      </div>
    </fieldset>
  );
}
