import { Children, createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ElementType, type HTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import { cx } from '../../utils/cx';

export interface AccordionItemData {
  value: string;
  header: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface AccordionProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  multiple?: boolean;
  /** `string | null` in single mode, `string[]` when `multiple`. */
  value?: string | string[] | null;
  defaultValue?: string | string[] | null;
  onChange?: (value: string | string[] | null) => void;
  flush?: boolean;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  items?: AccordionItemData[];
  ref?: Ref<HTMLDivElement>;
}

interface AccordionContextValue {
  isOpen: (value: string) => boolean;
  toggle: (value: string) => void;
  headingLevel: number;
  regions: boolean;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

const toArray = (v: string | string[] | null | undefined): string[] => (v === null || v === undefined ? [] : Array.isArray(v) ? v : [v]);
const TRIGGER_SELECTOR = '.ui-accordion__trigger:not(:disabled)';

export function Accordion({ multiple = false, value, defaultValue, onChange, flush = false, headingLevel = 3, items, className, children, ref, onKeyDown, ...rest }: AccordionProps) {
  const [open, setOpen] = useControllableState<string[]>(
    value === undefined ? undefined : toArray(value),
    toArray(defaultValue),
    (next) => onChange?.(multiple ? next : (next[0] ?? null)),
  );
  const rootRef = useRef<HTMLDivElement | null>(null);

  const toggle = useCallback(
    (v: string) => {
      const isOpen = open.includes(v);
      if (multiple) setOpen(isOpen ? open.filter((x) => x !== v) : [...open, v]);
      else setOpen(isOpen ? [] : [v]);
    },
    [open, multiple, setOpen],
  );

  const count = items ? items.length : Children.toArray(children).length;
  const ctx: AccordionContextValue = { isOpen: (v) => open.includes(v), toggle, headingLevel, regions: count <= 6 };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !(event.target instanceof HTMLElement) || !event.target.matches('.ui-accordion__trigger')) return;
    const triggers = Array.from(rootRef.current?.querySelectorAll<HTMLElement>(TRIGGER_SELECTOR) ?? []);
    const index = triggers.indexOf(event.target);
    let target = -1;
    if (event.key === 'ArrowDown') target = (index + 1) % triggers.length;
    else if (event.key === 'ArrowUp') target = (index - 1 + triggers.length) % triggers.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = triggers.length - 1;
    if (target >= 0) {
      event.preventDefault();
      triggers[target]?.focus();
    }
  };

  return (
    <AccordionContext.Provider value={ctx}>
      <div
        ref={(node) => {
          rootRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cx('accordion ui-accordion', flush && 'accordion-flush', className)}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        {items ? items.map((item) => <AccordionItem key={item.value} value={item.value} header={item.header} disabled={item.disabled}>{item.content}</AccordionItem>) : children}
      </div>
    </AccordionContext.Provider>
  );
}

export interface AccordionItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  value: string;
  header: ReactNode;
  disabled?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

const CLOSE_MS = 250;

export function AccordionItem({ value, header, disabled = false, className, children, ref, ...rest }: AccordionItemProps) {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error('Accordion.Item must be used inside <Accordion>');
  const uid = useId();
  const triggerId = `${uid}-trigger`;
  const panelId = `${uid}-panel`;
  const reduced = usePrefersReducedMotion();
  const open = ctx.isOpen(value);
  const [mounted, setMounted] = useState(open);
  const Heading = `h${ctx.headingLevel}` as ElementType;

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (reduced) {
      setMounted(false);
      return;
    }
    const id = setTimeout(() => setMounted(false), CLOSE_MS);
    return () => clearTimeout(id);
  }, [open, reduced]);

  const closing = !open && mounted;

  return (
    <div ref={ref} className={cx('accordion-item ui-accordion__item', open && 'ui-accordion__item--open', className)} {...rest}>
      <Heading className="accordion-header ui-accordion__header">
        <button
          type="button"
          id={triggerId}
          className={cx('accordion-button ui-accordion__trigger', !open && 'collapsed')}
          aria-expanded={open}
          aria-controls={panelId}
          disabled={disabled}
          onClick={() => !disabled && ctx.toggle(value)}
        >
          {header}
        </button>
      </Heading>
      <div
        id={panelId}
        role={ctx.regions ? 'region' : undefined}
        aria-labelledby={ctx.regions ? triggerId : undefined}
        hidden={!open && !mounted}
        inert={closing}
        className={cx('accordion-collapse ui-accordion__collapse', open && 'ui-accordion__collapse--open', closing && 'ui-accordion__collapse--closing')}
      >
        <div className="ui-accordion__clip">
          <div className="accordion-body ui-accordion__body">{children}</div>
        </div>
      </div>
    </div>
  );
}

Accordion.Item = AccordionItem;
