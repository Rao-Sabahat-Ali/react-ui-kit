import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InputText } from '../InputText/InputText';
import { FloatLabel } from './FloatLabel';

describe('FloatLabel', () => {
  it('AC-1: renders .form-floating with control before the linked label', () => {
    const { container } = render(
      <FloatLabel label="Email">
        <InputText />
      </FloatLabel>,
    );
    const group = container.querySelector('.form-floating')!;
    expect(group.children[0]).toBe(screen.getByRole('textbox', { name: 'Email' }));
    expect(group.children[1]?.tagName).toBe('LABEL');
  });

  it('AC-2: sets placeholder to the label when missing, keeps an explicit one', () => {
    const { rerender } = render(
      <FloatLabel label="Email">
        <InputText />
      </FloatLabel>,
    );
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'Email');
    rerender(
      <FloatLabel label="Email">
        <InputText placeholder="you@example.com" />
      </FloatLabel>,
    );
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'you@example.com');
  });

  it('AC-3: help and error are wired via aria-describedby and aria-invalid', () => {
    render(
      <FloatLabel label="Email" help="Work address" error="Not valid">
        <InputText />
      </FloatLabel>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAccessibleDescription('Work address Not valid');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveClass('is-invalid');
  });
});
