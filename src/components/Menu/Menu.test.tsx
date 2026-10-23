import { readFileSync } from 'node:fs';
import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from '../Dialog/Dialog';
import { Menu } from './Menu';
import type { MenuItem } from './types';

const scss = readFileSync(`${process.cwd()}/src/components/Menu/Menu.scss`, 'utf8');

const items = (command = vi.fn()): MenuItem[] => [
  { label: 'Edit', command },
  { label: 'Duplicate', command },
  { separator: true, label: 'sep' },
  { label: 'Archive', command, disabled: true },
  { label: 'Delete', command, danger: true },
];

function PopupMenu({ menuItems = items(), onNavigate }: { menuItems?: MenuItem[]; onNavigate?: (href: string) => void }) {
  return (
    <>
      <button type="button">Before</button>
      <Menu popup items={menuItems} onNavigate={onNavigate} trigger={<button type="button">Actions</button>} />
      <button type="button">After</button>
    </>
  );
}

const trigger = () => screen.getByRole('button', { name: 'Actions' });
const item = (name: string) => screen.getByRole('menuitem', { name });

describe('Menu', () => {
  it('AC-1: popup opens with focus on first item; ArrowUp opens on last', async () => {
    const user = userEvent.setup();
    render(<PopupMenu />);
    await user.click(trigger());
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(item('Edit')).toHaveFocus();
    await user.keyboard('{Escape}');
    await user.keyboard('{ArrowUp}');
    expect(item('Delete')).toHaveFocus();
  });

  it('AC-2: keyboard per table (arrows wrap, Enter activates and focuses trigger)', async () => {
    const user = userEvent.setup();
    const command = vi.fn();
    render(<PopupMenu menuItems={items(command)} />);
    trigger().focus();
    await user.keyboard('{Enter}');
    expect(item('Edit')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(item('Delete')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(item('Edit')).toHaveFocus();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(command).toHaveBeenCalledWith(expect.objectContaining({ item: expect.objectContaining({ label: 'Duplicate' }) }));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it('AC-3: activating calls command and closes; href items navigate', async () => {
    const user = userEvent.setup();
    const command = vi.fn();
    const onNavigate = vi.fn();
    render(<PopupMenu onNavigate={onNavigate} menuItems={[{ label: 'Run', command }, { label: 'Docs', href: '/docs' }]} />);
    await user.click(trigger());
    await user.click(item('Run'));
    expect(command).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    await user.click(trigger());
    expect(item('Docs')).toHaveAttribute('href', '/docs');
    await user.click(item('Docs'));
    expect(onNavigate).toHaveBeenCalledWith('/docs', expect.anything());
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('AC-4: target=_blank gets rel noopener noreferrer; unsafe URLs are dropped', () => {
    render(
      <Menu
        ariaLabel="Links"
        items={[
          { label: 'External', href: 'https://example.com', target: '_blank' },
          { label: 'Evil', href: 'javascript:alert(1)' },
        ]}
      />,
    );
    expect(item('External')).toHaveAttribute('rel', 'noopener noreferrer');
    expect(item('External')).toHaveAttribute('target', '_blank');
    expect(item('Evil')).not.toHaveAttribute('href');
    expect(item('Evil').tagName).toBe('DIV');
  });

  it('AC-5: checkbox/radio items reflect aria-checked', () => {
    render(
      <Menu
        ariaLabel="View"
        items={[
          { label: 'Show grid', checked: true },
          { label: 'Small', group: 'size', checked: false },
          { label: 'Large', group: 'size', checked: true },
        ]}
      />,
    );
    expect(screen.getByRole('menuitemcheckbox', { name: 'Show grid' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: 'Small' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('menuitemradio', { name: 'Large' })).toHaveAttribute('aria-checked', 'true');
  });

  it('AC-6: trigger exposes aria-haspopup/expanded/controls; Enter, Space and ArrowDown open on first item', async () => {
    const user = userEvent.setup();
    render(<PopupMenu />);
    expect(trigger()).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    for (const key of ['{Enter}', ' ', '{ArrowDown}']) {
      trigger().focus();
      await user.keyboard(key);
      expect(trigger()).toHaveAttribute('aria-expanded', 'true');
      expect(trigger()).toHaveAttribute('aria-controls', screen.getByRole('menu').id);
      expect(item('Edit')).toHaveFocus();
      await user.keyboard('{Escape}');
    }
  });

  it('AC-7: Home/End focus first/last item', async () => {
    const user = userEvent.setup();
    render(<PopupMenu />);
    await user.click(trigger());
    await user.keyboard('{End}');
    expect(item('Delete')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(item('Edit')).toHaveFocus();
  });

  it('AC-8: typeahead focuses next match, resets after 500 ms, repeated char cycles', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<Menu popup trigger={<button type="button">Actions</button>} items={[{ label: 'Copy' }, { label: 'Cut' }, { label: 'Paste' }, { label: 'Crop' }]} />);
      await user.click(trigger());
      await user.keyboard('p');
      expect(item('Paste')).toHaveFocus();
      await act(async () => void vi.advanceTimersByTime(600));
      await user.keyboard('c');
      expect(item('Crop')).toHaveFocus();
      await user.keyboard('c');
      expect(item('Copy')).toHaveFocus();
      await act(async () => void vi.advanceTimersByTime(600));
      await user.keyboard('cu');
      expect(item('Cut')).toHaveFocus();
    } finally {
      vi.useRealTimers();
    }
  });

  it('AC-9: Tab/Shift+Tab close and move to the next/previous tabbable after the trigger', async () => {
    const user = userEvent.setup();
    render(<PopupMenu />);
    await user.click(trigger());
    await user.tab();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByText('After')).toHaveFocus();
    await user.click(trigger());
    await user.tab({ shift: true });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByText('Before')).toHaveFocus();
  });

  it('AC-10: Escape closes only the menu inside a Dialog and focuses the trigger', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog open={open} title="Edit" onClose={(r) => { onClose(r); setOpen(false); }}>
          <Menu popup items={items()} trigger={<button type="button">Actions</button>} />
        </Dialog>
      );
    }
    render(<Harness />);
    await user.click(trigger());
    expect(item('Edit')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Edit' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(trigger()).toHaveFocus();
  });

  it('AC-11: disabled items are focusable with aria-disabled and do not run; separators are skipped', async () => {
    const user = userEvent.setup();
    const command = vi.fn();
    render(<PopupMenu menuItems={items(command)} />);
    await user.click(trigger());
    expect(screen.getByRole('separator')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(item('Archive')).toHaveFocus();
    expect(item('Archive')).toHaveAttribute('aria-disabled', 'true');
    await user.keyboard('{Enter}');
    await user.click(item('Archive'));
    expect(command).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('AC-12: Space toggles checkbox/radio without closing; radios are exclusive per group', async () => {
    const user = userEvent.setup();
    render(
      <Menu
        popup
        trigger={<button type="button">Actions</button>}
        items={[
          { label: 'Grid', checked: false },
          { label: 'Small', group: 'size', checked: true },
          { label: 'Large', group: 'size', checked: false },
        ]}
      />,
    );
    await user.click(trigger());
    await user.keyboard(' ');
    expect(screen.getByRole('menuitemcheckbox', { name: 'Grid' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{ArrowDown} ');
    expect(screen.getByRole('menuitemradio', { name: 'Large' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('menuitemradio', { name: 'Small' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('AC-13: popup trigger is the only tab stop; inline menu has exactly one tabindex=0', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<PopupMenu />);
    await user.click(trigger());
    for (const el of screen.getAllByRole('menuitem')) expect(el).toHaveAttribute('tabindex', '-1');
    unmount();
    render(<Menu ariaLabel="Inline" items={items()} />);
    const zero = screen.getAllByRole('menuitem').filter((el) => el.getAttribute('tabindex') === '0');
    expect(zero).toHaveLength(1);
    await user.tab();
    expect(item('Edit')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(item('Duplicate')).toHaveAttribute('tabindex', '0');
    expect(item('Edit')).toHaveAttribute('tabindex', '-1');
  });

  it('AC-14: outside click closes; focus returns to trigger only if it was inside the menu', async () => {
    const user = userEvent.setup();
    render(<PopupMenu />);
    await user.click(trigger());
    await user.click(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
    await act(async () => new Promise((r) => setTimeout(r, 0)));
    expect(trigger()).toHaveFocus();

    await user.click(trigger());
    screen.getByText('Before').focus();
    await user.click(document.body);
    await act(async () => new Promise((r) => setTimeout(r, 0)));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger()).not.toHaveFocus();
  });

  it('AC-15: menu has an accessible name', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<PopupMenu />);
    await user.click(trigger());
    expect(screen.getByRole('menu', { name: 'Actions' })).toBeInTheDocument();
    unmount();
    render(<Menu ariaLabel="File" items={items()} />);
    expect(screen.getByRole('menu', { name: 'File' })).toBeInTheDocument();
  });

  it('AC-16: reduced motion disables open animation', () => {
    expect(scss).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*{\s*\.ui-menu--popup,\s*\.ui-menu--submenu\s*{\s*animation: none/);
  });

  it('groups render with a label', () => {
    render(<Menu ariaLabel="Grouped" items={[{ label: 'Account', items: [{ label: 'Profile' }, { label: 'Sign out' }] }]} />);
    expect(screen.getByRole('group', { name: 'Account' })).toContainElement(item('Profile'));
  });
});
