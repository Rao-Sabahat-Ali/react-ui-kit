// Identity v2 behaviour of the overlay and menu components (presence, sliding marks, magnification, Turn).
import { readFileSync } from 'node:fs';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Breadcrumb } from './Breadcrumb/Breadcrumb';
import { CommandPalette } from './CommandPalette/CommandPalette';
import { ConfirmPopupProvider, useConfirmPopup } from './ConfirmPopup/ConfirmPopup';
import { Dock } from './Dock/Dock';
import { MegaMenu } from './MegaMenu/MegaMenu';
import { Popover } from './Popover/Popover';
import { Steps } from './Steps/Steps';
import { TableOfContents } from './TableOfContents/TableOfContents';
import { TabMenu } from './TabMenu/TabMenu';
import { Tour } from './Tour/Tour';

const read = (path: string) => readFileSync(`${process.cwd()}/src/components/${path}`, 'utf8');

/** Pretend the browser can run exit animations so usePresence keeps closing parts mounted. */
function enableAnimations() {
  (document as unknown as { getAnimations: unknown }).getAnimations = () => [];
}

describe('presence (enter and exit) of lifted parts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    enableAnimations();
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (document as unknown as { getAnimations?: unknown }).getAnimations;
  });

  it('Popover stays mounted, inert and closed during the exit, then unmounts', () => {
    render(<Popover title="Filters" trigger={<button type="button">Open</button>}>Body</Popover>);
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    const root = document.querySelector('.ui-popover-root')!;
    expect(root).toHaveAttribute('data-state', 'open');
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(document.querySelector('.ui-popover-root')).toHaveAttribute('data-state', 'closed');
    expect(document.querySelector('.ui-popover-root')).toHaveAttribute('inert');
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(document.querySelector('.ui-popover-root')).toBeNull();
  });

  it('ConfirmPopup resolves at once and plays its exit before unmounting', async () => {
    let result: boolean | undefined;
    function Host() {
      const confirmPopup = useConfirmPopup();
      return (
        <button
          type="button"
          onClick={(e) => {
            void confirmPopup({ target: e.currentTarget, message: 'Delete?' }).then((ok) => (result = ok));
          }}
        >
          Delete
        </button>
      );
    }
    render(
      <ConfirmPopupProvider>
        <Host />
      </ConfirmPopupProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result).toBe(true);
    expect(document.querySelector('.ui-confirm-popup-root')).toHaveAttribute('data-state', 'closed');
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(document.querySelector('.ui-confirm-popup-root')).toBeNull();
  });

  it('MegaMenu panel keeps its content during the exit and is then hidden', () => {
    render(<MegaMenu items={[{ label: 'Products', columns: [{ header: 'Kits', items: [{ label: 'Alpha', href: '/a' }] }] }]} />);
    const button = screen.getByRole('button', { name: /Products/ });
    fireEvent.click(button);
    const panel = document.querySelector('.ui-mega-menu__panel') as HTMLElement;
    expect(panel).not.toHaveAttribute('hidden');
    fireEvent.click(button);
    expect(panel).toHaveAttribute('data-state', 'closed');
    expect(panel).not.toHaveAttribute('hidden');
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(panel).toHaveAttribute('hidden');
  });

  it('CommandPalette exits with data-state closed and a reopening starts with an empty query', async () => {
    const commands = [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }];
    const { rerender } = render(<CommandPalette open commands={commands} onOpenChange={() => {}} hotkey={false} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'be' } });
    rerender(<CommandPalette open={false} commands={commands} onOpenChange={() => {}} hotkey={false} />);
    expect(document.querySelector('.ui-command-palette-root')).toHaveAttribute('data-state', 'closed');
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(document.querySelector('.ui-command-palette-root')).toBeNull();
    rerender(<CommandPalette open commands={commands} onOpenChange={() => {}} hotkey={false} />);
    expect(screen.getByRole('combobox')).toHaveValue('');
  });
});

