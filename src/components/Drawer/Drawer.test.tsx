import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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
});
