import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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
});
