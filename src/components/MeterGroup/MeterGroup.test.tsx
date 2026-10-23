import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MeterGroup } from './MeterGroup';

const data = [
  { label: 'Apps', value: 25 },
  { label: 'Photos', value: 40 },
  { label: 'Other', value: 10 },
];

describe('MeterGroup', () => {
  it('AC-1: segment widths are proportional to max', () => {
    render(<MeterGroup value={data} max={200} />);
    const apps = screen.getByRole('meter', { name: 'Apps' });
    expect(apps.style.getPropertyValue('--ui-meter-size')).toBe('12.5%');
    expect(screen.getByRole('meter', { name: 'Photos' }).style.getPropertyValue('--ui-meter-size')).toBe('20%');
    expect(apps).toHaveAttribute('aria-valuenow', '25');
    expect(apps).toHaveAttribute('aria-valuemin', '0');
    expect(apps).toHaveAttribute('aria-valuemax', '200');
  });

  it('segments never exceed 100% in total', () => {
    render(<MeterGroup value={[{ label: 'A', value: 80 }, { label: 'B', value: 80 }]} />);
    expect(screen.getByRole('meter', { name: 'B' }).style.getPropertyValue('--ui-meter-size')).toBe('20%');
  });

  it('AC-2: legend text includes formatted values', () => {
    render(<MeterGroup value={data} formatValue={(v) => `${v} GB`} />);
    expect(screen.getByText('25 GB')).toBeInTheDocument();
    expect(screen.getByText('Photos')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Apps' })).toHaveAttribute('aria-valuetext', '25 GB');
  });

  it('labelPosition and orientation', () => {
    const { container } = render(<MeterGroup value={data} labelPosition="start" orientation="vertical" />);
    const root = container.firstElementChild!;
    expect(root).toHaveClass('ui-meter-group--vertical');
    expect(root.firstElementChild!.tagName).toBe('UL');
  });
});
