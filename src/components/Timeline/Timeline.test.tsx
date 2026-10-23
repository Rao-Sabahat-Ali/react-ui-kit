import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Timeline } from './Timeline';

interface Ev {
  title: string;
  date: string;
}
const events: Ev[] = [
  { title: 'Ordered', date: '2026-10-01' },
  { title: 'Shipped', date: '2026-10-03' },
  { title: 'Delivered', date: '2026-10-05' },
];

describe('Timeline', () => {
  it('AC-1: renders an ordered list with markers and connectors', () => {
    const { container } = render(<Timeline value={events} content={(e) => e.title} />);
    const list = screen.getByRole('list', { name: 'Timeline' });
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(container.querySelectorAll('.ui-timeline__marker')).toHaveLength(3);
    // No connector after the last event.
    expect(container.querySelectorAll('.ui-timeline__connector')).toHaveLength(2);
    expect(screen.getByText('Shipped')).toBeInTheDocument();
  });

  it('AC-1: custom marker and opposite content', () => {
    render(<Timeline value={events} content={(e) => e.title} opposite={(e) => `on ${e.date}`} marker={() => <b data-testid="m" />} />);
    expect(screen.getAllByTestId('m')).toHaveLength(3);
    expect(screen.getByText('on 2026-10-03')).toBeInTheDocument();
  });

  it('AC-1: dates are machine-readable <time> elements', () => {
    render(<Timeline value={events} content={(e) => e.title} date={(e) => e.date} opposite={(e) => e.date} />);
    const times = document.querySelectorAll('time');
    expect(times).toHaveLength(3);
    expect(times[0]).toHaveAttribute('datetime', '2026-10-01');
  });

  it.each(['left', 'right', 'alternate'] as const)('AC-2: vertical %s alignment', (align) => {
    render(<Timeline value={events} align={align} content={(e) => e.title} />);
    const list = screen.getByRole('list');
    expect(list).toHaveClass('ui-timeline--vertical', `ui-timeline--${align}`);
  });

  it.each(['top', 'bottom'] as const)('AC-2: horizontal %s alignment', (align) => {
    render(<Timeline value={events} layout="horizontal" align={align} content={(e) => e.title} />);
    expect(screen.getByRole('list')).toHaveClass('ui-timeline--horizontal', `ui-timeline--${align}`);
  });

  it('AC-2: alternate marks every other event; RTL is handled by logical CSS', () => {
    render(
      <div dir="rtl">
        <Timeline value={events} align="alternate" content={(e) => e.title} />
      </div>,
    );
    const items = screen.getAllByRole('listitem');
    expect(items[1]).toHaveClass('ui-timeline__event--even');
    expect(items[0]).not.toHaveClass('ui-timeline__event--even');
  });
});
