import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { cx } from '../../utils/cx';

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  align?: 'start' | 'center' | 'end';
  type?: 'solid' | 'dashed' | 'dotted';
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function Divider({ orientation = 'horizontal', align = 'center', type = 'solid', className, children, ref, ...rest }: DividerProps) {
  const hasLabel = children !== undefined && children !== null && children !== false && children !== '';
  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      className={cx(
        'ui-divider',
        `ui-divider--${orientation}`,
        `ui-divider--${type}`,
        orientation === 'vertical' && 'vr',
        hasLabel && 'ui-divider--labelled',
        hasLabel && `ui-divider--${align}`,
        className,
      )}
      {...rest}
    >
      {hasLabel && <span className="ui-divider__label">{children}</span>}
    </div>
  );
}
