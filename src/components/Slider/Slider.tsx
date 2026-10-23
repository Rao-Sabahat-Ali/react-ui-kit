import { useRef, useState, type HTMLAttributes, type KeyboardEvent, type PointerEvent, type ReactNode, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { clamp, roundToStep } from '../../utils/number';
import { cx } from '../../utils/cx';
import { useFieldControl } from '../Field/Field';

export type SliderValue = number | [number, number];

export interface SliderMark {
  value: number;
  label?: ReactNode;
}

export interface SliderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  value?: SliderValue;
  defaultValue?: SliderValue;
  onChange?: (value: SliderValue) => void;
  /** Fires once per interaction: on pointer up or key up. */
  onChangeEnd?: (value: SliderValue) => void;
  range?: boolean;
  min?: number;
  max?: number;
  step?: number;
  orientation?: 'horizontal' | 'vertical';
  marks?: SliderMark[];
  showValue?: boolean | 'tooltip';
  /** `aria-valuetext` (and displayed text) for a value. */
  valueText?: (value: number) => string;
  /** Accessible name(s) of the thumb(s); range sliders should provide two. */
  thumbLabels?: string | [string, string];
  disabled?: boolean;
  ref?: Ref<HTMLDivElement>;
}

/** Local defaults for range thumbs (no matching keys in locale/en.ts). */

