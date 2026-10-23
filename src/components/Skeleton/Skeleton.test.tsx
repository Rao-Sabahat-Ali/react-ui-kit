import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('AC-1: renders placeholder classes with dimensions', () => {
    const { container } = render(<Skeleton shape="rect" width={120} height={40} />);
    const item = container.querySelector('.placeholder') as HTMLElement;
    expect(item).toHaveClass('ui-skeleton--rect');
    expect(item.style.width).toBe('120px');
    expect(container.firstChild).toHaveClass('placeholder-wave');
  });

  it('AC-2: lines renders N lines with last at 60%', () => {
    const { container } = render(<Skeleton lines={3} />);
    const items = container.querySelectorAll('.placeholder');
    expect(items).toHaveLength(3);
    expect((items[2] as HTMLElement).style.width).toBe('60%');
  });

  it('AC-3: hidden from AT', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
