import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dock, type DockItem, type DockProps } from './Dock';

const originalMatchMedia = window.matchMedia;
function mockMedia(matching: string[]) {
  window.matchMedia = ((query: string) => ({ matches: matching.includes(query), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
}

const makeItems = (command = vi.fn()): DockItem[] => [
  { label: 'Home', icon: 'home', href: '/home' },
  { label: 'Search', icon: 'search', command },
  { label: 'Settings', icon: 'settings', command },
];
const setup = (props: Partial<DockProps> = {}, command = vi.fn()) =>
  render(
    <>
      <button type="button">Before</button>
      <Dock items={makeItems(command)} ariaLabel="Launcher" {...props} />
      <button type="button">After</button>
    </>,
  );
const item = (name: string) => screen.getByRole(name === 'Home' ? 'link' : 'button', { name });

describe('Dock', () => {
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('AC-1: arrow navigation between items', async () => {
    const user = userEvent.setup();
    setup();
    item('Home').focus();
    await user.keyboard('{ArrowRight}');
    expect(item('Search')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(item('Home')).toHaveFocus();
  });

  it('AC-2: magnification disabled under reduced motion', () => {
    const { unmount } = setup();
    expect(screen.getByRole('toolbar')).toHaveClass('ui-dock--magnify');
    unmount();
    mockMedia(['(prefers-reduced-motion: reduce)']);
    setup();
    expect(screen.getByRole('toolbar')).not.toHaveClass('ui-dock--magnify');
  });

  it('AC-3: toolbar role, accessible name and orientation', () => {
    const { unmount } = setup();
    expect(screen.getByRole('toolbar', { name: 'Launcher' })).toHaveAttribute('aria-orientation', 'horizontal');
    unmount();
    setup({ position: 'left' });
    expect(screen.getByRole('toolbar', { name: 'Launcher' })).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('AC-4: single tab stop; re-entering focuses the last focused item', async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    await user.tab();
    expect(item('Home')).toHaveFocus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    await user.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(item('Settings')).toHaveFocus();
  });

  it('AC-5: Home/End focus first/last; arrows do not wrap', async () => {
    const user = userEvent.setup();
    setup();
    item('Home').focus();
    await user.keyboard('{ArrowLeft}');
    expect(item('Home')).toHaveFocus();
    await user.keyboard('{End}');
    expect(item('Settings')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(item('Settings')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(item('Home')).toHaveFocus();
  });

  it('AC-6: in RTL ArrowLeft moves to the next item', async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <Dock items={makeItems()} ariaLabel="Launcher" />
      </div>,
    );
    item('Home').focus();
    await user.keyboard('{ArrowLeft}');
    expect(item('Search')).toHaveFocus();
  });

  it('AC-7: Enter/Space activate buttons; Enter follows links', async () => {
    const user = userEvent.setup();
    const command = vi.fn();
    const onNavigate = vi.fn();
    setup({ onNavigate }, command);
    item('Search').focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(command).toHaveBeenCalledTimes(2);
    item('Home').focus();
    await user.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenCalledWith('/home', expect.anything());
  });

  it('AC-8: tooltip label shows on focus and hover and hides on Escape', async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    await user.tab();
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(tip).toHaveTextContent('Home');
    expect(tip).toHaveAttribute('aria-hidden', 'true');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip', { hidden: true })).toBeNull();
    expect(item('Home')).toHaveFocus();
    await user.hover(item('Search'));
    await act(async () => new Promise((r) => setTimeout(r, 200)));
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Search');
  });

  it('AC-9: no magnification on coarse pointers', () => {
    mockMedia(['(pointer: coarse)']);
    setup();
    expect(screen.getByRole('toolbar')).not.toHaveClass('ui-dock--magnify');
  });

  it('link items expose aria-current', () => {
    setup({ activeHref: '/home' });
    expect(item('Home')).toHaveAttribute('aria-current', 'page');
  });
});
