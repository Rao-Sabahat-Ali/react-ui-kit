import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type Ref } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useControllableState } from '../../hooks/useControllableState';
import { useFloating } from '../../hooks/useFloating';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { clamp } from '../../utils/number';
import type { Size } from '../../types';
import { useFieldControl } from '../Field/Field';
import { Portal } from '../Portal/Portal';

/** Local English defaults until locale keys exist (`saturationBrightnessLabel`, `hexColor`, `swatches`). */
const DEFAULT_LABELS = { area: 'Saturation and brightness', hex: 'Hex colour', swatches: 'Preset colours' };

export type ColorFormat = 'hex' | 'rgb' | 'hsl';
export type ColorSwatch = string | { value: string; name: string };

export interface ColorPickerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  format?: ColorFormat;
  alpha?: boolean;
  swatches?: ColorSwatch[];
  inline?: boolean;
  native?: boolean;
  labels?: Partial<typeof DEFAULT_LABELS>;
  size?: Size;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  'aria-describedby'?: string;
  ref?: Ref<HTMLElement>;
}

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}
interface Hsva {
  h: number;
  s: number;
  v: number;
  a: number;
}

// ---------- colour maths (no dependencies) ----------
const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function parseHex(text: string): Rgba | null {
  const m = HEX_RE.exec(text.trim());
  if (!m) return null;
  let hex = m[1]!;
  if (hex.length <= 4) hex = [...hex].map((c) => c + c).join('');
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return { r: n(0), g: n(2), b: n(4), a: hex.length === 8 ? Math.round((n(6) / 255) * 100) / 100 : 1 };
}

/** Parse `#hex`, `rgb()/rgba()` or `hsl()/hsla()`. */
export function parseColor(text: string | undefined | null): Rgba | null {
  if (!text) return null;
  const hex = parseHex(text);
  if (hex) return hex;
  const fn = /^(rgba?|hsla?)\(\s*([^)]*)\)$/i.exec(text.trim());
  if (!fn) return null;
  const parts = fn[2]!.split(/[\s,/]+/).filter(Boolean).map((p) => parseFloat(p));
  if (parts.length < 3 || parts.some((p) => Number.isNaN(p))) return null;
  const a = parts[3] === undefined ? 1 : clamp(parts[3], 0, 1);
  if (fn[1]!.toLowerCase().startsWith('rgb')) return { r: clamp(Math.round(parts[0]!), 0, 255), g: clamp(Math.round(parts[1]!), 0, 255), b: clamp(Math.round(parts[2]!), 0, 255), a };
  return { ...hslToRgb(parts[0]!, parts[1]!, parts[2]!), a };
}

