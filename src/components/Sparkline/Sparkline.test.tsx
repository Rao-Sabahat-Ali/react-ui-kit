import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatCard } from '../StatCard/StatCard';
import { Sparkline } from './Sparkline';

const svg = (c: HTMLElement) => c.querySelector('svg')!;

describe('Sparkline', () => {
  it('AC-1: label gives role=img and a name; without a label it is decorative', () => {
    const { container, rerender } = render(<Sparkline values={[1, 2, 3]} label="Signups" />);
    expect(screen.getByRole('img', { name: /^Signups\./ })).toBeInTheDocument();
    rerender(<Sparkline values={[1, 2, 3]} />);
    expect(svg(container)).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('AC-2: summary overrides, false disables, and the generated text states the key figures', () => {
    const { rerender } = render(<Sparkline values={[3, 9, 1, 5]} label="Visits" />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Visits. 4 values, from 3 to 5, lowest 1, highest 9');
    rerender(<Sparkline values={[3, 9]} label="Visits" summary="Up sharply" />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Visits. Up sharply');
    rerender(<Sparkline values={[3, 9]} label="Visits" summary={false} />);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Visits');
  });

  it('AC-3: type renders a line, a line plus filled area, or one rect per value', () => {
    const { container, rerender } = render(<Sparkline values={[1, 2, 3, 4]} />);
    expect(container.querySelector('.ui-sparkline__line')).toBeInTheDocument();
    expect(container.querySelector('.ui-sparkline__area')).toBeNull();
    rerender(<Sparkline values={[1, 2, 3, 4]} type="area" />);
    expect(container.querySelector('.ui-sparkline__line')).toBeInTheDocument();
    expect(container.querySelector('.ui-sparkline__area')).toBeInTheDocument();
    rerender(<Sparkline values={[1, 2, 3, 4]} type="bar" />);
    expect(container.querySelectorAll('.ui-sparkline__bar')).toHaveLength(4);
    expect(container.querySelector('.ui-sparkline__line')).toBeNull();
  });

  it('AC-4: color maps to the chart token via a class; no raw colour values', () => {
    const { container } = render(<Sparkline values={[1, 2]} color={3} />);
    expect(svg(container)).toHaveClass('ui-sparkline--color-3');
    const scss = readFileSync(join(__dirname, 'Sparkline.scss'), 'utf8');
    expect(scss).toContain('var(--ui-color-chart-#{$n})');
    expect(scss).not.toMatch(/#[0-9a-fA-F]{3,8}\b(?!\))/);
    expect(svg(container).outerHTML).not.toMatch(/(#[0-9a-f]{3,6}|rgb\()/i);
  });

  it('AC-5: showMinMax renders exactly two markers at the extremes', () => {
    const { container, rerender } = render(<Sparkline values={[4, 1, 9, 5]} showMinMax height={40} />);
    const markers = container.querySelectorAll('.ui-sparkline__marker');
    expect(markers).toHaveLength(2);
    const ys = Array.from(markers).map((m) => Number(/M[\d.]+ ([\d.]+)h0/.exec(m.getAttribute('d')!)![1]));
    expect(Math.min(...ys)).toBe(3);
    expect(Math.max(...ys)).toBe(37);
    rerender(<Sparkline values={[4, 1, 9, 5]} />);
    expect(container.querySelectorAll('.ui-sparkline__marker')).toHaveLength(0);
  });

  it('AC-6: too few points render nothing; constant series stay finite; nulls make gaps', () => {
    const { container, rerender } = render(<Sparkline values={[5]} />);
    expect(container.firstChild).toBeNull();
    rerender(<Sparkline values={[null, 3]} />);
    expect(container.firstChild).toBeNull();
    rerender(<Sparkline values={[2, 2, 2]} type="area" />);
    expect(container.innerHTML).not.toContain('NaN');
    rerender(<Sparkline values={[1, 2, null, 4, 5]} />);
    const d = container.querySelector('.ui-sparkline__line')!.getAttribute('d')!;
    expect(d.match(/M/g)).toHaveLength(2);
    rerender(<Sparkline values={[7]} type="bar" />);
    expect(container.querySelectorAll('.ui-sparkline__bar')).toHaveLength(1);
  });

  it('AC-7: bars use a zero baseline when values span zero', () => {
    const { container } = render(<Sparkline values={[4, -4]} type="bar" height={43} />);
    const [pos, neg] = Array.from(container.querySelectorAll('.ui-sparkline__bar')).map((r) => ({ y: Number(r.getAttribute('y')), h: Number(r.getAttribute('height')) }));
    expect(pos!.y + pos!.h).toBeCloseTo(neg!.y, 1);
    expect(neg!.y).toBeGreaterThan(pos!.y);
  });

  it('AC-8: height sets the svg height and there is no text or axis', () => {
    const { container } = render(<Sparkline values={[1, 2, 3]} height={48} label="x" />);
    expect(svg(container)).toHaveAttribute('height', '48');
    expect(svg(container)).toHaveAttribute('viewBox', '0 0 100 48');
    expect(container.querySelector('text, line, .ui-sparkline__axis')).toBeNull();
  });

  it('AC-9: StatCard renders its sparkline prop with Sparkline, decorative', () => {
    const { container } = render(<StatCard label="Users" value={10} sparkline={[1, 3, 2, 5]} />);
    const s = container.querySelector('svg.ui-sparkline.ui-stat-card__sparkline');
    expect(s).toBeInTheDocument();
    expect(s).toHaveAttribute('aria-hidden', 'true');
  });
});
