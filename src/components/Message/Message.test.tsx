import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Message } from './Message';

describe('Message', () => {
  it('AC-1: default alert-info', () => {
    const { container } = render(<Message>Hello</Message>);
    expect(container.firstChild).toHaveClass('alert', 'alert-info', 'ui-message');
  });

  it('AC-2: severity changes class and icon', () => {
    const { container } = render(<Message severity="danger">Oops</Message>);
    expect(container.firstChild).toHaveClass('alert-danger');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('AC-3: live maps to roles', () => {
    const { rerender, container } = render(<Message>A</Message>);
    expect(container.firstChild).not.toHaveAttribute('role');
    rerender(<Message live="assertive">A</Message>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(<Message live="polite">A</Message>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('AC-4: dismissible close calls onDismiss, hides when uncontrolled', async () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Message dismissible onDismiss={onDismiss}>A</Message>);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalled();
    rerender(<Message dismissible key="b">B</Message>);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('B')).toBeNull();
  });

  it('AC-5: visually hidden severity prefix', () => {
    render(<Message severity="warning">Low disk</Message>);
    expect(screen.getByText('Warning:')).toHaveClass('visually-hidden');
  });
});
