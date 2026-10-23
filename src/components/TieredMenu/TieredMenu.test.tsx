import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MenuItem } from '../Menu/types';
import { TieredMenu } from './TieredMenu';

const tree = (command = vi.fn()): MenuItem[] => [
  { label: 'New', command, items: [{ label: 'Document', command }, { label: 'Sheet', command }, { label: 'Template', items: [{ label: 'Invoice', command }] }] },
  { label: 'Open', items: [{ label: 'Recent', command }, { label: 'Remote', command }] },
  { label: 'Settings', command },
];

const mi = (name: string) => screen.getByRole('menuitem', { name });
const advance = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));

function Popup({ items = tree() }: { items?: MenuItem[] }) {
  return (
    <>
      <TieredMenu popup items={items} trigger={<button type="button">File</button>} />
      <button type="button">After</button>
    </>
  );
}

describe('TieredMenu', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('AC-1: submenus open via hover, click and ArrowRight; close via ArrowLeft and Escape', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TieredMenu ariaLabel="File" items={tree()} />);
    await user.hover(mi('New'));
    await advance(150);
    expect(mi('Document')).toBeVisible();
    await user.click(mi('Settings'));
    await advance(300);
    expect(screen.queryByRole('menuitem', { name: 'Document' })).toBeNull();

    await user.click(mi('Open'));
    expect(mi('Recent')).toBeVisible();
    mi('Open').focus();
    await user.keyboard('{ArrowUp}{ArrowRight}');
    expect(mi('Document')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(mi('New')).toHaveFocus();
    expect(screen.queryByRole('menuitem', { name: 'Document' })).toBeNull();
    await user.keyboard('{ArrowRight}{Escape}');
    expect(mi('New')).toHaveFocus();
    expect(mi('New')).toHaveAttribute('aria-expanded', 'false');
  });

  it('AC-2: flyouts flip to fit the viewport', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute('role') === 'menu' && this.hasAttribute('aria-labelledby')) return DOMRect.fromRect({ width: 200, height: 100 });
      if (this.getAttribute('aria-haspopup') === 'menu') return DOMRect.fromRect({ x: 800, y: 50, width: 150, height: 32 });
      return DOMRect.fromRect({});
    });
    const user = userEvent.setup();
    render(<TieredMenu ariaLabel="File" items={tree()} />);
    mi('New').focus();
    await user.keyboard('{ArrowRight}');
    const sub = screen.getByRole('menu', { name: 'New' });
    // end side: 800 + 150 + 2 + 200 > 1024 - 8 → flipped to start: 800 - 200 - 2
    expect(sub.style.left).toBe('598px');
  });

  it('AC-3: parents expose aria-haspopup, aria-expanded, aria-controls; submenu labelled by parent', async () => {
    const user = userEvent.setup();
    render(<TieredMenu ariaLabel="File" items={tree()} />);
    const parent = mi('New');
    expect(parent).toHaveAttribute('aria-haspopup', 'menu');
    expect(parent).toHaveAttribute('aria-expanded', 'false');
    parent.focus();
    await user.keyboard('{Enter}');
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    const sub = screen.getByRole('menu', { name: 'New' });
    expect(parent).toHaveAttribute('aria-controls', sub.id);
  });

  it('AC-4: in RTL ArrowLeft opens and ArrowRight closes submenus', async () => {
    const user = userEvent.setup();
    render(
      <div dir="rtl">
        <TieredMenu ariaLabel="File" items={tree()} />
      </div>,
    );
    mi('New').focus();
    await user.keyboard('{ArrowRight}');
    expect(mi('New')).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{ArrowLeft}');
    expect(mi('Document')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(mi('New')).toHaveFocus();
    expect(mi('New')).toHaveAttribute('aria-expanded', 'false');
  });

  it('AC-5: Escape closes one level and focuses parent; at root closes and focuses trigger', async () => {
    const user = userEvent.setup();
    render(<Popup />);
    await user.click(screen.getByText('File'));
    await user.keyboard('{Enter}{ArrowDown}{ArrowDown}{Enter}');
    expect(mi('Invoice')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(mi('Template')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(mi('New')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByText('File')).toHaveFocus();
  });

  it('AC-6: Enter/Space on a parent opens its submenu on the first child', async () => {
    const user = userEvent.setup();
    const command = vi.fn();
    render(<TieredMenu ariaLabel="File" items={tree(command)} />);
    mi('New').focus();
    await user.keyboard('{Enter}');
    expect(mi('Document')).toHaveFocus();
    await user.keyboard('{Escape}{ArrowDown} ');
    expect(mi('Recent')).toHaveFocus();
    expect(command).not.toHaveBeenCalled();
  });

  it('AC-7: Home/End and typeahead operate only within the current level', async () => {
    const user = userEvent.setup();
    render(<TieredMenu ariaLabel="File" items={tree()} />);
    mi('New').focus();
    await user.keyboard('{Enter}{End}');
    expect(mi('Template')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(mi('Document')).toHaveFocus();
    await user.keyboard('s');
    expect(mi('Sheet')).toHaveFocus();
    await user.keyboard('o'); // "Open" is on the root level: no match here
    expect(mi('Sheet')).toHaveFocus();
  });

  it('AC-8: Tab closes all levels; activating a leaf closes all and focuses the trigger', async () => {
    const user = userEvent.setup();
    const command = vi.fn();
    render(<Popup items={tree(command)} />);
    await user.click(screen.getByText('File'));
    await user.keyboard('{ArrowRight}');
    await user.tab();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByText('After')).toHaveFocus();
    await user.click(screen.getByText('File'));
    await user.keyboard('{ArrowRight}{Enter}');
    expect(command).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByText('File')).toHaveFocus();
  });

  it('AC-9: hover opens after 150 ms, closes 300 ms after leaving; diagonal travel keeps it open', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <>
        <TieredMenu ariaLabel="File" items={tree()} />
        <p>Elsewhere</p>
      </>,
    );
    await user.hover(mi('New'));
    await advance(100);
    expect(mi('New')).toHaveAttribute('aria-expanded', 'false');
    await advance(50);
    expect(mi('New')).toHaveAttribute('aria-expanded', 'true');
    // Diagonal: the pointer crosses the "Open" item on its way into the flyout.
    await user.hover(mi('Open'));
    await advance(100);
    await user.hover(mi('Sheet'));
    await advance(1000);
    expect(mi('New')).toHaveAttribute('aria-expanded', 'true');
    expect(mi('Open')).toHaveAttribute('aria-expanded', 'false');
    await user.hover(screen.getByText('Elsewhere'));
    await advance(250);
    expect(mi('New')).toHaveAttribute('aria-expanded', 'true');
    await advance(50);
    expect(mi('New')).toHaveAttribute('aria-expanded', 'false');
  });

  it('AC-10: touch tap on a parent toggles its submenu without activating', async () => {
    const user = userEvent.setup();
    const command = vi.fn();
    render(<TieredMenu ariaLabel="File" items={tree(command)} />);
    await user.pointer({ keys: '[TouchA]', target: mi('New') });
    expect(mi('New')).toHaveAttribute('aria-expanded', 'true');
    await user.pointer({ keys: '[TouchA]', target: mi('New') });
    expect(mi('New')).toHaveAttribute('aria-expanded', 'false');
    expect(command).not.toHaveBeenCalled();
  });

  it('AC-11: only one submenu per level is open at a time', async () => {
    const user = userEvent.setup();
    render(<TieredMenu ariaLabel="File" items={tree()} />);
    await user.click(mi('New'));
    await user.click(mi('Open'));
    expect(mi('Open')).toHaveAttribute('aria-expanded', 'true');
    expect(mi('New')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getAllByRole('menu')).toHaveLength(2);
  });
});
