import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BlockUI } from './BlockUI';

const ui = (blocked: boolean, fullScreen = false) => (
  <BlockUI blocked={blocked} fullScreen={fullScreen}>
    <button>Pay</button>
  </BlockUI>
);

describe('BlockUI', () => {
  it('AC-1: blocked children are inert and aria-busy', () => {
    const { rerender } = render(ui(false));
    const button = screen.getByRole('button', { name: 'Pay' });
    expect(button.closest('[inert]')).toBeNull();
    rerender(ui(true));
    expect(screen.getByText('Pay', { selector: 'button' }).closest('[inert]')).not.toBeNull();
    expect(screen.getByText('Pay').parentElement).toHaveAttribute('aria-busy', 'true');
  });

  it('AC-2: overlay announces status', () => {
    const { rerender } = render(ui(false));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    rerender(ui(true));
    expect(screen.getByRole('status')).toHaveTextContent('Please wait…');
  });

  it('AC-2: custom template replaces the default message', () => {
    render(
      <BlockUI blocked template={<p>Processing payment</p>}>
        x
      </BlockUI>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Processing payment');
  });

  it('AC-3: fullScreen moves focus to the overlay and unblocking restores focus', () => {
    const { rerender } = render(ui(false, true));
    const button = screen.getByRole('button', { name: 'Pay' });
    button.focus();
    expect(button).toHaveFocus();
    rerender(ui(true, true));
    expect(screen.getByRole('status').firstElementChild).toHaveFocus();
    rerender(ui(false, true));
    expect(screen.getByRole('button', { name: 'Pay' })).toHaveFocus();
  });
});
