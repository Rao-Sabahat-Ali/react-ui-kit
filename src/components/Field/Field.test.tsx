import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InputText } from '../InputText/InputText';
import { Field } from './Field';

describe('Field', () => {
  it('AC-1: label is associated with the control', () => {
    render(<Field label="Email"><InputText /></Field>);
    expect(screen.getByLabelText('Email')).toBeInstanceOf(HTMLInputElement);
  });

  it('AC-2 & AC-3: help and error wired via aria-describedby and aria-invalid', () => {
    render(<Field label="Email" help="We never share it." error="Required"><InputText /></Field>);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAccessibleDescription('We never share it. Required');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('AC-4: required sets required and decorative marker', () => {
    const { container } = render(<Field label="Name" required><InputText /></Field>);
    expect(screen.getByLabelText(/Name/)).toBeRequired();
    expect(container.querySelector('.ui-field__required')).toHaveAttribute('aria-hidden', 'true');
  });

  it('AC-5: labelHidden keeps accessible name', () => {
    const { container } = render(<Field label="Search" labelHidden><InputText /></Field>);
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(container.querySelector('label')).toHaveClass('visually-hidden');
  });
});
