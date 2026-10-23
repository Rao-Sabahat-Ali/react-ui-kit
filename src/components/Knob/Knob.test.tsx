import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Knob } from './Knob';

function mockRect(el: HTMLElement) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
}

describe('Knob', () => {
  afterEach(() => vi.restoreAllMocks());

  it('AC-1: pointer drag around the dial changes value', () => {
    const onChange = vi.fn();
    render(<Knob aria-label="Volume" defaultValue={0} onChange={onChange} />);
    const knob = screen.getByRole('slider', { name: 'Volume' });
    mockRect(knob);
    fireEvent.pointerDown(knob, { clientX: 50, clientY: 0, button: 0 }); // 12 o'clock: halfway
    expect(knob).toHaveAttribute('aria-valuenow', '50');
    fireEvent.pointerMove(knob, { clientX: 100, clientY: 50 }); // 3 o'clock: 90deg -> (90+135)/270
    expect(knob).toHaveAttribute('aria-valuenow', '83');
    fireEvent.pointerMove(knob, { clientX: 0, clientY: 100 }); // bottom-left snaps to min
    expect(knob).toHaveAttribute('aria-valuenow', '0');
    fireEvent.pointerUp(knob);
    fireEvent.pointerMove(knob, { clientX: 100, clientY: 50 });
    expect(knob).toHaveAttribute('aria-valuenow', '0');
    expect(onChange).toHaveBeenCalledWith(50);
  });

  it('AC-2: keyboard per table', async () => {
    render(<Knob aria-label="Volume" defaultValue={50} step={2} min={0} max={100} />);
    const knob = screen.getByRole('slider');
    knob.focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(knob).toHaveAttribute('aria-valuenow', '52');
    await userEvent.keyboard('{ArrowLeft}{ArrowDown}');
    expect(knob).toHaveAttribute('aria-valuenow', '48');
    await userEvent.keyboard('{PageUp}');
    expect(knob).toHaveAttribute('aria-valuenow', '68');
    await userEvent.keyboard('{PageDown}{PageDown}');
    expect(knob).toHaveAttribute('aria-valuenow', '28');
    await userEvent.keyboard('{End}');
    expect(knob).toHaveAttribute('aria-valuenow', '100');
    await userEvent.keyboard('{ArrowUp}');
    expect(knob).toHaveAttribute('aria-valuenow', '100');
    await userEvent.keyboard('{Home}');
    expect(knob).toHaveAttribute('aria-valuenow', '0');
  });

  it('AC-2: exposes value attributes and valuetext from the template', () => {
    render(<Knob aria-label="Volume" value={30} min={10} max={90} valueTemplate={(v) => `${v} percent`} />);
    const knob = screen.getByRole('slider');
    expect(knob).toHaveAttribute('aria-valuemin', '10');
    expect(knob).toHaveAttribute('aria-valuemax', '90');
    expect(knob).toHaveAttribute('aria-valuetext', '30 percent');
  });

  it('AC-3: arc length matches value proportion', () => {
    const { container, rerender } = render(<Knob aria-label="K" value={25} />);
    const arc = () => container.querySelector('.ui-knob__value')!;
    expect(arc().getAttribute('stroke-dasharray')).toBe('25 100');
    rerender(<Knob aria-label="K" value={100} />);
    expect(arc().getAttribute('stroke-dasharray')).toBe('100 100');
    rerender(<Knob aria-label="K" value={5} min={0} max={20} />);
    expect(arc().getAttribute('stroke-dasharray')).toBe('25 100');
  });

  it('readOnly ignores keyboard and pointer', async () => {
    render(<Knob aria-label="Gauge" readOnly value={40} />);
    const knob = screen.getByRole('slider');
    expect(knob).toHaveAttribute('aria-readonly', 'true');
    expect(knob).not.toHaveAttribute('tabindex');
    mockRect(knob);
    fireEvent.pointerDown(knob, { clientX: 50, clientY: 0, button: 0 });
    fireEvent.keyDown(knob, { key: 'ArrowUp' });
    expect(knob).toHaveAttribute('aria-valuenow', '40');
  });
});
