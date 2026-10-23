import type { ButtonHTMLAttributes, MouseEvent, ReactNode, Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { cx } from '../../utils/cx';
import { Button, type ButtonAppearance, type ButtonVariant } from '../Button/Button';
import type { Size } from '../../types';
import type { IconName } from '../Icon/Icon';

export interface ToggleButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'children' | 'aria-pressed'> {
  pressed?: boolean;
  defaultPressed?: boolean;
  onChange?: (pressed: boolean, event?: MouseEvent<HTMLButtonElement>) => void;
  /** Label shown while pressed. */
  onLabel?: ReactNode;
  /** Label shown while not pressed. */
  offLabel?: ReactNode;
  onIcon?: IconName;
  offIcon?: IconName;
  variant?: ButtonVariant;
  appearance?: ButtonAppearance;
  size?: Size;
  /** Icon-only toggles need an accessible name. */
  'aria-label'?: string;
  ref?: Ref<HTMLButtonElement>;
}

export function ToggleButton({
  pressed: pressedProp,
  defaultPressed = false,
  onChange,
  onLabel,
  offLabel,
  onIcon,
  offIcon,
  variant = 'secondary',
  appearance = 'outline',
  size = 'md',
  disabled,
  className,
  onClick,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: ToggleButtonProps) {
  const [pressed, setPressed] = useControllableState<boolean>(pressedProp, defaultPressed);
  const label = pressed ? onLabel ?? offLabel : offLabel ?? onLabel;
  const icon = pressed ? onIcon ?? offIcon : offIcon ?? onIcon;
  const swapsLabel = onLabel !== undefined && offLabel !== undefined && onLabel !== offLabel;
  // Keep the accessible name stable when the visible label swaps; aria-pressed carries the state.
  const stableName = ariaLabel ?? (swapsLabel && typeof offLabel === 'string' ? offLabel : undefined);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    setPressed(!pressed);
    onChange?.(!pressed, event);
  };

  const common = {
    ref,
    variant,
    appearance,
    size,
    disabled,
    icon,
    'aria-pressed': pressed,
    className: cx('ui-toggle-button', pressed && 'active ui-toggle-button--pressed', className),
    onClick: handleClick,
    ...rest,
  };

  if (label === undefined || label === null) {
    return <Button {...common} aria-label={stableName ?? ''} />;
  }
  return (
    <Button {...common} aria-label={stableName}>
      {label}
    </Button>
  );
}
