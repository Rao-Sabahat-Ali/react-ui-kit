import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useFloating } from '../../hooks/useFloating';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import { useOverlay } from '../../hooks/useOverlay';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { getFocusable } from '../../utils/dom';
import { focusAdjacentTabbable } from '../../utils/element';
import type { Placement } from '../../utils/position';
import { Button } from '../Button/Button';
import { Portal } from '../Portal/Portal';

export type TourTarget = string | RefObject<HTMLElement | null> | (() => HTMLElement | null);

export interface TourStep {
  id?: string;
  /** CSS selector, ref or function returning the element this step points at. */
  target: TourTarget;
  title?: ReactNode;
  content: ReactNode;
  placement?: Placement;
}

/** `missing`: no step has a target in the page, so the tour could not be shown at all (it did not finish). */
export type TourCloseReason = 'done' | 'skip' | 'escape' | 'missing';

export interface TourProps {
  steps: TourStep[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Current step index (controlled). */
  step?: number;
  defaultStep?: number;
  onStepChange?: (index: number, step: TourStep) => void;
  onClose?: (reason: TourCloseReason) => void;
  /** Accessible name when a step has no title. */
  label?: string;
  /** px between the target and the highlight ring. */
  ringPadding?: number;
}

function resolveTarget(target: TourTarget): HTMLElement | null {
  try {
    if (typeof target === 'string') return document.querySelector<HTMLElement>(target);
    if (typeof target === 'function') return target();
    return target.current;
  } catch {
    // Invalid selector: treated as a missing target.
    return null;
  }
}

export function Tour({ steps, open: openProp, defaultOpen = false, onOpenChange, step: stepProp, defaultStep = 0, onStepChange, onClose, label, ringPadding = 4 }: TourProps) {
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange);
  const [stepState, setStep] = useControllableState(stepProp, defaultStep);
  const index = Math.min(Math.max(stepState, 0), Math.max(steps.length - 1, 0));

  const goTo = useCallback(
    (next: number) => {
      setStep(next);
      const target = steps[next];
      if (target) onStepChange?.(next, target);
    },
    [setStep, steps, onStepChange],
  );
  const close = useCallback(
    (reason: TourCloseReason) => {
      setOpen(false);
      setStep(defaultStep);
      onClose?.(reason);
    },
    [setOpen, setStep, defaultStep, onClose],
  );

  if (!open || steps.length === 0) return null;
  return <TourPanel steps={steps} index={index} goTo={goTo} close={close} label={label} ringPadding={ringPadding} />;
}

interface PanelProps {
  steps: TourStep[];
  index: number;
  goTo: (index: number) => void;
  close: (reason: TourCloseReason) => void;
  label?: string;
  ringPadding: number;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

function TourPanel({ steps, index, goTo, close, label, ringPadding }: PanelProps) {
  const { t } = useLocale();
  const reduced = usePrefersReducedMotion();
  const id = useId();
  const titleId = `${id}-title`;
  const bodyId = `${id}-body`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const direction = useRef<1 | -1>(1);
  const warned = useRef(new Set<number>());
  const step = steps[index]!;
  const last = index === steps.length - 1;

  // A fresh anchor object per step also makes the floating hook and the scroll effect re-run for repeated targets.
  const [anchorRef, setAnchor] = useState<RefObject<HTMLElement | null>>({ current: null });
  const target = anchorRef.current;
  const [box, setBox] = useState<Box | null>(null);

  // Resolve the target of the current step; skip steps whose target is missing.
  useLayoutEffect(() => {
    const el = resolveTarget(step.target);
    if (el && el.isConnected) {
      setAnchor({ current: el });
      return;
    }
    setAnchor({ current: null });
    if (import.meta.env?.DEV && !warned.current.has(index)) {
      warned.current.add(index);
      console.warn(`[react-ui-kit] Tour: the target of step ${index + 1}${step.id ? ` ("${step.id}")` : ''} was not found; skipping it.`);
    }
    const scan = (from: number, dir: 1 | -1) => {
      for (let i = from; i >= 0 && i < steps.length; i += dir) {
        const candidate = steps[i]!;
        const found = resolveTarget(candidate.target);
        if (found && found.isConnected) return i;
        if (import.meta.env?.DEV && !warned.current.has(i)) {
          warned.current.add(i);
          console.warn(`[react-ui-kit] Tour: the target of step ${i + 1}${candidate.id ? ` ("${candidate.id}")` : ''} was not found; skipping it.`);
        }
      }
      return -1;
    };
    const dir = direction.current;
    let next = scan(index + dir, dir);
    if (next === -1) next = scan(index - dir, (dir * -1) as 1 | -1);
    if (next === -1) close('missing');
    else goTo(next);
    // The step (and its target) is the only trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, step]);

  // Bring the target into view, then keep the ring on it while the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!target) {
      setBox(null);
      return;
    }
    target.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    const measure = () => {
      const r = target.getBoundingClientRect();
      setBox((prev) => (prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height ? prev : { top: r.top, left: r.left, width: r.width, height: r.height }));
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(target);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      observer?.disconnect();
    };
  }, [anchorRef, target, reduced]);

