import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuantityTick } from './QuantityTick';

let reduced = false;
let animate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  reduced = false;
  animate = vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn(), finish: vi.fn(), addEventListener: vi.fn() }));
  (HTMLElement.prototype as unknown as { animate: unknown }).animate = animate;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('reduced-motion') ? reduced : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
});

describe('QuantityTick', () => {
  it('AC-1: formats numeric values via Intl with tabular figures', () => {
    const { container } = render(<QuantityTick value={1234.5} format={{ maximumFractionDigits: 1 }} />);
    expect(screen.getByRole('status')).toHaveTextContent('1,234.5');
    expect(container.firstElementChild).toHaveClass('ui-qty-tick', 'ui-tabular');
  });

  it('AC-2: exposes the whole value once in a status region; visual digits are aria-hidden', () => {
    const { container } = render(<QuantityTick value={42} />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(container.querySelector('.ui-qty-tick__visual')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('42');
  });

  it('AC-3: announce={false} drops the status role', () => {
    render(<QuantityTick value={42} announce={false} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('AC-4: only changed columns roll, and a count going down reverses the stack', () => {
    const { container, rerender } = render(<QuantityTick value={199} />);
    expect(container.querySelectorAll('.ui-qty-tick__roll')).toHaveLength(0);
    rerender(<QuantityTick value={200} />);
    const rolls = container.querySelectorAll('.ui-qty-tick__roll');
    expect(rolls).toHaveLength(3);
    expect(rolls[0]!.textContent).toBe('12');
    rerender(<QuantityTick value={190} />);
    const down = container.querySelectorAll('.ui-qty-tick__roll');
    expect(down).toHaveLength(2);
    expect(down[0]!.textContent).toBe('12');
    expect(down[1]!.textContent).toBe('90');
    rerender(<QuantityTick value={191} />);
    expect(container.querySelectorAll('.ui-qty-tick__roll')).toHaveLength(1);
  });

  it('AC-5: reduced motion or animate={false} renders no rolling columns', () => {
    reduced = true;
    const { container, rerender } = render(<QuantityTick value={1} />);
    rerender(<QuantityTick value={2} />);
    expect(container.querySelectorAll('.ui-qty-tick__roll')).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent('2');
    reduced = false;
    const second = render(<QuantityTick value={1} animate={false} />);
    second.rerender(<QuantityTick value={2} animate={false} />);
    expect(second.container.querySelectorAll('.ui-qty-tick__roll')).toHaveLength(0);
  });

  it('AC-6: rolls animate transform only and do not start in a hidden tab', () => {
    const { rerender } = render(<QuantityTick value={1} />);
    rerender(<QuantityTick value={2} />);
    const frames = animate.mock.calls[0]![0] as Keyframe[];
    expect(Object.keys(frames[0]!)).toEqual(['transform']);
    animate.mockClear();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    rerender(<QuantityTick value={3} />);
    expect(animate).not.toHaveBeenCalled();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });

  it('AC-7: string values tick the same way', () => {
    const { container, rerender } = render(<QuantityTick value="3:12" />);
    rerender(<QuantityTick value="3:13" />);
    expect(container.querySelectorAll('.ui-qty-tick__roll')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('3:13');
  });
});