describe('stylesheets', () => {
  it('floating parts are lifted: 2px line, lift shadow and an exit that is faster than the entrance', () => {
    const parts = read('../styles/_parts.scss');
    expect(parts).toMatch(/@mixin lifted[^}]*var\(--ui-line-width\) solid var\(--ui-color-line\)[^}]*var\(--ui-shadow-lift\)/s);
    expect(parts).toMatch(/@mixin pop-out\s*{\s*animation: ui-pop-out calc\(var\(--ui-motion-part\) \* 0\.7\) var\(--ui-easing-in\)/);
    for (const file of ['Popover/Popover', 'Tooltip/Tooltip', 'ConfirmPopup/ConfirmPopup', 'MegaMenu/MegaMenu', 'CommandPalette/CommandPalette', 'Dock/Dock']) {
      expect(read(`${file}.scss`)).toMatch(/parts\.lifted/);
    }
  });

  it('Tour ring is a 2px dashed accent guide line and never blurs the page', () => {
    const scss = read('Tour/Tour.scss');
    expect(scss).toMatch(/\.ui-tour__ring\s*{[^}]*outline: var\(--ui-line-width\) dashed var\(--ui-color-accent\)/s);
  });

  it('Dock magnification is transform-only and switched off under reduced motion', () => {
    const scss = read('Dock/Dock.scss');
    expect(scss).toMatch(/transform: translateX\(var\(--ui-dock-t, 0px\)\) scale\(var\(--ui-dock-s, 1\)\)/);
    expect(scss).toMatch(/prefers-reduced-motion: reduce\)\s*{\s*\.ui-dock--magnify \.ui-dock__item,[^}]*transform: none/s);
  });

  it('menu items share one highlight for hover and keyboard focus', () => {
    const scss = read('Menu/Menu.scss');
    expect(scss).toMatch(/&:hover,\s*&:focus,\s*&:focus-visible,[^{]*{\s*@include parts\.item-highlighted/);
  });
});

describe('Tour', () => {
  it('draws the step as a light numeral and keeps the full "Step n of m" for assistive technology', () => {
    document.body.innerHTML = '';
    render(
      <>
        <button type="button" id="t">Target</button>
        <Tour defaultOpen steps={[{ target: '#t', title: 'Hello', content: 'First' }]} />
      </>,
    );
    expect(document.querySelector('.ui-tour__numeral')).toHaveTextContent('1');
    expect(document.querySelector('.ui-tour__numeral')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('dialog')).toHaveTextContent('Step 1 of 1');
  });
});

