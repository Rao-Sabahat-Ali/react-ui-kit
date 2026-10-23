import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dialog, type DialogCloseReason } from './Dialog';

function Harness({ onClose = vi.fn(), nested = false, closeOnEscape = true }: { onClose?: (r: DialogCloseReason) => void; nested?: boolean; closeOnEscape?: boolean }) {
  const [open, setOpen] = useState(false);
  const [inner, setInner] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      <Dialog open={open} closeOnEscape={closeOnEscape} onClose={(r) => { onClose(r); setOpen(false); }} title="Edit user" footer={<button type="button">Save</button>}>
        <input aria-label="Name" />
        {nested && <button type="button" onClick={() => setInner(true)}>Inner</button>}
        <Dialog open={inner} onClose={() => setInner(false)} title="Inner dialog">inner body</Dialog>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('AC-1: portal with dialog role, aria-modal and title label', async () => {
    const { container } = render(<Harness />);
    await userEvent.click(screen.getByText('Open'));
    const dialog = screen.getByRole('dialog', { name: 'Edit user' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(container).not.toContainElement(dialog);
  });

  it('AC-2: focus moves in on open and returns to trigger on close', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText('Open'));
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByText('Open')).toHaveFocus();
  });

  it('AC-3: Tab cycles within the dialog', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText('Open'));
    await userEvent.tab();
    expect(screen.getByLabelText('Name')).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByText('Save')).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('AC-4: Escape closes with reason; can be disabled', async () => {
    const onClose = vi.fn();
    const { unmount } = render(<Harness onClose={onClose} />);
    await userEvent.click(screen.getByText('Open'));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledWith('escape');
    unmount();
    const noEsc = vi.fn();
    render(<Harness onClose={noEsc} closeOnEscape={false} />);
    await userEvent.click(screen.getByText('Open'));
    await userEvent.keyboard('{Escape}');
    expect(noEsc).not.toHaveBeenCalled();
  });

  it('AC-5: backdrop click closes, inside click does not', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await userEvent.click(screen.getByText('Open'));
    const content = screen.getByRole('dialog');
    fireEvent.mouseDown(content);
    fireEvent.click(content);
    expect(onClose).not.toHaveBeenCalled();
    const modal = document.querySelector('.ui-dialog') as HTMLElement;
    fireEvent.mouseDown(modal);
    fireEvent.click(modal);
    expect(onClose).toHaveBeenCalledWith('backdrop');
  });

  it('AC-6: locks body scroll while open', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText('Open'));
    expect(document.body.style.overflow).toBe('hidden');
    await userEvent.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });

  it('AC-7: nested — Escape closes only the top-most', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} nested />);
    await userEvent.click(screen.getByText('Open'));
    await userEvent.click(screen.getByText('Inner'));
    expect(screen.getByRole('dialog', { name: 'Inner dialog' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Inner dialog' })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Edit user' })).toBeInTheDocument();
  });

  it('AC-8: no DOM when closed', () => {
    render(<Dialog open={false} onClose={() => {}} title="X" />);
    expect(document.querySelector('.ui-dialog')).toBeNull();
  });

  it('marks background inert while open', async () => {
    const { container } = render(<Harness />);
    await userEvent.click(screen.getByText('Open'));
    expect(container).toHaveAttribute('inert');
    await userEvent.keyboard('{Escape}');
    expect(container).not.toHaveAttribute('inert');
  });
});
