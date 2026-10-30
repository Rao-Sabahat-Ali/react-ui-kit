import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('AC-1: formats value via Intl with tabular nums', () => {
    const { container } = render(<StatCard label="Words learned" value={1234} />);
    expect(screen.getByRole('status')).toHaveTextContent('1,234');
    expect(container.querySelector('.ui-stat-card__value')).toHaveClass('ui-tabular');
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
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('AC-4: plain variant renders without card chrome', () => {
    const { container } = render(<StatCard label="Streak" value={12} variant="plain" />);
    const root = container.firstElementChild!;
    expect(root).toHaveClass('ui-stat-card--plain');
    expect(root).not.toHaveClass('card');
    expect(container.querySelector('.ui-stat-card__value')).toHaveTextContent('12');
  });

  it('AC-5: default variant stays a card', () => {
    const { container } = render(<StatCard label="Users" value={3} />);
    expect(container.firstElementChild).toHaveClass('card', 'ui-stat-card');
  });

  it('AC-6: parts-list order: icon, then value, then label', () => {
    const { container } = render(<StatCard icon="flame" label="Day streak" value={12} variant="plain" />);
    const parts = [...container.querySelectorAll('.ui-stat-card__icon, .ui-stat-card__value, .ui-stat-card__label')].map((n) => n.className.split(' ')[0]);
    expect(parts).toEqual(['ui-stat-card__icon', 'ui-stat-card__value', 'ui-stat-card__label']);
  });

  it('AC-7: numeric counts get an aria-hidden × quantity mark; text, percent and currency do not', () => {
    const { container, rerender } = render(<StatCard label="Streak" value={12} />);
    expect(container.querySelector('.ui-qty__mark')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.ui-qty__mark')).toHaveTextContent('×');
    rerender(<StatCard label="Rate" value="98%" />);
    expect(container.querySelector('.ui-qty__mark')).toBeNull();
    rerender(<StatCard label="Rate" value={0.5} format={{ style: 'percent' }} />);
    expect(container.querySelector('.ui-qty__mark')).toBeNull();
    rerender(<StatCard label="Rate" value="98%" quantity />);
    expect(container.querySelector('.ui-qty__mark')).toBeInTheDocument();
  });

  it('AC-8: a changed value is announced once through a single status region', () => {
    const { rerender } = render(<StatCard label="Streak" value={12} />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    rerender(<StatCard label="Streak" value={13} />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('13');
  });
});
