import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode, type Ref, type RefObject } from 'react';
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { isPlainClick } from '../../utils/navigation';

export interface TocItem {
  id: string;
  label: ReactNode;
  children?: TocItem[];
}

export interface TableOfContentsProps {
  /** Explicit, optionally nested items. */
  items?: TocItem[];
  /** Container (selector, element or ref) whose headings are scanned when `items` is absent. */
  from?: string | HTMLElement | RefObject<HTMLElement | null> | null;
  /** Selector scanned inside `from`; the heading level decides the nesting. */
  headings?: string;
  /** Accessible name and visible title. */
  label?: string;
  hideTitle?: boolean;
  sticky?: boolean;
  /** px kept above the target when scrolling and for the scrollspy line. */
  offset?: number;
  /** Replaces the default hash update (client-side routers); scrolling and focus still happen. */
  onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  onActiveChange?: (id: string | null) => void;
  className?: string;
  ref?: Ref<HTMLElement>;
}

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

function resolveContainer(from: TableOfContentsProps['from']): HTMLElement | null {
  if (!from || typeof document === 'undefined') return null;
  if (typeof from === 'string') {
    try {
      return document.querySelector<HTMLElement>(from);
    } catch {
      // Invalid selector: treated as no container.
      return null;
    }
  }
  if (from instanceof HTMLElement) return from;
  return from.current;
}

/** The tree plus the heading elements found by the scan (ids can be shadowed by DOM clobbering, elements cannot). */
interface Scan {
  items: TocItem[];
  elements: Map<string, HTMLElement>;
}

function scan(container: HTMLElement, selector: string): Scan {
  const roots: TocItem[] = [];
  const elements = new Map<string, HTMLElement>();
  const stack: { level: number; item: TocItem }[] = [];
  let found: HTMLElement[] = [];
  try {
    found = Array.from(container.querySelectorAll<HTMLElement>(selector));
  } catch {
    // Invalid selector: no headings.
  }
  found.forEach((el) => {
    const text = el.textContent?.trim() ?? '';
    if (!text) return;
    if (!el.id) {
      const base = `toc-${slugify(text) || 'section'}`;
      let id = base;
      for (let n = 2; document.getElementById(id); n++) id = `${base}-${n}`;
      el.id = id;
    }
    const match = /^H([1-6])$/.exec(el.tagName);
    const level = match ? Number(match[1]) : Number(el.getAttribute('aria-level')) || 2;
    elements.set(el.id, el);
    const item: TocItem = { id: el.id, label: text };
    while (stack.length && stack[stack.length - 1]!.level >= level) stack.pop();
    const parent = stack[stack.length - 1];
    if (parent) (parent.item.children ??= []).push(item);
    else roots.push(item);
    stack.push({ level, item });
  });
  return { items: roots, elements };
}

const flatten = (items: TocItem[]): string[] => items.flatMap((i) => [i.id, ...flatten(i.children ?? [])]);

export function TableOfContents({ items, from, headings = 'h2, h3', label, hideTitle = false, sticky = false, offset = 16, onNavigate, onActiveChange, className, ref }: TableOfContentsProps) {
  const { t } = useLocale();
  const reduced = usePrefersReducedMotion();
  const name = label ?? t('onThisPage');
  const [scanned, setScanned] = useState<TocItem[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const list = items ?? scanned;
  // Heading elements found by the scan, so neither the scrollspy nor click handling goes through `getElementById` for them.
  const scannedElements = useRef(new Map<string, HTMLElement>());
  const lookup = useCallback((id: string): HTMLElement | null => scannedElements.current.get(id) ?? document.getElementById(id), []);
  const ids = useMemo(() => flatten(list), [list]);
  const idKey = ids.join('\u0000');

  // Build items from the headings of `from`, and keep them current when the content changes.
  useEffect(() => {
    if (items) return;
    const container = resolveContainer(from);
    if (!container) {
      scannedElements.current = new Map();
      setScanned([]);
      return;
    }
    const run = () => {
      const result = scan(container, headings);
      scannedElements.current = result.elements;
      const next = result.items;
      setScanned((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    run();
    if (typeof MutationObserver === 'undefined') return;
    let frame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(run);
    });
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [items, from, headings]);

  // Scrollspy: the current section is the last heading above the offset line.
  useEffect(() => {
    const els = idKey ? idKey.split('\u0000').map((id) => lookup(id)).filter((e): e is HTMLElement => !!e) : [];
    if (els.length === 0 || typeof IntersectionObserver === 'undefined') {
      setActive(null);
      return;
    }
    const compute = () => {
      const line = offset + 8;
      let current: HTMLElement | null = null;
      for (const el of els) {
        if (el.getBoundingClientRect().top <= line) current = el;
        else break;
      }
      if (!current && els[0]!.getBoundingClientRect().top < window.innerHeight) current = els[0]!;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom && window.scrollY > 0) current = els[els.length - 1]!;
      setActive(current ? current.id : null);
    };
    const observer = new IntersectionObserver(compute, { rootMargin: `-${offset}px 0px -60% 0px`, threshold: [0, 1] });
    els.forEach((el) => observer.observe(el));
    compute();
    return () => observer.disconnect();
  }, [idKey, offset, lookup]);

  const activeRef = useRef(onActiveChange);
  activeRef.current = onActiveChange;
  const lastReported = useRef<string | null>(null);
  useEffect(() => {
    if (lastReported.current === active) return;
    lastReported.current = active;
    activeRef.current?.(active);
  }, [active]);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, id: string) => {
      if (!isPlainClick(event)) return;
      const target = lookup(id);
      if (!target) return;
      event.preventDefault();
      target.style.scrollMarginBlockStart = `${offset}px`;
      target.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      }
      target.focus({ preventScroll: true });
      const href = `#${id}`;
      if (onNavigate) onNavigate(href, event);
      else window.history.pushState(null, '', href);
      setActive(id);
    },
    [offset, onNavigate, reduced, lookup],
  );

  const render = (nodes: TocItem[], depth: number): ReactNode => (
    <ol className={cx('ui-toc__list', depth > 0 && 'ui-toc__list--nested')}>
      {nodes.map((item) => (
        <li key={item.id} className="ui-toc__item">
          <a href={`#${item.id}`} className="ui-toc__link" aria-current={active === item.id ? 'location' : undefined} onClick={(e) => handleClick(e, item.id)}>
            {item.label}
          </a>
          {item.children && item.children.length > 0 && render(item.children, depth + 1)}
        </li>
      ))}
    </ol>
  );

  return (
    <nav ref={ref} aria-label={name} className={cx('ui-toc', sticky && 'ui-toc--sticky', className)} style={sticky ? ({ '--ui-toc-offset': `${offset}px` } as CSSProperties) : undefined}>
      <p className={cx('ui-toc__title', hideTitle && 'visually-hidden')}>{name}</p>
      {list.length > 0 && render(list, 0)}
    </nav>
  );
}
