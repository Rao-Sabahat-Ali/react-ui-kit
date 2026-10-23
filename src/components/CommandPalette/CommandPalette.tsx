import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { useControllableState } from '../../hooks/useControllableState';
import { useOverlay } from '../../hooks/useOverlay';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { safeUrl } from '../../utils/url';
import { Icon, type IconName } from '../Icon/Icon';
import { Portal } from '../Portal/Portal';

/** Local English default until a locale key exists (`commandPaletteHint`). */
const DEFAULT_HINT = '↑↓ to navigate · Enter to run · Esc to close';

export interface Command {
  id: string;
  label: string;
  group?: string;
  description?: string;
  keywords?: string[];
  icon?: IconName | ReactNode;
  /** Display only, e.g. `['Mod', 'S']`. */
  shortcut?: string[];
  disabled?: boolean;
  run?: () => void | Promise<void>;
  href?: string;
}

export interface CommandPaletteLabels {
  title: string;
  recent: string;
  loading: string;
  hint: string;
}

export interface CommandPaletteProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  commands?: Command[];
  onSearch?: (query: string, signal: AbortSignal) => Promise<Command[]>;
  searchDebounce?: number;
  minQueryLength?: number;
  filter?: (command: Command, query: string) => boolean | number;
  recent?: Command[];
  maxRecent?: number;
  onRun?: (command: Command) => void;
  /** Global shortcut; `Mod` = Cmd on Apple platforms, Ctrl elsewhere. `false` disables. */
  hotkey?: string | false;
  closeOnRun?: boolean;
  placeholder?: string;
  emptyMessage?: ReactNode;
  labels?: Partial<CommandPaletteLabels>;
  itemTemplate?: (command: Command, ctx: { active: boolean; query: string }) => ReactNode;
  /** Router navigation for `href` commands; falls back to `location.assign`. */
  onNavigate?: (href: string) => void;
  className?: string;
}

export const isApplePlatform = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

export const defaultCommandFilter = (command: Command, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [command.label, ...(command.keywords ?? [])].some((s) => s.toLowerCase().includes(q));
};

function matchesHotkey(event: globalThis.KeyboardEvent, hotkey: string, apple: boolean): boolean {
  const parts = hotkey.split('+').map((p) => p.trim().toLowerCase());
  const key = parts[parts.length - 1];
  const want = { ctrl: false, meta: false, shift: false, alt: false };
  for (const p of parts.slice(0, -1)) {
    if (p === 'mod') want[apple ? 'meta' : 'ctrl'] = true;
    else if (p === 'ctrl' || p === 'control') want.ctrl = true;
    else if (p === 'meta' || p === 'cmd' || p === 'command') want.meta = true;
    else if (p === 'shift') want.shift = true;
    else if (p === 'alt' || p === 'option') want.alt = true;
  }
  return (
    event.key.toLowerCase() === key && event.ctrlKey === want.ctrl && event.metaKey === want.meta && event.shiftKey === want.shift && event.altKey === want.alt
  );
}

const ARIA_KEY: Record<string, string> = { mod: '', ctrl: 'Control', control: 'Control', meta: 'Meta', cmd: 'Meta', command: 'Meta', shift: 'Shift', alt: 'Alt', option: 'Alt', enter: 'Enter', esc: 'Escape', escape: 'Escape' };

function ariaShortcut(keys: string[], apple: boolean): string {
  return keys
    .map((k) => {
      const lower = k.toLowerCase();
      if (lower === 'mod') return apple ? 'Meta' : 'Control';
      return ARIA_KEY[lower] ?? (k.length === 1 ? k.toUpperCase() : k);
    })
    .join('+');
}

interface Row {
  command: Command;
  /** Unique option id suffix (recent and results may contain the same command). */
  key: string;
  section: string | undefined;
}

const PAGE = 10;

