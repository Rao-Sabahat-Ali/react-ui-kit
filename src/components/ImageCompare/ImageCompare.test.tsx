import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { compileScss, mediaBlock } from '../../../test/scss';
import { ImageCompare, type ImageCompareProps } from './ImageCompare';

const base: ImageCompareProps = { beforeSrc: '/before.jpg', afterSrc: '/after.jpg', beforeAlt: 'Room before', afterAlt: 'Room after' };
const slider = () => screen.getByRole('slider', { name: 'Compare images' });

function mockRect(el: Element, left = 0, width = 400) {
  el.getBoundingClientRect = () => ({ left, right: left + width, width, top: 0, bottom: 100, height: 100, x: left, y: 0, toJSON: () => ({}) }) as DOMRect;
}

describe('ImageCompare', () => {
  it('AC-1: images with alt and a named slider with value and text', () => {
    render(<ImageCompare {...base} />);
    expect(screen.getByRole('img', { name: 'Room before' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Room after' })).toBeInTheDocument();
    expect(slider()).toHaveAttribute('aria-valuemin', '0');
    expect(slider()).toHaveAttribute('aria-valuemax', '100');
    expect(slider()).toHaveAttribute('aria-valuenow', '50');
    expect(slider()).toHaveAttribute('aria-valuetext', '50% Before, 50% After');
    expect(slider()).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('AC-2: keys change the value, Home/End jump, Page keys move ten steps, values clamp', async () => {
    const onChange = vi.fn();
    render(<ImageCompare {...base} onChange={onChange} step={5} />);
    slider().focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith(55);
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(slider()).toHaveAttribute('aria-valuenow', '45');
    await userEvent.keyboard('{PageUp}');
    expect(slider()).toHaveAttribute('aria-valuenow', '95');
    await userEvent.keyboard('{PageUp}');
    expect(slider()).toHaveAttribute('aria-valuenow', '100');
    await userEvent.keyboard('{Home}');
    expect(slider()).toHaveAttribute('aria-valuenow', '0');
    await userEvent.keyboard('{ArrowLeft}');
    expect(slider()).toHaveAttribute('aria-valuenow', '0');
    await userEvent.keyboard('{End}');
    expect(slider()).toHaveAttribute('aria-valuenow', '100');
    await userEvent.keyboard('{PageDown}{ArrowDown}{ArrowUp}');
    expect(slider()).toHaveAttribute('aria-valuenow', '50');
  });

  it('AC-3: pointer down and drag set the value from the position; release stops it', () => {
    const { container } = render(<ImageCompare {...base} />);
    const root = container.firstElementChild!;
    mockRect(root);
    fireEvent.pointerDown(root, { clientX: 100, button: 0, pointerId: 1 });
    expect(slider()).toHaveAttribute('aria-valuenow', '25');
    expect(slider()).toHaveFocus();
    fireEvent.pointerMove(root, { clientX: 300, pointerId: 1 });
    expect(slider()).toHaveAttribute('aria-valuenow', '75');
    fireEvent.pointerUp(root, { pointerId: 1 });
    fireEvent.pointerMove(root, { clientX: 40, pointerId: 1 });
    expect(slider()).toHaveAttribute('aria-valuenow', '75');
    fireEvent.pointerDown(root, { clientX: 9999, button: 0, pointerId: 1 });
    expect(slider()).toHaveAttribute('aria-valuenow', '100');
  });

  it('AC-4: controlled and uncontrolled', async () => {
    function Controlled() {
      const [v, setV] = useState(20);
      return (
        <>
          <ImageCompare {...base} value={v} onChange={setV} />
          <output>{v}</output>
        </>
      );
    }
    const { unmount } = render(<Controlled />);
    expect(slider()).toHaveAttribute('aria-valuenow', '20');
    slider().focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('status')).toHaveTextContent('21');
    unmount();
    render(<ImageCompare {...base} defaultValue={70} />);
    expect(slider()).toHaveAttribute('aria-valuenow', '70');
  });

  it('AC-5: RTL mirrors pointer positions and arrow keys', async () => {
    const { container } = render(
      <div dir="rtl" style={{ direction: 'rtl' }}>
        <ImageCompare {...base} />
      </div>,
    );
    const root = container.querySelector('.ui-image-compare')!;
    mockRect(root);
    fireEvent.pointerDown(root, { clientX: 300, button: 0, pointerId: 1 });
    expect(slider()).toHaveAttribute('aria-valuenow', '25');
    fireEvent.pointerUp(root);
    await userEvent.keyboard('{ArrowLeft}');
    expect(slider()).toHaveAttribute('aria-valuenow', '26');
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(slider()).toHaveAttribute('aria-valuenow', '24');
    const css = compileScss('src/components/ImageCompare/ImageCompare.scss');
    expect(css).toMatch(/\[dir=["']?rtl["']?\]\s+\.ui-image-compare__before\s*\{[^}]*clip-path:\s*inset\(0 0 0/);
    expect(css).toMatch(/\.ui-image-compare__handle\s*\{[^}]*inset-inline-start/);
  });

  it('AC-6: labels render by default, can be hidden, and are aria-hidden', () => {
    const { container, rerender } = render(<ImageCompare {...base} beforeLabel="2019" afterLabel="2026" />);
    const labels = container.querySelectorAll('.ui-image-compare__label');
    expect(labels).toHaveLength(2);
    labels.forEach((l) => expect(l).toHaveAttribute('aria-hidden', 'true'));
    expect(slider()).toHaveAttribute('aria-valuetext', '50% 2019, 50% 2026');
    rerender(<ImageCompare {...base} showLabels={false} />);
    expect(container.querySelectorAll('.ui-image-compare__label')).toHaveLength(0);
  });

  it('AC-7: disabled removes the tab stop and ignores keys and pointer', async () => {
    const onChange = vi.fn();
    const { container } = render(<ImageCompare {...base} disabled onChange={onChange} />);
    expect(slider()).toHaveAttribute('tabindex', '-1');
    expect(slider()).toHaveAttribute('aria-disabled', 'true');
    slider().focus();
    await userEvent.keyboard('{ArrowRight}');
    const root = container.firstElementChild!;
    mockRect(root);
    fireEvent.pointerDown(root, { clientX: 100, button: 0, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('AC-8: reduced motion removes the transitions; the handle is the only tab stop', async () => {
    const css = compileScss('src/components/ImageCompare/ImageCompare.scss');
    const block = mediaBlock(css, '(prefers-reduced-motion: reduce)');
    expect(block).toMatch(/\.ui-image-compare__before/);
    expect(block).toMatch(/transition:\s*none/);
    render(<><button type="button">before</button><ImageCompare {...base} /><button type="button">after</button></>);
    await userEvent.tab();
    await userEvent.tab();
    expect(slider()).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'after' })).toHaveFocus();
  });
});
