import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { InputMask } from './InputMask';

const input = () => screen.getByRole('textbox') as HTMLInputElement;

describe('InputMask', () => {
  it('AC-1: typing fills slots, skipping literals; invalid chars rejected', async () => {
    render(<InputMask aria-label="Phone" mask="(999) 999-9999" />);
    await userEvent.type(input(), 'ab55512');
    expect(input()).toHaveValue('(555) 12_-____');
    await userEvent.type(input(), '34567');
    expect(input()).toHaveValue('(555) 123-4567');
  });

  it('AC-1: shows slot characters while focused and clears when blurred empty', async () => {
    render(<InputMask aria-label="Code" mask="999-999" slotChar="#" />);
    expect(input()).toHaveValue('');
    await userEvent.click(input());
    expect(input()).toHaveValue('###-###');
    await userEvent.tab();
    expect(input()).toHaveValue('');
  });

  it('AC-1: letters and alphanumerics', async () => {
    render(<InputMask aria-label="Serial" mask="aa-**" />);
    await userEvent.type(input(), '1xyz9');
    expect(input()).toHaveValue('xy-z9');
  });

  it('AC-2: Backspace removes the previous slot char, not literals', async () => {
    render(<InputMask aria-label="Code" mask="999-999" />);
    await userEvent.type(input(), '1234');
    expect(input()).toHaveValue('123-4__');
    await userEvent.keyboard('{Backspace}');
    expect(input()).toHaveValue('123-___');
    await userEvent.keyboard('{Backspace}');
    expect(input()).toHaveValue('12_-___');
    expect(input().selectionStart).toBe(2);
  });

  it('AC-2: Delete removes the next slot char over a literal', async () => {
    render(<InputMask aria-label="Code" mask="999-999" defaultValue="123-456" />);
    input().focus();
    input().setSelectionRange(3, 3);
    await userEvent.keyboard('{Delete}');
    expect(input()).toHaveValue('123-56_');
  });

  it('AC-3: paste applies the mask', async () => {
    render(<InputMask aria-label="Phone" mask="(999) 999-9999" />);
    await userEvent.click(input());
    await userEvent.paste('555.123.4567 ext');
    expect(input()).toHaveValue('(555) 123-4567');
  });

  it('AC-4: unmask emits the raw value and onComplete fires when required slots are filled', async () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    render(<InputMask aria-label="Code" mask="999-999" unmask onChange={onChange} onComplete={onComplete} />);
    await userEvent.type(input(), '12345');
    expect(onChange).toHaveBeenLastCalledWith('12345', expect.anything());
    expect(onComplete).not.toHaveBeenCalled();
    await userEvent.type(input(), '6');
    expect(onChange).toHaveBeenLastCalledWith('123456', expect.anything());
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('AC-4: without unmask the masked text is emitted; optional slots complete early', async () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    render(<InputMask aria-label="Code" mask="99-99?-99" onChange={onChange} onComplete={onComplete} />);
    await userEvent.type(input(), '1234');
    expect(onChange).toHaveBeenLastCalledWith('12-34', expect.anything());
    expect(onComplete).toHaveBeenLastCalledWith('12-34');
  });

  it('AC-5: caret position is preserved after edits in the middle', async () => {
    render(<InputMask aria-label="Code" mask="999-999" defaultValue="123-456" />);
    input().focus();
    input().setSelectionRange(1, 1);
    await userEvent.keyboard('9');
    expect(input()).toHaveValue('192-345');
    expect(input().selectionStart).toBe(2);
    await userEvent.keyboard('{Backspace}');
    expect(input()).toHaveValue('123-45_');
    expect(input().selectionStart).toBe(1);
  });

  it('autoClear clears incomplete values on blur, autoClear=false keeps them', async () => {
    const { unmount } = render(<InputMask aria-label="Code" mask="999-999" />);
    await userEvent.type(input(), '12');
    await userEvent.tab();
    expect(input()).toHaveValue('');
    unmount();
    render(<InputMask aria-label="Code" mask="999-999" autoClear={false} />);
    await userEvent.type(input(), '12');
    await userEvent.tab();
    expect(input()).toHaveValue('12_-___');
  });

  it('controlled value renders masked', () => {
    render(<InputMask aria-label="Code" mask="999-999" value="123456" />);
    expect(input()).toHaveValue('123-456');
  });
});
