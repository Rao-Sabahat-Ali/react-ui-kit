import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TabMenu } from './TabMenu';

const scss = readFileSync(`${process.cwd()}/src/components/TabMenu/TabMenu.scss`, 'utf8');
const items = [
  { label: 'Overview', href: '/overview' },
  { label: 'Activity', href: '/activity', badge: 3 },
  { label: 'Settings', href: '/settings' },
];

describe('TabMenu', () => {
  it('AC-1: links render with active aria-current and no tab roles', async () => {
    const onNavigate = vi.fn();
    render(<TabMenu items={items} activeHref="/activity" ariaLabel="Project" onNavigate={onNavigate} />);
    expect(screen.getByRole('navigation', { name: 'Project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Activity/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('tab')).toBeNull();
    await userEvent.click(screen.getByRole('link', { name: 'Settings' }));
    expect(onNavigate).toHaveBeenCalledWith('/settings', expect.anything());
  });

  it('AC-2: overflow scrolls horizontally', () => {
    render(<TabMenu items={items} ariaLabel="Project" variant="underline" />);
    const list = screen.getByRole('list');
    expect(list).toHaveClass('flex-nowrap', 'nav-underline', 'ui-tab-menu__list');
    expect(scss).toMatch(/\.ui-tab-menu__list\s*{\s*overflow-x: auto/);
  });
});
