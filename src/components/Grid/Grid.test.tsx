import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Grid } from './Grid';

const root = (c: HTMLElement) => c.firstElementChild as HTMLElement;

describe('Grid', () => {
  it('AC-1: renders div.row.ui-grid with g-3 by default', () => {
    const { container } = render(<Grid>x</Grid>);
    expect(root(container).tagName).toBe('DIV');
    expect(root(container)).toHaveClass('row', 'ui-grid', 'g-3');
  });

  it('AC-2: columns per breakpoint add row-cols and wrap children in div.col', () => {
    const { container } = render(
      <Grid columns={{ xs: 1, md: 3 }}>
        <span>a</span>
        <span>b</span>
      </Grid>,
    );
    expect(root(container)).toHaveClass('row-cols-1', 'row-cols-md-3');
    const cols = root(container).children;
    expect(cols).toHaveLength(2);
    expect(cols[0]!.tagName).toBe('DIV');
    expect(cols[0]).toHaveClass('col');
  });

  it('AC-3: columns="auto" adds row-cols-auto', () => {
    const { container } = render(<Grid columns="auto">x</Grid>);
    expect(root(container)).toHaveClass('row-cols-auto');
  });

  it('AC-4: responsive gap and gapX', () => {
    const { container } = render(<Grid gap={{ xs: 2, lg: 4 }} gapX={1}>x</Grid>);
    expect(root(container)).toHaveClass('g-2', 'g-lg-4', 'gx-1');
    expect(root(container)).not.toHaveClass('g-3');
  });

  it('AC-5: Grid.Col span classes', () => {
    const { container } = render(
      <Grid>
        <Grid.Col span={6}>a</Grid.Col>
        <Grid.Col span={{ xs: 12, md: 'auto' }}>b</Grid.Col>
        <Grid.Col>c</Grid.Col>
      </Grid>,
    );
    const [a, b, c] = Array.from(root(container).children);
    expect(a).toHaveClass('col-6');
    expect(b).toHaveClass('col-12', 'col-md-auto');
    expect(c).toHaveClass('col');
    expect(c!.className).not.toMatch(/col-\d/);
  });

  it('AC-6: Grid.Col offset', () => {
    const { container } = render(
      <Grid>
        <Grid.Col offset={{ md: 2 }}>a</Grid.Col>
      </Grid>,
    );
    expect(root(container).firstElementChild).toHaveClass('offset-md-2');
  });

  it('AC-7: as="ul" renders ul.row.list-unstyled with li.col children', () => {
    const { container } = render(
      <Grid as="ul" columns={2}>
        <span>a</span>
      </Grid>,
    );
    expect(root(container).tagName).toBe('UL');
    expect(root(container)).toHaveClass('row', 'list-unstyled');
    expect(root(container).firstElementChild!.tagName).toBe('LI');
    expect(root(container).firstElementChild).toHaveClass('col');
  });

  it('AC-8: null and false children are not wrapped', () => {
    const { container } = render(
      <Grid columns={2}>
        {null}
        <span>a</span>
        {false}
      </Grid>,
    );
    expect(root(container).children).toHaveLength(1);
  });

  it('AC-9: align and justify classes', () => {
    const { container } = render(<Grid align="center" justify="between">x</Grid>);
    expect(root(container)).toHaveClass('align-items-center', 'justify-content-between');
  });
});
