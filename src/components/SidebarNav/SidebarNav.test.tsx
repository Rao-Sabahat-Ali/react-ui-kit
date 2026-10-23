import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SidebarNav } from './SidebarNav';

const items = [
  { label: 'Home', href: '/', icon: 'home' as const, section: 'Learn' },
  { label: 'Practice', icon: 'star' as const, section: 'Learn', items: [{ label: 'Review', href: '/review' }, { label: 'Tests', href: '/tests' }] },
  { label: 'Settings', href: '/settings', section: 'Account' },
];

describe('SidebarNav', () => {
  it('AC-1: active item aria-current and ancestors expanded', () => {
    render(<SidebarNav items={items} activeHref="/tests" />);
    expect(screen.getByRole('link', { name: 'Tests' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Practice' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('AC-2: collapsed hides labels visually but keeps names and titles', () => {
    render(<SidebarNav items={items} collapsed />);
    const link = screen.getByRole('link', { name: 'Home' });
    expect(link).toHaveAttribute('title', 'Home');
    expect(link.querySelector('.ui-sidebar-nav__label')).toHaveClass('visually-hidden');
  });

  it('AC-3: group toggles are keyboard operable', async () => {
    render(<SidebarNav items={items} />);
    const group = screen.getByRole('button', { name: 'Practice' });
    group.focus();
    await userEvent.keyboard('{Enter}');
    expect(group).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Review' })).toBeInTheDocument();
  });

  it('AC-4: onNavigate intercepts plain clicks only', () => {
    const onNavigate = vi.fn();
    render(<SidebarNav items={items} onNavigate={onNavigate} />);
    const link = screen.getByRole('link', { name: 'Settings' });
    fireEvent.click(link, { button: 0 });
    expect(onNavigate).toHaveBeenCalledWith('/settings', expect.anything());
    onNavigate.mockClear();
    fireEvent.click(link, { button: 0, metaKey: true });
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('AC-5: section headings render', () => {
    render(<SidebarNav items={items} />);
    expect(screen.getByText('Learn')).toHaveClass('ui-sidebar-nav__section');
    expect(screen.getByText('Account')).toBeInTheDocument();
  });
});
