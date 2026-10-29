import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Field } from '../Field/Field';
import { InputOtp } from './InputOtp';

const box = (n: number, total = 6) => screen.getByRole('textbox', { name: `Digit ${n} of ${total}` }) as HTMLInputElement;
const boxes = () => screen.getAllByRole('textbox') as HTMLInputElement[];

describe('InputOtp', () => {
  it('AC-1: typing advances focus; Backspace moves back', async () => {
    const onChange = vi.fn();
    render(<InputOtp aria-label="Code" onChange={onChange} />);
    await userEvent.click(box(1));
    await userEvent.keyboard('123');
    expect(boxes().map((b) => b.value).join('')).toBe('123');
    expect(box(4)).toHaveFocus();
    await userEvent.keyboard('{Backspace}');
    expect(box(3)).toHaveFocus();
    expect(box(3)).toHaveValue('');
    expect(onChange).toHaveBeenLastCalledWith('12');
    await userEvent.keyboard('{Backspace}');
    expect(box(2)).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('1');
  });

  it('AC-1: arrow keys move between boxes', async () => {
    render(<InputOtp aria-label="Code" defaultValue="123456" />);
    box(3).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(box(4)).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(box(2)).toHaveFocus();
  });

  it('AC-2: paste fills all boxes and fires onComplete', async () => {
    const onComplete = vi.fn();
    render(<InputOtp aria-label="Code" onComplete={onComplete} />);
    await userEvent.click(box(1));
    await userEvent.paste('12 34-56');
    expect(boxes().map((b) => b.value).join('')).toBe('123456');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('AC-2: typing the last digit fires onComplete', async () => {
    const onComplete = vi.fn();
    render(<InputOtp aria-label="Code" length={4} onComplete={onComplete} />);
    await userEvent.click(box(1, 4));
    await userEvent.keyboard('1234');
    expect(onComplete).toHaveBeenCalledWith('1234');
  });

  it('AC-2: multi-character input (OTP autofill) is distributed', async () => {
    render(<InputOtp aria-label="Code" />);
    await userEvent.click(box(1));
    // Autofill delivers the whole code to the first box through a change event.
    fireEvent.change(box(1), { target: { value: '654321' } });
    expect(boxes().map((b) => b.value).join('')).toBe('654321');
  });

  it('AC-3: integerOnly rejects letters; integerOnly=false accepts them', async () => {
    const { unmount } = render(<InputOtp aria-label="Code" />);
    await userEvent.click(box(1));
    await userEvent.keyboard('a1b2');
    expect(boxes().map((b) => b.value).join('')).toBe('12');
    unmount();
    render(<InputOtp aria-label="Code" integerOnly={false} />);
    await userEvent.click(box(1));
    await userEvent.keyboard('a1');
    expect(boxes().map((b) => b.value).join('')).toBe('a1');
  });

  it('AC-4: each box has a positional accessible name and the group is labelled', () => {
    render(
      <Field label="Verification code">
        <InputOtp length={4} />
      </Field>,
    );
    expect(screen.getByRole('group', { name: 'Verification code' })).toBeInTheDocument();
    for (let i = 1; i <= 4; i++) expect(box(i, 4)).toBeInTheDocument();
    expect(box(1, 4)).toHaveAttribute('autocomplete', 'one-time-code');
    expect(box(1, 4)).toHaveAttribute('inputmode', 'numeric');
    expect(box(2, 4)).toHaveAttribute('autocomplete', 'off');
  });

  it('mask renders password boxes', () => {
    render(<InputOtp aria-label="PIN" length={4} mask defaultValue="12" />);
    expect(document.querySelectorAll('input[type="password"]')).toHaveLength(4);
  });

  it('controlled value drives the boxes', async () => {
    function Harness() {
      const [v, setV] = useState('12');
      return <InputOtp aria-label="Code" length={4} value={v} onChange={setV} />;
    }
    render(<Harness />);
    expect(box(2, 4)).toHaveValue('2');
    await userEvent.click(box(3, 4));
    await userEvent.keyboard('9');
    expect(box(3, 4)).toHaveValue('9');
  });
});

describe('InputOtp (v2)', () => {
  it('AC-v2-1: every box sits in a numbered-part cell that marks filled cells', () => {
    const { container } = render(<InputOtp aria-label="Code" length={4} defaultValue="12" />);
    const cells = Array.from(container.querySelectorAll('.ui-input-otp__cell'));
    expect(cells.map((c) => c.getAttribute('data-index'))).toEqual(['1', '2', '3', '4']);
    expect(cells.map((c) => c.hasAttribute('data-filled'))).toEqual([true, true, false, false]);
  });
});
