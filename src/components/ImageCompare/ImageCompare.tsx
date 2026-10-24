import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { safeImageSrc, type ImageRatio } from '../Image/Image';

export interface ImageCompareProps {
  beforeSrc: string;
  afterSrc: string;
  /** Required alternative text of each image. */
  beforeAlt: string;
  afterAlt: string;
  /** Share (0–100) of the before image shown, measured from the inline-start edge. */
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  step?: number;
  beforeLabel?: string;
  afterLabel?: string;
  showLabels?: boolean;
  ratio?: ImageRatio;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

export function ImageCompare({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  value: valueProp,
  defaultValue = 50,
  onChange,
  step = 1,
  beforeLabel,
  afterLabel,
  showLabels = true,
  ratio,
  disabled = false,
  className,
  ref,
  ...rest
}: ImageCompareProps) {
  const { t } = useLocale();
  const [raw, setValue] = useControllableState<number>(valueProp, defaultValue, onChange);
  const value = clamp(raw);
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const before = beforeLabel ?? t('imageCompareBefore');
  const after = afterLabel ?? t('imageCompareAfter');

  const set = (next: number) => {
    const clamped = clamp(next);
    if (clamped !== value) setValue(clamped);
  };

  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    if (rect.width === 0) return;
    const rtl = getComputedStyle(root).direction === 'rtl';
    const offset = rtl ? rect.right - event.clientX : event.clientX - rect.left;
    set((offset / rect.width) * 100);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
    fromPointer(event);
    // Moving focus to the handle makes the keyboard model available right after a click.
    event.currentTarget.querySelector<HTMLElement>('[role="slider"]')?.focus({ preventScroll: true });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rtl = rootRef.current ? getComputedStyle(rootRef.current).direction === 'rtl' : false;
    const inc = rtl ? 'ArrowLeft' : 'ArrowRight';
    const dec = rtl ? 'ArrowRight' : 'ArrowLeft';
    let next: number | null = null;
    if (event.key === inc || event.key === 'ArrowUp') next = value + step;
    else if (event.key === dec || event.key === 'ArrowDown') next = value - step;
    else if (event.key === 'PageUp') next = value + step * 10;
    else if (event.key === 'PageDown') next = value - step * 10;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 100;
    if (next === null) return;
    event.preventDefault();
    set(next);
  };

  const style = { '--ui-image-compare-position': `${value}%` } as CSSProperties;

  return (
    // Pointer handling is a convenience; the keyboard model lives on the slider element inside.
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={cx('ui-image-compare', ratio && `ui-image-compare--ratio ui-image-compare--${ratio}`, dragging && 'ui-image-compare--dragging', disabled && 'ui-image-compare--disabled', className)}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={(event) => dragging && fromPointer(event)}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onLostPointerCapture={() => setDragging(false)}
    >
      <img className="ui-image-compare__after" src={safeImageSrc(afterSrc)} alt={afterAlt} draggable={false} />
      <img className="ui-image-compare__before" src={safeImageSrc(beforeSrc)} alt={beforeAlt} draggable={false} />
      {showLabels && (
        <>
          <span className="ui-image-compare__label ui-image-compare__label--before" aria-hidden="true">
            {before}
          </span>
          <span className="ui-image-compare__label ui-image-compare__label--after" aria-hidden="true">
            {after}
          </span>
        </>
      )}
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={rest['aria-label'] ?? t('imageCompare')}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        aria-valuetext={t('imageCompareValue', { before: Math.round(value), beforeLabel: before, after: Math.round(100 - value), afterLabel: after })}
        aria-disabled={disabled || undefined}
        className="ui-image-compare__handle"
        onKeyDown={handleKeyDown}
      >
        <span className="ui-image-compare__grip" aria-hidden="true" />
      </div>
    </div>
  );
}
