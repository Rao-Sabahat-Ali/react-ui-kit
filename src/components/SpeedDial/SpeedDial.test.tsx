import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpeedDial, type SpeedDialItem, type SpeedDialProps } from './SpeedDial';

const scss = readFileSync(`${process.cwd()}/src/components/SpeedDial/SpeedDial.scss`, 'utf8');
const originalMatchMedia = window.matchMedia;

const makeItems = (command = vi.fn()): SpeedDialItem[] => [
  { label: 'Upload', icon: 'upload', command },
  { label: 'Folder', icon: 'plus', command },
  { label: 'Share', icon: 'external-link', command },
];

function setup(props: Partial<SpeedDialProps> = {}) {
  const command = vi.fn();
  render(
    <>
      <SpeedDial items={makeItems(command)} ariaLabel="Create" position="static" {...props} />
      <button type="button">After</button>
      <p>Outside</p>
    </>,
  );
  return { command, trigger: screen.getByRole('button', { name: 'Create' }) };
}
const mi = (name: string) => screen.getByRole('menuitem', { name });
/** Escape twice: the first one dismisses the keyboard-focus tooltip (Tooltip AC-5). */
const escape = (user: ReturnType<typeof userEvent.setup>) => user.keyboard('{Escape}{Escape}');

describe('SpeedDial', () => {
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('AC-1: toggle opens/closes; actions positioned per type/direction', async () => {
    const user = userEvent.setup();
    const { trigger } = setup({ type: 'semi-circle', direction: 'up' });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeVisible();
    const entries = document.querySelectorAll<HTMLElement>('.ui-speed-dial__entry');
    // Semi-circle facing up: first at the left, middle straight up, last at the right.
    expect(entries[0]!.style.getPropertyValue('--ui-speed-dial-x')).toBe('-4.5rem');
    expect(entries[1]!.style.getPropertyValue('--ui-speed-dial-y')).toBe('-4.5rem');
    expect(entries[2]!.style.getPropertyValue('--ui-speed-dial-x')).toBe('4.5rem');
    expect(document.querySelector('.ui-speed-dial')).toHaveClass('ui-speed-dial--semi-circle', 'ui-speed-dial--up');
    await user.click(trigger);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('AC-2: keyboard navigation and Escape', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(mi('Upload')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(mi('Folder')).toHaveFocus();
    await escape(user);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('AC-3: reduced motion disables stagger animation', () => {
    expect(scss).toMatch(/prefers-reduced-motion: reduce\)\s*{\s*\.ui-speed-dial__entry\s*{\s*animation: none;\s*animation-delay: 0s/);
  });

  it('AC-4: trigger named by ariaLabel with aria-haspopup, aria-expanded, aria-controls', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', screen.getByRole('menu', { name: 'Create' }).id);
  });

  it('AC-5: keyboard open focuses first item; Enter/Space runs command, closes and focuses trigger', async () => {
    const user = userEvent.setup();
    const { trigger, command } = setup();
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(mi('Upload')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(command).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
    await user.keyboard(' ');
    await user.keyboard(' ');
    expect(command).toHaveBeenCalledTimes(2);
    expect(trigger).toHaveFocus();
  });

  it('AC-6: arrows follow direction/type mapping; Home/End focus first/last', async () => {
    const user = userEvent.setup();
    const a = setup({ direction: 'down' });
    await user.click(a.trigger);
    await user.keyboard('{ArrowDown}');
    expect(mi('Folder')).toHaveFocus();
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(mi('Share')).toHaveFocus(); // wraps
    await user.keyboard('{Home}');
    expect(mi('Upload')).toHaveFocus();
    await user.keyboard('{End}');
    expect(mi('Share')).toHaveFocus();
  });

  it('AC-6: circle types use Right/Down for next and Left/Up for previous', async () => {
    const user = userEvent.setup();
    const { trigger } = setup({ type: 'circle' });
    await user.click(trigger);
    await user.keyboard('{ArrowRight}');
    expect(mi('Folder')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(mi('Share')).toHaveFocus();
    await user.keyboard('{ArrowLeft}{ArrowUp}');
    expect(mi('Upload')).toHaveFocus();
  });

  it('AC-7: Tab closes and moves focus on', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    await user.tab();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  it('AC-8: when closed, actions are hidden and not focusable', () => {
    setup();
    const menu = document.querySelector('[role="menu"]')!;
    expect(menu).toHaveAttribute('hidden');
    expect(screen.queryAllByRole('menuitem')).toHaveLength(0);
  });

  it('AC-9: coarse pointers show action labels as visible text', async () => {
    window.matchMedia = ((query: string) => ({ matches: query === '(pointer: coarse)', media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    expect(screen.getByText('Upload')).toBeVisible();
    expect(screen.getByText('Upload')).toHaveClass('ui-speed-dial__label');
    expect(screen.queryByRole('tooltip', { hidden: true })).toBeNull();
  });

  it('AC-10: outside click closes', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    await user.click(screen.getByText('Outside'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('actions stay mounted (inert, data-state closed) while they fold back, then unmount', async () => {
    const original = document.getAnimations;
    document.getAnimations = () => [];
    try {
      const user = userEvent.setup();
      const { trigger } = setup();
      await user.click(trigger);
      const list = document.querySelector('.ui-speed-dial__list')!;
      expect(list).toHaveAttribute('data-state', 'open');
      await user.click(trigger);
      expect(list).toHaveAttribute('data-state', 'closed');
      expect(list).toHaveAttribute('inert');
      expect(list).not.toHaveAttribute('hidden');
      await vi.waitFor(() => expect(list).toHaveAttribute('hidden'));
    } finally {
      document.getAnimations = original;
    }
  });

  it('the last action settles with the snap easing and the guide line is drawn for linear layouts', () => {
    expect(scss).toContain('ui-speed-dial__entry--last');
    expect(scss).toContain('ui-speed-dial-guide-in');
    setup();
    const entries = document.querySelectorAll('.ui-speed-dial__entry');
    expect(entries[entries.length - 1]).toHaveClass('ui-speed-dial__entry--last');
    expect(entries[0]).not.toHaveClass('ui-speed-dial__entry--last');
  });
});
