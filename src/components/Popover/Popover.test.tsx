import { readFileSync } from 'node:fs';
import { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from '../Dialog/Dialog';
import { Popover } from './Popover';

const scss = readFileSync(`${process.cwd()}/src/components/Popover/Popover.scss`, 'utf8');

let triggerTop = 100;
function mockRects() {
  return vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.getAttribute('role') === 'dialog') return DOMRect.fromRect({ x: 0, y: 0, width: 200, height: 100 });
    if (this.hasAttribute('aria-haspopup')) return DOMRect.fromRect({ x: 100, y: triggerTop, width: 80, height: 30 });
    return DOMRect.fromRect({ x: 0, y: 0, width: 0, height: 0 });
  });
}

function Basic(props: Partial<Parameters<typeof Popover>[0]>) {
  return (
    <>
      <button type="button">Before</button>
      <Popover title="Filters" trigger={<button type="button">Open</button>} {...props}>
        <input aria-label="Query" />
        <button type="button">Apply</button>
      </Popover>
      <button type="button">After</button>
    </>
  );
}

describe('Popover', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    triggerTop = 100;
  });

  it('AC-1: opens anchored to trigger and flips when overflowing', async () => {
    mockRects();
    const { unmount } = render(<Basic />);
    await userEvent.click(screen.getByText('Open'));
    const panel = screen.getByRole('dialog');
    expect(panel.style.top).toBe(`${100 + 30 + 8}px`);
    expect(panel).toHaveAttribute('data-placement', 'bottom');
    unmount();

    triggerTop = 700; // 700 + 30 + 8 + 100 > 768 - 8 → flip to top
    render(<Basic />);
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByRole('dialog').style.top).toBe(`${700 - 100 - 8}px`);
    expect(screen.getByRole('dialog')).toHaveAttribute('data-placement', 'top');
  });

  it('AC-2: outside click and Escape close; focus returns', async () => {
    render(<Basic />);
    await userEvent.click(screen.getByText('Open'));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Open')).toHaveFocus();
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByLabelText('Query')).toHaveFocus();
    await userEvent.click(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Open')).toHaveFocus();
  });

  it('AC-3: repositions on scroll and resize', async () => {
    mockRects();
    render(<Basic />);
    await userEvent.click(screen.getByText('Open'));
    triggerTop = 200;
    fireEvent.scroll(window);
    expect(screen.getByRole('dialog').style.top).toBe(`${200 + 38}px`);
    triggerTop = 250;
    fireEvent(window, new Event('resize'));
    expect(screen.getByRole('dialog').style.top).toBe(`${250 + 38}px`);
  });

  it('AC-4: trigger exposes aria-haspopup, aria-expanded and aria-controls', async () => {
    render(<Basic />);
    const trigger = screen.getByText('Open');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', screen.getByRole('dialog').id);
  });

  it('AC-5: panel is a non-modal dialog with an accessible name', async () => {
    const { unmount } = render(<Basic />);
    await userEvent.click(screen.getByText('Open'));
    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    expect(dialog).not.toHaveAttribute('aria-modal');
    unmount();
    render(<Basic title={undefined} ariaLabel="Quick details" />);
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByRole('dialog', { name: 'Quick details' })).toBeInTheDocument();
  });

  it('AC-6: focus moves to initialFocus, else first focusable, else the panel', async () => {
    function WithInitial() {
      const ref = useRef<HTMLButtonElement>(null);
      return (
        <Popover ariaLabel="P" initialFocus={ref} trigger={<button type="button">Open</button>}>
          <input aria-label="Query" />
          <button ref={ref} type="button">Target</button>
        </Popover>
      );
    }
    const a = render(<WithInitial />);
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Target')).toHaveFocus();
    a.unmount();
    const b = render(<Basic />);
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByLabelText('Query')).toHaveFocus();
    b.unmount();
    render(
      <Popover ariaLabel="Text only" trigger={<button type="button">Open</button>}>
        Plain text
      </Popover>,
    );
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('AC-7: Tab past last focusable closes and moves on; Shift+Tab from first focuses trigger', async () => {
    render(<Basic />);
    await userEvent.click(screen.getByText('Open'));
    await userEvent.tab({ shift: true });
    expect(screen.getByText('Open')).toHaveFocus();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByLabelText('Query')).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByText('Apply')).toHaveFocus();
    await userEvent.tab();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('After')).toHaveFocus();
  });

  it('AC-8: Escape inside a popover nested in a Dialog closes only the popover', async () => {
    const onClose = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog open={open} title="Edit" onClose={(r) => { onClose(r); setOpen(false); }}>
          <Popover ariaLabel="Inner" trigger={<button type="button">Open</button>}>
            <button type="button">Inside</button>
          </Popover>
        </Dialog>
      );
    }
    render(<Harness />);
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Inside')).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Inner' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Edit' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Open')).toHaveFocus();
  });

  it('AC-9: background is not inert and scroll is not locked', async () => {
    render(<Basic />);
    await userEvent.click(screen.getByText('Open'));
    for (const child of Array.from(document.body.children)) expect(child).not.toHaveAttribute('inert');
    expect(document.body.style.overflow).not.toBe('hidden');
    await userEvent.click(screen.getByText('After'));
    expect(screen.getByText('After')).toHaveFocus();
  });

  it('AC-10: outside click returns focus to trigger only if focus was inside the panel', async () => {
    render(<Basic />);
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByLabelText('Query')).toHaveFocus();
    await userEvent.click(screen.getByText('After'));
    expect(screen.queryByRole('dialog')).toBeNull();
    // Focus was inside the panel: restored to the trigger, then the clicked button takes it natively.
    expect(screen.getByText('After')).toHaveFocus();

    await userEvent.click(screen.getByText('Open'));
    screen.getByText('Before').focus();
    await userEvent.click(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Open')).not.toHaveFocus();
  });

  it('AC-11: reduced motion disables the open/close animation', () => {
    expect(scss).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*{\s*\.ui-popover\s*{\s*animation: none/);
  });

  it('controlled open state', async () => {
    const onOpenChange = vi.fn();
    render(<Basic open={false} onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByText('Open'));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
