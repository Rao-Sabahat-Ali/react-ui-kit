import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from '../Dialog/Dialog';
import { Tooltip } from './Tooltip';

import { readFileSync } from 'node:fs';

const scss = readFileSync(`${process.cwd()}/src/components/Tooltip/Tooltip.scss`, 'utf8');

function setup() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}
const advance = (ms: number) =>
  act(async () => {
    vi.advanceTimersByTime(ms);
  });

describe('Tooltip', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('AC-1: shows after delay on hover and immediately on keyboard focus', async () => {
    const user = setup();
    render(
      <>
        <span data-testid="away">away</span>
        <button type="button">Before</button>
        <Tooltip content="Save changes">
          <button type="button">Save</button>
        </Tooltip>
      </>,
    );
    await user.hover(screen.getByText('Save'));
    expect(screen.queryByRole('tooltip')).toBeNull();
    await advance(250);
    expect(screen.queryByRole('tooltip')).toBeNull();
    await advance(50);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Save changes');
    await user.hover(screen.getByTestId('away'));
    await advance(100);
    expect(screen.queryByRole('tooltip')).toBeNull();

    await user.tab();
    await user.tab();
    expect(screen.getByText('Save')).toHaveFocus();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('AC-2: Escape hides without moving focus', async () => {
    const user = setup();
    render(
      <Tooltip content="Help">
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(screen.getByText('Trigger')).toHaveFocus();
  });

  it('AC-3: pointer can move onto tooltip without it closing', async () => {
    const user = setup();
    render(
      <>
        <span data-testid="away">away</span>
        <Tooltip content="Details">
          <button type="button">Trigger</button>
        </Tooltip>
      </>,
    );
    await user.hover(screen.getByText('Trigger'));
    await advance(300);
    const tip = screen.getByRole('tooltip');
    await user.hover(screen.getByTestId('away'));
    await advance(50);
    await user.hover(tip);
    await advance(1000);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('AC-4: aria-describedby set only while visible', async () => {
    const user = setup();
    render(
      <Tooltip content="Info">
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    const btn = screen.getByText('Trigger');
    expect(btn).not.toHaveAttribute('aria-describedby');
    await user.tab();
    expect(btn).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id);
    expect(btn).toHaveAccessibleDescription('Info');
    await user.keyboard('{Escape}');
    expect(btn).not.toHaveAttribute('aria-describedby');
  });

  it('AC-5: Escape with a visible tooltip does not close the enclosing Dialog; otherwise it propagates', async () => {
    const user = setup();
    const onClose = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog open={open} onClose={(r) => { onClose(r); setOpen(false); }} title="Settings">
          <Tooltip content="Explain">
            <button type="button">Help</button>
          </Tooltip>
        </Dialog>
      );
    }
    render(<Harness />);
    // Focus starts on the dialog's Close button; Tab moves to the tooltip trigger.
    await user.tab();
    expect(screen.getByText('Help')).toHaveFocus();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledWith('escape');
  });

  it('AC-6: stays visible while hovered or focused (no timeout)', async () => {
    const user = setup();
    render(
      <>
        <span data-testid="away">away</span>
        <Tooltip content="Persistent">
          <button type="button">Trigger</button>
        </Tooltip>
      </>,
    );
    await user.hover(screen.getByText('Trigger'));
    await advance(300);
    await advance(60_000);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.hover(screen.getByTestId('away'));
    await advance(100);
    await user.tab();
    await user.hover(screen.getByText('Trigger'));
    await user.hover(screen.getByTestId('away'));
    await advance(60_000);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('AC-7: hides after delay.hide when pointer leaves, and immediately on blur', async () => {
    const user = setup();
    render(
      <>
        <span data-testid="away">away</span>
        <Tooltip content="Tip" delay={{ show: 10, hide: 200 }}>
          <button type="button">Trigger</button>
        </Tooltip>
        <button type="button">Next</button>
      </>,
    );
    await user.hover(screen.getByText('Trigger'));
    await advance(10);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.hover(screen.getByTestId('away'));
    await advance(150);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await advance(50);
    expect(screen.queryByRole('tooltip')).toBeNull();

    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.tab();
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('AC-8: asLabel gives the trigger a persistent name and hides the tooltip from AT', async () => {
    const user = setup();
    render(
      <Tooltip content="Delete" asLabel>
        <button type="button">
          <svg aria-hidden="true" />
        </button>
      </Tooltip>,
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    await user.tab();
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(tip).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Delete' })).not.toHaveAttribute('aria-describedby');
  });

  it('AC-9: not shown on touch pointers or on mouse-click focus', async () => {
    const user = setup();
    render(
      <>
        <span data-testid="away">away</span>
        <Tooltip content="Tip" delay={{ show: 0 }}>
          <button type="button">Trigger</button>
        </Tooltip>
      </>,
    );
    await user.pointer({ keys: '[TouchA]', target: screen.getByText('Trigger') });
    await advance(500);
    expect(screen.queryByRole('tooltip')).toBeNull();
    (screen.getByText('Trigger') as HTMLElement).blur();
    await user.pointer({ keys: '[MouseLeft]', target: screen.getByText('Trigger') });
    expect(screen.getByText('Trigger')).toHaveFocus();
    // Focus came from the mouse: only the hover delay may show it, focus alone does not.
    await user.hover(screen.getByTestId('away'));
    await advance(500);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('AC-10: role tooltip, never in tab order, at most one visible', async () => {
    const user = setup();
    render(
      <>
        <span data-testid="away">away</span>
        <Tooltip content="First tip">
          <button type="button">One</button>
        </Tooltip>
        <Tooltip content="Second tip">
          <button type="button">Two</button>
        </Tooltip>
      </>,
    );
    await user.tab();
    const tip = screen.getByRole('tooltip');
    expect(tip).not.toHaveAttribute('tabindex');
    await user.hover(screen.getByText('Two'));
    await advance(300);
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Second tip');
  });

  it('AC-11: reduced motion disables fade/scale', () => {
    expect(scss).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*{\s*\.ui-tooltip\s*{\s*animation: none/);
  });

  it('hides when disabled is toggled on', async () => {
    const user = setup();
    const { rerender } = render(
      <Tooltip content="Tip">
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    rerender(
      <Tooltip content="Tip" disabled>
        <button type="button">Trigger</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
