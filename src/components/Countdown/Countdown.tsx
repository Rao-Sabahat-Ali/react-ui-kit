import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { QuantityTick } from '../QuantityTick/QuantityTick';

export type CountdownFormat = 'dd:hh:mm:ss' | 'hh:mm:ss' | 'mm:ss' | 'words';
type DateInput = Date | number | string;

export interface CountdownProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Accessible name of the timer, e.g. "Offer ends in". */
  label: string;
  /** Moment to count down to. */
  target?: DateInput;
  /** Milliseconds to count down from mount (alternative to `target`). */
  duration?: number;
  /** `elapsed` counts up from `since`. */
  mode?: 'countdown' | 'elapsed';
  /** Start of the `elapsed` count; defaults to mount time. */
  since?: DateInput;
  format?: CountdownFormat;
  paused?: boolean;
  onComplete?: () => void;
  /** Rendered instead of the value once the countdown reached zero. */
  completedContent?: ReactNode;
  /** Remaining seconds at which a polite announcement is made (once each). */
  announceAt?: number[];
  ref?: Ref<HTMLDivElement>;
}

const toMs = (v: DateInput | undefined): number | undefined => (v === undefined ? undefined : v instanceof Date ? v.getTime() : typeof v === 'number' ? v : Date.parse(v));
const pad = (n: number) => String(n).padStart(2, '0');

function split(total: number) {
  return { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

const UNITS = [
  ['d', 'day'],
  ['h', 'hour'],
  ['m', 'minute'],
  ['s', 'second'],
] as const;

function words(total: number, locale: string, display: 'narrow' | 'long', max = 2): string {
  const parts = split(total);
  const nonZero = UNITS.filter(([key]) => parts[key] > 0).slice(0, max);
  const shown = nonZero.length ? nonZero : ([UNITS[3]] as unknown as typeof UNITS);
  return shown.map(([key, unit]) => new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: display }).format(parts[key])).join(' ');
}

function formatTime(total: number, format: CountdownFormat, locale: string): string {
  const { d, h, m, s } = split(total);
  switch (format) {
    case 'dd:hh:mm:ss':
      return `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`;
    case 'hh:mm:ss':
      return `${pad(d * 24 + h)}:${pad(m)}:${pad(s)}`;
    case 'mm:ss':
      return `${pad(Math.floor(total / 60))}:${pad(s)}`;
    default:
      return words(total, locale, 'narrow');
  }
}

export function Countdown({ label, target, duration, mode = 'countdown', since, format = 'dd:hh:mm:ss', paused = false, onComplete, completedContent, announceAt, className, ref, ...rest }: CountdownProps) {
  const { t, locale } = useLocale();
  const targetMs = toMs(target);
  const sinceMs = toMs(since);
  const elapsedMode = mode === 'elapsed';

  // `anchor` is the end (countdown) or the start (elapsed) timestamp; it is rebuilt when the inputs change.
  const anchor = useRef(0);
  const key = `${mode}|${targetMs}|${duration}|${sinceMs}`;
  const keyRef = useRef<string | null>(null);
  const firedRef = useRef(false);
  const announced = useRef<Set<number> | null>(null);
  const pausedAt = useRef<number | null>(paused ? Date.now() : null);
  const [now, setNow] = useState(() => Date.now());
  if (keyRef.current !== key) {
    keyRef.current = key;
    const base = Date.now();
    anchor.current = elapsedMode ? (sinceMs ?? base) : (targetMs ?? base + (duration ?? 0));
    firedRef.current = false;
    announced.current = null;
  }

  useEffect(() => setNow(Date.now()), [key]);

  const ms = Math.max(0, elapsedMode ? now - anchor.current : anchor.current - now);
  const total = elapsedMode ? Math.floor(ms / 1000) : Math.ceil(ms / 1000);
  const completed = !elapsedMode && total <= 0;
  const [announcement, setAnnouncement] = useState('');

  // Pausing freezes the shown value; resuming shifts the anchor by the paused time.
  useEffect(() => {
    if (paused) {
      pausedAt.current ??= Date.now();
      return;
    }
    if (pausedAt.current !== null) {
      const at = Date.now();
      anchor.current += at - pausedAt.current;
      pausedAt.current = null;
      setNow(at);
    }
  }, [paused]);

  // One tick per second, stopped while the page is hidden (value is recomputed from the clock, so no drift).
  useEffect(() => {
    if (paused || completed) return;
    let id: number | undefined;
    const tick = () => setNow(Date.now());
    const start = () => {
      if (id === undefined) id = window.setInterval(tick, 1000);
    };
    const stop = () => {
      if (id !== undefined) window.clearInterval(id);
      id = undefined;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        tick();
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [paused, completed, key]);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  useEffect(() => {
    if (completed && !firedRef.current) {
      firedRef.current = true;
      onCompleteRef.current?.();
    }
  }, [completed]);

  const thresholds = announceAt?.join(',') ?? '';
  useEffect(() => {
    if (!thresholds || elapsedMode) return;
    const list = thresholds.split(',').map(Number);
    if (announced.current === null) {
      // Thresholds already behind us at mount are marked, not spoken.
      announced.current = new Set(list.filter((th) => total <= th));
      return;
    }
    const crossed = list.filter((th) => total <= th && !announced.current!.has(th));
    if (crossed.length === 0) return;
    crossed.forEach((th) => announced.current!.add(th));
    setAnnouncement(completed ? t('countdownComplete') : t('countdownRemaining', { time: words(total, locale, 'long') }));
  }, [thresholds, total, completed, elapsedMode, locale, t]);

  const { d, h, m, s } = split(total);
  const iso = `P${d}DT${h}H${m}M${s}S`;
  const shown = formatTime(total, format, locale);

  return (
    <>
      <div ref={ref} role="timer" aria-live="off" aria-label={label} className={cx('ui-countdown', paused && 'ui-countdown--paused', completed && 'ui-countdown--completed', className)} {...rest}>
        {completed && completedContent !== undefined ? (
          <span className="ui-countdown__completed">{completedContent}</span>
        ) : (
          <time className="ui-countdown__time ui-tabular" dateTime={iso}>
            {format === 'words' ? shown : <QuantityTick value={shown} announce={false} />}
          </time>
        )}
      </div>
      {announceAt && announceAt.length > 0 && (
        <span className="visually-hidden ui-countdown__status" role="status" aria-live="polite">
          {announcement}
        </span>
      )}
    </>
  );
}
