import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('AC-1: default classes', () => {
    render(<Badge value={3} />);
    const badge = screen.getByText('3').parentElement;
    expect(badge).toHaveClass('badge', 'text-bg-primary');
    expect(badge).not.toHaveClass('rounded-pill');
  });

  it('AC-1: pill=true still adds rounded-pill for compatibility', () => {
    render(<Badge value={3} pill />);
    expect(screen.getByText('3').parentElement).toHaveClass('rounded-pill');
  });

  it('AC-2: max caps display', () => {
    render(<Badge value={120} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('AC-3: subtle appearance', () => {
    render(<Badge value="Beta" variant="info" appearance="subtle" />);
    expect(screen.getByText('Beta').parentElement).toHaveClass('bg-info-subtle', 'text-info-emphasis');
  });

  it('AC-4: dot without text, label accessible', () => {
    const { container } = render(<Badge dot label="New messages" />);
    expect(container.querySelector('.ui-badge--dot')).toBeInTheDocument();
    expect(screen.getByText('New messages')).toHaveClass('visually-hidden');
  });

  it('AC-5: overlay positions badge on child', () => {
    const { container } = render(<Badge value={2} overlay={{ children: <button type="button">Inbox</button> }} />);
    expect(container.querySelector('.position-relative')).toContainElement(screen.getByRole('button'));
    expect(container.querySelector('.badge')).toHaveClass('position-absolute', 'translate-middle', 'top-0', 'start-100');
  });
});
