import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Chart, type ChartData } from './Chart';
import { niceTicks } from './geometry';

const data: ChartData = {
  labels: ['Jan', 'Feb', 'Mar'],
  series: [
    { name: 'Revenue', values: [10, 20, 30] },
    { name: 'Costs', values: [5, 15, 10] },
  ],
};
const svgOf = (c: HTMLElement) => c.querySelector('svg.ui-chart__svg')!;

describe('Chart', () => {
  it('figure, figcaption and labelled svg', () => {
    render(<Chart type="line" data={data} title="Sales" summary="Revenue grows" />);
    expect(screen.getByRole('figure', { name: 'Sales' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Sales. Revenue grows' })).toBeInTheDocument();
  });

  it('AC-1: renders each type with correct geometry', () => {
    const line = render(<Chart type="line" data={data} title="L" />);
    expect(line.container.querySelectorAll('.ui-chart__line')).toHaveLength(2);
    expect(line.container.querySelectorAll('circle.ui-chart__point')).toHaveLength(6);
    line.unmount();
    const area = render(<Chart type="area" data={data} title="A" />);
    expect(area.container.querySelectorAll('.ui-chart__area')).toHaveLength(2);
    area.unmount();
    const bar = render(<Chart type="bar" data={data} title="B" />);
    expect(bar.container.querySelectorAll('rect.ui-chart__bar')).toHaveLength(6);
    bar.unmount();
    const stacked = render(<Chart type="bar" stacked data={data} title="S" />);
    const rects = Array.from(stacked.container.querySelectorAll<SVGRectElement>('rect.ui-chart__bar'));
    expect(rects).toHaveLength(6);
    // Stacked: same x per label, Costs sits on top of Revenue.
    const jan = rects.filter((r) => r.getAttribute('data-key')!.endsWith('-0'));
    expect(jan[0]!.getAttribute('x')).toBe(jan[1]!.getAttribute('x'));
    expect(Number(jan[1]!.getAttribute('y')) + Number(jan[1]!.getAttribute('height'))).toBeCloseTo(Number(jan[0]!.getAttribute('y')), 1);
    stacked.unmount();
    const horiz = render(<Chart type="bar" horizontal data={data} title="H" />);
    const h = horiz.container.querySelectorAll<SVGRectElement>('rect.ui-chart__bar');
    expect(h).toHaveLength(6);
    expect(Number(h[2]!.getAttribute('width'))).toBeGreaterThan(Number(h[0]!.getAttribute('width')));
    horiz.unmount();
    const pie = render(<Chart type="pie" data={data} title="P" />);
    expect(pie.container.querySelectorAll('path.ui-chart__slice')).toHaveLength(3);
    pie.unmount();
    const dough = render(<Chart type="doughnut" data={data} title="D" />);
    const slices = dough.container.querySelectorAll('path.ui-chart__slice');
    expect(slices).toHaveLength(3);
    expect(slices[0]!.getAttribute('d')).toMatch(/A.*L.*A/);
    dough.unmount();
    const spark = render(<Chart type="sparkline" data={data} title="Spark" />);
    expect(spark.container.querySelectorAll('.ui-chart__line')).toHaveLength(2);
    expect(spark.container.querySelector('.ui-chart__tick')).toBeNull();
    expect(spark.container.querySelector('.ui-chart__legend')).toBeNull();
  });

  it('AC-1: nice ticks', () => {
    expect(niceTicks(0, 30).values).toEqual([0, 10, 20, 30]);
    expect(niceTicks(0, 0.9).values).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });

  it('AC-2: uses chart tokens in order (theme-aware CSS variables)', () => {
    const { container } = render(<Chart type="bar" data={{ labels: ['a'], series: [{ name: 'A', values: [1] }, { name: 'B', values: [2] }, { name: 'C', values: [3], color: 7 }] }} title="T" />);
    const bars = container.querySelectorAll('rect.ui-chart__bar');
    expect(bars[0]).toHaveClass('ui-chart--c1');
    expect(bars[1]).toHaveClass('ui-chart--c2');
    expect(bars[2]).toHaveClass('ui-chart--c7');
    // No hard-coded colours: fills come from CSS (var(--ui-color-chart-n)), so theme switches apply without re-render.
    bars.forEach((b) => expect(b.getAttribute('fill')).toBeNull());
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    expect(container.querySelectorAll('rect.ui-chart__bar')[0]).toHaveClass('ui-chart--c1');
  });

  describe('AC-3', () => {
    const original = globalThis.ResizeObserver;
    afterEach(() => {
      globalThis.ResizeObserver = original;
    });
    it('AC-3: resizes with container (fallback width without ResizeObserver)', () => {
      let callback: ResizeObserverCallback = () => {};
      let disconnected = false;
      globalThis.ResizeObserver = class {
        constructor(cb: ResizeObserverCallback) {
          callback = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {
          disconnected = true;
        }
      } as unknown as typeof ResizeObserver;
      const { container, unmount } = render(<Chart type="line" data={data} title="R" />);
      expect(svgOf(container)).toHaveAttribute('width', '600');
      act(() => callback([{ contentRect: { width: 420 } } as ResizeObserverEntry], {} as ResizeObserver));
      expect(svgOf(container)).toHaveAttribute('width', '420');
      expect(svgOf(container)).toHaveAttribute('viewBox', '0 0 420 280');
      unmount();
      expect(disconnected).toBe(true);
      globalThis.ResizeObserver = undefined as unknown as typeof ResizeObserver;
      const second = render(<Chart type="line" data={data} title="R2" />);
      expect(svgOf(second.container)).toHaveAttribute('width', '600');
    });
  });

  it('AC-4: keyboard focus moves between points and shows the tooltip', async () => {
    const user = userEvent.setup();
    render(<Chart type="line" data={data} title="K" />);
    await user.tab();
    const first = screen.getByRole('img', { name: 'Revenue, Jan: 10' });
    expect(first).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Revenue');
    expect(screen.getByRole('tooltip')).toHaveTextContent('10');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('img', { name: 'Revenue, Feb: 20' })).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent('20');
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('img', { name: 'Costs, Feb: 15' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('img', { name: 'Costs, Mar: 10' })).toHaveFocus();
    // Single tab stop.
    await user.tab();
    expect(document.activeElement?.closest('svg')).toBeNull();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('AC-5: legend toggles series visibility', async () => {
    const user = userEvent.setup();
    const { container } = render(<Chart type="line" data={data} title="Legend" />);
    const legend = screen.getByRole('list', { name: 'Legend' });
    const costs = within(legend).getByRole('button', { name: 'Costs' });
    expect(costs).toHaveAttribute('aria-pressed', 'true');
    await user.click(costs);
    expect(costs).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelectorAll('.ui-chart__line')).toHaveLength(1);
    await user.click(costs);
    expect(container.querySelectorAll('.ui-chart__line')).toHaveLength(2);
  });

  it('AC-5: pie legend toggles slices', async () => {
    const user = userEvent.setup();
    const { container } = render(<Chart type="pie" data={data} title="Pie" />);
    await user.click(screen.getByRole('button', { name: 'Feb' }));
    expect(container.querySelectorAll('path.ui-chart__slice')).toHaveLength(2);
  });

  it('AC-6: "View as table" renders an accessible table of the data', async () => {
    const user = userEvent.setup();
    render(<Chart type="bar" data={{ ...data, series: [data.series[0]!, { name: 'Costs', values: [5, null, 10] }] }} title="Sales" showTable />);
    const toggle = screen.getByRole('button', { name: 'View as table' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    const table = screen.getByRole('table', { name: 'Sales' });
    expect(within(table).getByRole('columnheader', { name: 'Revenue' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'Feb' })).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide table' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('AC-7: null values create gaps in line charts', () => {
    const { container } = render(<Chart type="line" data={{ labels: ['a', 'b', 'c', 'd'], series: [{ name: 'S', values: [1, 2, null, 4] }] }} title="Gap" />);
    const d = container.querySelector('.ui-chart__line')!.getAttribute('d')!;
    expect(d.match(/M/g)).toHaveLength(2);
    expect(d.match(/L/g)).toHaveLength(1);
    expect(container.querySelectorAll('circle.ui-chart__point')).toHaveLength(3);
  });
});

describe('Chart patterns', () => {
  it('lines get dashes and bars get per-series hatch patterns', () => {
    const line = render(<Chart type="line" data={data} title="P" patterns />);
    const lines = line.container.querySelectorAll('.ui-chart__line');
    expect(lines[0]).not.toHaveAttribute('stroke-dasharray');
    expect(lines[1]).toHaveAttribute('stroke-dasharray');
    line.unmount();
    const bar = render(<Chart type="bar" data={data} title="P" patterns />);
    expect(bar.container.querySelectorAll('pattern')).toHaveLength(2);
    expect(bar.container.querySelector('pattern')).toHaveClass('ui-chart--c1');
    const rects = bar.container.querySelectorAll<SVGRectElement>('rect.ui-chart__bar');
    expect(rects[1]!.style.fill).toMatch(/^url\(/);
  });
});
