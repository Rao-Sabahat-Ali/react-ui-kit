import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MenuItem } from '../Menu/types';
import { Menubar } from './Menubar';

const navItems: MenuItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Products', items: [{ label: 'Laptops', href: '/laptops' }, { label: 'Phones', href: '/phones' }] },
  { label: 'Support', items: [{ label: 'Docs', href: '/docs' }, { label: 'Contact', href: '/contact' }] },
  { label: 'About', href: '/about' },
];

const appItems = (command = vi.fn()): MenuItem[] => [
  { label: 'File', items: [{ label: 'New', command }, { label: 'Open', command }, { label: 'Export', items: [{ label: 'PDF', command }] }] },
  { label: 'Edit', items: [{ label: 'Undo', command }, { label: 'Redo', command }] },
  { label: 'View', items: [{ label: 'Zoom in', command }] },
  { label: 'Help', command },
];

const originalMatchMedia = window.matchMedia;
function mockCollapsed(collapsed: boolean) {
  window.matchMedia = (
    (query: string) =>
      ({ matches: collapsed && query.includes('max-width'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList
  ) as typeof window.matchMedia;
}

const mi = (name: string) => screen.getByRole('menuitem', { name });

describe('Menubar', () => {
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('AC-1: navigation mode renders a nav landmark with disclosure buttons', () => {
    render(<Menubar items={navItems} ariaLabel="Site" />);
    expect(screen.getByRole('navigation', { name: 'Site' })).toBeInTheDocument();
    const products = screen.getByRole('button', { name: 'Products' });
    expect(products).toHaveAttribute('aria-expanded', 'false');
    expect(products).toHaveAttribute('aria-controls');
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it('AC-2: menubar mode supports APG menubar keyboard', async () => {
    const user = userEvent.setup();
    const command = vi.fn();
    render(<Menubar items={appItems(command)} ariaLabel="App" />);
    expect(screen.getByRole('menubar', { name: 'App' })).toHaveAttribute('aria-orientation', 'horizontal');
    await user.tab();
    expect(mi('File')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(mi('Edit')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(mi('Undo')).toHaveFocus();
    await user.keyboard('{Escape}{ArrowUp}');
    expect(mi('Redo')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(command).toHaveBeenCalledTimes(1);
    expect(mi('Edit')).toHaveFocus();
    expect(mi('Edit')).toHaveAttribute('aria-expanded', 'false');
  });

  it('AC-3: collapses into a toggler below the breakpoint', async () => {
    mockCollapsed(true);
    const user = userEvent.setup();
    render(<Menubar items={navItems} />);
    const toggler = screen.getByRole('button', { name: 'Menu' });
    expect(toggler).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'Home' })).toBeNull();
    await user.click(toggler);
    expect(toggler).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(toggler.getAttribute('aria-controls')!)).not.toHaveAttribute('hidden');
    expect(screen.getByRole('link', { name: 'Home' })).toBeVisible();
  });

  it('AC-4: navigation mode has no menu roles, aria-current on the active link, one submenu at a time', async () => {
    const user = userEvent.setup();
    render(<Menubar items={navItems} activeHref="/phones" />);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByRole('menubar')).toBeNull();
    expect(screen.queryByRole('menuitem')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Products' }));
    expect(screen.getByRole('link', { name: 'Phones' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('button', { name: 'Support' }));
    expect(screen.getByRole('button', { name: 'Products' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Support' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('link', { name: 'Phones' })).toBeNull();
  });

  it('AC-5: navigation mode Escape closes and focuses the button; focus leaving closes', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Menubar items={navItems} />
        <button type="button">After</button>
      </>,
    );
    const products = screen.getByRole('button', { name: 'Products' });
    await user.click(products);
    await user.tab();
    expect(screen.getByRole('link', { name: 'Laptops' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(products).toHaveAttribute('aria-expanded', 'false');
    expect(products).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Support' })).toHaveFocus();
    expect(products).toHaveAttribute('aria-expanded', 'false');
  });

  it('AC-6: menubar mode has a single tab stop with roving tabindex', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Menubar items={appItems()} ariaLabel="App" />
        <button type="button">After</button>
      </>,
    );
    const tops = ['File', 'Edit', 'View', 'Help'].map(mi);
    expect(tops.filter((el) => el.getAttribute('tabindex') === '0')).toHaveLength(1);
    await user.tab();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(mi('View')).toHaveAttribute('tabindex', '0');
    await user.tab();
    expect(screen.getByText('After')).toHaveFocus();
    await user.tab({ shift: true });
    expect(mi('View')).toHaveFocus();
  });

  it('AC-7: menubar mode Home/End and typeahead on top-level items', async () => {
    const user = userEvent.setup();
    render(<Menubar items={appItems()} ariaLabel="App" />);
    await user.tab();
    await user.keyboard('{End}');
    expect(mi('Help')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(mi('File')).toHaveFocus();
    await user.keyboard('v');
    expect(mi('View')).toHaveFocus();
  });

  it('AC-8: menubar mode arrows are inverted in RTL', async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <Menubar items={appItems()} ariaLabel="App" />
      </div>,
    );
    await user.tab();
    await user.keyboard('{ArrowLeft}');
    expect(mi('Edit')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(mi('File')).toHaveFocus();
  });

  it('AC-9: ArrowRight/Left inside a submenu moves to the adjacent top item and opens it', async () => {
    const user = userEvent.setup();
    render(<Menubar items={appItems()} ariaLabel="App" />);
    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(mi('New')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(mi('Edit')).toHaveAttribute('aria-expanded', 'true');
    expect(mi('Undo')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(mi('File')).toHaveAttribute('aria-expanded', 'true');
    expect(mi('New')).toHaveFocus();
    // ArrowRight on a parent inside the submenu opens its flyout instead.
    await user.keyboard('{End}{ArrowRight}');
    expect(mi('PDF')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(mi('Edit')).toHaveAttribute('aria-expanded', 'true');
  });

  it('AC-10: menubar mode Escape closes one level and focuses its parent; Tab closes all', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Menubar items={appItems()} ariaLabel="App" />
        <button type="button">After</button>
      </>,
    );
    await user.tab();
    await user.keyboard('{ArrowDown}{End}{ArrowRight}');
    expect(mi('PDF')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(mi('Export')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(mi('File')).toHaveFocus();
    expect(mi('File')).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{ArrowDown}{End}{ArrowRight}');
    await user.tab();
    expect(screen.getByText('After')).toHaveFocus();
    expect(screen.queryAllByRole('menu')).toHaveLength(0);
  });

  it('AC-11: collapsed panel Escape closes it and focuses the toggler', async () => {
    mockCollapsed(true);
    const user = userEvent.setup();
    render(<Menubar items={navItems} />);
    const toggler = screen.getByRole('button', { name: 'Menu' });
    await user.click(toggler);
    await user.tab();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(toggler).toHaveAttribute('aria-expanded', 'false');
    expect(toggler).toHaveFocus();
  });

  it('AC-12: hover-opened submenus stay open while hovered and close on Escape', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const advance = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));
    render(<Menubar items={navItems} openOnHover />);
    const products = screen.getByRole('button', { name: 'Products' });
    await user.hover(products);
    await advance(150);
    expect(products).toHaveAttribute('aria-expanded', 'true');
    await user.hover(screen.getByRole('link', { name: 'Laptops' }));
    await advance(5000);
    expect(products).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(products).toHaveAttribute('aria-expanded', 'false');
  });

  it('menubar mode hover with openOnHover', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Menubar items={appItems()} ariaLabel="App" openOnHover />);
    await user.hover(mi('File'));
    await act(async () => void vi.advanceTimersByTime(150));
    expect(mi('File')).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(mi('File')).toHaveAttribute('aria-expanded', 'false');
  });
});
