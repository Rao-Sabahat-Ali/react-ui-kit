import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('AC-1: formats value via Intl with tabular nums', () => {
    render(<StatCard label="Words learned" value={1234} />);
    expect(screen.getByText('1,234')).toHaveClass('ui-tabular');
  });

  it('AC-2: delta direction text and colour, respecting invertDelta', () => {
    const { rerender } = render(<StatCard label="XP" value={10} delta={0.12} deltaLabel="vs last week" />);
    expect(screen.getByText('Up 12% vs last week').parentElement).toHaveClass('text-success-emphasis');
    rerender(<StatCard label="Mistakes" value={3} delta={0.12} invertDelta />);
    expect(screen.getByText('Up 12%').parentElement).toHaveClass('text-danger-emphasis');
  });

  it('AC-3: loading shows skeleton instead of value', () => {
    const { container } = render(<StatCard label="XP" value={10} loading />);
    expect(container.querySelector('.ui-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('10')).toBeNull();
  });
});
