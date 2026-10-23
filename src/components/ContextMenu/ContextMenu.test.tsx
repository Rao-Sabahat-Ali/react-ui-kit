import { readFileSync } from 'node:fs';
import { useRef, type RefObject } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MenuItem } from '../Menu/types';
import { ContextMenu, type ContextMenuHandle } from './ContextMenu';

const scss = readFileSync(`${process.cwd()}/src/components/ContextMenu/ContextMenu.scss`, 'utf8');

const items = (command: () => void = vi.fn()): MenuItem[] => [
  { label: 'Open', command },
  { label: 'Move to', items: [{ label: 'Archive', command }, { label: 'Shared', command }] },
  { label: 'Delete', command },
];

function Row({ label = 'Row 1', handleRef, command }: { label?: string; handleRef?: RefObject<ContextMenuHandle | null>; command?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={ref} tabIndex={0} role="region" aria-label={label}>
        {label}
      </div>
      <ContextMenu target={ref} items={items(command)} ariaLabel={`${label} actions`} ref={handleRef} />
    </>
  );
}

const menu = () => screen.queryByRole('menu');
const mi = (name: string) => screen.getByRole('menuitem', { name });

describe('ContextMenu', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('AC-1: opens at the pointer on contextmenu; Shift+F10 opens at the element', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute('role') === 'region') return DOMRect.fromRect({ x: 40, y: 60, width: 300, height: 40 });
      return DOMRect.fromRect({});
    });
    const user = userEvent.setup();
    render(<Row />);
    const row = screen.getByRole('region');
    const event = fireEvent.contextMenu(row, { clientX: 120, clientY: 200 });
    expect(event).toBe(false); // native menu suppressed
    expect(menu()).toHaveStyle({ top: '200px', left: '120px' });
    await user.keyboard('{Escape}');
    row.focus();
    await user.keyboard('{Shift>}{F10}{/Shift}');
    expect(menu()).toHaveStyle({ top: '100px', left: '40px' });
  });

  it('AC-2: behaves as TieredMenu after opening', async () => {
    const user = userEvent.setup();
    const command = vi.fn();
    render(<Row command={command} />);
    fireEvent.contextMenu(screen.getByRole('region'), { clientX: 10, clientY: 10 });
    await user.keyboard('{ArrowDown}{ArrowRight}');
    expect(mi('Archive')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(mi('Move to')).toHaveFocus();
    await user.keyboard('{End}{Enter}');
    expect(command).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
  });

  it('AC-3: ContextMenu key on a focused target opens at the element', async () => {
    const user = userEvent.setup();
    render(<Row />);
    screen.getByRole('region').focus();
    await user.keyboard('{ContextMenu}');
    expect(screen.getByRole('menu', { name: 'Row 1 actions' })).toBeInTheDocument();
  });

  it('AC-4: focus is on the first item after pointer or keyboard open', async () => {
    const user = userEvent.setup();
    render(<Row />);
    fireEvent.contextMenu(screen.getByRole('region'), { clientX: 10, clientY: 10 });
    expect(mi('Open')).toHaveFocus();
    await user.keyboard('{Escape}');
    await user.keyboard('{Shift>}{F10}{/Shift}');
    expect(mi('Open')).toHaveFocus();
  });

  it('AC-5: Escape at root, Tab and outside click close and return focus to the target', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Row />
        <p>Outside</p>
      </>,
    );
    const row = screen.getByRole('region');
    row.focus();
    await user.keyboard('{Shift>}{F10}{/Shift}');
    await user.keyboard('{Escape}');
    expect(menu()).toBeNull();
    expect(row).toHaveFocus();
    await user.keyboard('{Shift>}{F10}{/Shift}');
    await user.tab();
    expect(menu()).toBeNull();
    expect(row).toHaveFocus();
    await user.keyboard('{Shift>}{F10}{/Shift}');
    await user.click(screen.getByText('Outside'));
    await act(async () => new Promise((r) => setTimeout(r, 0)));
    expect(menu()).toBeNull();
    expect(row).toHaveFocus();
  });

  it('AC-6: 500 ms touch long-press opens; moving > 10 px or releasing early cancels', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Row />);
    const row = screen.getByRole('region');
    const advance = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));

    await user.pointer({ keys: '[TouchA>]', target: row, coords: { clientX: 50, clientY: 50 } });
    await advance(300);
    await user.pointer({ keys: '[/TouchA]', target: row });
    await advance(500);
    expect(menu()).toBeNull();

    await user.pointer({ keys: '[TouchA>]', target: row, coords: { clientX: 50, clientY: 50 } });
    await user.pointer({ pointerName: 'TouchA', target: row, coords: { clientX: 70, clientY: 50 } });
    await advance(600);
    expect(menu()).toBeNull();
    await user.pointer({ keys: '[/TouchA]', target: row });

    await user.pointer({ keys: '[TouchA>]', target: row, coords: { clientX: 50, clientY: 50 } });
    await user.pointer({ pointerName: 'TouchA', target: row, coords: { clientX: 55, clientY: 52 } });
    await advance(500);
    expect(menu()).toBeInTheDocument();
    expect(menu()).toHaveStyle({ top: '50px', left: '50px' });
  });

  it('AC-7: menu stays within the viewport', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute('role') === 'menu') return DOMRect.fromRect({ width: 200, height: 150 });
      return DOMRect.fromRect({});
    });
    render(<Row />);
    fireEvent.contextMenu(screen.getByRole('region'), { clientX: 1000, clientY: 740 });
    const el = menu()!;
    expect(parseFloat(el.style.left) + 200).toBeLessThanOrEqual(window.innerWidth - 8);
    expect(parseFloat(el.style.top) + 150).toBeLessThanOrEqual(window.innerHeight - 8);
  });

  it('AC-8: opening a second context menu closes the first', async () => {
    const second = { current: null as ContextMenuHandle | null };
    render(
      <>
        <Row label="Row A" />
        <Row label="Row B" handleRef={second} />
      </>,
    );
    fireEvent.contextMenu(screen.getByRole('region', { name: 'Row A' }), { clientX: 10, clientY: 10 });
    expect(screen.getByRole('menu', { name: 'Row A actions' })).toBeInTheDocument();
    act(() => second.current!.show({ clientX: 30, clientY: 30, target: screen.getByRole('region', { name: 'Row B' }) }));
    expect(screen.getAllByRole('menu')).toHaveLength(1);
    expect(screen.getByRole('menu', { name: 'Row B actions' })).toBeInTheDocument();
  });

  it('AC-9: reduced motion disables open animation', () => {
    expect(scss).toMatch(/prefers-reduced-motion: reduce\)\s*{\s*\.ui-context-menu\s*{\s*animation: none/);
  });
});
