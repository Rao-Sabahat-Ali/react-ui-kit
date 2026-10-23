import { readFileSync } from 'node:fs';
import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmPopupProvider, useConfirmPopup, type ConfirmPopupFn, type ConfirmPopupSeverity } from './ConfirmPopup';

const scss = readFileSync(`${process.cwd()}/src/components/ConfirmPopup/ConfirmPopup.scss`, 'utf8');

let api: ConfirmPopupFn | null = null;
function Row({ severity }: { severity?: ConfirmPopupSeverity }) {
  const confirmPopup = useConfirmPopup();
  api = confirmPopup;
  const [result, setResult] = useState('none');
  return (
    <>
      <button type="button" onClick={async (e) => setResult(String(await confirmPopup({ target: e.currentTarget, message: 'Delete this row?', acceptLabel: 'Delete', severity })))}>
        Remove
      </button>
      <output>{result}</output>
    </>
  );
}
const setup = (severity?: ConfirmPopupSeverity) => render(<ConfirmPopupProvider><Row severity={severity} /></ConfirmPopupProvider>);

describe('ConfirmPopup', () => {
  afterEach(() => vi.restoreAllMocks());

  it('AC-1: positions next to the target and flips when there is no space', async () => {
    let targetTop = 100;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute('role') === 'alertdialog') return DOMRect.fromRect({ width: 220, height: 120 });
      if (this.textContent === 'Remove') return DOMRect.fromRect({ x: 300, y: targetTop, width: 80, height: 30 });
      return DOMRect.fromRect({});
    });
    setup();
    await userEvent.click(screen.getByText('Remove'));
    expect(screen.getByRole('alertdialog').style.top).toBe('138px');
    expect(screen.getByRole('alertdialog')).toHaveAttribute('data-placement', 'bottom');
    await userEvent.keyboard('{Escape}');
    targetTop = 700;
    await userEvent.click(screen.getByText('Remove'));
    expect(screen.getByRole('alertdialog').style.top).toBe(`${700 - 120 - 8}px`);
    expect(screen.getByRole('alertdialog')).toHaveAttribute('data-placement', 'top');
  });

  it('AC-2: promise resolves per choice', async () => {
    setup();
    await userEvent.click(screen.getByText('Remove'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('status')).toHaveTextContent('true');
    await userEvent.click(screen.getByText('Remove'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('status')).toHaveTextContent('false');
  });

  it('AC-3: alertdialog, aria-modal, accessible name and description', async () => {
    setup();
    await userEvent.click(screen.getByText('Remove'));
    const popup = screen.getByRole('alertdialog', { name: 'Confirmation' });
    expect(popup).toHaveAttribute('aria-modal', 'true');
    expect(popup).toHaveAccessibleDescription('Delete this row?');
  });

  it('AC-4: initial focus is Reject for danger, Accept otherwise', async () => {
    const a = setup('danger');
    await userEvent.click(screen.getByText('Remove'));
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    a.unmount();
    setup();
    await userEvent.click(screen.getByText('Remove'));
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
  });

  it('AC-5: Tab and Shift+Tab cycle within the popup', async () => {
    setup();
    await userEvent.click(screen.getByText('Remove'));
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
  });

  it('AC-6: Escape and outside click resolve false', async () => {
    setup();
    await userEvent.click(screen.getByText('Remove'));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('false');
    await userEvent.click(screen.getByText('Remove'));
    await userEvent.click(document.querySelector('.ui-confirm-popup__catcher')!);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('false');
  });

  it('AC-7: focus returns to target after accept, reject, Escape and outside click', async () => {
    setup();
    const target = screen.getByText('Remove');
    await userEvent.click(target);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(target).toHaveFocus();
    await userEvent.click(target);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(target).toHaveFocus();
    await userEvent.click(target);
    await userEvent.keyboard('{Escape}');
    expect(target).toHaveFocus();
    await userEvent.click(target);
    await userEvent.click(document.querySelector('.ui-confirm-popup__catcher')!);
    expect(target).toHaveFocus();
  });

  it('AC-8: background is inert while open', async () => {
    const { container } = setup();
    await userEvent.click(screen.getByText('Remove'));
    expect(container).toHaveAttribute('inert');
    await userEvent.keyboard('{Escape}');
    expect(container).not.toHaveAttribute('inert');
  });

  it('AC-9: a second call resolves the pending one with false', async () => {
    setup();
    const target = screen.getByText('Remove');
    let first: Promise<boolean> | undefined;
    let second: Promise<boolean> | undefined;
    await act(async () => {
      first = api!({ target, message: 'First?' });
    });
    await act(async () => {
      second = api!({ target, message: 'Second?' });
    });
    await expect(first).resolves.toBe(false);
    expect(screen.getAllByRole('alertdialog')).toHaveLength(1);
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription('Second?');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await expect(second).resolves.toBe(true);
  });

  it('AC-10: reduced motion disables the open animation', () => {
    expect(scss).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*{\s*\.ui-confirm-popup\s*{\s*animation: none/);
  });
});
