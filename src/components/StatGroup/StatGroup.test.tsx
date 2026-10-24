import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatCard } from '../StatCard/StatCard';
import { StatGroup } from './StatGroup';

describe('StatGroup', () => {
  it('AC-1: renders a named group', () => {
    render(
      <StatGroup aria-label="Your progress">
        <StatCard label="Streak" value={1} />
      </StatGroup>,
    );
    expect(screen.getByRole('group', { name: 'Your progress' })).toHaveClass('ui-stat-group');
  });

  it('AC-2: StatCards inside render plain unless variant="card" is explicit', () => {
    const { container } = render(
      <StatGroup aria-label="g">
        <StatCard label="A" value={1} />
        <StatCard label="B" value={2} variant="card" />
      </StatGroup>,
    );
    const cards = container.querySelectorAll('.ui-stat-card');
    expect(cards[0]).toHaveClass('ui-stat-card--plain');
    expect(cards[0]).not.toHaveClass('card');
    expect(cards[1]).toHaveClass('card');
  });

  it('AC-3: draws rules via the group class, with no box or shadow classes', () => {
    render(
      <StatGroup aria-label="g">
        <StatCard label="A" value={1} />
      </StatGroup>,
    );
    const group = screen.getByRole('group');
    expect(group.className).toBe('ui-stat-group');
  });
});
