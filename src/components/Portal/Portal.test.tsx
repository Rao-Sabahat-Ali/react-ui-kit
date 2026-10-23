import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Portal } from './Portal';

describe('Portal', () => {
  it('AC-1: renders into body by default and into container when given', () => {
    const { container } = render(<Portal><p>in body</p></Portal>);
    expect(container).not.toHaveTextContent('in body');
    expect(screen.getByText('in body').parentElement).toBe(document.body);

    const target = document.createElement('div');
    document.body.appendChild(target);
    render(<Portal container={target}><p>in target</p></Portal>);
    expect(screen.getByText('in target').parentElement).toBe(target);
    target.remove();
  });

  it('renders inline when disabled', () => {
    const { container } = render(<Portal disabled><p>inline</p></Portal>);
    expect(container).toHaveTextContent('inline');
  });
});
