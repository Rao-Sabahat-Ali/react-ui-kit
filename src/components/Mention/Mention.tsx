import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useControllableState } from '../../hooks/useControllableState';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { useFieldControl } from '../Field/Field';
import { Portal } from '../Portal/Portal';

export interface MentionProps<T> extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'defaultValue' | 'onChange' | 'ref'> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  triggers?: string[];
  suggestions: T[];
  onSearch?: (trigger: string, query: string) => void;
  /** Text inserted after the trigger. */
  getOptionLabel?: (item: T) => string;
  itemTemplate?: (item: T) => ReactNode;
  emptyMessage?: ReactNode;
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

interface ActiveMention {
  trigger: string;
  /** Index of the trigger character. */
  start: number;
  query: string;
}

/** Find a trigger before the caret that starts a word and has no whitespace up to the caret. */
export function findMention(text: string, caret: number, triggers: string[]): ActiveMention | null {
  const before = text.slice(0, caret);
  for (let i = before.length - 1; i >= 0; i--) {
    const ch = before[i]!;
    if (/\s/.test(ch)) return null;
    const trigger = triggers.find((tr) => before.startsWith(tr, i));
    if (trigger && (i === 0 || /\s/.test(before[i - 1]!))) return { trigger, start: i, query: before.slice(i + trigger.length) };
  }
  return null;
}

const MIRROR_PROPS = [
  'boxSizing', 'width', 'height', 'overflowX', 'overflowY', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
  'lineHeight', 'fontFamily', 'textAlign', 'textTransform', 'textIndent', 'letterSpacing', 'wordSpacing', 'direction', 'tabSize',
] as const;

/** Caret position relative to the textarea's border box (mirror-div technique). */
export function getCaretCoordinates(el: HTMLTextAreaElement, position: number): { top: number; left: number; height: number } {
  const mirror = document.createElement('div');
  const computed = getComputedStyle(el);
  for (const prop of MIRROR_PROPS) mirror.style[prop] = computed[prop];
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflowWrap = 'break-word';
  mirror.style.top = '0';
  mirror.style.left = '-9999px';
  mirror.textContent = el.value.slice(0, position);
  const marker = document.createElement('span');
  marker.textContent = el.value.slice(position) || '.';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.5 || 20;
  const coords = { top: marker.offsetTop - el.scrollTop, left: marker.offsetLeft - el.scrollLeft, height: lineHeight };
  mirror.remove();
  return coords;
}

export function Mention<T>({
  value: valueProp,
  defaultValue = '',
  onChange,
  triggers = ['@'],
  suggestions,
  onSearch,
  getOptionLabel = String,
  itemTemplate,
  emptyMessage,
  invalid,
  className,
  id,
  rows = 3,
  ref,
  onKeyDown,
  onBlur,
  ...rest
}: MentionProps<T>) {
  const { t } = useLocale();
  const control = useFieldControl({ id, invalid, required: rest.required, 'aria-describedby': rest['aria-describedby'] });
  const [value, setValue] = useControllableState<string>(valueProp, defaultValue, onChange);
  const listboxId = useId();
  const [mention, setMention] = useState<ActiveMention | null>(null);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const pendingCaret = useRef<number | null>(null);
  const lastSearch = useRef<string | null>(null);

  const open = mention !== null && mention.start !== dismissedAt;

  const inspect = (text: string, caret: number) => {
    const found = findMention(text, caret, triggers);
    setMention(found);
    if (!found) {
      setDismissedAt(null);
      lastSearch.current = null;
      return;
    }
    const key = `${found.start}:${found.trigger}${found.query}`;
    if (key !== lastSearch.current && found.start !== dismissedAt) {
      lastSearch.current = key;
      setActiveIndex(0);
      onSearch?.(found.trigger, found.query);
    }
  };

  // Position the panel under the caret at the trigger.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!open || !el || !mention) return;
    const rect = el.getBoundingClientRect();
    const caret = getCaretCoordinates(el, mention.start);
    setPos({ top: rect.top + caret.top + caret.height, left: rect.left + caret.left });
  }, [open, mention]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (pendingCaret.current === null || !el) return;
    el.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  }, [value]);

  useEffect(() => {
    if (activeIndex >= suggestions.length) setActiveIndex(0);
  }, [suggestions.length, activeIndex]);

  const close = () => setDismissedAt(mention?.start ?? null);

  const choose = (item: T | undefined) => {
    const el = textareaRef.current;
    if (item === undefined || !mention || !el) return;
    const caret = el.selectionStart ?? value.length;
    const inserted = `${mention.trigger}${getOptionLabel(item)} `;
    const next = value.slice(0, mention.start) + inserted + value.slice(caret);
    pendingCaret.current = mention.start + inserted.length;
    setMention(null);
    setDismissedAt(null);
    lastSearch.current = null;
    setValue(next);
    el.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !open) return;
    const n = suggestions.length;
    switch (event.key) {
      case 'ArrowDown':
        if (n === 0) return;
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % n);
        break;
      case 'ArrowUp':
        if (n === 0) return;
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + n) % n);
        break;
      case 'Enter':
      case 'Tab':
        if (n === 0) return;
        event.preventDefault();
        choose(suggestions[activeIndex]);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        close();
        break;
      default:
    }
  };

  useClickOutside([textareaRef, panelRef], close, open);

  const setRefs = (node: HTMLTextAreaElement | null) => {
    textareaRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as { current: unknown }).current = node;
  };

  const optionId = (i: number) => `${listboxId}-opt-${i}`;
  const comboProps = open
    ? {
        role: 'combobox' as const,
        'aria-expanded': true,
        'aria-controls': listboxId,
        'aria-autocomplete': 'list' as const,
        'aria-activedescendant': suggestions.length > 0 ? optionId(activeIndex) : undefined,
      }
    : {};

  return (
    <div className={cx('ui-mention', className)}>
      <textarea
        ref={setRefs}
        id={control.id}
        rows={rows}
        {...rest}
        {...comboProps}
        aria-describedby={control.describedBy}
        aria-invalid={control.invalid || undefined}
        aria-required={control.required || undefined}
        className={cx('form-control ui-mention__input', control.invalid && 'is-invalid')}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          inspect(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onSelect={(e) => {
          const el = e.currentTarget;
          if (el.selectionStart === el.selectionEnd) inspect(el.value, el.selectionStart);
        }}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          onBlur?.(e);
          if (!panelRef.current?.contains(e.relatedTarget as Node | null)) setMention(null);
        }}
      />
      {open && (
        <Portal>
          <div ref={panelRef} className="dropdown-menu show ui-mention__panel" style={{ position: 'fixed', top: pos.top, left: pos.left } as CSSProperties}>
            <ul id={listboxId} role="listbox" aria-label={mention.trigger} className="list-unstyled mb-0 ui-mention__list">
              {suggestions.map((item, index) => (
                // Pointer convenience; keyboard handled by the focused control (aria-activedescendant / roving focus, covered by AC tests).
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={optionId(index)}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={cx('dropdown-item ui-mention__option', index === activeIndex && 'active')}
                  onPointerDown={(e) => e.preventDefault()}
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => choose(item)}
                >
                  {itemTemplate ? itemTemplate(item) : getOptionLabel(item)}
                </li>
              ))}
            </ul>
            {suggestions.length === 0 && <div className="dropdown-item-text text-body-secondary ui-mention__empty">{emptyMessage ?? t('noResults')}</div>}
          </div>
        </Portal>
      )}
    </div>
  );
}
