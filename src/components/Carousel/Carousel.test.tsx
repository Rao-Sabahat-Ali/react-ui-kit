import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Carousel } from './Carousel';

const items = ['A', 'B', 'C', 'D', 'E'];
const template = (item: string) => <div>Item {item}</div>;
const original = window.matchMedia;

function mockMedia({ width = 1200, reduced = false } = {}) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    let matches = false;
    const max = /max-width:\s*(\d+)px/.exec(query);
    if (max) matches = width <= Number(max[1]);
    if (query.includes('prefers-reduced-motion')) matches = reduced;
    return { matches, media: query, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() };
  }) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = original;
  vi.useRealTimers();
});

const visibleLabels = () =>
  screen
    .getAllByRole('group', { hidden: true })
    .filter((el) => !el.hasAttribute('aria-hidden'))
    .map((el) => el.textContent);

describe('Carousel', () => {
  it('has carousel semantics, slide groups and labelled indicators', () => {
    render(<Carousel value={items} itemTemplate={template} aria-label="Featured" />);
    const region = screen.getByRole('region', { name: 'Featured' });
    expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    const slide = screen.getByRole('group', { name: 'Slide 1 of 5' });
    expect(slide).toHaveAttribute('aria-roledescription', 'slide');
    expect(screen.getByRole('button', { name: 'Go to slide 3' })).toBeInTheDocument();
  });

  it('AC-1: prev/next and indicators navigate; ends are disabled without circular', async () => {
    const user = userEvent.setup();
    render(<Carousel value={items} itemTemplate={template} />);
    expect(visibleLabels()).toEqual(['Item A']);
    expect(screen.getByRole('button', { name: 'Previous slide' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(visibleLabels()).toEqual(['Item B']);
    await user.click(screen.getByRole('button', { name: 'Go to slide 5' }));
    expect(visibleLabels()).toEqual(['Item E']);
    expect(screen.getByRole('button', { name: 'Go to slide 5' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled();
  });

  it('AC-1: circular wraps in both directions', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Carousel value={items} itemTemplate={template} circular onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: 'Previous slide' }));
    expect(visibleLabels()).toEqual(['Item E']);
    await user.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(visibleLabels()).toEqual(['Item A']);
    expect(onPageChange).toHaveBeenLastCalledWith(0);
  });

  it('AC-2: responsive numVisible per breakpoint', () => {
    const responsive = [
      { breakpoint: '1024px', numVisible: 2, numScroll: 2 },
      { breakpoint: '600px', numVisible: 1, numScroll: 1 },
    ];
    mockMedia({ width: 1200 });
    const { unmount } = render(<Carousel value={items} itemTemplate={template} numVisible={3} responsiveOptions={responsive} />);
    expect(visibleLabels()).toEqual(['Item A', 'Item B', 'Item C']);
    expect(screen.getAllByRole('button', { name: /Go to slide/ })).toHaveLength(3);
    unmount();
    mockMedia({ width: 800 });
    const second = render(<Carousel value={items} itemTemplate={template} numVisible={3} responsiveOptions={responsive} />);
    expect(visibleLabels()).toEqual(['Item A', 'Item B']);
    second.unmount();
    mockMedia({ width: 400 });
    render(<Carousel value={items} itemTemplate={template} numVisible={3} responsiveOptions={responsive} />);
    expect(visibleLabels()).toEqual(['Item A']);
  });

  it('AC-3: autoplay advances, pauses on hover/focus and has a pause button', () => {
    vi.useFakeTimers();
    mockMedia();
    render(<Carousel value={items} itemTemplate={template} autoplayInterval={1000} />);
    const region = screen.getByRole('region');
    act(() => vi.advanceTimersByTime(1000));
    expect(visibleLabels()).toEqual(['Item B']);
    fireEvent.mouseEnter(region);
    act(() => vi.advanceTimersByTime(3000));
    expect(visibleLabels()).toEqual(['Item B']);
    fireEvent.mouseLeave(region);
    const pause = within(region).getByRole('button', { name: 'Pause slideshow' });
    fireEvent.focus(pause);
    act(() => vi.advanceTimersByTime(3000));
    expect(visibleLabels()).toEqual(['Item B']);
    fireEvent.blur(pause);
    fireEvent.click(pause);
    expect(screen.getByRole('button', { name: 'Play slideshow' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(visibleLabels()).toEqual(['Item B']);
  });

  it('AC-3: autoplay stops while the tab is hidden and resumes when it is visible again', () => {
    vi.useFakeTimers();
    mockMedia();
    render(<Carousel value={items} itemTemplate={template} autoplayInterval={1000} />);
    const state = vi.spyOn(document, 'visibilityState', 'get');
    state.mockReturnValue('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    act(() => vi.advanceTimersByTime(3000));
    expect(visibleLabels()).toEqual(['Item A']);
    state.mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    act(() => vi.advanceTimersByTime(1000));
    expect(visibleLabels()).toEqual(['Item B']);
    state.mockRestore();
  });

  it('indicators carry one sliding accent mark that follows the current page', async () => {
    mockMedia();
    render(<Carousel value={items} itemTemplate={template} />);
    const indicators = document.querySelector<HTMLElement>('.ui-carousel__indicators')!;
    expect(indicators.style.getPropertyValue('--ui-mark-size')).not.toBe('');
    expect(within(indicators).getAllByRole('button').filter((b) => b.getAttribute('aria-current') === 'true')).toHaveLength(1);
    await userEvent.click(within(indicators).getByRole('button', { name: 'Go to slide 3' }));
    expect(within(indicators).getByRole('button', { name: 'Go to slide 3' })).toHaveAttribute('aria-current', 'true');
  });

  it('AC-3: never autoplays with reduced motion', () => {
    vi.useFakeTimers();
    mockMedia({ reduced: true });
    render(<Carousel value={items} itemTemplate={template} autoplayInterval={1000} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(visibleLabels()).toEqual(['Item A']);
    expect(screen.queryByRole('button', { name: 'Pause slideshow' })).not.toBeInTheDocument();
  });

  it('AC-4: swipe on touch navigates', () => {
    const { container } = render(<Carousel value={items} itemTemplate={template} />);
    const viewport = container.querySelector('.ui-carousel__viewport')!;
    fireEvent.touchStart(viewport, { touches: [{ clientX: 200, clientY: 10 }] });
    fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 100, clientY: 12 }] });
    expect(visibleLabels()).toEqual(['Item B']);
    fireEvent.touchStart(viewport, { touches: [{ clientX: 100, clientY: 10 }] });
    fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 220, clientY: 10 }] });
    expect(visibleLabels()).toEqual(['Item A']);
    fireEvent.touchStart(viewport, { touches: [{ clientX: 100, clientY: 10 }] });
    fireEvent.touchEnd(viewport, { changedTouches: [{ clientX: 110, clientY: 10 }] });
    expect(visibleLabels()).toEqual(['Item A']);
  });
});