function hslToRgb(h: number, s: number, l: number) {
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

function rgbToHsv({ r, g, b, a }: Rgba): Hsva {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const d = max - Math.min(rr, gg, bb);
  let h = 0;
  if (d) h = max === rr ? ((gg - bb) / d) % 6 : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  return { h: Math.round((h * 60 + 360) % 360), s: Math.round(max ? (d / max) * 100 : 0), v: Math.round(max * 100), a };
}

function hsvToRgb({ h, s, v, a }: Hsva): Rgba {
  const sat = s / 100;
  const val = v / 100;
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((val - val * sat * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return { r: f(5), g: f(3), b: f(1), a };
}

function rgbToHsl({ r, g, b }: Rgba) {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const { h } = rgbToHsv({ r, g, b, a: 1 });
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

const hex2 = (n: number) => n.toString(16).padStart(2, '0');
const toHex = ({ r, g, b, a }: Rgba, withAlpha: boolean) => `#${hex2(r)}${hex2(g)}${hex2(b)}${withAlpha ? hex2(Math.round(a * 255)) : ''}`;

export function formatColor(rgba: Rgba, format: ColorFormat, withAlpha: boolean): string {
  const a = Math.round(rgba.a * 100) / 100;
  if (format === 'rgb') return withAlpha ? `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${a})` : `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
  if (format === 'hsl') {
    const { h, s, l } = rgbToHsl(rgba);
    return withAlpha ? `hsla(${h}, ${s}%, ${l}%, ${a})` : `hsl(${h}, ${s}%, ${l}%)`;
  }
  return toHex(rgba, withAlpha);
}

const sameRgba = (x: Rgba | null, y: Rgba | null) => Boolean(x && y && x.r === y.r && x.g === y.g && x.b === y.b && Math.abs(x.a - y.a) < 0.01);

// ---------- component ----------

/** The hue spectrum is data, not theme colour, so it is generated here rather than in SCSS. */
const HUE_GRADIENT = `linear-gradient(to var(--ui-color-picker-hue-dir, right), ${[0, 60, 120, 180, 240, 300, 360].map((h) => `hsl(${h}, 100%, 50%)`).join(', ')})`;

type Channel = 'area' | 'hue' | 'alpha';

export function ColorPicker({
  value: valueProp,
  defaultValue = '#3366ff',
  onChange,
  format = 'hex',
  alpha = false,
  swatches,
  inline = false,
  native = false,
  labels: labelsProp,
  size = 'md',
  disabled = false,
  className,
  style,
  ref,
  ...props
}: ColorPickerProps) {
  const { t } = useLocale();
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const control = useFieldControl({ id: props.id, invalid: props.invalid, 'aria-describedby': props['aria-describedby'] });
  const [value, setValue] = useControllableState<string>(valueProp, defaultValue, onChange);
  const rgba = parseColor(value) ?? { r: 0, g: 0, b: 0, a: 1 };
  const [hsv, setHsv] = useState<Hsva>(() => rgbToHsv(rgba));
  const lastEmitted = useRef<string>(value);
  const [hexText, setHexText] = useState(() => toHex(rgba, alpha));
  const [hexInvalid, setHexInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const hueRef = useRef<HTMLDivElement | null>(null);
  const alphaRef = useRef<HTMLDivElement | null>(null);
  const dialogLabelId = useId();
  const position = useFloating(triggerRef, popupRef, { open: open && !inline, placement: 'bottom-start' });

  // Sync internal HSV when the value changes from outside (keeps hue when saturation hits 0).
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    const parsed = parseColor(value);
    if (parsed) {
      setHsv(rgbToHsv(parsed));
      setHexText(toHex(parsed, alpha));
      setHexInvalid(false);
    }
  }, [value, alpha]);

  const emitHsv = (next: Hsva) => {
    setHsv(next);
    const rgb = hsvToRgb(next);
    setHexText(toHex(rgb, alpha));
    setHexInvalid(false);
    const out = formatColor(rgb, format, alpha);
    lastEmitted.current = out;
    setValue(out);
  };

  const emitRgba = (next: Rgba) => {
    const withA = alpha ? next : { ...next, a: 1 };
    setHsv(rgbToHsv(withA));
    setHexText(toHex(withA, alpha));
    setHexInvalid(false);
    const out = formatColor(withA, format, alpha);
    lastEmitted.current = out;
    setValue(out);
  };

  /** Apply a typed hex string; returns false when it is not a valid colour. */
  const applyHex = (text: string): boolean => {
    const parsed = parseHex(text);
    const digits = text.trim().replace(/^#/, '').length;
    if (!parsed || !(alpha ? [3, 4, 6, 8] : [3, 6]).includes(digits)) return false;
    const next = alpha ? parsed : { ...parsed, a: 1 };
    if (!sameRgba(next, rgba)) {
      setHsv(rgbToHsv(next));
      const out = formatColor(next, format, alpha);
      lastEmitted.current = out;
      setValue(out);
    }
    setHexText(toHex(next, alpha));
    setHexInvalid(false);
    return true;
  };

  const sizeClass = size === 'sm' ? 'form-control-sm' : size === 'lg' ? 'form-control-lg' : undefined;

  const setRef = (node: HTMLElement | null) => {
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: unknown }).current = node;
  };

  useClickOutside([triggerRef, popupRef], () => setOpen(false), open && !inline);

  if (native) {
    return (
      <input
        ref={setRef}
        type="color"
        id={control.id}
        className={cx('form-control form-control-color ui-color-picker ui-color-picker--native', sizeClass, control.invalid && 'is-invalid', className)}
        style={style}
        value={toHex(rgba, false)}
        disabled={disabled}
        aria-label={props['aria-label']}
        aria-describedby={control.describedBy}
        aria-invalid={control.invalid || undefined}
        onChange={(e) => {
          const parsed = parseHex(e.target.value);
          if (parsed) emitRgba({ ...parsed, a: rgba.a });
        }}
      />
    );
  }

  const fromPointer = (channel: Channel, event: { clientX: number; clientY: number }) => {
    const el = (channel === 'area' ? areaRef : channel === 'hue' ? hueRef : alphaRef).current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rtl = getComputedStyle(el).direction === 'rtl';
    let x = rect.width ? clamp((event.clientX - rect.left) / rect.width, 0, 1) : 0;
    if (rtl && channel !== 'area') x = 1 - x;
    const y = rect.height ? clamp((event.clientY - rect.top) / rect.height, 0, 1) : 0;
    if (channel === 'area') emitHsv({ ...hsv, s: Math.round(x * 100), v: Math.round((1 - y) * 100) });
    else if (channel === 'hue') emitHsv({ ...hsv, h: Math.round(x * 360) });
    else emitHsv({ ...hsv, a: Math.round(x * 100) / 100 });
  };

  const pointerHandlers = (channel: Channel) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      e.currentTarget.focus();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      fromPointer(channel, e);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) fromPointer(channel, e);
    },
  });

  const handleSliderKey = (channel: Channel, event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const step = event.shiftKey ? 10 : 1;
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const right = rtl ? -step : step;
    const k = event.key;
    let next: Hsva | null = null;
    if (channel === 'area') {
      if (k === 'ArrowRight') next = { ...hsv, s: clamp(hsv.s + right, 0, 100) };
      else if (k === 'ArrowLeft') next = { ...hsv, s: clamp(hsv.s - right, 0, 100) };
      else if (k === 'ArrowUp') next = { ...hsv, v: clamp(hsv.v + step, 0, 100) };
      else if (k === 'ArrowDown') next = { ...hsv, v: clamp(hsv.v - step, 0, 100) };
      else if (k === 'Home') next = { ...hsv, s: 0 };
      else if (k === 'End') next = { ...hsv, s: 100 };
      else if (k === 'PageUp') next = { ...hsv, v: clamp(hsv.v + 10, 0, 100) };
      else if (k === 'PageDown') next = { ...hsv, v: clamp(hsv.v - 10, 0, 100) };
    } else {
      const key = channel === 'hue' ? 'h' : 'a';
      const max = channel === 'hue' ? 360 : 100;
      const current = channel === 'hue' ? hsv.h : Math.round(hsv.a * 100);
      let n: number | null = null;
      if (k === 'ArrowRight') n = current + right;
      else if (k === 'ArrowLeft') n = current - right;
      else if (k === 'ArrowUp') n = current + step;
      else if (k === 'ArrowDown') n = current - step;
      else if (k === 'PageUp') n = current + 10;
      else if (k === 'PageDown') n = current - 10;
      else if (k === 'Home') n = 0;
      else if (k === 'End') n = max;
      if (n !== null) {
        const c = clamp(n, 0, max);
        next = { ...hsv, [key]: channel === 'hue' ? c : c / 100 };
      }
    }
    if (next) {
      event.preventDefault();
      emitHsv(next);
    }
  };

  const pure = hsvToRgb({ h: hsv.h, s: 100, v: 100, a: 1 });
  const current = hsvToRgb(hsv);
  const swatchList = (swatches ?? []).map((s) => (typeof s === 'string' ? { value: s, name: s } : s));
  const checkedSwatch = swatchList.findIndex((s) => sameRgba(parseColor(s.value), alpha ? rgba : { ...rgba, a: 1 }));

  const handleSwatchKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const n = swatchList.length;
    let to = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') to = (index + 1) % n;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') to = (index - 1 + n) % n;
    else if (event.key === 'Home') to = 0;
    else if (event.key === 'End') to = n - 1;
    if (to === -1) return;
    event.preventDefault();
    const target = swatchList[to]!;
    const parsed = parseColor(target.value);
    if (parsed) emitRgba(parsed);
    (event.currentTarget.parentElement?.children[to] as HTMLElement | undefined)?.focus();
  };

  const panel = (
    <div className={cx('ui-color-picker__panel', inline && 'ui-color-picker__panel--inline')}>
      <div
        ref={areaRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={labels.area}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hsv.s}
        aria-valuetext={t('saturationBrightness', { saturation: hsv.s, brightness: hsv.v })}
        aria-disabled={disabled || undefined}
        className="ui-color-picker__area"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), rgb(${pure.r}, ${pure.g}, ${pure.b})` }}
        onKeyDown={(e) => handleSliderKey('area', e)}
        {...pointerHandlers('area')}
      >
        <span className="ui-color-picker__thumb" style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }} aria-hidden="true" />
      </div>
      <div
        ref={hueRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={t('hue')}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={hsv.h}
        aria-valuetext={`${hsv.h}°`}
        aria-disabled={disabled || undefined}
        className="ui-color-picker__hue"
        style={{ background: HUE_GRADIENT }}
        onKeyDown={(e) => handleSliderKey('hue', e)}
        {...pointerHandlers('hue')}
      >
        <span className="ui-color-picker__thumb ui-color-picker__thumb--bar" style={{ insetInlineStart: `${(hsv.h / 360) * 100}%` }} aria-hidden="true" />
      </div>
      {alpha && (
        <div
          ref={alphaRef}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={t('alpha')}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(hsv.a * 100)}
          aria-valuetext={`${Math.round(hsv.a * 100)}%`}
          aria-disabled={disabled || undefined}
          className="ui-color-picker__alpha"
          style={{ '--ui-color-picker-current': `rgb(${current.r}, ${current.g}, ${current.b})` } as CSSProperties}
          onKeyDown={(e) => handleSliderKey('alpha', e)}
          {...pointerHandlers('alpha')}
        >
          <span className="ui-color-picker__thumb ui-color-picker__thumb--bar" style={{ insetInlineStart: `${hsv.a * 100}%` }} aria-hidden="true" />
        </div>
      )}
      <div className="ui-color-picker__fields">
        <span className="ui-color-picker__preview" style={{ backgroundColor: toHex(current, alpha) }} aria-hidden="true" />
        <input
          type="text"
          className={cx('form-control form-control-sm ui-color-picker__hex', hexInvalid && 'is-invalid')}
          aria-label={labels.hex}
          aria-invalid={hexInvalid || undefined}
          spellCheck={false}
          autoComplete="off"
          maxLength={9}
          disabled={disabled}
          value={hexText}
          onChange={(e) => {
            const text = e.target.value;
            setHexText(text);
            // Apply while typing only for full-length hex; short forms (#abc) apply on Enter/blur.
            const full = alpha ? /^#?([0-9a-f]{6}|[0-9a-f]{8})$/i : /^#?[0-9a-f]{6}$/i;
            if (full.test(text.trim())) applyHex(text);
            else setHexInvalid(!/^#?[0-9a-f]{0,8}$/i.test(text.trim()) || text.trim().replace('#', '').length > (alpha ? 8 : 6));
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (!applyHex(hexText)) setHexInvalid(true);
          }}
          onBlur={() => {
            if (!applyHex(hexText)) {
              setHexText(toHex(rgba, alpha));
              setHexInvalid(false);
            }
          }}
        />
      </div>
      {swatchList.length > 0 && (
        <div role="radiogroup" aria-label={labels.swatches} className="ui-color-picker__swatches">
          {swatchList.map((swatch, i) => (
            <button
              key={`${swatch.value}-${i}`}
              type="button"
              role="radio"
              aria-checked={i === checkedSwatch}
              aria-label={swatch.name}
              tabIndex={i === (checkedSwatch === -1 ? 0 : checkedSwatch) ? 0 : -1}
              disabled={disabled}
              className="ui-color-picker__swatch"
              style={{ backgroundColor: swatch.value }}
              onClick={() => {
                const parsed = parseColor(swatch.value);
                if (parsed) emitRgba(parsed);
              }}
              onKeyDown={(e) => handleSwatchKey(e, i)}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (inline) {
    return (
      <div
        ref={setRef}
        id={control.id}
        role="group"
        aria-label={props['aria-label'] ?? (control.labelId ? undefined : t('colorPicker'))}
        aria-labelledby={control.labelId}
        aria-describedby={control.describedBy}
        className={cx('ui-color-picker ui-color-picker--inline', disabled && 'ui-color-picker--disabled', className)}
        style={style}
      >
        {panel}
      </div>
    );
  }

  return (
    <div className={cx('ui-color-picker', disabled && 'ui-color-picker--disabled', className)} style={style}>
      <button
        ref={(node) => {
          triggerRef.current = node;
          setRef(node);
        }}
        type="button"
        id={control.id}
        className={cx('form-control ui-color-picker__trigger', sizeClass, control.invalid && 'is-invalid')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={props['aria-label']}
        aria-labelledby={control.labelId ? `${control.labelId} ${control.id}` : undefined}
        aria-describedby={control.describedBy}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="ui-color-picker__preview" style={{ backgroundColor: toHex(current, alpha) }} aria-hidden="true" />
        <span className="ui-color-picker__text">{value}</span>
      </button>
      {open && (
        <Portal>
          {/* Pointer convenience; keyboard handled by the focused control (aria-activedescendant / roving focus, covered by AC tests). */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <div
            ref={popupRef}
            role="dialog"
            aria-labelledby={dialogLabelId}
            className="dropdown-menu show ui-color-picker__popup"
            style={{ position: 'fixed', top: position.top, left: position.left }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
                triggerRef.current?.focus();
              }
            }}
          >
            <span id={dialogLabelId} className="visually-hidden">
              {t('colorPicker')}
            </span>
            <PopupFocus targetRef={areaRef} />
            {panel}
          </div>
        </Portal>
      )}
    </div>
  );
}

/** Moves focus to the SV area when the popup mounts. */
function PopupFocus({ targetRef }: { targetRef: { current: HTMLElement | null } }) {
  useEffect(() => {
    targetRef.current?.focus();
  }, [targetRef]);
  return null;
}
