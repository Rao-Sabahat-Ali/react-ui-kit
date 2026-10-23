import { Children, createContext, isValidElement, useCallback, useContext, useEffect, useId, useMemo, useRef, type HTMLAttributes, type ReactElement, type ReactNode, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { Icon } from '../Icon/Icon';

export interface StepperStepProps {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  optional?: boolean;
  /** `true` shows a generic error label; a node is shown as the error text. */
  error?: boolean | ReactNode;
  /** Step panel content (rendered only while the step is active). */
  children?: ReactNode;
}

/** Declarative step; the parent Stepper reads its props and renders header and panel. */
export function StepperStep(_props: StepperStepProps): null {
  return null;
}

export interface StepperApi {
  next: () => void;
  prev: () => void;
  goTo: (value: string) => void;
  isFirst: boolean;
  isLast: boolean;
  value: string;
}

const StepperContext = createContext<StepperApi | null>(null);

export function useStepper(): StepperApi {
  const ctx = useContext(StepperContext);
  if (!ctx) throw new Error('useStepper must be used inside <Stepper>');
  return ctx;
}

export interface StepperProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Users cannot jump ahead of the first incomplete (current) step. */
  linear?: boolean;
  orientation?: 'horizontal' | 'vertical';
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export function Stepper({ value, defaultValue, onChange, linear = false, orientation = 'horizontal', headingLevel = 3, className, children, ref, ...rest }: StepperProps) {
  const { t } = useLocale();
  const uid = useId();
  const steps = Children.toArray(children).filter((c): c is ReactElement<StepperStepProps> => isValidElement(c) && c.type === StepperStep);
  const [current, setCurrent] = useControllableState<string>(value, defaultValue ?? steps[0]?.props.value ?? '', onChange);
  const activeIndex = Math.max(0, steps.findIndex((s) => s.props.value === current));
  const active = steps[activeIndex];
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const previous = useRef(current);

  const indexOf = useCallback((v: string) => steps.findIndex((s) => s.props.value === v), [steps]);
  const reachable = (idx: number) => idx >= 0 && (!linear || idx <= activeIndex + 1);
  const goTo = (v: string) => {
    const idx = indexOf(v);
    if (idx !== activeIndex && reachable(idx)) setCurrent(v);
  };
  const api: StepperApi = useMemo(
    () => ({
      next: () => activeIndex < steps.length - 1 && setCurrent(steps[activeIndex + 1]!.props.value),
      prev: () => activeIndex > 0 && setCurrent(steps[activeIndex - 1]!.props.value),
      goTo,
      isFirst: activeIndex === 0,
      isLast: activeIndex === steps.length - 1,
      value: current,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIndex, steps.length, current, linear, setCurrent],
  );

  // Move focus to the panel heading on step change (not on first render).
  useEffect(() => {
    if (previous.current !== current) {
      previous.current = current;
      headingRef.current?.focus();
    }
  }, [current]);

  const Heading = `h${headingLevel}` as 'h3';
  const panelId = `${uid}-panel`;
  const headingId = `${uid}-heading`;

  return (
    <StepperContext.Provider value={api}>
      <div ref={ref} className={cx('ui-stepper', `ui-stepper--${orientation}`, linear && 'ui-stepper--linear', className)} {...rest}>
        <ol className="ui-stepper__list">
          {steps.map((step, i) => {
            const { value: v, label, description, optional, error } = step.props;
            const isCurrent = i === activeIndex;
            const isDone = i < activeIndex && !error;
            const hasError = Boolean(error);
            const navigable = !isCurrent && (!linear || i <= activeIndex);
            const body = (
              <>
                <span className="ui-stepper__marker" aria-hidden="true">
                  {hasError ? <Icon name="alert-circle" size="sm" /> : isDone ? <Icon name="check" size="sm" /> : i + 1}
                </span>
                <span className="ui-stepper__text">
                  <span className="visually-hidden">{t('stepOf', { index: i + 1, total: steps.length })}. </span>
                  <span className="ui-stepper__label">{label}</span>
                  {isDone && <span className="visually-hidden"> ({t('completed')})</span>}
                  {optional && <span className="ui-stepper__optional">{t('optional')}</span>}
                  {description && <span className="ui-stepper__description">{description}</span>}
                  {hasError && <span className="ui-stepper__error">{error === true ? t('stepError') : error}</span>}
                </span>
              </>
            );
            return (
              <li key={v} className={cx('ui-stepper__step', isCurrent && 'ui-stepper__step--current', isDone && 'ui-stepper__step--done', hasError && 'ui-stepper__step--error')} aria-current={isCurrent ? 'step' : undefined}>
                {navigable ? (
                  <button type="button" className="ui-stepper__header" onClick={() => goTo(v)}>
                    {body}
                  </button>
                ) : (
                  <span className="ui-stepper__header" aria-controls={isCurrent ? panelId : undefined}>
                    {body}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        {active && (
          <div id={panelId} role="region" aria-labelledby={headingId} className="ui-stepper__panel">
            <Heading ref={headingRef} id={headingId} tabIndex={-1} className="ui-stepper__heading">
              {active.props.label}
            </Heading>
            {active.props.children}
          </div>
        )}
      </div>
    </StepperContext.Provider>
  );
}

Stepper.Step = StepperStep;
