import { readFileSync } from 'node:fs';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MegaMenu, type MegaMenuItem } from './MegaMenu';

const scss = readFileSync(`${process.cwd()}/src/components/MegaMenu/MegaMenu.scss`, 'utf8');

const items: MegaMenuItem[] = [
  {
    label: 'Shop',
    href: '/shop',
    columns: [
      { header: 'Computers', items: [{ label: 'Laptops', href: '/laptops' }, { label: 'Desktops', href: '/desktops' }] },
      { header: 'Phones', items: [{ label: 'Smartphones', href: '/phones' }] },
    ],
  },
  { label: 'Brands', columns: [{ header: 'Popular', items: [{ label: 'Acme', href: '/acme' }] }] },
  { label: 'Deals', href: '/deals' },
];

const setup = (props: Partial<Parameters<typeof MegaMenu>[0]> = {}) =>
  render(
    <>
      <MegaMenu items={items} ariaLabel="Store" {...props} />
      <button type="button">After</button>
    </>,
  );
const btn = (name: string) => screen.getByRole('button', { name });

describe('MegaMenu', () => {
  afterEach(() => vi.useRealTimers());

  it('AC-1: opens panel on click and Enter', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(btn('Shop'));
    expect(screen.getByRole('link', { name: 'Laptops' })).toBeVisible();
    await user.click(btn('Shop'));
    expect(screen.queryByRole('link', { name: 'Laptops' })).toBeNull();
    btn('Shop').focus();
    await user.keyboard('{Enter}');
    expect(btn('Shop')).toHaveAttribute('aria-expanded', 'true');
  });

  it('AC-2: columns render with headings; links tab in order', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(btn('Shop'));
    expect(screen.getByRole('heading', { name: 'Computers' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Phones' })).toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Laptops' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Desktops' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Smartphones' })).toHaveFocus();
  });

  it('AC-3: vertical orientation for sidebars', () => {
    setup({ orientation: 'vertical' });
    const nav = screen.getByRole('navigation', { name: 'Store' });
    expect(nav).toHaveClass('ui-mega-menu--vertical');
    expect(within(nav).getAllByRole('list')[0]).toHaveClass('flex-column');
  });

  it('AC-4: top-level buttons expose aria-expanded/aria-controls; no menu roles', async () => {
    const user = userEvent.setup();
    setup();
    expect(btn('Shop')).toHaveAttribute('aria-expanded', 'false');
    await user.click(btn('Shop'));
    expect(document.getElementById(btn('Shop').getAttribute('aria-controls')!)).toBeVisible();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByRole('menuitem')).toBeNull();
  });

  it('AC-5: Escape closes the panel and focuses its button, also from inside the panel', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(btn('Shop'));
    await user.keyboard('{Escape}');
    expect(btn('Shop')).toHaveAttribute('aria-expanded', 'false');
    expect(btn('Shop')).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.tab();
    expect(screen.getByRole('link', { name: 'Laptops' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(btn('Shop')).toHaveAttribute('aria-expanded', 'false');
    expect(btn('Shop')).toHaveFocus();
  });

  it('AC-6: tabbing out of button and panel closes the panel', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(btn('Brands'));
    await user.tab();
    expect(screen.getByRole('link', { name: 'Acme' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Deals' })).toHaveFocus();
    expect(btn('Brands')).toHaveAttribute('aria-expanded', 'false');
  });

  it('AC-7: opening a panel closes any other', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(btn('Shop'));
    await user.click(btn('Brands'));
    expect(btn('Shop')).toHaveAttribute('aria-expanded', 'false');
    expect(btn('Brands')).toHaveAttribute('aria-expanded', 'true');
  });

  it('AC-8: hover-opened panel stays open while hovered and closes on Escape', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const advance = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));
    setup({ openOnHover: true });
    await user.hover(btn('Shop'));
    await advance(150);
    expect(btn('Shop')).toHaveAttribute('aria-expanded', 'true');
    await user.hover(screen.getByRole('link', { name: 'Desktops' }));
    await advance(5000);
    expect(btn('Shop')).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(btn('Shop')).toHaveAttribute('aria-expanded', 'false');
  });

  it('AC-9: touch tap on an item with href opens the panel (no navigation); panel has a View all link', async () => {
    const user = userEvent.setup();
    setup();
    await user.pointer({ keys: '[TouchA]', target: btn('Shop') });
    expect(btn('Shop')).toHaveAttribute('aria-expanded', 'true');
    expect(btn('Shop').tagName).toBe('BUTTON');
    expect(screen.getByRole('link', { name: 'View all Shop' })).toHaveAttribute('href', '/shop');
  });

  it('AC-10: column lists are labelled by headings; current link has aria-current', async () => {
    const user = userEvent.setup();
    setup({ activeHref: '/phones' });
    await user.click(btn('Shop'));
    const list = screen.getByRole('list', { name: 'Phones' });
    expect(within(list).getByRole('link', { name: 'Smartphones' })).toHaveAttribute('aria-current', 'page');
  });

  it('reduced motion disables the panel animation', () => {
    expect(scss).toMatch(/prefers-reduced-motion: reduce\)\s*{\s*\.ui-mega-menu__panel\s*{\s*animation: none/);
  });
});
