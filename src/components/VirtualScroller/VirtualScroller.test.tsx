import { act, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtualScroller, type VirtualScrollerHandle } from './VirtualScroller';

const items = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 200 });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 300 });
});

afterEach(() => {
  vi.unstubAllGlobals();
  // @ts-expect-error restore jsdom default
  delete HTMLElement.prototype.clientHeight;
  // @ts-expect-error restore jsdom default
  delete HTMLElement.prototype.clientWidth;
});

const setup = (props: Partial<React.ComponentProps<typeof VirtualScroller<string>>> = {}) =>
  render(<VirtualScroller aria-label="List" items={items} itemSize={20} height="200px" itemTemplate={(item) => <span>{item}</span>} {...props} />);

const scrollTo = (el: HTMLElement, top: number) =>
  act(() => {
    el.scrollTop = top;
    el.dispatchEvent(new Event('scroll'));
  });

describe('VirtualScroller', () => {
  it('AC-1: only visible items plus overscan are in the DOM', () => {
    setup({ overscan: 3 });
    // viewport 200 / 20 = 10 visible, + 3 overscan after
    expect(screen.getAllByRole('listitem')).toHaveLength(13);
    expect(screen.getByText('Item 0')).toBeInTheDocument();
    expect(screen.queryByText('Item 500')).not.toBeInTheDocument();
  });

  it('AC-2: scrolling updates the rendered window using a transform offset', () => {
    setup({ overscan: 2 });
    const viewport = screen.getByRole('region', { name: 'List' });
    scrollTo(viewport, 2000);
    expect(screen.getByText('Item 100')).toBeInTheDocument();
    expect(screen.queryByText('Item 0')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeLessThan(20);
    const content = screen.getByRole('list');
    expect(content.style.transform).toBe(`translate3d(0, ${98 * 20}px, 0)`);
  });

  it('AC-2: scroll updates are throttled through requestAnimationFrame', () => {
    const raf = vi.fn(() => 7);
    vi.stubGlobal('requestAnimationFrame', raf);
    setup();
    const viewport = screen.getByRole('region', { name: 'List' });
    act(() => {
      viewport.dispatchEvent(new Event('scroll'));
      viewport.dispatchEvent(new Event('scroll'));
      viewport.dispatchEvent(new Event('scroll'));
    });
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it('AC-3: scrollToIndex scrolls the item into the window', () => {
    const ref = createRef<VirtualScrollerHandle>();
    setup({ ref });
    act(() => ref.current?.scrollToIndex(400));
    expect(screen.getByRole('region', { name: 'List' }).scrollTop).toBe(8000);
    expect(screen.getByText('Item 400')).toBeInTheDocument();
  });

  it('AC-3: onLazyLoad fires with the rendered range on mount and on scroll', () => {
    const onLazyLoad = vi.fn();
    setup({ lazy: true, onLazyLoad, overscan: 0 });
    expect(onLazyLoad).toHaveBeenLastCalledWith({ first: 0, last: 9 });
    scrollTo(screen.getByRole('region', { name: 'List' }), 400);
    expect(onLazyLoad).toHaveBeenLastCalledWith({ first: 20, last: 29 });
  });

  it('supports horizontal orientation', () => {
    setup({ orientation: 'horizontal', itemSize: 100, overscan: 0 });
    // viewport width 300 / 100
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('supports a grid with fixed columns', () => {
    setup({ orientation: 'both', itemSize: [100, 20], overscan: 0 });
    // 3 columns x 10 rows
    expect(screen.getAllByRole('listitem')).toHaveLength(30);
  });
});