export function CommandPalette(props: CommandPaletteProps) {
  const { open: openProp, defaultOpen = false, onOpenChange, hotkey = 'Mod+K' } = props;
  const [open, setOpen] = useControllableState<boolean>(openProp, defaultOpen, onOpenChange);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (hotkey === false) return;
    const apple = isApplePlatform();
    const handler = (event: globalThis.KeyboardEvent) => {
      if (!matchesHotkey(event, hotkey, apple)) return;
      if (!openRef.current) {
        // Another modal owns focus: leave the shortcut alone.
        const modal = document.querySelector('[aria-modal="true"]');
        if (modal) return;
      }
      event.preventDefault();
      setOpen(!openRef.current);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [hotkey, setOpen]);

  if (!open) return null;
  return <PaletteInner {...props} close={() => setOpen(false)} />;
}

function PaletteInner({
  close,
  commands = [],
  onSearch,
  searchDebounce = 200,
  minQueryLength = 1,
  filter = defaultCommandFilter,
  recent,
  maxRecent = 5,
  onRun,
  closeOnRun = true,
  placeholder,
  emptyMessage,
  labels: labelsProp,
  itemTemplate,
  onNavigate,
  className,
}: CommandPaletteProps & { close: () => void }) {
  const { t, tp } = useLocale();
  const labels: CommandPaletteLabels = { title: t('commandPalette'), recent: t('recent'), loading: t('loading'), hint: DEFAULT_HINT, ...labelsProp };
  const apple = useMemo(isApplePlatform, []);
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const listboxId = `${baseId}-listbox`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const backdropDown = useRef(false);
  const [query, setQuery] = useState('');
  const [asyncResults, setAsyncResults] = useState<Command[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef(0);

  const queryRef = useRef(query);
  queryRef.current = query;
  useOverlay({
    rootRef,
    contentRef,
    initialFocus: inputRef,
    onEscape: () => {
      if (queryRef.current) setQuery('');
      else close();
    },
  });

  // ---------- async search ----------
  useEffect(() => {
    window.clearTimeout(timer.current);
    controller.current?.abort();
    controller.current = null;
    if (!onSearch || query.trim().length < minQueryLength) {
      setAsyncResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = window.setTimeout(() => {
      const ctrl = new AbortController();
      controller.current = ctrl;
      let promise: Promise<Command[]>;
      try {
        promise = onSearch(query, ctrl.signal);
      } catch {
        promise = Promise.resolve([]);
      }
      Promise.resolve(promise).then(
        (results) => {
          if (ctrl.signal.aborted) return;
          setAsyncResults(Array.isArray(results) ? results : []);
          setLoading(false);
        },
        () => {
          // Abort or failure: no async results (static results remain).
          if (ctrl.signal.aborted) return;
          setAsyncResults([]);
          setLoading(false);
        },
      );
    }, searchDebounce);
    return () => {
      window.clearTimeout(timer.current);
      controller.current?.abort();
    };
    // onSearch identity changes each render for inline handlers; the query drives searching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, minQueryLength, searchDebounce]);

  // ---------- results ----------
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const q = query.trim();
    if (!q && recent && recent.length > 0) {
      for (const c of recent.slice(0, maxRecent)) out.push({ command: c, key: `r-${c.id}`, section: labels.recent });
    }
    const ranked = commands
      .map((c, i) => ({ c, i, score: filter(c, q) }))
      .filter((x) => x.score !== false && x.score !== 0)
      .sort((a, b) => (typeof b.score === 'number' ? b.score : 1) - (typeof a.score === 'number' ? a.score : 1) || a.i - b.i)
      .map((x) => x.c);
    const seen = new Set(ranked.map((c) => c.id));
    const merged = [...ranked, ...asyncResults.filter((c) => !seen.has(c.id))];
    // Ungrouped first, then groups in first-appearance order.
    const groupOrder: string[] = [];
    for (const c of merged) if (c.group && !groupOrder.includes(c.group)) groupOrder.push(c.group);
    for (const c of merged.filter((c) => !c.group)) out.push({ command: c, key: `c-${c.id}`, section: undefined });
    for (const g of groupOrder) for (const c of merged.filter((x) => x.group === g)) out.push({ command: c, key: `c-${c.id}`, section: g });
    return out;
    // labels.recent is derived from locale/props and stable in practice
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, commands, recent, maxRecent, asyncResults, filter]);

  const enabled = rows.filter((r) => !r.command.disabled);
  const activeRow = rows.find((r) => r.key === activeKey && !r.command.disabled);

  // First enabled result becomes active when results change.
  const rowsKey = rows.map((r) => r.key).join('|');
  useEffect(() => {
    setActiveKey(enabled[0]?.key ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsKey]);

  const optionId = (key: string) => `${baseId}-opt-${key}`;
  useEffect(() => {
    if (activeKey) document.getElementById(optionId(activeKey))?.scrollIntoView?.({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  const runCommand = (command: Command) => {
    if (command.disabled) return;
    try {
      const result = command.run ? command.run() : command.href ? navigate(command.href) : undefined;
      if (result instanceof Promise) result.catch((error: unknown) => console.error(error));
    } finally {
      onRun?.(command);
      if (closeOnRun) close();
    }
  };

  const navigate = (href: string) => {
    if (onNavigate) onNavigate(href);
    else {
      const url = safeUrl(href);
      if (url) window.location.assign(url);
    }
  };

  const move = (delta: number, wrap: boolean) => {
    if (enabled.length === 0) return;
    const pos = enabled.findIndex((r) => r.key === activeRow?.key);
    let next: number;
    if (pos === -1) next = delta > 0 ? 0 : enabled.length - 1;
    else if (wrap) next = (pos + delta + enabled.length) % enabled.length;
    else next = Math.min(Math.max(pos + delta, 0), enabled.length - 1);
    setActiveKey(enabled[next]!.key);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        move(1, true);
        break;
      case 'ArrowUp':
        event.preventDefault();
        move(-1, true);
        break;
      case 'PageDown':
        event.preventDefault();
        move(PAGE, false);
        break;
      case 'PageUp':
        event.preventDefault();
        move(-PAGE, false);
        break;
      case 'Home':
      case 'End':
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        setActiveKey((event.key === 'Home' ? enabled[0] : enabled[enabled.length - 1])?.key ?? null);
        break;
      case 'Enter':
        if (!activeRow) return;
        event.preventDefault();
        runCommand(activeRow.command);
        break;
      default:
    }
  };

  const keyLabel = (k: string) => {
    const lower = k.toLowerCase();
    if (lower === 'mod') return apple ? '⌘' : t('keyCtrl');
    if (lower === 'ctrl' || lower === 'control') return t('keyCtrl');
    if (lower === 'shift') return apple ? '⇧' : t('keyShift');
    if (lower === 'alt' || lower === 'option') return apple ? '⌥' : t('keyAlt');
    if (lower === 'meta' || lower === 'cmd' || lower === 'command') return apple ? '⌘' : t('keyCommand');
    if (lower === 'enter') return t('keyEnter');
    if (lower === 'esc' || lower === 'escape') return t('keyEscape');
    return k.length === 1 ? k.toUpperCase() : k;
  };

  const renderOption = (row: Row) => {
    const { command } = row;
    const active = row.key === activeRow?.key;
    const descId = command.description ? `${optionId(row.key)}-desc` : undefined;
    return (
      <div
        key={row.key}
        id={optionId(row.key)}
        role="option"
        aria-selected={active}
        aria-disabled={command.disabled || undefined}
        aria-describedby={descId}
        aria-keyshortcuts={command.shortcut ? ariaShortcut(command.shortcut, apple) : undefined}
        className={cx('list-group-item list-group-item-action ui-command-palette__item', active && 'ui-command-palette__item--active', command.disabled && 'disabled')}
        onPointerDown={(e) => e.preventDefault()}
        onPointerMove={() => !command.disabled && setActiveKey(row.key)}
        onClick={() => runCommand(command)}
      >
        {itemTemplate ? (
          itemTemplate(command, { active, query })
        ) : (
          <>
            {command.icon !== undefined && (
              <span className="ui-command-palette__icon" aria-hidden="true">
                {typeof command.icon === 'string' ? <Icon name={command.icon} /> : command.icon}
              </span>
            )}
            <span className="ui-command-palette__text">
              <span className="ui-command-palette__label">
                <Highlight text={command.label} query={query} />
              </span>
              {command.description && (
                <span id={descId} className="ui-command-palette__description">
                  {command.description}
                </span>
              )}
            </span>
            {command.shortcut && (
              <span className="ui-command-palette__shortcut" aria-hidden="true">
                {command.shortcut.map((k, i) => (
                  <kbd key={`${k}-${i}`} className="ui-command-palette__kbd">
                    {keyLabel(k)}
                  </kbd>
                ))}
              </span>
            )}
          </>
        )}
      </div>
    );
  };

  // Group consecutive rows by section.
  const sections: { name: string | undefined; rows: Row[] }[] = [];
  for (const row of rows) {
    const last = sections[sections.length - 1];
    if (last && last.name === row.section) last.rows.push(row);
    else sections.push({ name: row.section, rows: [row] });
  }

  const status = loading ? labels.loading : query.trim() ? tp('resultsCount', rows.length) : '';
  const hasResults = rows.length > 0;

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (backdropDown.current && event.target === event.currentTarget) close();
    backdropDown.current = false;
  };

  return (
    <Portal>
      <div ref={rootRef} className={cx('ui-command-palette-root', className)}>
        <div className="modal-backdrop show ui-command-palette__backdrop" />
        <div
          className="modal d-block ui-command-palette"
          onMouseDown={(e) => (backdropDown.current = e.target === e.currentTarget)}
          onClick={handleBackdropClick}
        >
          <div className="modal-dialog modal-lg modal-fullscreen-sm-down ui-command-palette__dialog">
            <div ref={contentRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="modal-content ui-command-palette__content">
              <h2 id={titleId} className="visually-hidden">
                {labels.title}
              </h2>
              <div className="ui-command-palette__search-wrap">
                <Icon name="search" className="ui-command-palette__search-icon" />
                <input
                  ref={inputRef}
                  type="text"
                  role="combobox"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={placeholder ?? t('commandPaletteSearch')}
                  aria-expanded={hasResults}
                  aria-controls={listboxId}
                  aria-autocomplete="list"
                  aria-activedescendant={activeRow ? optionId(activeRow.key) : undefined}
                  placeholder={placeholder ?? t('commandPaletteSearch')}
                  className="form-control ui-command-palette__search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="modal-body ui-command-palette__body">
                <div id={listboxId} role="listbox" aria-label={labels.title} className="list-group list-group-flush ui-command-palette__list">
                  {sections.map((section, i) =>
                    section.name ? (
                      <div key={`${section.name}-${i}`} role="group" aria-labelledby={`${baseId}-group-${i}`} className="ui-command-palette__group">
                        <div id={`${baseId}-group-${i}`} role="presentation" className="ui-command-palette__group-label">
                          {section.name}
                        </div>
                        {section.rows.map(renderOption)}
                      </div>
                    ) : (
                      section.rows.map(renderOption)
                    ),
                  )}
                </div>
                {!hasResults && !loading && <div className="ui-command-palette__empty">{emptyMessage ?? t('noResults')}</div>}
                {loading && !hasResults && <div className="ui-command-palette__loading" aria-hidden="true">{labels.loading}</div>}
              </div>
              <div role="status" aria-live="polite" className="visually-hidden">
                {status}
              </div>
              <div className="ui-command-palette__footer" aria-hidden="true">
                {labels.hint}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/** Bold the first case-insensitive match of the query. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="ui-command-palette__match">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}
