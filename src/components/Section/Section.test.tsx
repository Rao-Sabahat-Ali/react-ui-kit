import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Section } from './Section';

describe('Section', () => {
  it('AC-1: renders a region named by its heading', () => {
    render(<Section title="Today">content</Section>);
    const region = screen.getByRole('region', { name: 'Today' });
    expect(region.tagName).toBe('SECTION');
  });

  it('AC-2: titleAs selects the heading element (default h2)', () => {
    const { rerender } = render(<Section title="A">x</Section>);
    expect(screen.getByRole('heading', { level: 2, name: 'A' })).toBeInTheDocument();
    rerender(<Section title="A" titleAs="h3">x</Section>);
    expect(screen.getByRole('heading', { level: 3, name: 'A' })).toBeInTheDocument();
  });

  it('AC-3: description and actions render only when provided', () => {
    const { container, rerender } = render(<Section title="A">x</Section>);
    expect(container.querySelector('.ui-section__description')).toBeNull();
    expect(container.querySelector('.ui-section__actions')).toBeNull();
    rerender(<Section title="A" description="Hint" actions={<button type="button">Go</button>}>x</Section>);
    expect(screen.getByText('Hint')).toHaveClass('ui-section__description');
    expect(screen.getByRole('button', { name: 'Go' }).parentElement).toHaveClass('ui-section__actions');
  });

  it('AC-4: separated adds the modifier class', () => {
    const { container, rerender } = render(<Section title="A">x</Section>);
    expect(container.firstElementChild).not.toHaveClass('ui-section--separated');
    rerender(<Section title="A" separated>x</Section>);
    expect(container.firstElementChild).toHaveClass('ui-section--separated');
  });

  it('AC-5: sections get unique heading ids', () => {
    render(
      <>
        <Section title="One">x</Section>
        <Section title="Two">y</Section>
      </>,
    );
    const ids = screen.getAllByRole('heading').map((h) => h.id);
    expect(new Set(ids).size).toBe(2);
    expect(screen.getByRole('region', { name: 'Two' })).toBeInTheDocument();
  });
});
