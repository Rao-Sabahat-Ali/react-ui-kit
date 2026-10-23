import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ConfirmProvider, useConfirm } from './ConfirmDialog';

function Trigger({ severity }: { severity?: 'primary' | 'danger' }) {
  const confirm = useConfirm();
  const [result, setResult] = useState('none');
  return (
    <>
      <button type="button" onClick={async () => setResult(String(await confirm({ title: 'Reset progress?', message: 'All learned words will be lost.', acceptLabel: 'Reset progress', severity })))}>
        Ask
      </button>
      <output>{result}</output>
    </>
  );
}

const setup = (severity?: 'primary' | 'danger') => render(<ConfirmProvider><Trigger severity={severity} /></ConfirmProvider>);

describe('ConfirmDialog', () => {
  it('AC-1: resolves true on accept, false on reject and Escape', async () => {
    setup();
    await userEvent.click(screen.getByText('Ask'));
    await userEvent.click(screen.getByRole('button', { name: 'Reset progress' }));
    expect(screen.getByRole('status')).toHaveTextContent('true');
    await userEvent.click(screen.getByText('Ask'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('status')).toHaveTextContent('false');
    await userEvent.click(screen.getByText('Ask'));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('status')).toHaveTextContent('false');
  });

  it('AC-2: danger severity focuses reject', async () => {
    setup('danger');
    await userEvent.click(screen.getByText('Ask'));
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Reset progress' })).toHaveClass('btn-danger');
  });

  it('AC-3: alertdialog role with label and description', async () => {
    setup();
    await userEvent.click(screen.getByText('Ask'));
    const dialog = screen.getByRole('alertdialog', { name: 'Reset progress?' });
    expect(dialog).toHaveAccessibleDescription('All learned words will be lost.');
  });
});
