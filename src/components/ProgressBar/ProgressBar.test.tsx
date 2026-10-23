import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('AC-1: determinate width and ARIA values', () => {
    const { container } = render(<ProgressBar label="Daily goal" value={30} max={60} />);
    const bar = screen.getByRole('progressbar', { name: 'Daily goal' });
    expect(bar).toHaveAttribute('aria-valuenow', '30');
    expect(bar).toHaveAttribute('aria-valuemax', '60');
    expect((container.querySelector('.progress-bar') as HTMLElement).style.width).toBe('50%');
  });

  it('AC-2: indeterminate omits aria-valuenow and animates', () => {
    const { container } = render(<ProgressBar label="Loading" />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
    expect(container.querySelector('.progress-bar')).toHaveClass('progress-bar-animated');
  });

  it('clamps out-of-range values', () => {
    render(<ProgressBar label="x" value={150} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});
