import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Fieldset } from './Fieldset';

describe('Fieldset', () => {
  it('AC-1: renders fieldset with legend', () => {
    render(
      <Fieldset legend="Shipping">
        <input aria-label="Street" />
      </Fieldset>,
    );
    expect(screen.getByRole('group', { name: 'Shipping' })).toBeInTheDocument();
    expect(screen.getByRole('group').querySelector('legend')).toHaveTextContent('Shipping');
  });

  it('AC-2: toggleable collapses content and syncs aria-expanded', async () => {
    const onToggle = vi.fn();
    render(
      <Fieldset legend="Advanced" toggleable onToggle={onToggle}>
        <input aria-label="Street" />
      </Fieldset>,
    );
    const btn = screen.getByRole('button', { name: /Advanced/ });
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Street')).toBeVisible();
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Street')).not.toBeVisible();
    expect(onToggle).toHaveBeenCalledWith(true);
    expect(btn).toHaveAttribute('aria-controls', document.getElementById(btn.getAttribute('aria-controls')!)!.id);
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  it('supports defaultCollapsed and controlled collapsed', () => {
    const { rerender } = render(
      <Fieldset legend="L" toggleable defaultCollapsed>
        <input aria-label="x" />
      </Fieldset>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    rerender(
      <Fieldset legend="L" toggleable collapsed={false}>
        <input aria-label="x" />
      </Fieldset>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });
});
