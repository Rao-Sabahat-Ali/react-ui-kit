import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Image } from './Image';

describe('Image', () => {
  it('AC-1: lazy by default; explicit dimensions and ratio reserve space', () => {
    const { container } = render(<Image src="/a.jpg" alt="Lake" width={320} height={180} ratio="16x9" />);
    const img = screen.getByRole('img', { name: 'Lake' });
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('width', '320');
    expect(img).toHaveAttribute('height', '180');
    expect(container.querySelector('.ui-image')).toHaveClass('ui-image--ratio-16x9');
  });

  it('AC-1: eager loading can be opted into and placeholder shows until load', () => {
    const { container } = render(<Image src="/a.jpg" alt="Lake" loading="eager" placeholder={<span>loading</span>} />);
    const img = screen.getByRole('img', { name: 'Lake' });
    expect(img).toHaveAttribute('loading', 'eager');
    expect(screen.getByText('loading')).toBeInTheDocument();
    fireEvent.load(img);
    expect(screen.queryByText('loading')).not.toBeInTheDocument();
    expect(container.querySelector('.ui-image')).toHaveAttribute('data-status', 'loaded');
  });

  it('AC-2: fallbackSrc replaces a broken image only once', () => {
    const { container } = render(<Image src="/broken.jpg" alt="Lake" fallbackSrc="/fallback.jpg" />);
    const img = screen.getByRole('img', { name: 'Lake' });
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', '/fallback.jpg');
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', '/fallback.jpg');
    expect(container.querySelector('.ui-image')).toHaveAttribute('data-status', 'error');
  });

  it('rejects unsafe src protocols', () => {
    render(<Image src="javascript:alert(1)" alt="x" />);
    expect(screen.getByRole('img', { name: 'x' })).not.toHaveAttribute('src');
  });

  it('AC-3: preview opens a dialog with focus management, zoom and rotate', async () => {
    const user = userEvent.setup();
    render(<Image src="/a.jpg" alt="Lake" preview />);
    const trigger = screen.getByRole('button', { name: 'View larger: Lake' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Lake' });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    const preview = dialog.querySelector('.ui-image__preview')!;
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(preview).toHaveAttribute('data-zoom', '1.25');
    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(preview).toHaveAttribute('data-zoom', '0.75');
    await user.click(screen.getByRole('button', { name: 'Rotate' }));
    expect(preview).toHaveAttribute('data-rotation', '90');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
