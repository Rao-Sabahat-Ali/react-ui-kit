import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PaymentStatus, type PaymentStatusValue } from './PaymentStatus';

const TITLES: Record<PaymentStatusValue, string> = {
  processing: 'Processing your payment',
  requires_action: 'Confirm your payment',
  succeeded: 'Payment received',
  failed: 'Payment failed',
  canceled: 'Payment canceled',
};

describe('PaymentStatus', () => {
  it.each(Object.keys(TITLES) as PaymentStatusValue[])('AC-1: %s renders heading, description and glyph', (status) => {
    const { container } = render(<PaymentStatus status={status} />);
    expect(screen.getByRole('heading', { level: 2, name: TITLES[status] })).toBeInTheDocument();
    expect(container.querySelector('.ui-empty-state__description')?.textContent).toBeTruthy();
    expect(container.querySelector('.ui-empty-state__icon svg')).not.toBeNull();
  });

  it('AC-1: title and description can be overridden and the heading level changed', () => {
    render(<PaymentStatus status="failed" titleAs="h1" title="Card declined" description="Your bank said no." />);
    expect(screen.getByRole('heading', { level: 1, name: 'Card declined' })).toBeInTheDocument();
    expect(screen.getByText('Your bank said no.')).toBeInTheDocument();
  });

  it('AC-2: failed is assertive, the rest polite; processing is busy', () => {
    const { rerender } = render(<PaymentStatus status="failed" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    for (const status of ['processing', 'requires_action', 'succeeded', 'canceled'] as const) {
      rerender(<PaymentStatus status={status} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).toBeNull();
    }
    rerender(<PaymentStatus status="processing" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('AC-3: failed and canceled offer Try again (primary) and Use another method (outline)', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onUseAnotherMethod = vi.fn();
    const { rerender } = render(<PaymentStatus status="failed" onRetry={onRetry} onUseAnotherMethod={onUseAnotherMethod} />);
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveClass('btn-primary');
    expect(screen.getByRole('button', { name: 'Use another method' })).toHaveClass('btn-outline-secondary');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await user.click(screen.getByRole('button', { name: 'Use another method' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onUseAnotherMethod).toHaveBeenCalledTimes(1);
    rerender(<PaymentStatus status="canceled" onRetry={onRetry} />);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use another method' })).toBeNull();
  });

  it('AC-4: requires action confirms, succeeded continues only when asked, action replaces the built-ins', async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const { rerender } = render(<PaymentStatus status="requires_action" onContinue={onContinue} />);
    await user.click(screen.getByRole('button', { name: 'Confirm payment' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
    rerender(<PaymentStatus status="succeeded" />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<PaymentStatus status="succeeded" onContinue={onContinue} continueLabel="Back to the shop" />);
    expect(screen.getByRole('button', { name: 'Back to the shop' })).toBeInTheDocument();
    rerender(<PaymentStatus status="failed" onRetry={onContinue} action={<a href="/help">Contact support</a>} />);
    expect(screen.getByRole('link', { name: 'Contact support' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('AC-5: the reference renders with its label and tabular numerals class', () => {
    render(<PaymentStatus status="succeeded" reference="ORD-48213" />);
    const value = screen.getByText('ORD-48213');
    expect(value).toHaveClass('ui-payment-status__reference-value');
    expect(value.parentElement).toHaveTextContent('Reference ORD-48213');
  });

  it('AC-6: no emoji or images and at most one solid button per status', () => {
    for (const status of Object.keys(TITLES) as PaymentStatusValue[]) {
      const { container, unmount } = render(<PaymentStatus status={status} reference="pay_1" onRetry={() => {}} onUseAnotherMethod={() => {}} onContinue={() => {}} />);
      expect(container.querySelectorAll('img')).toHaveLength(0);
      expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}✨✅❌]/u);
      expect(within(container).queryAllByRole('button').filter((b) => b.classList.contains('btn-primary')).length).toBeLessThanOrEqual(1);
      unmount();
    }
  });
});
