import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Terminal } from './Terminal';

const input = () => screen.getByRole('textbox', { name: 'Command' });
const log = () => screen.getByRole('log', { name: 'Terminal' });

describe('Terminal', () => {
  it('AC-1: named group, log region and a labelled textbox with an aria-hidden prompt', () => {
    const { container } = render(<Terminal onCommand={() => null} />);
    expect(screen.getByRole('group', { name: 'Terminal' })).toBeInTheDocument();
    expect(log()).toBeInTheDocument();
    expect(input()).toHaveAttribute('type', 'text');
    container.querySelectorAll('.ui-terminal__prompt').forEach((p) => expect(p).toHaveAttribute('aria-hidden', 'true'));
  });

  it('AC-2: Enter runs the trimmed line, prints command and output, clears and keeps focus; empty lines are ignored', async () => {
    const onCommand = vi.fn((line: string) => (line === 'node' ? <strong>rich</strong> : `echo: ${line}`));
    render(<Terminal onCommand={onCommand} prompt=">" />);
    await userEvent.type(input(), '   hello world  {Enter}');
    expect(onCommand).toHaveBeenCalledWith('hello world');
    expect(within(log()).getByText('hello world')).toBeInTheDocument();
    expect(within(log()).getByText('echo: hello world')).toBeInTheDocument();
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();
    await userEvent.type(input(), '   {Enter}');
    expect(onCommand).toHaveBeenCalledTimes(1);
    await userEvent.type(input(), 'node{Enter}');
    expect(within(log()).getByText('rich').tagName).toBe('STRONG');
  });

  it('AC-3: ArrowUp/ArrowDown walk history and restore the draft', async () => {
    render(<Terminal onCommand={() => null} />);
    await userEvent.type(input(), 'one{Enter}two{Enter}two{Enter}three{Enter}');
    await userEvent.type(input(), 'dra');
    await userEvent.keyboard('{ArrowUp}');
    expect(input()).toHaveValue('three');
    await userEvent.keyboard('{ArrowUp}');
    expect(input()).toHaveValue('two');
    await userEvent.keyboard('{ArrowUp}');
    expect(input()).toHaveValue('one');
    await userEvent.keyboard('{ArrowUp}');
    expect(input()).toHaveValue('one');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(input()).toHaveValue('dra');
  });

  it('AC-4: async handlers show Running… until they settle; a rejection prints the localized error', async () => {
    let resolve!: (v: string) => void;
    const onCommand = vi.fn((line: string) =>
      line === 'slow' ? new Promise<string>((r) => (resolve = r)) : Promise.reject(new Error('nope')),
    );
    render(<Terminal onCommand={onCommand} />);
    await userEvent.type(input(), 'slow{Enter}');
    expect(within(log()).getByText('Running…')).toBeInTheDocument();
    await act(async () => resolve('done at last'));
    expect(within(log()).queryByText('Running…')).toBeNull();
    expect(within(log()).getByText('done at last')).toBeInTheDocument();
    await userEvent.type(input(), 'boom{Enter}');
    expect(await within(log()).findByText('The command failed')).toBeInTheDocument();
  });

  it('AC-4: a handler that throws prints the error too', async () => {
    render(<Terminal onCommand={() => { throw new Error('bad'); }} />);
    await userEvent.type(input(), 'x{Enter}');
    expect(within(log()).getByText('The command failed')).toBeInTheDocument();
  });

  it('AC-5: clear empties the log without calling onCommand; welcome is printed first', async () => {
    const onCommand = vi.fn(() => 'out');
    render(<Terminal onCommand={onCommand} welcome="Type help" />);
    expect(within(log()).getByText('Type help')).toBeInTheDocument();
    await userEvent.type(input(), 'ls{Enter}');
    expect(within(log()).getByText('out')).toBeInTheDocument();
    await userEvent.type(input(), 'clear{Enter}');
    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(within(log()).queryByText('out')).toBeNull();
    expect(within(log()).getByText('Type help')).toBeInTheDocument();
  });

  it('AC-6: maxHistory limits log entries and recallable commands', async () => {
    render(<Terminal onCommand={(l) => `r-${l}`} maxHistory={2} />);
    await userEvent.type(input(), 'a{Enter}b{Enter}c{Enter}');
    expect(within(log()).queryByText('r-a')).toBeNull();
    expect(within(log()).getByText('r-b')).toBeInTheDocument();
    expect(within(log()).getByText('r-c')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(input()).toHaveValue('b');
  });

  it('AC-7: Escape clears the input; disabled disables it', async () => {
    const { rerender } = render(<Terminal onCommand={() => null} />);
    await userEvent.type(input(), 'abc');
    await userEvent.keyboard('{Escape}');
    expect(input()).toHaveValue('');
    rerender(<Terminal onCommand={() => null} disabled />);
    expect(input()).toBeDisabled();
  });

  it('AC-8: output is added inside the log and the log scrolls to the bottom', async () => {
    render(<Terminal onCommand={() => 'result'} />);
    const el = log();
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 500 });
    await userEvent.type(input(), 'go{Enter}');
    expect(within(el).getByText('result')).toBeInTheDocument();
    expect(el.scrollTop).toBe(500);
    expect(el).toHaveAttribute('aria-relevant', 'additions');
  });

  it('AC-9: the log is keyboard scrollable and clicking the console focuses the input', async () => {
    const { container } = render(<Terminal onCommand={() => 'x'} welcome="hi" />);
    expect(log()).toHaveAttribute('tabindex', '0');
    await userEvent.click(container.querySelector('.ui-terminal__welcome')!);
    expect(input()).toHaveFocus();
  });
});
