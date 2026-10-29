import { useState, type HTMLAttributes, type ReactNode } from 'react';
import { usePresence } from '../../motion/usePresence';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import type { Severity } from '../../types';
import { Icon, type IconName } from '../Icon/Icon';

export interface MessageProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  severity?: Severity;
  title?: ReactNode;
  icon?: IconName | false;
  dismissible?: boolean;
  onDismiss?: () => void;
  actions?: ReactNode;
  live?: 'polite' | 'assertive' | 'off';
  inline?: boolean;
}

const DEFAULT_ICON: Record<Severity, IconName> = {
  info: 'info',
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'alert-circle',
  secondary: 'info',
};

const PREFIX_KEY = {
  info: 'severityInfo',
  success: 'severitySuccess',
  warning: 'severityWarning',
  danger: 'severityDanger',
  secondary: 'severitySecondary',
} as const;

export function Message({ severity = 'info', title, icon, dismissible = false, onDismiss, actions, live = 'off', inline = false, className, children, ...rest }: MessageProps) {
  const { t } = useLocale();
  const [dismissed, setDismissed] = useState(false);
  // Uncontrolled dismissal leaves with a short exit; a message its owner removes simply unmounts (Messages keeps a ghost).
  const { present, state } = usePresence(!dismissed);
  if (!present) return null;

  const role = live === 'assertive' ? 'alert' : live === 'polite' ? 'status' : undefined;
  const iconName = icon === false ? null : (icon ?? DEFAULT_ICON[severity]);
  const handleDismiss = () => {
    if (onDismiss) onDismiss();
    else setDismissed(true);
  };

  return (
    <div
      role={role}
      data-state={state}
      inert={state === 'closed' ? true : undefined}
      className={cx('alert', `alert-${severity}`, 'ui-message', `ui-message--${severity}`, inline && 'ui-message--inline', dismissible && 'alert-dismissible', className)}
      {...rest}
    >
      {iconName && <Icon name={iconName} className="ui-message__icon" size={inline ? 'sm' : 'md'} />}
      <div className="ui-message__content">
        <span className="visually-hidden">{t(PREFIX_KEY[severity])} </span>
        {title && <div className="alert-heading ui-message__title">{title}</div>}
        {children && <div className="ui-message__body">{children}</div>}
        {actions && <div className="ui-message__actions">{actions}</div>}
      </div>
      {dismissible && <button type="button" className="btn-close ui-message__close" aria-label={t('dismiss')} onClick={handleDismiss} />}
    </div>
  );
}
