import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Field } from '../Field/Field';
import { ColorPicker, formatColor, parseColor } from './ColorPicker';

describe('ColorPicker', () => {
  it('AC-1: keys and dragging update the value in the chosen format', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColorPicker aria-label="Brand" inline format="rgb" defaultValue="#ff0000" onChange={onChange} />);
    const hue = screen.getByRole('slider', { name: 'Hue' });
    expect(hue).toHaveAttribute('aria-valuenow', '0');
    hue.focus();
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(hue).toHaveAttribute('aria-valuenow', '10');
    expect(onChange).toHaveBeenLastCalledWith('rgb(255, 42, 0)');
    await user.keyboard('{End}');
    expect(hue).toHaveAttribute('aria-valuenow', '360');

    const area = screen.getByRole('slider', { name: 'Saturation and brightness' });
    expect(area).toHaveAttribute('aria-valuetext', 'Saturation 100%, brightness 100%');
    area.focus();
    await user.keyboard('{ArrowDown}{ArrowLeft}');
    expect(area).toHaveAttribute('aria-valuetext', 'Saturation 99%, brightness 99%');

    area.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(area, { clientX: 100, clientY: 50, pointerId: 1 });
    expect(area).toHaveAttribute('aria-valuetext', 'Saturation 50%, brightness 50%');
    expect(onChange).toHaveBeenLastCalledWith('rgb(128, 64, 64)');
  });

  it('AC-1: hsl format and alpha output', async () => {
    const onChange = vi.fn();
    render(<ColorPicker aria-label="Tint" inline alpha format="hsl" defaultValue="#00ff0080" onChange={onChange} />);
    const alpha = screen.getByRole('slider', { name: 'Opacity' });
    expect(alpha).toHaveAttribute('aria-valuenow', '50');
    alpha.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('hsla(120, 100%, 50%, 0.51)');
  });

  it('AC-2: hex input accepts valid hex and rejects invalid', async () => {
    const onChange = vi.fn();
    render(<ColorPicker aria-label="Brand" inline onChange={onChange} />);
    const hex = screen.getByRole('textbox', { name: 'Hex colour' });
    await userEvent.clear(hex);
    await userEvent.type(hex, '#12ab');
    expect(onChange).not.toHaveBeenCalled(); // incomplete
    await userEvent.type(hex, '9f');
    expect(hex).not.toHaveAttribute('aria-invalid');
    expect(onChange).toHaveBeenLastCalledWith('#12ab9f');
    await userEvent.clear(hex);
    await userEvent.type(hex, 'zzzzzz');
    expect(hex).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).toHaveBeenCalledTimes(1);
    await userEvent.tab();
    expect(hex).toHaveValue('#12ab9f'); // reverted
    await userEvent.clear(hex);
    await userEvent.type(hex, '#fff{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('#ffffff');
    expect(hex).toHaveValue('#ffffff');
  });

  it('AC-3: swatch click sets value', async () => {
    const onChange = vi.fn();
    render(<ColorPicker aria-label="Brand" inline swatches={[{ value: '#ff0000', name: 'Red' }, '#0000ff']} onChange={onChange} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Red' }));
    expect(onChange).toHaveBeenLastCalledWith('#ff0000');
    expect(screen.getByRole('radio', { name: 'Red' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('#0000ff');
    expect(screen.getByRole('radio', { name: '#0000ff' })).toHaveFocus();
  });

  it('AC-4: native renders input[type=color].form-control-color', () => {
    const onChange = vi.fn();
    render(
      <Field label="Colour">
        <ColorPicker native defaultValue="#336699" onChange={onChange} />
      </Field>,
    );
    const input = screen.getByLabelText('Colour') as HTMLInputElement;
    expect(input.type).toBe('color');
    expect(input).toHaveClass('form-control-color');
    fireEvent.change(input, { target: { value: '#000000' } });
    expect(onChange).toHaveBeenCalledWith('#000000');
  });

  it('popup mode opens a dialog, focuses the area and Escape closes', async () => {
    render(<ColorPicker aria-label="Brand" />);
    const trigger = screen.getByRole('button', { name: 'Brand' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    await userEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Choose colour' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Saturation and brightness' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('parses and formats colour strings', () => {
    expect(parseColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30, a: 1 });
    expect(parseColor('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 1 });
    expect(parseColor('nope')).toBeNull();
    expect(formatColor({ r: 255, g: 0, b: 0, a: 0.5 }, 'hex', true)).toBe('#ff000080');
  });
});
