import type { ReactNode } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import type { MessageKey } from '../../locale/en';
import { cx } from '../../utils/cx';
import { Button } from '../Button/Button';
import { EmptyState } from '../EmptyState/EmptyState';
import type { IconName } from '../Icon/Icon';

export type PaymentStatusValue = 'processing' | 'requires_action' | 'succeeded' | 'failed' | 'canceled';

export interface PaymentStatusProps {
  status: PaymentStatusValue;
  title?: ReactNode;
  description?: ReactNode;
  /** Order or payment id, shown with tabular numerals. */
  reference?: string;
  referenceLabel?: ReactNode;
  /** Failed and canceled: primary "Try again". */
  onRetry?: () => void;
  /** Failed and canceled: secondary "Use another method". */
  onUseAnotherMethod?: () => void;
  /** Requires action ("Confirm payment") and succeeded ("Continue"). */
  onContinue?: () => void;
  continueLabel?: ReactNode;
  /** Custom actions; replaces the built-in ones. */
  action?: ReactNode;
  titleAs?: 'h1' | 'h2' | 'h3' | 'h4';
  className?: string;
}

const COPY: Record<PaymentStatusValue, { title: MessageKey; description: MessageKey; icon: IconName }> = {
  processing: { title: 'paymentProcessingTitle', description: 'paymentProcessingDescription', icon: 'refresh' },
  requires_action: { title: 'paymentActionTitle', description: 'paymentActionDescription', icon: 'info' },
  succeeded: { title: 'paymentSucceededTitle', description: 'paymentSucceededDescription', icon: 'check-circle' },
  failed: { title: 'paymentFailedTitle', description: 'paymentFailedDescription', icon: 'alert-circle' },
  canceled: { title: 'paymentCanceledTitle', description: 'paymentCanceledDescription', icon: 'x' },
};

/**
 * Result of a payment attempt in the EmptyState layout. Display only: confirm `succeeded` on your server (webhook or a
 * retrieved payment), never from the client alone. Failed announces assertively, every other state politely.
 */
export function PaymentStatus({ status, title, description, reference, referenceLabel, onRetry, onUseAnotherMethod, onContinue, continueLabel, action, titleAs = 'h2', className }: PaymentStatusProps) {
  const { t } = useLocale();
  const copy = COPY[status];

  let actions: ReactNode = action;
  if (actions === undefined) {
    if (status === 'requires_action' && onContinue) {
      actions = <Button onClick={onContinue}>{continueLabel ?? t('paymentActionButton')}</Button>;
    } else if (status === 'succeeded' && onContinue) {
      actions = <Button onClick={onContinue}>{continueLabel ?? t('paymentContinue')}</Button>;
    } else if ((status === 'failed' || status === 'canceled') && (onRetry || onUseAnotherMethod)) {
      actions = (
        <div className="ui-payment-status__actions">
          {onRetry && <Button onClick={onRetry}>{t('paymentRetry')}</Button>}
          {onUseAnotherMethod && (
            <Button appearance="outline" variant="secondary" onClick={onUseAnotherMethod}>
              {t('paymentAnotherMethod')}
            </Button>
          )}
        </div>
      );
    }
  }

  return (
    <EmptyState
      className={cx('ui-payment-status', `ui-payment-status--${status.replace('_', '-')}`, className)}
      variant={status === 'failed' ? 'error' : 'empty'}
      live={status === 'failed'}
      role={status === 'failed' ? 'alert' : 'status'}
      aria-busy={status === 'processing' || undefined}
      icon={copy.icon}
      titleAs={titleAs}
      title={title ?? t(copy.title)}
      description={
        <>
          {description ?? t(copy.description)}
          {reference && (
            <span className="ui-payment-status__reference">
              {referenceLabel ?? t('paymentReference')} <span className="ui-payment-status__reference-value">{reference}</span>
            </span>
          )}
        </>
      }
      action={actions}
    />
  );
}
