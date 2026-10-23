import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CommandPalette, type Command, type CommandPaletteProps } from './CommandPalette';

const make = (overrides: Partial<Command> = {}) => {
  const run = vi.fn();
  const commands: Command[] = [
    { id: 'home', label: 'Home', run },
    { id: 'new-invoice', label: 'New invoice', group: 'Actions', shortcut: ['Mod', 'N'], run },
    { id: 'archive', label: 'Archive all', group: 'Actions', disabled: true, run },
    { id: 'users', label: 'Users', group: 'Navigation', keywords: ['people', 'accounts'], run },
    { id: 'settings', label: 'Settings', group: 'Navigation', run, ...overrides },
  ];
  return { run, commands };
};

const input = () => screen.getByRole('combobox');
const activeOption = () => {
  const id = input().getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};

function Opener(props: Partial<CommandPaletteProps>) {
  const [open, setOpen] = useState(true);
  return <CommandPalette open={open} onOpenChange={setOpen} {...props} />;
}

describe('CommandPalette', () => {
  it('AC-1: Ctrl+K opens a modal dialog and focuses the combobox; pressing again closes; hotkey={false} disables', async () => {
    const user = userEvent.setup();
    const { commands } = make();
    const { unmount } = render(<CommandPalette commands={commands} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.keyboard('{Control>}k{/Control}');
    const dialog = screen.getByRole('dialog', { name: 'Command palette' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(input()).toHaveFocus();
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();

    render(<CommandPalette commands={commands} hotkey={false} />);
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('AC-1: uses Meta+K on Apple platforms', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    render(<CommandPalette commands={make().commands} />);
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.keyboard('{Meta>}k{/Meta}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('AC-2: input controls the listbox and is expanded while results are visible', async () => {
    render(<Opener commands={make().commands} />);
    expect(input().getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id);
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    expect(input()).toHaveAttribute('aria-autocomplete', 'list');
    await userEvent.type(input(), 'zzz');
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });

  it('AC-3: typing filters case-insensitively over label and keywords', async () => {
    render(<Opener commands={make().commands} />);
    await userEvent.type(input(), 'PEOP');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Users']);
    await userEvent.clear(input());
    await userEvent.type(input(), 'in');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['New invoiceCtrlN', 'Settings']);
    expect(screen.queryByRole('option', { name: /Home/ })).toBeNull();
  });

  it('AC-4: grouped commands render inside labelled groups in first-appearance order', () => {
    render(<Opener commands={make().commands} />);
    const groups = screen.getAllByRole('group');
    expect(groups.map((g) => g.getAttribute('aria-labelledby') && document.getElementById(g.getAttribute('aria-labelledby')!)?.textContent)).toEqual(['Actions', 'Navigation']);
    expect(within(screen.getByRole('group', { name: 'Navigation' })).getAllByRole('option')).toHaveLength(2);
    // ungrouped first
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Home');
  });

  it('AC-5: arrows move the active descendant, wrapping and skipping disabled', async () => {
    render(<Opener commands={make().commands} />);
    expect(activeOption()).toHaveTextContent('Home');
    expect(activeOption()).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowDown}');
    expect(activeOption()).toHaveTextContent('New invoice');
    await userEvent.keyboard('{ArrowDown}');
    expect(activeOption()).toHaveTextContent('Users'); // skips disabled Archive
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(activeOption()).toHaveTextContent('Home'); // wraps
    await userEvent.keyboard('{ArrowUp}');
    expect(activeOption()).toHaveTextContent('Settings');
    expect(screen.getByRole('option', { name: 'Home' })).toHaveAttribute('aria-selected', 'false');
  });

  it('AC-6: Enter runs, then onRun, then closes; click does the same; closeOnRun={false} keeps it open', async () => {
    const order: string[] = [];
    const commands: Command[] = [
      { id: 'a', label: 'Alpha', run: () => void order.push('run:a') },
      { id: 'b', label: 'Beta', run: () => void order.push('run:b') },
    ];
    const onOpenChange = vi.fn();
    const { unmount } = render(<CommandPalette defaultOpen commands={commands} onOpenChange={(o) => (order.push(`open:${o}`), onOpenChange(o))} onRun={(c) => order.push(`onRun:${c.id}`)} />);
    await userEvent.keyboard('{Enter}');
    expect(order).toEqual(['run:a', 'onRun:a', 'open:false']);
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();

    order.length = 0;
    render(<CommandPalette defaultOpen closeOnRun={false} commands={commands} onRun={(c) => order.push(`onRun:${c.id}`)} />);
    await userEvent.click(screen.getByRole('option', { name: 'Beta' }));
    expect(order).toEqual(['run:b', 'onRun:b']);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('AC-7: disabled commands have aria-disabled and cannot run', async () => {
    const { run, commands } = make();
    render(<Opener commands={commands} />);
    const archive = screen.getByRole('option', { name: 'Archive all' });
    expect(archive).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(archive);
    await userEvent.type(input(), 'archive{Enter}');
    expect(run).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('AC-8: empty query with recent shows a Recent group of at most maxRecent', async () => {
    const recent: Command[] = Array.from({ length: 7 }, (_, i) => ({ id: `r${i}`, label: `Recent ${i}` }));
    render(<Opener commands={make().commands} recent={recent} maxRecent={3} />);
    const group = screen.getByRole('group', { name: 'Recent' });
    expect(within(group).getAllByRole('option')).toHaveLength(3);
    await userEvent.type(input(), 'set');
    expect(screen.queryByRole('group', { name: 'Recent' })).toBeNull();
  });

  it('AC-9: onSearch is debounced, previous signal aborted, aborted results never rendered', async () => {
    const calls: { query: string; signal: AbortSignal; resolve: (c: Command[]) => void }[] = [];
    const onSearch = vi.fn((query: string, signal: AbortSignal) => new Promise<Command[]>((resolve) => calls.push({ query, signal, resolve })));
    render(<Opener commands={[]} onSearch={onSearch} searchDebounce={30} />);
    await userEvent.type(input(), 'ab');
    expect(onSearch).not.toHaveBeenCalled();
    await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1));
    expect(calls[0]!.query).toBe('ab');
    expect(calls[0]!.signal).toBeInstanceOf(AbortSignal);
    await userEvent.type(input(), 'c');
    expect(calls[0]!.signal.aborted).toBe(true);
    await act(async () => calls[0]!.resolve([{ id: 'stale', label: 'Stale result' }]));
    expect(screen.queryByText('Stale result')).toBeNull();
    await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(2));
    await act(async () => calls[1]!.resolve([{ id: 'fresh', label: 'Fresh abc' }]));
    expect(screen.getByRole('option', { name: 'Fresh abc' })).toBeInTheDocument();
  });

  it('AC-10: closing aborts a pending onSearch signal', async () => {
    let signal: AbortSignal | undefined;
    render(<Opener commands={[]} searchDebounce={0} onSearch={(_q, s) => ((signal = s), new Promise<Command[]>(() => {}))} />);
    await userEvent.type(input(), 'x');
    await waitFor(() => expect(signal).toBeDefined());
    expect(signal!.aborted).toBe(false);
    await userEvent.keyboard('{Escape}{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(signal!.aborted).toBe(true);
  });

  it('AC-11: a status region announces loading, then the result count', async () => {
    let resolve: (c: Command[]) => void = () => {};
    render(<Opener commands={[{ id: 'u', label: 'Users' }]} searchDebounce={0} onSearch={() => new Promise<Command[]>((r) => (resolve = r))} />);
    await userEvent.type(input(), 'u');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading…');
    await act(async () => resolve([{ id: 'u2', label: 'User groups' }]));
    expect(status).toHaveTextContent('2 results');
  });

  it('AC-12: no matches renders emptyMessage and no options', async () => {
    render(<Opener commands={make().commands} emptyMessage="Nothing here" />);
    await userEvent.type(input(), 'qwerty');
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('AC-13: Escape clears a non-empty query, then closes and calls onOpenChange(false)', async () => {
    const onOpenChange = vi.fn();
    render(<CommandPalette defaultOpen commands={make().commands} onOpenChange={onOpenChange} />);
    await userEvent.type(input(), 'set');
    await userEvent.keyboard('{Escape}');
    expect(input()).toHaveValue('');
    expect(onOpenChange).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('AC-14: focus returns to the previously focused element on close', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Before</button>
        <CommandPalette commands={make().commands} />
      </>,
    );
    screen.getByRole('button', { name: 'Before' }).focus();
    await user.keyboard('{Control>}k{/Control}');
    expect(input()).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Before' })).toHaveFocus();
  });

  it('AC-15: shortcut renders kbd elements and sets aria-keyshortcuts', () => {
    render(<Opener commands={make().commands} />);
    const option = screen.getByRole('option', { name: /New invoice/ });
    expect(option).toHaveAttribute('aria-keyshortcuts', 'Control+N');
    expect(option.querySelectorAll('kbd')).toHaveLength(2);
    expect(option.querySelector('.ui-command-palette__shortcut')).toHaveAttribute('aria-hidden', 'true');
  });

  it('AC-16: a rejected onSearch shows static results only and does not throw', async () => {
    render(<Opener commands={[{ id: 'u', label: 'Users' }]} searchDebounce={0} onSearch={() => Promise.reject(new Error('500'))} />);
    await userEvent.type(input(), 'u');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 result'));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Users']);
  });
});
