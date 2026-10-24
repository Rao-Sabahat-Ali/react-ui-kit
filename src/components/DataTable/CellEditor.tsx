import { useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react';
import type { CellEditorContext } from './types';

const CONTROL = 'input, select, textarea, button, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

interface CellEditorProps<T> {
  row: T;
  label: string;
  initialValue: unknown;
  render: (ctx: CellEditorContext<T>) => ReactNode;
  /** Return false when the value was rejected (editor stays open, invalid). */
  onCommit: (value: unknown, viaBlur?: boolean) => boolean;
  onCancel: () => void;
  /** Commit and move to the next (or previous) editable cell. */
  onTab: (value: unknown, backwards: boolean) => boolean;
}

const control = (root: HTMLElement | null) => root?.querySelector<HTMLElement>(CONTROL) ?? null;

/** Inline cell editor (editMode="cell"): Enter commits, Escape cancels, Tab moves on, blur outside commits. */
export function CellEditor<T>({ row, label, initialValue, render, onCommit, onCancel, onTab }: CellEditorProps<T>) {
  const [value, setValue] = useState<unknown>(initialValue);
  const [invalid, setInvalid] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  // Set once the editor is closing so the unmount blur does not commit a second time.
  const done = useRef(false);

  useLayoutEffect(() => {
    const el = control(rootRef.current);
    if (!el) return;
    if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby') && !(el as HTMLInputElement).labels?.length) el.setAttribute('aria-label', label);
    el.focus();
    if (el instanceof HTMLInputElement && typeof el.select === 'function') el.select();
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = control(rootRef.current);
    if (!el) return;
    if (invalid) el.setAttribute('aria-invalid', 'true');
    else el.removeAttribute('aria-invalid');
  }, [invalid]);

  const commit = (next: unknown = valueRef.current, viaBlur = false): boolean => {
    if (done.current) return true;
    const ok = onCommit(next, viaBlur);
    if (ok) done.current = true;
    else {
      setInvalid(true);
      control(rootRef.current)?.focus();
    }
    return ok;
  };

  const cancel = () => {
    if (done.current) return;
    done.current = true;
    onCancel();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.nativeEvent.isComposing) {
      e.stopPropagation();
      return;
    }
    if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      e.stopPropagation();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      if (done.current) return;
      if (onTab(valueRef.current, e.shiftKey)) done.current = true;
      else setInvalid(true);
    } else {
      // Keep grid navigation keys inside the editor.
      e.stopPropagation();
    }
  };

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && rootRef.current?.contains(next)) return;
    // Focus moved into a popup opened by the editor (e.g. a date picker) — not a blur outside.
    if (next instanceof Element && next.closest('.ui-popover-root, [role="listbox"], [role="dialog"]')) return;
    if (!rootRef.current?.isConnected) return;
    commit(valueRef.current, true);
  };

  return (
    // Key handling for the composite editor; the focusable control inside receives the events.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div ref={rootRef} className="ui-data-table__editor" onKeyDown={onKeyDown} onBlur={onBlur}>
      {render({
        value,
        onChange: (v) => {
          valueRef.current = v;
          setValue(v);
          if (invalid) setInvalid(false);
        },
        onCommit: () => commit(),
        onCancel: cancel,
        row,
        'aria-label': label,
        invalid,
      })}
    </div>
  );
}
