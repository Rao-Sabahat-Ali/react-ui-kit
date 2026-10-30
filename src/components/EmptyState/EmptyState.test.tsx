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

  it('AC-3: media replaces the icon, sits in a sized slot above the title and assembles like the icon', () => {
    const { container } = render(<EmptyState title="No shelves yet" media={<img alt="A flat-pack shelf" src="shelf.svg" />} />);
    expect(container.querySelector('.ui-empty-state__icon')).toBeNull();
    const slot = container.querySelector('.ui-empty-state__media');
    expect(slot).toHaveAttribute('data-assemble');
    expect(slot).toContainElement(screen.getByRole('img', { name: 'A flat-pack shelf' }));
    expect(slot!.compareDocumentPosition(screen.getByRole('heading', { name: 'No shelves yet' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('without media the icon is still rendered', () => {
    const { container } = render(<EmptyState title="T" />);
    expect(container.querySelector('.ui-empty-state__icon')).toBeInTheDocument();
    expect(container.querySelector('.ui-empty-state__media')).toBeNull();
  });

  it('titleAs changes heading level', () => {
    render(<EmptyState title="T" titleAs="h2" />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });
});
