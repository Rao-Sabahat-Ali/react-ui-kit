import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InputText } from '../InputText/InputText';
import { KEY_FILTER_PRESETS } from './patterns';
import { useKeyFilter } from './useKeyFilter';

function Native({ pattern }: { pattern: Parameters<typeof useKeyFilter>[0] }) {
  const { props } = useKeyFilter(pattern);
  return <input aria-label="native" {...props} />;
}

describe('KeyFilter', () => {
  it('AC-1: disallowed keystrokes are prevented (hook)', async () => {
    render(<Native pattern="pint" />);
    const input = screen.getByLabelText('native');
    await userEvent.type(input, 'a1b2-3');
    expect(input).toHaveValue('123');
  });

  it('AC-1: presets and RegExp patterns via InputText keyFilter', async () => {
    const onChange = vi.fn();
    const first = render(<InputText aria-label="f" keyFilter="num" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('f'), '-1.5x');
    expect(screen.getByLabelText('f')).toHaveValue('-1.5');
    first.unmount();
    render(<InputText aria-label="f" keyFilter={/[A-C]/} />);
    await userEvent.type(screen.getByLabelText('f'), 'ADBc');
    expect(screen.getByLabelText('f')).toHaveValue('AB');
    expect(KEY_FILTER_PRESETS.hex.test('F')).toBe(true);
    expect(KEY_FILTER_PRESETS.hex.test('g')).toBe(false);
    expect(KEY_FILTER_PRESETS.email.test('@')).toBe(true);
    expect(KEY_FILTER_PRESETS.alpha.test('1')).toBe(false);
  });

  it('AC-1: control keys and shortcuts still work', async () => {
    render(<InputText aria-label="f" keyFilter="pint" defaultValue="12" />);
    const input = screen.getByLabelText('f') as HTMLInputElement;
    input.focus();
    expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(true);
    expect(fireEvent.keyDown(input, { key: 'ArrowLeft' })).toBe(true);
    expect(fireEvent.keyDown(input, { key: 'a', ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(input, { key: 'v', metaKey: true })).toBe(true);
    expect(fireEvent.keyDown(input, { key: 'x' })).toBe(false);
    await userEvent.keyboard('{Backspace}');
    expect(input).toHaveValue('1');
  });

  it('AC-1: user onKeyDown still runs and can prevent', async () => {
    const onKeyDown = vi.fn();
    render(<InputText aria-label="f" keyFilter="pint" onKeyDown={onKeyDown} />);
    await userEvent.type(screen.getByLabelText('f'), '5');
    expect(onKeyDown).toHaveBeenCalled();
  });

  it('AC-2: paste is filtered to allowed characters', async () => {
    const onChange = vi.fn();
    render(<InputText aria-label="f" keyFilter="pint" onChange={onChange} />);
    const input = screen.getByLabelText('f');
    await userEvent.click(input);
    await userEvent.paste('a1b2-3c');
    expect(input).toHaveValue('123');
    expect(onChange).toHaveBeenLastCalledWith('123', expect.anything());
  });

  it('AC-2: paste of fully allowed text is untouched, fully disallowed is dropped', async () => {
    render(<InputText aria-label="f" keyFilter="pint" />);
    const input = screen.getByLabelText('f');
    await userEvent.click(input);
    await userEvent.paste('42');
    await userEvent.paste('zzz');
    expect(input).toHaveValue('42');
  });

  it('AC-2: paste inserts at the caret on the hook', async () => {
    render(<Native pattern="pint" />);
    const input = screen.getByLabelText('native') as HTMLInputElement;
    await userEvent.type(input, '19');
    input.setSelectionRange(1, 1);
    await userEvent.paste('x5y');
    expect(input).toHaveValue('159');
  });

  it('AC-3: IME composition is not blocked', () => {
    render(<InputText aria-label="f" keyFilter="pint" />);
    const input = screen.getByLabelText('f');
    expect(fireEvent.keyDown(input, { key: 'Process', keyCode: 229 })).toBe(true);
    expect(fireEvent.keyDown(input, { key: 'a', isComposing: true })).toBe(true);
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: 'にほん' } });
    fireEvent.compositionEnd(input);
    expect(fireEvent.keyDown(input, { key: 'a', isComposing: true })).toBe(true);
  });

  it('without keyFilter InputText accepts everything', async () => {
    render(<InputText aria-label="f" />);
    await userEvent.type(screen.getByLabelText('f'), 'abc1');
    expect(screen.getByLabelText('f')).toHaveValue('abc1');
  });
});
