import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { MenuItem } from '../Menu/types';
import { PanelMenu } from './PanelMenu';

const scss = readFileSync(`${process.cwd()}/src/components/PanelMenu/PanelMenu.scss`, 'utf8');

const items: MenuItem[] = [
  { key: 'account', label: 'Account', items: [{ label: 'Profile', href: '/profile' }, { label: 'Security', href: '/security' }] },
  { key: 'billing', label: 'Billing', items: [{ label: 'Invoices', href: '/invoices' }, { label: 'Plans', key: 'plans', items: [{ label: 'Upgrade', href: '/upgrade' }] }] },
  { key: 'tools', label: 'Tools', items: [{ label: 'Export', command: vi.fn() }] },
];
const header = (name: string) => screen.getByRole('button', { name });

describe('PanelMenu', () => {
  it('AC-1: headers toggle sub-lists', async () => {
    render(<PanelMenu items={items} />);
    expect(screen.queryByRole('link', { name: 'Profile' })).toBeNull();
    await userEvent.click(header('Account'));
    expect(screen.getByRole('link', { name: 'Profile' })).toBeVisible();
    await userEvent.click(header('Account'));
    expect(screen.queryByRole('link', { name: 'Profile' })).toBeNull();
  });

  it('AC-2: active item has aria-current', () => {
    render(<PanelMenu items={items} activeKey="/security" />);
    expect(screen.getByRole('link', { name: 'Security' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Profile' })).not.toHaveAttribute('aria-current');
  });

  it('AC-3: headers expose aria-expanded/aria-controls; collapsed content hidden and not tabbable', async () => {
    render(<PanelMenu items={items} />);
    const account = header('Account');
    expect(account).toHaveAttribute('aria-expanded', 'false');
    const content = document.getElementById(account.getAttribute('aria-controls')!)!;
    expect(content).toHaveAttribute('hidden');
    await userEvent.tab();
    await userEvent.tab();
    expect(header('Billing')).toHaveFocus();
  });

  it('AC-4: Enter/Space toggle a section and focus stays on the header', async () => {
    render(<PanelMenu items={items} />);
    header('Account').focus();
    await userEvent.keyboard('{Enter}');
    expect(header('Account')).toHaveAttribute('aria-expanded', 'true');
    expect(header('Account')).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(header('Account')).toHaveAttribute('aria-expanded', 'false');
    expect(header('Account')).toHaveFocus();
  });

  it('AC-5: multiple={false} collapses other sections when one opens', async () => {
    const onToggle = vi.fn();
    const { unmount } = render(<PanelMenu items={items} onToggle={onToggle} />);
    await userEvent.click(header('Account'));
    await userEvent.click(header('Billing'));
    expect(header('Account')).toHaveAttribute('aria-expanded', 'false');
    expect(header('Billing')).toHaveAttribute('aria-expanded', 'true');
    expect(onToggle).toHaveBeenLastCalledWith(['billing'], expect.objectContaining({ label: 'Billing' }));
    unmount();
    render(<PanelMenu items={items} multiple />);
    await userEvent.click(header('Account'));
    await userEvent.click(header('Billing'));
    expect(header('Account')).toHaveAttribute('aria-expanded', 'true');
  });

  it('AC-6: ancestor sections of activeKey are expanded on mount', () => {
    render(<PanelMenu items={items} activeKey="/upgrade" />);
    expect(header('Billing')).toHaveAttribute('aria-expanded', 'true');
    expect(header('Plans')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Upgrade' })).toHaveAttribute('aria-current', 'page');
    expect(header('Account')).toHaveAttribute('aria-expanded', 'false');
  });

  it('AC-7: ArrowDown/Up and Home/End move between headers', async () => {
    render(<PanelMenu items={items} />);
    header('Account').focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(header('Billing')).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(header('Tools')).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(header('Billing')).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(header('Account')).toHaveFocus();
  });

  it('AC-8: nav landmark with an accessible name', () => {
    render(<PanelMenu items={items} ariaLabel="Settings" />);
    expect(screen.getByRole('navigation', { name: 'Settings' })).toBeInTheDocument();
  });

  it('AC-9: reduced motion disables expand/collapse animation', () => {
    expect(scss).toMatch(/prefers-reduced-motion: reduce\)\s*{\s*\.ui-panel-menu__content,\s*\.ui-panel-menu__chevron\s*{\s*animation: none;\s*transition: none/);
  });

  it('command items are buttons; headers live in headings', async () => {
    const command = vi.fn();
    render(<PanelMenu items={[{ key: 't', label: 'Tools', items: [{ label: 'Export', command }] }]} defaultExpandedKeys={['t']} />);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(command).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Tools', level: 3 })).toContainElement(header('Tools'));
  });
});
