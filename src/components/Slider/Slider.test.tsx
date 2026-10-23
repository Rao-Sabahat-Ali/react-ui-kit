import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Field } from '../Field/Field';
import { Slider } from './Slider';

function mockTrack(container: HTMLElement, rect: Partial<DOMRect> = {}) {
  const track = container.querySelector('.ui-slider__track') as HTMLElement;
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON: () => ({}), ...rect });
  return track;
}

describe('Slider', () => {
  afterEach(() => vi.restoreAllMocks());

  it('AC-1: click on the track sets the value, snapping to step', () => {
    const onChange = vi.fn();
    const { container } = render(<Slider aria-label="Volume" step={10} onChange={onChange} />);
    const track = mockTrack(container);
    fireEvent.pointerDown(track, { clientX: 94, clientY: 0, button: 0 });
    fireEvent.pointerUp(track);
    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveAttribute('aria-valuenow', '50');
    expect(onChange).toHaveBeenLastCalledWith(50);
  });

  it('AC-1: drag moves the thumb and focuses it', () => {
    const { container } = render(<Slider aria-label="Volume" />);
    const track = mockTrack(container);
    fireEvent.pointerDown(track, { clientX: 20, clientY: 0, button: 0 });
    fireEvent.pointerMove(track, { clientX: 150, clientY: 0 });
    const thumb = screen.getByRole('slider');
    expect(thumb).toHaveAttribute('aria-valuenow', '75');
    expect(thumb).toHaveFocus();
    fireEvent.pointerMove(track, { clientX: 500, clientY: 0 });
    expect(thumb).toHaveAttribute('aria-valuenow', '100');
  });

  it('AC-2: range thumbs cannot cross', async () => {
    const { container } = render(<Slider range defaultValue={[30, 60]} />);
    const [minThumb, maxThumb] = screen.getAllByRole('slider');
    expect(minThumb).toHaveAccessibleName('Minimum');
    expect(maxThumb).toHaveAccessibleName('Maximum');
    maxThumb!.focus();
    await userEvent.keyboard('{Home}');
    expect(maxThumb).toHaveAttribute('aria-valuenow', '30');
    minThumb!.focus();
    await userEvent.keyboard('{End}');
    expect(minThumb).toHaveAttribute('aria-valuenow', '30');
    expect(minThumb).toHaveAttribute('aria-valuemax', '30');
    expect(maxThumb).toHaveAttribute('aria-valuemin', '30');
    // pointer drag past the other thumb is clamped as well
    const track = mockTrack(container);
    fireEvent.pointerDown(track, { clientX: 60, clientY: 0, button: 0 });
    fireEvent.pointerMove(track, { clientX: 190, clientY: 0 });
    expect(minThumb).toHaveAttribute('aria-valuenow', '30');
  });

  it('AC-2: click picks the nearest range thumb and thumbLabels name them', () => {
    const { container } = render(<Slider range defaultValue={[20, 80]} thumbLabels={['Minimum price', 'Maximum price']} />);
    const track = mockTrack(container);
    fireEvent.pointerDown(track, { clientX: 150, clientY: 0, button: 0 });
    fireEvent.pointerUp(track);
    expect(screen.getByRole('slider', { name: 'Maximum price' })).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByRole('slider', { name: 'Minimum price' })).toHaveAttribute('aria-valuenow', '20');
  });

  it('AC-3: keyboard per table', async () => {
    render(<Slider aria-label="Level" defaultValue={50} step={5} />);
    const thumb = screen.getByRole('slider');
    thumb.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(thumb).toHaveAttribute('aria-valuenow', '55');
    await userEvent.keyboard('{ArrowUp}{ArrowLeft}{ArrowDown}{ArrowDown}');
    expect(thumb).toHaveAttribute('aria-valuenow', '45');
    await userEvent.keyboard('{PageUp}');
    expect(thumb).toHaveAttribute('aria-valuenow', '55');
    await userEvent.keyboard('{PageDown}{PageDown}');
    expect(thumb).toHaveAttribute('aria-valuenow', '35');
    await userEvent.keyboard('{End}');
    expect(thumb).toHaveAttribute('aria-valuenow', '100');
    await userEvent.keyboard('{Home}');
    expect(thumb).toHaveAttribute('aria-valuenow', '0');
  });

  it('AC-3: onChangeEnd fires once per keyboard interaction and once per pointer interaction', async () => {
    const onChangeEnd = vi.fn();
    const { container } = render(<Slider aria-label="Level" defaultValue={50} onChangeEnd={onChangeEnd} />);
    const thumb = screen.getByRole('slider');
    thumb.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChangeEnd).toHaveBeenCalledTimes(1);
    expect(onChangeEnd).toHaveBeenLastCalledWith(51);
    await userEvent.keyboard('{ArrowRight>3/}');
    expect(onChangeEnd).toHaveBeenCalledTimes(2);

    const track = mockTrack(container);
    fireEvent.pointerDown(track, { clientX: 20, clientY: 0, button: 0 });
    fireEvent.pointerMove(track, { clientX: 40, clientY: 0 });
    fireEvent.pointerMove(track, { clientX: 60, clientY: 0 });
    expect(onChangeEnd).toHaveBeenCalledTimes(2);
    fireEvent.pointerUp(track);
    expect(onChangeEnd).toHaveBeenCalledTimes(3);
    expect(onChangeEnd).toHaveBeenLastCalledWith(30);
  });

  it('AC-4: vertical orientation maps bottom to min and sets aria-orientation', () => {
    const { container } = render(<Slider aria-label="Level" orientation="vertical" />);
    const thumb = screen.getByRole('slider');
    expect(thumb).toHaveAttribute('aria-orientation', 'vertical');
    const track = mockTrack(container);
    fireEvent.pointerDown(track, { clientX: 0, clientY: 150, button: 0 });
    fireEvent.pointerUp(track);
    expect(thumb).toHaveAttribute('aria-valuenow', '25');
    expect(thumb.style.insetBlockEnd).toBe('25%');
  });

  it('AC-4: RTL inverts pointer mapping and arrow keys', async () => {
    const { container } = render(
      <div dir="rtl">
        <Slider aria-label="Level" defaultValue={50} />
      </div>,
    );
    const track = mockTrack(container);
    fireEvent.pointerDown(track, { clientX: 50, clientY: 0, button: 0 });
    fireEvent.pointerUp(track);
    const thumb = screen.getByRole('slider');
    expect(thumb).toHaveAttribute('aria-valuenow', '75');
    await userEvent.keyboard('{ArrowLeft}');
    expect(thumb).toHaveAttribute('aria-valuenow', '76');
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(thumb).toHaveAttribute('aria-valuenow', '74');
  });

  it('valueText feeds aria-valuetext; Field label names a single slider', () => {
    render(
      <Field label="Budget">
        <Slider defaultValue={30} valueText={(v) => `$${v}`} />
      </Field>,
    );
    const thumb = screen.getByRole('slider', { name: 'Budget' });
    expect(thumb).toHaveAttribute('aria-valuetext', '$30');
  });

  it('disabled ignores input', async () => {
    render(<Slider aria-label="Level" defaultValue={50} disabled />);
    const thumb = screen.getByRole('slider');
    fireEvent.keyDown(thumb, { key: 'ArrowRight' });
    expect(thumb).toHaveAttribute('aria-valuenow', '50');
    expect(thumb).toHaveAttribute('aria-disabled', 'true');
  });
});
