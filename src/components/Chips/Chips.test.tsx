import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Field } from '../Field/Field';
import { Chips } from './Chips';

const chipTexts = () => screen.queryAllByRole('listitem').map((li) => li.textContent);

describe('Chips', () => {
  it('AC-1: Enter/comma adds trimmed value; empty is ignored', async () => {
    const onChange = vi.fn();
    render(
      <Field label="Tags">
        <Chips onChange={onChange} />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Tags' });
    await userEvent.type(input, '  react  {Enter}');
    expect(onChange).toHaveBeenLastCalledWith(['react']);
    await userEvent.type(input, 'vite,');
    expect(onChange).toHaveBeenLastCalledWith(['react', 'vite']);
    await userEvent.type(input, '   {Enter},');
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(chipTexts()).toEqual(['react', 'vite']);
    expect(input).toHaveValue('');
  });

  it('AC-2: duplicates are rejected unless allowDuplicate', async () => {
    const onChange = vi.fn();
    const { unmount } = render(<Chips aria-label="Tags" defaultValue={['a']} onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'a{Enter}');
    expect(onChange).not.toHaveBeenCalled();
    expect(chipTexts()).toEqual(['a']);
    unmount();
    render(<Chips aria-label="Tags" defaultValue={['a']} allowDuplicate onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'a{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(['a', 'a']);
  });

  it('AC-3: paste "a, b, c" adds three chips', async () => {
    const onChange = vi.fn();
    render(<Chips aria-label="Tags" onChange={onChange} />);
    await userEvent.click(screen.getByRole('textbox'));
    await userEvent.paste('a, b, c');
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b', 'c']);
    expect(chipTexts()).toEqual(['a', 'b', 'c']);
  });

  it('AC-4: max blocks further input', async () => {
    const onChange = vi.fn();
    render(<Chips aria-label="Tags" max={2} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'a{Enter}b{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);
    expect(input).toHaveAttribute('readonly');
    await userEvent.type(input, 'c{Enter}');
    expect(input).toHaveValue('');
    expect(onChange).toHaveBeenCalledTimes(2);
    await userEvent.paste('d, e');
    expect(chipTexts()).toEqual(['a', 'b']);
  });

  it('AC-5: remove button removes the chip and focuses the input', async () => {
    const onChange = vi.fn();
    render(<Chips aria-label="Tags" defaultValue={['one', 'two']} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove one' }));
    expect(onChange).toHaveBeenLastCalledWith(['two']);
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('keyboard: Backspace on empty input focuses last chip, arrows move, Delete removes', async () => {
    const onChange = vi.fn();
    render(<Chips aria-label="Tags" defaultValue={['one', 'two', 'three']} onChange={onChange} />);
    await userEvent.click(screen.getByRole('textbox'));
    await userEvent.keyboard('{Backspace}');
    expect(screen.getByRole('button', { name: 'Remove three' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: 'Remove two' })).toHaveFocus();
    await userEvent.keyboard('{Delete}');
    expect(onChange).toHaveBeenLastCalledWith(['one', 'three']);
  });

  it('validate rejects with message', async () => {
    render(<Chips aria-label="Emails" validate={(v) => v.includes('@') || 'Not an email'} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'nope{Enter}');
    expect(screen.getByText('Not an email')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Not an email');
    expect(input).toHaveValue('nope');
  });
});
