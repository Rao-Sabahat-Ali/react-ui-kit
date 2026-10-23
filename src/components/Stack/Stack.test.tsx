import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stack } from './Stack';

const root = (c: HTMLElement) => c.firstElementChild as HTMLElement;

describe('Stack', () => {
  it('AC-1: default renders div.ui-stack.d-flex.flex-column with gap-3', () => {
    const { container } = render(<Stack>x</Stack>);
    expect(root(container).tagName).toBe('DIV');
    expect(root(container)).toHaveClass('ui-stack', 'd-flex', 'flex-column', 'gap-3');
  });

  it('AC-2: horizontal renders flex-row and ui-stack--horizontal', () => {
    const { container } = render(<Stack direction="horizontal">x</Stack>);
    expect(root(container)).toHaveClass('flex-row', 'ui-stack--horizontal');
    expect(root(container)).not.toHaveClass('flex-column');
  });

  it('AC-3: responsive direction adds flex-column flex-md-row', () => {
    const { container } = render(<Stack direction={{ xs: 'vertical', md: 'horizontal' }}>x</Stack>);
    expect(root(container)).toHaveClass('flex-column', 'flex-md-row');
  });

  it('AC-4: Bootstrap gap step uses class, other steps use inline custom property', () => {
    const { container, rerender } = render(<Stack gap={2}>x</Stack>);
    expect(root(container)).toHaveClass('gap-2');
    rerender(<Stack gap={6}>x</Stack>);
    expect(root(container).style.getPropertyValue('--ui-stack-gap')).toBe('var(--ui-space-6)');
    expect(root(container).className).not.toMatch(/\bgap-\d/);
  });

  it('AC-5: align and justify classes', () => {
    const { container } = render(<Stack align="center" justify="between">x</Stack>);
    expect(root(container)).toHaveClass('align-items-center', 'justify-content-between');
  });

  it('AC-6: wrap and inline', () => {
    const { container } = render(<Stack wrap inline>x</Stack>);
    expect(root(container)).toHaveClass('flex-wrap', 'd-inline-flex');
    expect(root(container)).not.toHaveClass('d-flex');
  });

  it('AC-7: as="ul" renders a ul root', () => {
    const { container } = render(<Stack as="ul"><li>a</li></Stack>);
    expect(root(container).tagName).toBe('UL');
  });

  it('AC-8: divider inserts n-1 separators ignoring null/false children', () => {
    render(
      <Stack divider>
        <span>a</span>
        {null}
        <span>b</span>
        {false}
        <span>c</span>
      </Stack>,
    );
    expect(screen.getAllByRole('separator')).toHaveLength(2);
  });

  it('AC-9: no role added; className, style and rest forwarded', () => {
    const { container } = render(<Stack className="extra" style={{ color: 'red' }} data-x="1">x</Stack>);
    const el = root(container);
    expect(el).not.toHaveAttribute('role');
    expect(el).toHaveClass('extra');
    expect(el).toHaveStyle({ color: 'rgb(255, 0, 0)' });
    expect(el).toHaveAttribute('data-x', '1');
  });
});
