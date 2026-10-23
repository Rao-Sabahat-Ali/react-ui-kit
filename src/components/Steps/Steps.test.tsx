import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Steps } from './Steps';

const items = [{ label: 'Cart' }, { label: 'Shipping' }, { label: 'Payment', status: 'error' as const }, { label: 'Review' }];

describe('Steps', () => {
  it('AC-1: renders states with text alternatives', () => {
    render(<Steps items={items} activeIndex={1} ariaLabel="Checkout" />);
    const list = screen.getByRole('list', { name: 'Checkout' });
    expect(list.tagName).toBe('OL');
    const [cart, shipping, payment, review] = within(list).getAllByRole('listitem');
    expect(cart).toHaveTextContent('Step 1 of 4: Cart, Completed');
    expect(shipping).toHaveAttribute('aria-current', 'step');
    expect(payment).toHaveTextContent('Payment, Error');
    expect(review).not.toHaveAttribute('aria-current');
    expect(review).toHaveTextContent('Step 4 of 4: Review');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('AC-2: clickable when not read-only', async () => {
    const onSelect = vi.fn();
    render(<Steps items={items} activeIndex={1} readOnly={false} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /Cart/ }));
    expect(onSelect).toHaveBeenCalledWith(0);
    screen.getByRole('button', { name: /Review/ }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(3);
  });
});
