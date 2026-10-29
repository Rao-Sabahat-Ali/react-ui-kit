import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Galleria, type GalleriaItem } from './Galleria';

const photos: GalleriaItem[] = [
  { src: '/1.jpg', alt: 'Red chair', caption: 'Front' },
  { src: '/2.jpg', alt: 'Blue chair', thumbnail: '/2-t.jpg' },
  { src: '/3.jpg', alt: 'Green chair' },
];

const mainImage = () => document.querySelector<HTMLImageElement>('.ui-galleria__image')!;

describe('Galleria', () => {
  it('AC-1: thumbnail click changes the active image and sets aria-current', async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(<Galleria value={photos} onIndexChange={onIndexChange} />);
    expect(mainImage()).toHaveAttribute('alt', 'Red chair');
    await user.click(screen.getByRole('button', { name: 'Blue chair' }));
    expect(mainImage()).toHaveAttribute('alt', 'Blue chair');
    expect(screen.getByRole('button', { name: 'Blue chair' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Red chair' })).not.toHaveAttribute('aria-current');
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('AC-1: arrow keys on thumbnails and navigators change the active image', async () => {
    const user = userEvent.setup();
    render(<Galleria value={photos} />);
    screen.getByRole('button', { name: 'Red chair' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(mainImage()).toHaveAttribute('alt', 'Blue chair');
    expect(screen.getByRole('button', { name: 'Blue chair' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(mainImage()).toHaveAttribute('alt', 'Green chair');
    await user.click(screen.getByRole('button', { name: 'Previous slide' }));
    expect(mainImage()).toHaveAttribute('alt', 'Blue chair');
    await user.keyboard('{ArrowLeft}');
    expect(mainImage()).toHaveAttribute('alt', 'Red chair');
    expect(screen.getByRole('button', { name: 'Previous slide' })).toBeDisabled();
  });

  it('AC-1: circular wraps with navigators', async () => {
    const user = userEvent.setup();
    render(<Galleria value={photos} circular />);
    await user.click(screen.getByRole('button', { name: 'Previous slide' }));
    expect(mainImage()).toHaveAttribute('alt', 'Green chair');
  });

  it('AC-2: fullscreen opens a modal with focus trap; Escape closes and restores focus', async () => {
    const user = userEvent.setup();
    render(<Galleria value={photos} fullscreen aria-label="Product photos" />);
    const trigger = screen.getByRole('button', { name: 'View larger: Red chair' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Product photos' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    for (let i = 0; i < 5; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('AC-3: alt is required by type', () => {
    // @ts-expect-error alt is required on GalleriaItem
    const bad: GalleriaItem = { src: '/x.jpg' };
    expect(bad.src).toBe('/x.jpg');
    render(<Galleria value={photos} />);
    expect(mainImage()).toHaveAttribute('alt', 'Red chair');
  });

  describe('autoplay', () => {
    afterEach(() => vi.useRealTimers());
    const alts = () => document.querySelector<HTMLImageElement>('.ui-galleria__figure:not(.ui-galleria__figure--leaving) .ui-galleria__image')!.alt;

    it('advances on an interval and stops on hover, focus and in a hidden tab', () => {
      vi.useFakeTimers();
      render(<Galleria value={photos} autoplay={1000} showThumbnails={false} circular />);
      const region = screen.getByRole('region');
      act(() => vi.advanceTimersByTime(1000));
      expect(alts()).toBe('Blue chair');
      fireEvent.mouseEnter(region);
      act(() => vi.advanceTimersByTime(3000));
      expect(alts()).toBe('Blue chair');
      fireEvent.mouseLeave(region);
      const next = screen.getByRole('button', { name: 'Next slide' });
      fireEvent.focus(next);
      act(() => vi.advanceTimersByTime(3000));
      expect(alts()).toBe('Blue chair');
      fireEvent.blur(next);
      const state = vi.spyOn(document, 'visibilityState', 'get');
      state.mockReturnValue('hidden');
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      act(() => vi.advanceTimersByTime(3000));
      expect(alts()).toBe('Blue chair');
      state.mockRestore();
    });
  });

  it('indicators are dashes with a single sliding accent mark', async () => {
    render(<Galleria value={photos} showIndicators showThumbnails={false} />);
    const indicators = document.querySelector<HTMLElement>('.ui-galleria__indicators')!;
    expect(indicators.style.getPropertyValue('--ui-mark-size')).not.toBe('');
    await userEvent.click(screen.getByRole('button', { name: 'Go to slide 2' }));
    expect(screen.getByRole('button', { name: 'Go to slide 2' })).toHaveAttribute('aria-current', 'true');
  });

  it('turns without leaving a stale layer when animation is unavailable (jsdom)', async () => {
    render(<Galleria value={photos} showThumbnails={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(mainImage().alt).toBe('Blue chair');
    expect(document.querySelector('.ui-galleria__figure--leaving')).toBeNull();
  });
});
