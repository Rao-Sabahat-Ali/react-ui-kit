import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '../../locale';
import { compileScss, mediaBlock } from '../../../test/scss';
import { Dialog } from '../Dialog/Dialog';
import { Drawer, type DrawerProps } from './Drawer';

function Harness(props: Partial<DrawerProps>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      <Drawer title="Filters" {...props} open={open} onClose={(r) => { props.onClose?.(r); setOpen(false); }}>
        <input aria-label="Search" />
      </Drawer>
    </>
  );
}

describe('Drawer', () => {
  it('AC-1: overlay behaviour — focus in, Escape closes, focus restored, backdrop closes', async () => {
    const onClose = vi.fn();
    const { container } = render(<Harness onClose={onClose} />);
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByRole('dialog', { name: 'Filters' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    expect(container).toHaveAttribute('inert');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledWith('escape');
    expect(screen.getByText('Open')).toHaveFocus();
    await userEvent.click(screen.getByText('Open'));
    await userEvent.click(document.querySelector('.ui-drawer__backdrop')!);
    expect(onClose).toHaveBeenLastCalledWith('backdrop');
  });

  it('AC-2: position classes per edge', async () => {
    render(<Harness position="start" />);
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByRole('dialog')).toHaveClass('offcanvas-start');
  });

  it('AC-3: non-modal leaves page interactive', async () => {
    const { container } = render(<Harness modal={false} />);
    await userEvent.click(screen.getByText('Open'));
    expect(document.querySelector('.ui-drawer__backdrop')).toBeNull();
    expect(container).not.toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('');
  });

  it('AC-4: accessible name from title or aria-label; close button is localized', async () => {
    const { unmount } = render(<Drawer open onClose={() => {}} title="Filters">x</Drawer>);
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Filters' })).toBeInTheDocument();
    unmount();
    render(
      <LocaleProvider locale="sv" messages={{ close: 'Stäng' }}>
        <Drawer open onClose={() => {}} aria-label="Navigation">x</Drawer>
      </LocaleProvider>,
    );
    expect(screen.getByRole('dialog', { name: 'Navigation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stäng' })).toBeInTheDocument();
  });

  it('AC-5: focus goes to initialFocus, else first focusable, else the panel', () => {
    function WithInitial() {
      const ref = useRef<HTMLInputElement>(null);
      return (
        <Drawer open onClose={() => {}} title="T" initialFocus={ref}>
          <input aria-label="Search" ref={ref} />
        </Drawer>
      );
    }
    const first = render(<WithInitial />);
    expect(screen.getByLabelText('Search')).toHaveFocus();
    first.unmount();
    const second = render(<Drawer open onClose={() => {}} title="T"><input aria-label="Body input" /></Drawer>);
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    second.unmount();
    render(<Drawer open onClose={() => {}} aria-label="Bare" showClose={false}><p>Nothing to focus</p></Drawer>);
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('AC-6: Escape closes only a nested Dialog; closeOnEscape={false} ignores Escape', async () => {
    const onClose = vi.fn();
    function Nested() {
      const [dialog, setDialog] = useState(false);
      return (
        <Drawer open onClose={onClose} title="Outer">
          <button type="button" onClick={() => setDialog(true)}>Open dialog</button>
          <Dialog open={dialog} onClose={() => setDialog(false)} title="Inner">inner</Dialog>
        </Drawer>
      );
    }
    const nested = render(<Nested />);
    await userEvent.click(screen.getByText('Open dialog'));
    expect(screen.getByRole('dialog', { name: 'Inner' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Inner' })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Outer' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledWith('escape');
    nested.unmount();

    const ignored = vi.fn();
    render(<Drawer open onClose={ignored} title="Locked" closeOnEscape={false}>x</Drawer>);
    await userEvent.keyboard('{Escape}');
    expect(ignored).not.toHaveBeenCalled();
  });

  it('AC-7: modal makes siblings inert and locks scroll; both revert on close', async () => {
    const { container } = render(<Harness />);
    await userEvent.click(screen.getByText('Open'));
    expect(container).toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('hidden');
    await userEvent.keyboard('{Escape}');
    expect(container).not.toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('');
  });

  it('AC-8: focus returns to the trigger after Escape, backdrop and close button', async () => {
    render(<Harness />);
    const trigger = screen.getByText('Open');
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    await userEvent.click(trigger);
    await userEvent.click(document.querySelector('.ui-drawer__backdrop')!);
    expect(trigger).toHaveFocus();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(trigger).toHaveFocus();
  });

  it('AC-9: non-modal has no aria-modal, inert or scroll lock, does not move focus, and Escape closes', async () => {
    const onClose = vi.fn();
    const { container } = render(<Harness modal={false} onClose={onClose} />);
    const trigger = screen.getByText('Open');
    await userEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    expect(dialog).not.toHaveAttribute('aria-modal');
    expect(container).not.toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('');
    expect(trigger).toHaveFocus();
    await userEvent.tab({ shift: false });
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.tab();
    await userEvent.tab();
    expect(dialog.contains(document.activeElement)).toBe(false);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledWith('escape');
  });

  it('AC-10: responsive inline mode is a complementary region without dialog semantics', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: query.includes('min-width'), media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    const onClose = vi.fn();
    const wide = render(<Drawer open={false} onClose={onClose} responsive="lg" title="Filters">Panel</Drawer>);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('complementary', { name: 'Filters' })).toHaveTextContent('Panel');
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    wide.unmount();
    window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    render(<Drawer open onClose={onClose} responsive="lg" title="Filters">Panel</Drawer>);
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    window.matchMedia = original;
  });

  it('AC-11: reduced motion removes the slide animation (rule outranks the per-edge animation)', () => {
    const css = compileScss('src/components/Drawer/Drawer.scss');
    expect(css).toMatch(/@keyframes ui-drawer-in-x/);
    const block = mediaBlock(css, '(prefers-reduced-motion: reduce)');
    expect(block).toMatch(/\.ui-drawer\.offcanvas[^{]*\{[^}]*animation:\s*none/);
    expect(block).toMatch(/\.ui-drawer__backdrop[^{]*\{[^}]*animation:\s*none/);
  });
});
