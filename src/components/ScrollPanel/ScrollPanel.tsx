import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type Ref } from 'react';
import { cx } from '../../utils/cx';
import { getFocusable } from '../../utils/dom';

export interface ScrollPanelProps extends HTMLAttributes<HTMLDivElement> {
  height?: number | string;
  /** Accessible name for the scrollable region (used when content has no focusable elements). */
  ariaLabel?: string;
  ref?: Ref<HTMLDivElement>;
}

export function ScrollPanel({ height, ariaLabel, className, style, children, ref, ...rest }: ScrollPanelProps) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [needsFocus, setNeedsFocus] = useState(true);

  // Keyboard users must be able to scroll: if nothing inside is focusable, the container becomes the tab stop.
  // Runs after every render on purpose (children can change); guarded against loops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const next = getFocusable(el).filter((n) => n !== el).length === 0;
    setNeedsFocus((prev) => (prev === next ? prev : next));
  });

  if (needsFocus && !ariaLabel && !rest['aria-labelledby'] && import.meta.env?.DEV) {
    console.warn('[react-ui-kit] ScrollPanel: provide `ariaLabel` so the keyboard-scrollable region has an accessible name.');
  }

  const named = needsFocus && (ariaLabel || rest['aria-labelledby']);
  return (
    <div
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      // Named, keyboard-scrollable region only when nothing inside can take focus.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={needsFocus ? 0 : undefined}
      role={needsFocus ? 'region' : undefined}
      aria-label={named ? ariaLabel : undefined}
      className={cx('ui-scroll-panel', className)}
      style={{ ...(height !== undefined ? ({ height } as CSSProperties) : {}), ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