  const position = useFloating(anchorRef, contentRef, { open: target !== null, placement: step.placement ?? 'bottom', offset: ringPadding + 10 });

  // Non-modal overlay: Escape for the top-most overlay, focus restored on close; no trap, inert or scroll lock.
  useOverlay({ rootRef, contentRef, modal: false, onEscape: () => close('escape') });

  // Focus moves to the panel whenever a step becomes visible.
  useEffect(() => {
    if (target) contentRef.current?.focus({ preventScroll: true });
  }, [anchorRef, target, index]);

  const isTabbable = (el: HTMLElement) => getFocusable(document.body).includes(el);
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab' || !target) return;
    const panel = contentRef.current;
    if (!panel) return;
    const focusable = getFocusable(panel);
    const active = document.activeElement;
    if (!event.shiftKey && (focusable.length === 0 || active === focusable[focusable.length - 1])) {
      event.preventDefault();
      if (isTabbable(target)) target.focus();
      else focusAdjacentTabbable(target);
    } else if (event.shiftKey && (active === panel || active === focusable[0])) {
      event.preventDefault();
      if (isTabbable(target)) target.focus();
      else focusAdjacentTabbable(target, true);
    }
  };

  // Native listener (the panel is a dialog, not an interactive widget): Tab continues to the page instead of trapping.
  const keyHandler = useRef(handleKeyDown);
  keyHandler.current = handleKeyDown;
  useEffect(() => {
    const panel = contentRef.current;
    if (!panel) return;
    const listener = (e: KeyboardEvent) => keyHandler.current(e);
    panel.addEventListener('keydown', listener);
    return () => panel.removeEventListener('keydown', listener);
  }, []);

  const side = position.placement.split('-')[0] ?? 'bottom';
  const pad = ringPadding;

  return (
    <Portal>
      <div ref={rootRef} className="ui-tour-root">
        {box && <div className="ui-tour__ring" aria-hidden="true" style={{ position: 'fixed', top: box.top - pad, left: box.left - pad, width: box.width + pad * 2, height: box.height + pad * 2 }} />}
        <div
          ref={contentRef}
          role="dialog"
          aria-labelledby={step.title ? titleId : undefined}
          aria-label={step.title ? undefined : (label ?? t('tour'))}
          aria-describedby={bodyId}
          tabIndex={-1}
          data-placement={position.placement}
          className={cx('popover ui-popover ui-tour', `bs-popover-${side}`, `ui-popover--${side}`)}
          style={{ position: 'fixed', top: position.top, left: position.left, visibility: target ? undefined : 'hidden' }}
        >
          <div className="popover-arrow ui-popover__arrow" />
          {/* The step numeral is drawn light like a StepSheet panel; the full "Step n of m" is read from the hidden text. */}
          <div className="ui-tour__head">
            <span className="ui-tour__numeral ui-tabular" aria-hidden="true">
              {index + 1}
            </span>
            <span className="ui-tour__total ui-tabular" aria-hidden="true">
              / {steps.length}
            </span>
            <span className="visually-hidden">{t('stepOf', { index: index + 1, total: steps.length })}</span>
          </div>
          {step.title && (
            <h2 id={titleId} className="popover-header ui-popover__header ui-tour__title">
              {step.title}
            </h2>
          )}
          <div id={bodyId} className="popover-body ui-popover__body ui-tour__body">
            {step.content}
          </div>
          <div className="ui-tour__footer">
            <div className="ui-tour__actions">
              {!last && (
                <Button size="sm" appearance="text" variant="secondary" onClick={() => close('skip')}>
                  {t('tourSkip')}
                </Button>
              )}
              {index > 0 && (
                <Button
                  size="sm"
                  appearance="outline"
                  variant="secondary"
                  onClick={() => {
                    direction.current = -1;
                    goTo(index - 1);
                  }}
                >
                  {t('tourPrevious')}
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  if (last) close('done');
                  else {
                    direction.current = 1;
                    goTo(index + 1);
                  }
                }}
              >
                {last ? t('tourDone') : t('tourNext')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
