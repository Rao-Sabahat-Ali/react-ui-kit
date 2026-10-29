import { Children, createContext, isValidElement, useCallback, useContext, useEffect, useMemo, useRef, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { useAssemble } from '../../motion/useAssemble';
import { Icon } from '../Icon/Icon';

export type StepSheetStatus = 'complete' | 'current' | 'upcoming';

interface SheetContext {
  current: number;
  count: number;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  assemble: boolean;
}

const SheetCtx = createContext<SheetContext | null>(null);
const IndexCtx = createContext<number>(0);

/** Current step state and movement for actions inside a `StepPanel`. */
export function useStepSheet() {
  const ctx = useContext(SheetCtx);
  if (!ctx) throw new Error('useStepSheet must be used inside <StepSheet>');
  const { current, count, next, prev, goTo } = ctx;
  return { current, count, next, prev, goTo };
}

export interface StepSheetProps extends Omit<HTMLAttributes<HTMLOListElement>, 'children'> {
  ref?: Ref<HTMLOListElement>;
  /** Zero-based current step (controlled). */
  current?: number;
  defaultCurrent?: number;
  onCurrentChange?: (index: number) => void;
  /** `strip` (default): a ruled row of panels at ≥ md. `stack`: always vertical. */
  layout?: 'strip' | 'stack';
  /** Run the Assemble movement when a panel becomes current. Default true. */
  assemble?: boolean;
  children: ReactNode;
}

/**
 * Numbered step panels, the signature of multi-step work (sessions, onboarding, checkout). An ordered list; the
 * current panel carries `aria-current="step"`, earlier panels are complete and later ones upcoming.
 */
export function StepSheet({ current: currentProp, defaultCurrent = 0, onCurrentChange, layout = 'strip', assemble = true, className, children, ref, ...rest }: StepSheetProps) {
  const items = Children.toArray(children).filter(isValidElement);
  const count = items.length;
  const [current, setCurrent] = useControllableState<number>(currentProp, defaultCurrent, onCurrentChange);
  const clamp = useCallback((i: number) => Math.min(Math.max(i, 0), Math.max(count - 1, 0)), [count]);
  const listRef = useRef<HTMLOListElement | null>(null);
  const previous = useRef(current);

  const goTo = useCallback((i: number) => setCurrent(clamp(i)), [setCurrent, clamp]);
  const ctx = useMemo<SheetContext>(
    () => ({ current, count, goTo, next: () => goTo(current + 1), prev: () => goTo(current - 1), assemble }),
    [current, count, goTo, assemble],
  );

  // A step change moves focus to the new current title, but only if focus was inside the sheet (or lost to body).
  useEffect(() => {
    if (previous.current === current) return;
    previous.current = current;
    const list = listRef.current;
    if (!list) return;
    const active = document.activeElement;
    if (active && active !== document.body && !list.contains(active)) return;
    list.querySelector<HTMLElement>('[aria-current="step"] [data-step-title]')?.focus();
  }, [current]);

  return (
    <SheetCtx.Provider value={ctx}>
      <ol
        ref={(node) => {
          listRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cx('ui-step-sheet', `ui-step-sheet--${layout}`, className)}
        {...rest}
      >
        {items.map((child, i) => (
          <IndexCtx.Provider key={child.key ?? i} value={i}>
            {child}
          </IndexCtx.Provider>
        ))}
      </ol>
    </SheetCtx.Provider>
  );
}

export interface StepPanelProps extends Omit<HTMLAttributes<HTMLLIElement>, 'title'> {
  ref?: Ref<HTMLLIElement>;
  title: ReactNode;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** The one key value or diagram. */
  visual?: ReactNode;
  /** The one action. Inert unless this panel is current. */
  action?: ReactNode;
  status?: StepSheetStatus;
  numeral?: ReactNode;
}

export function StepPanel({ title, headingLevel = 3, visual, action, status: statusProp, numeral, className, children, ref, ...rest }: StepPanelProps) {
  const sheet = useContext(SheetCtx);
  if (!sheet) throw new Error('<StepPanel> must be used inside <StepSheet>');
  const index = useContext(IndexCtx);
  const { t } = useLocale();
  const status: StepSheetStatus = statusProp ?? (index < sheet.current ? 'complete' : index === sheet.current ? 'current' : 'upcoming');
  const Heading = `h${headingLevel}` as 'h3';
  const own = useRef<HTMLLIElement | null>(null);

  useAssemble(own, { enabled: sheet.assemble && status === 'current', trigger: status });

  const statusText = t('stepStatus', { n: index + 1, count: sheet.count, status: t(status === 'complete' ? 'stepComplete' : status === 'current' ? 'stepCurrent' : 'stepUpcoming') });

  return (
    <li
      ref={(node) => {
        own.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={cx('ui-step-panel', `ui-step-panel--${status}`, className)}
      data-status={status}
      aria-current={status === 'current' ? 'step' : undefined}
      {...rest}
    >
      <span className="ui-step-panel__guide" data-assemble-guide aria-hidden="true" />
      <div className="ui-step-panel__head" data-assemble>
        <span className="ui-step-panel__numeral ui-tabular" aria-hidden="true">
          {numeral ?? index + 1}
        </span>
        {status === 'complete' && <Icon name="check" size="lg" className="ui-step-panel__check" />}
      </div>
      <span className="visually-hidden">{statusText}</span>
      <Heading className="ui-step-panel__title" data-step-title tabIndex={status === 'current' ? -1 : undefined} data-assemble>
        {title}
      </Heading>
      {visual && (
        <div className="ui-step-panel__visual" data-assemble>
          {visual}
        </div>
      )}
      {children && (
        <div className="ui-step-panel__body" data-assemble>
          {children}
        </div>
      )}
      {action && (
        <div className="ui-step-panel__action" data-assemble inert={status !== 'current'}>
          {action}
        </div>
      )}
    </li>
  );
}
