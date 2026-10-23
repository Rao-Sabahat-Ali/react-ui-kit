import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InputText } from '../InputText/InputText';
import { InputGroup } from './InputGroup';

describe('InputGroup', () => {
  it('AC-1: renders .input-group and Addon renders .input-group-text', () => {
    const { container } = render(
      <InputGroup>
        <InputGroup.Addon>@</InputGroup.Addon>
        <InputText aria-label="User" />
      </InputGroup>,
    );
    expect(container.firstElementChild).toHaveClass('input-group');
    expect(screen.getByText('@')).toHaveClass('input-group-text');
  });

  it('AC-2: size propagates and invalid adds has-validation', () => {
    const { container, rerender } = render(<InputGroup size="sm"><InputText aria-label="A" /></InputGroup>);
    expect(container.firstElementChild).toHaveClass('input-group-sm');
    rerender(<InputGroup size="lg" invalid><InputText aria-label="A" /></InputGroup>);
    expect(container.firstElementChild).toHaveClass('input-group-lg', 'has-validation');
  });

  it('AC-3: describe addon text is in the control description', () => {
    render(
      <InputGroup>
        <InputGroup.Addon describe>USD</InputGroup.Addon>
        <InputText aria-label="Amount" />
        <InputGroup.Addon>.00</InputGroup.Addon>
      </InputGroup>,
    );
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveAccessibleDescription('USD');
  });

  it('AC-3: addons without describe do not describe the control', () => {
    render(
      <InputGroup>
        <InputGroup.Addon>USD</InputGroup.Addon>
        <InputText aria-label="Amount" />
      </InputGroup>,
    );
    expect(screen.getByRole('textbox')).not.toHaveAccessibleDescription();
  });
});
