import { useRef, type HTMLAttributes, type RefObject } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export interface FocusTrapProps extends HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  restoreFocus?: boolean;
}

export function FocusTrap({ active = true, initialFocus, restoreFocus = true, children, ...rest }: FocusTrapProps) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, { active, initialFocus, restoreFocus });
  return (
    <div ref={ref} {...rest}>
      {children}
    </div>
  );
}
