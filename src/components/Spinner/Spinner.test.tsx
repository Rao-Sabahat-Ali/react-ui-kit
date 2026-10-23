import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('AC-1: status role with default and custom label', () => {
    // Live regions announce their content; the label is visually hidden text inside.
    const { rerender } = render(<Spinner />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    rerender(<Spinner label="Loading orders" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading orders');
  });

  it('AC-2: decorative hides from AT', () => {
    const { container } = render(<Spinner decorative />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('AC-3: maps type, size and variant to classes', () => {
    render(<Spinner type="grow" size="sm" variant="primary" />);
    expect(screen.getByRole('status')).toHaveClass('spinner-grow', 'spinner-grow-sm', 'text-primary');
  });
});
