import { useRef, type HTMLAttributes, type KeyboardEvent, type PointerEvent, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { clamp, roundToStep } from '../../utils/number';
import { cx } from '../../utils/cx';
import type { Intent } from '../../types';
import { QuantityTick } from '../QuantityTick/QuantityTick';
import { useFieldControl } from '../Field/Field';

export interface KnobProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Diameter in px. */
  size?: number;
  strokeWidth?: number;
  /** Text shown in the centre and used as `aria-valuetext`. A string may contain `{v}`. */
  valueTemplate?: string | ((value: number) => string);
  /** Display-only gauge. */
  readOnly?: boolean;
  disabled?: boolean;
  variant?: Intent;
  ref?: Ref<HTMLDivElement>;
}

/** The dial sweeps 270 degrees, from -135 (bottom-left) to +135 (bottom-right), clockwise from 12 o'clock. */
const START = -135;
const SWEEP = 270;

const polar = (cx: number, cy: number, r: number, degrees: number) => {
  const rad = (degrees * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
};

export function Knob({
  value: valueProp,
  defaultValue = 0,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  size = 100,
  strokeWidth = 14,
  valueTemplate = '{v}',
  readOnly = false,
  disabled = false,
  variant = 'primary',
  className,
  style,
  onKeyDown,
  ref,
  ...rest
}: KnobProps) {
  const control = useFieldControl({ 'aria-describedby': rest['aria-describedby'] });
  const [stored, setStored] = useControllableState<number>(valueProp, defaultValue);
  const value = clamp(stored, min, max);
  const dragging = useRef(false);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const interactive = !readOnly && !disabled;

  const setRefs = (node: HTMLDivElement | null) => {
    elementRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const format = (v: number) => (typeof valueTemplate === 'function' ? valueTemplate(v) : valueTemplate.replace('{v}', String(v)));
  const range = max - min || 1;
  const proportion = (value - min) / range;

  const commit = (next: number) => {
    const snapped = clamp(roundToStep(min + Math.round((next - min) / step) * step, step), min, max);
    if (snapped !== value) {
      setStored(snapped);
      onChange?.(snapped);
    }
  };

  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const angle = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 = up, clockwise positive, range -180..180
    // The gap at the bottom snaps to the nearer end of the arc.
    const p = Math.abs(angle) <= 135 ? (angle - START) / SWEEP : angle > 0 ? 1 : 0;
    commit(min + p * range);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive || event.button > 0) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    elementRef.current?.focus({ preventScroll: true });
    fromPointer(event);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current && interactive) fromPointer(event);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !interactive) return;
    const keys: Record<string, number | undefined> = {
      ArrowUp: value + step,
      ArrowRight: value + step,
      ArrowDown: value - step,
      ArrowLeft: value - step,
      PageUp: value + step * 10,
      PageDown: value - step * 10,
      Home: min,
      End: max,
    };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    commit(next);
  };

  const radius = (size - strokeWidth) / 2;
  const centre = size / 2;
  const from = polar(centre, centre, radius, START);
  const to = polar(centre, centre, radius, START + SWEEP);
  const path = `M ${from.x} ${from.y} A ${radius} ${radius} 0 1 1 ${to.x} ${to.y}`;
  const text = format(value);

  return (
    <div
      ref={setRefs}
      id={control.id}
      role="slider"
      tabIndex={interactive ? 0 : undefined}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={text}
      aria-labelledby={rest['aria-label'] ? undefined : control.labelId}
      aria-readonly={readOnly || undefined}
      aria-disabled={disabled || undefined}
      {...rest}
      aria-describedby={control.describedBy}
      className={cx('ui-knob', `ui-knob--${variant}`, readOnly && 'ui-knob--readonly', disabled && 'ui-knob--disabled', className)}
      style={{ inlineSize: size, blockSize: size, ...style }}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <svg className="ui-knob__svg" viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true" focusable="false">
        <path className="ui-knob__track" d={path} fill="none" strokeWidth={strokeWidth} strokeLinecap="round" pathLength={100} />
        <path
          className="ui-knob__value"
          d={path}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${proportion * 100} 100`}
          style={proportion === 0 ? { visibility: 'hidden' } : undefined}
        />
      </svg>
      <span className="ui-knob__text" aria-hidden="true">
        <QuantityTick value={text} announce={false} />
      </span>
    </div>
  );
}
