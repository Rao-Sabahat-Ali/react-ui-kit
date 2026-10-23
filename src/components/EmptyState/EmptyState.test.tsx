import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('AC-1: renders title heading, description and action', () => {
    render(<EmptyState title="No saved words" description="Save words from the dictionary." action={<button type="button">Open dictionary</button>} />);
    expect(screen.getByRole('heading', { level: 3, name: 'No saved words' })).toBeInTheDocument();
    expect(screen.getByText('Save words from the dictionary.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open dictionary' })).toBeInTheDocument();
  });

  it('AC-2: error variant with live uses role alert', () => {
    render(<EmptyState variant="error" live title="Couldn't load" />);
    expect(screen.getByRole('alert')).toHaveClass('ui-empty-state--error');
  });

  it('titleAs changes heading level', () => {
    render(<EmptyState title="T" titleAs="h2" />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });
});
