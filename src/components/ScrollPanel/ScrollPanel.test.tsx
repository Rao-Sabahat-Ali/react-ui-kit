import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScrollPanel } from './ScrollPanel';

describe('ScrollPanel', () => {
  it('AC-1: renders a themed scroll container with the requested height', () => {
    const { container } = render(<ScrollPanel height={120} ariaLabel="Log">content</ScrollPanel>);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveClass('ui-scroll-panel');
    expect(el).toHaveStyle({ height: '120px' });
  });

  it('AC-2: keyboard-scrollable region when there are no focusable children', () => {
    render(<ScrollPanel ariaLabel="Release notes" height="10rem">plain text</ScrollPanel>);
    const region = screen.getByRole('region', { name: 'Release notes' });
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('AC-2: no extra tab stop when content is focusable', () => {
    const { container } = render(
      <ScrollPanel ariaLabel="Links">
        <a href="#x">x</a>
      </ScrollPanel>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el).not.toHaveAttribute('tabindex');
    expect(el).not.toHaveAttribute('role');
  });
});
