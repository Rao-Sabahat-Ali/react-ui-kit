import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
  it('AC-1: renders card with h3 title by default, titleAs changes level', () => {
    const { container, rerender } = render(<Card title="Revenue">Body</Card>);
    expect(container.firstChild).toHaveClass('card', 'ui-card');
    expect(container.querySelector('.card-body')).toHaveTextContent('Body');
    expect(screen.getByRole('heading', { level: 3, name: 'Revenue' })).toBeInTheDocument();
    rerender(<Card title="Revenue" titleAs="h2" />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('AC-2: slots render', () => {
    const { container } = render(<Card title="T" header="H" footer="F" media={<img src="a.png" alt="" />} actions={<button type="button">A</button>} />);
    expect(container.querySelector('.card-header')).toHaveTextContent('H');
    expect(container.querySelector('.card-footer')).toHaveTextContent('F');
    expect(container.querySelector('.card-img-top img')).toBeInTheDocument();
    expect(container.querySelector('.ui-card__actions')).toHaveTextContent('A');
  });

  it('AC-3: variants add modifier classes', () => {
    const { container } = render(<Card variant="elevated" />);
    expect(container.firstChild).toHaveClass('ui-card--elevated');
  });

  it('AC-4: href renders stretched link title; unsafe urls ignored', () => {
    const { rerender } = render(<Card title="Docs" href="/docs" />);
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveClass('stretched-link');
    rerender(<Card title="Docs" href="javascript:alert(1)" />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('AC-5: as changes root element', () => {
    const { container } = render(<Card as="article" />);
    expect(container.firstChild?.nodeName).toBe('ARTICLE');
  });
});
