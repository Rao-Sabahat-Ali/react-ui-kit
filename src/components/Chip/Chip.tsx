import type { HTMLAttributes, KeyboardEvent, MouseEvent, Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { Icon, type IconName } from '../Icon/Icon';

export interface ChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'onClick' | 'onChange'> {
  label: string;
  image?: string;
  icon?: IconName;
  removable?: boolean;
  onRemove?: () => void;
  /** Controlled pressed state for filter chips. */
  selected?: boolean;
  defaultSelected?: boolean;
  onChange?: (selected: boolean) => void;
  /** Makes the chip a toggle button (`aria-pressed`). */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  ref?: Ref<HTMLSpanElement>;
}

export function Chip({ label, image, icon, removable = false, onRemove, selected, defaultSelected = false, onChange, onClick, disabled = false, className, ref, ...rest }: ChipProps) {
  const { t } = useLocale();
  const [isSelected, setSelected] = useControllableState(selected, defaultSelected, onChange);
  const interactive = Boolean(onClick) || selected !== undefined || onChange !== undefined;

  const lead = image ? <img className="ui-chip__image" src={image} alt="" /> : icon ? <Icon name={icon} className="ui-chip__icon" /> : null;
  const content = (
    <>
      {lead}
      <span className="ui-chip__label">{label}</span>
    </>
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (removable && !disabled && (event.key === 'Backspace' || event.key === 'Delete')) {
      event.preventDefault();
      onRemove?.();
    }
  };

  return (
    <span ref={ref} className={cx('ui-chip', interactive && 'ui-chip--interactive', isSelected && 'ui-chip--selected', disabled && 'ui-chip--disabled', removable && 'ui-chip--removable', className)} {...rest}>
      {interactive ? (
        <button
          type="button"
          className="ui-chip__main"
          aria-pressed={isSelected}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          onClick={(event) => {
            onClick?.(event);
            setSelected(!isSelected);
          }}
        >
          {content}
        </button>
      ) : (
        <span className="ui-chip__main">{content}</span>
      )}
      {removable && (
        <button type="button" className="ui-chip__remove" aria-label={t('removeChip', { label })} disabled={disabled} onClick={() => onRemove?.()}>
          <Icon name="x" size="sm" />
        </button>
      )}
    </span>
  );
}