export function Slider({
  value: valueProp,
  defaultValue,
  onChange,
  onChangeEnd,
  range = false,
  min = 0,
  max = 100,
  step = 1,
  orientation = 'horizontal',
  marks,
  showValue = false,
  valueText,
  thumbLabels,
  disabled = false,
  className,
  ref,
  ...rest
}: SliderProps) {
  const { t } = useLocale();
  const control = useFieldControl({ 'aria-describedby': rest['aria-describedby'] });
  const fallback: SliderValue = range ? [min, max] : min;
  const [stored, setStored] = useControllableState<SliderValue>(valueProp, defaultValue ?? fallback);
  const vertical = orientation === 'vertical';
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragging = useRef<number | null>(null);
  const dirty = useRef(false);
  const [active, setActive] = useState<number | null>(null);

  const normalise = (v: SliderValue): [number, number] => {
    if (range) {
      const [a, b] = Array.isArray(v) ? v : [min, max];
      const lo = clamp(Math.min(a, b), min, max);
      const hi = clamp(Math.max(a, b), min, max);
      return [lo, hi];
    }
    const single = Array.isArray(v) ? (v[0] ?? min) : v;
    return [min, clamp(single, min, max)];
  };
  const [lo, hi] = normalise(stored);
  const values: number[] = range ? [lo, hi] : [hi];
  const latest = useRef(values);
  latest.current = values;

  const span = max - min || 1;
  const percent = (v: number) => ((v - min) / span) * 100;
  const snap = (v: number) => clamp(roundToStep(min + Math.round((v - min) / step) * step, step), min, max);
  const text = (v: number) => (valueText ? valueText(v) : String(v));

  const emit = (next: number[]): SliderValue => (range ? [next[0] as number, next[1] as number] : (next[0] as number));

  /** Move thumb `index` to `raw`, respecting its neighbour. Returns the resulting value. */
  const moveThumb = (index: number, raw: number) => {
    const current = latest.current;
    const lower = range && index === 1 ? (current[0] as number) : min;
    const upper = range && index === 0 ? (current[1] as number) : max;
    const nextValue = clamp(snap(raw), lower, upper);
    if (nextValue === current[index]) return;
    const next = [...current];
    next[index] = nextValue;
    latest.current = next;
    dirty.current = true;
    const out = emit(next);
    setStored(out);
    onChange?.(out);
  };

  const isRtl = () => {
    const el = trackRef.current;
    if (!el) return false;
    return getComputedStyle(el).direction === 'rtl' || el.closest('[dir]')?.getAttribute('dir') === 'rtl';
  };

  const valueFromPointer = (event: PointerEvent<HTMLElement>) => {
    const rect = trackRef.current!.getBoundingClientRect();
    let ratio: number;
    if (vertical) ratio = 1 - (event.clientY - rect.top) / (rect.height || 1);
    else {
      ratio = (event.clientX - rect.left) / (rect.width || 1);
      if (isRtl()) ratio = 1 - ratio;
    }
    return min + clamp(ratio, 0, 1) * span;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button > 0) return;
    const raw = valueFromPointer(event);
    const thumbEl = (event.target as HTMLElement).closest<HTMLElement>('[data-thumb]');
    let index = thumbEl ? Number(thumbEl.dataset.thumb) : 0;
    if (!thumbEl && range) {
      const [a, b] = latest.current as [number, number];
      const da = Math.abs(raw - a);
      const db = Math.abs(raw - b);
      index = da < db ? 0 : db < da ? 1 : raw > b ? 1 : 0;
    }
    dragging.current = index;
    dirty.current = false;
    setActive(index);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    thumbRefs.current[index]?.focus({ preventScroll: true });
    // Pressing on the thumb itself must not jump it to the pointer's exact position.
    if (!thumbEl) moveThumb(index, raw);
    event.preventDefault();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current === null || disabled) return;
    moveThumb(dragging.current, valueFromPointer(event));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current === null) return;
    dragging.current = null;
    setActive(null);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (dirty.current) {
      dirty.current = false;
      onChangeEnd?.(emit(latest.current));
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const current = latest.current[index] as number;
    const direction = isRtl() && !vertical ? -1 : 1;
    const page = Math.max(step, snap(min + span * 0.1) - min);
    let next: number | undefined;
    switch (event.key) {
      case 'ArrowRight':
        next = vertical ? undefined : current + step * direction;
        break;
      case 'ArrowLeft':
        next = vertical ? undefined : current - step * direction;
        break;
      case 'ArrowUp':
        next = current + step;
        break;
      case 'ArrowDown':
        next = current - step;
        break;
      case 'PageUp':
        next = current + page;
        break;
      case 'PageDown':
        next = current - page;
        break;
      case 'Home':
        next = min;
        break;
      case 'End':
        next = max;
        break;
    }
    if (next === undefined) return;
    event.preventDefault();
    moveThumb(index, next);
  };

  const handleKeyUp = () => {
    if (dirty.current && dragging.current === null) {
      dirty.current = false;
      onChangeEnd?.(emit(latest.current));
    }
  };

  const labelFor = (index: number): { 'aria-label'?: string; 'aria-labelledby'?: string } => {
    const given = Array.isArray(thumbLabels) ? thumbLabels[index] : index === 0 ? thumbLabels : undefined;
    if (given) return { 'aria-label': given };
    if (range) return { 'aria-label': index === 0 ? t('rangeMinimum') : t('rangeMaximum') };
    if (rest['aria-label']) return { 'aria-label': rest['aria-label'] };
    return control.labelId ? { 'aria-labelledby': control.labelId } : {};
  };

  const startPercent = range ? percent(lo) : 0;
  const endPercent = percent(hi);
  const rangeStyle = vertical
    ? { insetBlockEnd: `${startPercent}%`, blockSize: `${endPercent - startPercent}%` }
    : { insetInlineStart: `${startPercent}%`, inlineSize: `${endPercent - startPercent}%` };

  const { 'aria-label': _ariaLabel, ...rootRest } = rest;

  return (
    <div
      ref={ref}
      id={control.id}
      className={cx('ui-slider', `ui-slider--${orientation}`, disabled && 'ui-slider--disabled', range && 'ui-slider--range', className)}
      {...rootRest}
    >
      <div
        ref={trackRef}
        className="ui-slider__track"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="ui-slider__range" style={rangeStyle} />
        {marks?.map((mark) => (
          <span
            key={mark.value}
            className={cx('ui-slider__mark', mark.value >= (range ? lo : min) && mark.value <= hi && 'is-active')}
            style={vertical ? { insetBlockEnd: `${percent(mark.value)}%` } : { insetInlineStart: `${percent(mark.value)}%` }}
          >
            {mark.label !== undefined && <span className="ui-slider__mark-label">{mark.label}</span>}
          </span>
        ))}
        {values.map((v, i) => {
          const index = range ? i : 0;
          const lower = range && index === 1 ? (latest.current[0] as number) : min;
          const upper = range && index === 0 ? (latest.current[1] as number) : max;
          return (
            <div
              key={index}
              ref={(node) => {
                thumbRefs.current[index] = node;
              }}
              data-thumb={index}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-valuemin={lower}
              aria-valuemax={upper}
              aria-valuenow={v}
              aria-valuetext={valueText ? valueText(v) : undefined}
              aria-orientation={vertical ? 'vertical' : 'horizontal'}
              aria-disabled={disabled || undefined}
              aria-describedby={control.describedBy}
              {...labelFor(index)}
              className={cx('ui-slider__thumb', active === index && 'is-active')}
              style={vertical ? { insetBlockEnd: `${percent(v)}%` } : { insetInlineStart: `${percent(v)}%` }}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onKeyUp={handleKeyUp}
            >
              {showValue === 'tooltip' && (
                <span className="ui-slider__tooltip" aria-hidden="true">
                  {text(v)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {showValue === true && (
        <output className="ui-slider__value" aria-hidden="true">
          {range ? `${text(lo)} – ${text(hi)}` : text(hi)}
        </output>
      )}
    </div>
  );
}