describe('Breadcrumb', () => {
  it('draws the default separator as a line-art chevron icon, hidden from assistive technology', () => {
    render(<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Docs', href: '/docs' }, { label: 'Page' }]} />);
    const separators = document.querySelectorAll('.ui-breadcrumb__separator');
    expect(separators).toHaveLength(2);
    separators.forEach((sep) => {
      expect(sep).toHaveAttribute('aria-hidden', 'true');
      expect(sep.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('a string separator still uses the Bootstrap text divider', () => {
    render(<Breadcrumb separator="/" items={[{ label: 'Home', href: '/' }, { label: 'Page' }]} />);
    expect(document.querySelector('.ui-breadcrumb__separator')).toBeNull();
    expect(document.querySelector('.ui-breadcrumb')).toHaveClass('ui-breadcrumb--text-divider');
  });
});

describe('sliding accent marks', () => {
  afterEach(() => vi.restoreAllMocks());

  function mockRects(map: Record<string, DOMRect>) {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      for (const [selector, rect] of Object.entries(map)) if (this.matches(selector)) return rect;
      return DOMRect.fromRect({ x: 0, y: 0, width: 400, height: 40 });
    });
  }

  it('Steps places the mark under the current step and moves it with the selection', () => {
    mockRects({ '.ui-steps__item:nth-child(1)': DOMRect.fromRect({ x: 0, y: 0, width: 100, height: 40 }), '.ui-steps__item:nth-child(2)': DOMRect.fromRect({ x: 120, y: 0, width: 100, height: 40 }) });
    const items = [{ label: 'Cart' }, { label: 'Pay' }];
    const { rerender } = render(<Steps items={items} activeIndex={0} />);
    const list = screen.getByRole('list');
    expect(list.style.getPropertyValue('--ui-mark-pos')).toBe('0');
    expect(list.style.getPropertyValue('--ui-mark-size')).toBe('100');
    rerender(<Steps items={items} activeIndex={1} />);
    expect(list.style.getPropertyValue('--ui-mark-pos')).toBe('120');
  });

  it('TabMenu slides the mark to the current route', () => {
    mockRects({ '[aria-current="page"]': DOMRect.fromRect({ x: 80, y: 0, width: 60, height: 30 }) });
    render(<TabMenu variant="underline" items={[{ label: 'A', href: '/a' }, { label: 'B', href: '/b' }]} activeHref="/b" />);
    const list = document.querySelector('.ui-tab-menu__list') as HTMLElement;
    expect(list.style.getPropertyValue('--ui-mark-pos')).toBe('80');
    expect(list.style.getPropertyValue('--ui-mark-size')).toBe('60');
  });

  it('TableOfContents places the vertical marker on the active entry', () => {
    mockRects({ 'a[aria-current="location"]': DOMRect.fromRect({ x: 0, y: 36, width: 100, height: 24 }) });
    class IO {
      constructor(private cb: () => void) {}
      observe() {
        this.cb();
      }
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', IO);
    document.body.innerHTML = '<main id="doc"><h2 id="one">One</h2><h2 id="two">Two</h2></main>';
    render(<TableOfContents from="#doc" />);
    const track = document.querySelector('.ui-toc__list') as HTMLElement;
    expect(track.style.getPropertyValue('--ui-mark-pos')).toBe('36');
    expect(track.style.getPropertyValue('--ui-mark-size')).toBe('24');
    vi.unstubAllGlobals();
  });
});

describe('TabMenu Turn', () => {
  afterEach(() => {
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  });

  it('runs onNavigate inside a view transition of type ui-turn when the browser supports it', async () => {
    const start = vi.fn((arg: { update: () => void; types?: string[] } | (() => void)) => {
      (typeof arg === 'function' ? arg : arg.update)();
      return { finished: Promise.resolve(), ready: Promise.resolve() };
    });
    (document as unknown as { startViewTransition: unknown }).startViewTransition = start;
    const onNavigate = vi.fn();
    render(<TabMenu items={[{ label: 'A', href: '/a' }]} activeHref="/b" onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole('link', { name: 'A' }));
    expect(start).toHaveBeenCalledWith(expect.objectContaining({ types: ['ui-turn'] }));
    expect(onNavigate).toHaveBeenCalledWith('/a', expect.anything());
  });

  it('plain onNavigate still runs without View Transitions', async () => {
    const onNavigate = vi.fn();
    render(<TabMenu items={[{ label: 'A', href: '/a' }]} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole('link', { name: 'A' }));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});

describe('Dock magnification', () => {
  afterEach(() => vi.restoreAllMocks());

  it('scales the item nearest the pointer most and keeps neighbours apart with a transform shift', async () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
      const i = Array.from(this.parentElement?.children ?? []).indexOf(this);
      return i * 56;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(48);
    render(<Dock ariaLabel="Launcher" items={[{ label: 'A', icon: 'home' }, { label: 'B', icon: 'search' }, { label: 'C', icon: 'settings' }]} />);
    const toolbar = screen.getByRole('toolbar');
    vi.spyOn(toolbar, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ x: 0, y: 0, width: 200, height: 56 }));
    fireEvent.pointerMove(toolbar, { clientX: 80, clientY: 20, pointerType: 'mouse' });
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    const [a, b, c] = Array.from(toolbar.querySelectorAll<HTMLElement>('.ui-dock__item'));
    const s = (el: HTMLElement) => parseFloat(el.style.getPropertyValue('--ui-dock-s'));
    expect(s(b!)).toBeGreaterThan(s(a!));
    expect(s(b!)).toBeGreaterThan(s(c!));
    expect(parseFloat(a!.style.getPropertyValue('--ui-dock-t'))).toBeLessThan(0);
    expect(parseFloat(c!.style.getPropertyValue('--ui-dock-t'))).toBeGreaterThan(0);
    fireEvent.pointerLeave(toolbar);
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(b!.style.getPropertyValue('--ui-dock-s')).toBe('');
    vi.useRealTimers();
  });
});

describe('CommandPalette results', () => {
  it('highlights the query with the kit Highlight style and marks results as assemble parts', () => {
    render(<CommandPalette open hotkey={false} onOpenChange={() => {}} commands={[{ id: 'a', label: 'Open settings' }]} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'set' } });
    expect(document.querySelector('.ui-highlight__mark')).toHaveTextContent('set');
    expect(screen.getByRole('option')).toHaveAttribute('data-assemble');
  });
});
