import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PaymentMethodSelector, type PaymentMethod } from './PaymentMethodSelector';

const methods: PaymentMethod[] = [
  { id: 'card', label: 'Card', description: 'Visa, Mastercard and more', icon: 'user', badge: 'Fastest', children: <p>Card form</p> },
  { id: 'wallet', label: 'Digital wallet', children: <p>Wallet info</p> },
  { id: 'transfer', label: 'Bank transfer', disabled: true, disabledReason: 'Not available in your country' },
  { id: 'invoice', label: 'Invoice' },
];

describe('PaymentMethodSelector', () => {
  it('AC-1: radiogroup named by the legend, one tab stop, arrow keys skip disabled methods', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">before</button>
        <PaymentMethodSelector methods={methods} defaultValue="card" />
        <button type="button">after</button>
      </>,
    );
    const group = screen.getByRole('radiogroup', { name: 'Payment method' });
    expect(within(group).getAllByRole('radio')).toHaveLength(4);
    await user.tab();
    await user.tab();
    expect(screen.getByRole('radio', { name: /^Card/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Digital wallet' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Digital wallet' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Invoice' })).toBeChecked();
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(screen.getByRole('radio', { name: /^Card/ })).toBeChecked();
    await user.tab();
    expect(screen.getByRole('button', { name: 'after' })).toHaveFocus();
  });

  it('AC-1: aria-label names the group when there is no legend, and the legend can be hidden', () => {
    const { rerender } = render(<PaymentMethodSelector methods={methods} aria-label="How do you want to pay" />);
    expect(screen.getByRole('radiogroup', { name: 'How do you want to pay' })).toBeInTheDocument();
    rerender(<PaymentMethodSelector methods={methods} legend="Pay with" legendHidden />);
    expect(screen.getByRole('radiogroup', { name: 'Pay with' })).toBeInTheDocument();
    expect(screen.getByText('Pay with')).toHaveClass('visually-hidden');
  });

  it('AC-2: uncontrolled and controlled value with onChange(id) and the selected marker', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<PaymentMethodSelector methods={methods} onChange={onChange} />);
    expect(screen.getAllByRole('radio').every((r) => !(r as HTMLInputElement).checked)).toBe(true);
    await user.click(screen.getByText('Digital wallet'));
    expect(onChange).toHaveBeenCalledWith('wallet');
    expect(screen.getByRole('radio', { name: 'Digital wallet' }).closest('.ui-payment-methods__item')).toHaveClass('ui-payment-methods__item--selected');
    rerender(<PaymentMethodSelector methods={methods} value="invoice" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Invoice' })).toBeChecked();
    await user.click(screen.getByText('Card'));
    expect(onChange).toHaveBeenLastCalledWith('card');
    expect(screen.getByRole('radio', { name: 'Invoice' })).toBeChecked();
  });

  it('AC-3: a disabled method cannot be chosen and its reason is its description', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PaymentMethodSelector methods={methods} onChange={onChange} />);
    const radio = screen.getByRole('radio', { name: 'Bank transfer' });
    expect(radio).toBeDisabled();
    expect(radio).toHaveAccessibleDescription('Unavailable: Not available in your country');
    await user.click(screen.getByText('Bank transfer'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('AC-4: children render only for the selected method and are linked by aria-controls', async () => {
    const user = userEvent.setup();
    render(<PaymentMethodSelector methods={methods} defaultValue="card" />);
    expect(screen.getByText('Card form')).toBeInTheDocument();
    const radio = screen.getByRole('radio', { name: /^Card/ });
    const panel = screen.getByRole('group', { name: 'Card' });
    expect(radio).toHaveAttribute('aria-controls', panel.id);
    await user.click(screen.getByText('Digital wallet'));
    expect(screen.queryByText('Card form')).toBeNull();
    expect(screen.getByText('Wallet info')).toBeInTheDocument();
    await user.click(screen.getByText('Invoice'));
    expect(screen.queryByText('Wallet info')).toBeNull();
    expect(screen.queryByRole('group', { name: /./ })).toBeNull();
  });

  it('AC-5: description and badge render, description is linked, icon accepts a name or a node and is hidden', () => {
    render(
      <PaymentMethodSelector
        methods={[
          { id: 'a', label: 'Card', description: 'Visa and others', badge: 'Fastest', icon: 'user' },
          { id: 'b', label: 'Own mark', icon: <span data-testid="own">mark</span> },
        ]}
      />,
    );
    expect(screen.getByRole('radio', { name: /^Card/ })).toHaveAccessibleDescription('Visa and others');
    expect(screen.getByText('Fastest')).toBeInTheDocument();
    expect(document.querySelector('.ui-payment-methods__icon svg')).not.toBeNull();
    expect(screen.getByTestId('own').closest('.ui-payment-methods__icon')).toHaveAttribute('aria-hidden', 'true');
  });

  it('AC-6: error text is linked to the group and marks it invalid', () => {
    render(<PaymentMethodSelector methods={methods} error="Choose a payment method" />);
    const group = screen.getByRole('radiogroup');
    expect(group).toHaveAccessibleDescription('Choose a payment method');
    expect(group).toHaveAttribute('aria-invalid', 'true');
  });

  it('AC-7: disabling the group disables every radio and no brand images are rendered', () => {
    render(<PaymentMethodSelector methods={methods} disabled />);
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });
});
