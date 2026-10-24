import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressCircle } from './ProgressCircle';

const arc = (c: HTMLElement) => c.querySelector('.ui-progress-circle__value')!;

describe('ProgressCircle', () => {
  it('AC-1: progressbar role with name, values and valuetext', () => {
    render(<ProgressCircle label="Storage used" value={30} max={60} />);
    const bar = screen.getByRole('progressbar', { name: 'Storage used' });
    expect(bar).toHaveAttribute('aria-valuenow', '30');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '60');
    expect(bar).toHaveAttribute('aria-valuetext', '50%');
    const { rerender } = render(<ProgressCircle label="x" value={1} valueText="1 of 4 steps" />);
    expect(screen.getAllByRole('progressbar')[1]).toHaveAttribute('aria-valuetext', '1 of 4 steps');
    rerender(<ProgressCircle label="x" value={1} valueText="one" />);
  });

  it('AC-2: clamps the value and the arc length follows the percentage', () => {
    const { container, rerender } = render(<ProgressCircle label="x" value={25} size={80} strokeWidth={10} />);
    const r = (80 - 10) / 2;
    const c = 2 * Math.PI * r;
    expect(Number(arc(container).getAttribute('stroke-dashoffset'))).toBeCloseTo(c * 0.75, 3);
    rerender(<ProgressCircle label="x" value={250} size={80} strokeWidth={10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(Number(arc(container).getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 3);
    rerender(<ProgressCircle label="x" value={-5} size={80} strokeWidth={10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('AC-3: indeterminate has no valuenow and the indeterminate modifier', () => {
    const { container } = render(<ProgressCircle label="Loading" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(bar).toHaveClass('ui-progress-circle--indeterminate');
    expect(container.querySelector('.ui-progress-circle__content')).toBeNull();
  });

  it('AC-4: showValue renders the percentage; children replace it', () => {
    const { rerender } = render(<ProgressCircle label="x" value={72} showValue />);
    expect(screen.getByRole('progressbar')).toHaveTextContent('72%');
    rerender(
      <ProgressCircle label="x" value={72} showValue>
        <b>72 GB</b>
      </ProgressCircle>,
    );
    expect(screen.getByRole('progressbar')).toHaveTextContent('72 GB');
    expect(screen.getByRole('progressbar')).not.toHaveTextContent('72%');
  });

  it('AC-5: size presets and numbers set the svg size; strokeWidth sets thickness', () => {
    const { container, rerender } = render(<ProgressCircle label="x" value={1} size="lg" />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '96');
    rerender(<ProgressCircle label="x" value={1} size="sm" />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '40');
    rerender(<ProgressCircle label="x" value={1} size={120} strokeWidth={6} />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '120');
    expect(container.querySelector('.ui-progress-circle__track')).toHaveAttribute('stroke-width', '6');
    expect(arc(container)).toHaveAttribute('stroke-width', '6');
  });

  it('AC-6: variant sets the intent modifier; default is accent', () => {
    const { rerender } = render(<ProgressCircle label="x" value={1} />);
    expect(screen.getByRole('progressbar')).toHaveClass('ui-progress-circle--accent');
    rerender(<ProgressCircle label="x" value={1} variant="danger" />);
    expect(screen.getByRole('progressbar')).toHaveClass('ui-progress-circle--danger');
  });

  it('AC-7: the stylesheet disables the transition and the spin under prefers-reduced-motion', () => {
    const scss = readFileSync(join(__dirname, 'ProgressCircle.scss'), 'utf8');
    const block = scss.slice(scss.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toMatch(/\.ui-progress-circle__value\s*{\s*transition:\s*none/);
    expect(block).toMatch(/animation:\s*none/);
  });
});
