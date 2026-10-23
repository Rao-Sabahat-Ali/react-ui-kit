import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Inplace } from './Inplace';

const editor = (close: () => void) => (
  <>
    <input aria-label="Title" defaultValue="Hello" />
    <button onClick={close}>Done</button>
  </>
);

describe('Inplace', () => {
  it('AC-1: activation swaps display for editor and focuses it', async () => {
    render(<Inplace display="Hello" label="title">{editor}</Inplace>);
    await userEvent.click(screen.getByRole('button', { name: 'Edit title' }));
    expect(screen.queryByRole('button', { name: 'Edit title' })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus();
  });

  it('AC-2: Escape restores display and focus', async () => {
    const onToggle = vi.fn();
    render(<Inplace display="Hello" label="title" onToggle={onToggle}>{editor}</Inplace>);
    await userEvent.click(screen.getByRole('button', { name: 'Edit title' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit title' })).toHaveFocus();
    expect(onToggle).toHaveBeenNthCalledWith(1, true);
    expect(onToggle).toHaveBeenNthCalledWith(2, false);
  });

  it('close callback from the editor restores display', async () => {
    render(<Inplace display="Hello" label="title">{editor}</Inplace>);
    await userEvent.click(screen.getByRole('button', { name: 'Edit title' }));
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('button', { name: 'Edit title' })).toHaveFocus();
  });

  it('display name defaults to string display; disabled blocks activation; closable shows close', async () => {
    const first = render(<Inplace display="Project" disabled>{editor}</Inplace>);
    expect(screen.getByRole('button', { name: 'Edit Project' })).toBeDisabled();
    first.unmount();
    render(<Inplace display="Project" closable defaultActive>{editor}</Inplace>);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('button', { name: 'Edit Project' })).toBeInTheDocument();
  });
});
