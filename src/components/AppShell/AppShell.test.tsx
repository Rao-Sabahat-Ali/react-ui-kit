import type React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BottomNav } from '../BottomNav/BottomNav';
import { SidebarNav } from '../SidebarNav/SidebarNav';
import { Topbar } from '../Topbar/Topbar';
import { AppShell } from './AppShell';

function setViewport(desktop: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('min-width') ? desktop : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const nav = <SidebarNav activeHref="/" items={[{ label: 'Home', href: '/', icon: 'home' }, { label: 'Dictionary', href: '/dictionary', icon: 'search' }]} />;
const bottom = <BottomNav activeHref="/" items={[{ label: 'Home', href: '/', icon: 'home' }, { label: 'Words', href: '/dictionary', icon: 'search' }]} />;

const renderShell = (props: Partial<React.ComponentProps<typeof AppShell>> = {}) =>
  render(
    <AppShell topbar={<Topbar brand="Svenska" />} sidebar={nav} bottomNav={bottom} footer="© 2026" stateKey="test-shell" {...props}>
      <p>Content</p>
    </AppShell>,
  );

afterEach(() => localStorage.clear());

describe('AppShell', () => {
  it('AC-1: skip link and landmarks', async () => {
    setViewport(true);
    renderShell();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('contentinfo')).toHaveTextContent('© 2026');
    await userEvent.click(screen.getByRole('link', { name: 'Skip to content' }));
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('AC-2 & AC-6: desktop menu toggles collapse; mobile opens drawer with focus and Escape', async () => {
    setViewport(true);
    const { unmount, container } = renderShell();
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(container.firstChild).toHaveClass('ui-app-shell--collapsed');
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('title', 'Home');
    unmount();

    setViewport(false);
    renderShell();
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const drawer = screen.getByRole('dialog', { name: 'Menu' });
    expect(drawer).toContainElement(screen.getAllByRole('link', { name: 'Dictionary' })[0]!);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('AC-3: collapse state persists with stateKey', async () => {
    setViewport(true);
    const { unmount, container } = renderShell();
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    unmount();
    const again = renderShell();
    expect(again.container.firstChild).toHaveClass('ui-app-shell--collapsed');
    expect(container).toBeTruthy();
  });

  it('AC-5: bottomNav renders only on mobile with padding class', () => {
    setViewport(true);
    const desktop = renderShell();
    expect(desktop.container.querySelector('.ui-bottom-nav')).toBeNull();
    desktop.unmount();
    setViewport(false);
    const mobile = renderShell();
    expect(mobile.container.querySelector('.ui-bottom-nav')).toBeInTheDocument();
    expect(mobile.container.firstChild).toHaveClass('ui-app-shell--with-bottom-nav');
  });

  it('navigating from the mobile drawer closes it', async () => {
    setViewport(false);
    const onNavigate = vi.fn();
    render(
      <AppShell topbar={<Topbar brand="S" />} sidebar={<SidebarNav onNavigate={onNavigate} items={[{ label: 'Dictionary', href: '/dictionary' }]} />}>
        x
      </AppShell>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));
    await act(async () => userEvent.click(screen.getByRole('link', { name: 'Dictionary' })));
    expect(onNavigate).toHaveBeenCalledWith('/dictionary', expect.anything());
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
