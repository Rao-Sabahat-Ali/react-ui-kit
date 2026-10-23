import type { CSSProperties, HTMLAttributes, Ref } from 'react';
import { useLocale } from '../../locale/LocaleProvider';
import { cx } from '../../utils/cx';
import { clamp } from '../../utils/number';
import { Icon, type IconName } from '../Icon/Icon';
import type { ChartColor } from '../Chart/Chart';

/** Chart palette slot (`--ui-color-chart-{n}`). */

export interface MeterItem {
  label: string;
  value: number;
  color?: ChartColor;
  icon?: IconName;
}

export interface MeterGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  value: MeterItem[];
  max?: number;
  orientation?: 'horizontal' | 'vertical';
  /** Legend position relative to the bar. */
  labelPosition?: 'start' | 'end';
  formatValue?: (value: number, item: MeterItem) => string;
  ref?: Ref<HTMLDivElement>;
}

export function MeterGroup({ value, max = 100, orientation = 'horizontal', labelPosition = 'end', formatValue, className, ref, ...rest }: MeterGroupProps) {
  const { locale } = useLocale();
  const format = formatValue ?? ((v: number) => new Intl.NumberFormat(locale).format(v));
  const items = value.map((item, i) => ({ ...item, color: item.color ?? ((i % 8) + 1) as ChartColor }));

  // Segments share the bar; never let the sum exceed 100%.
  let remaining = 100;
  const segments = items.map((item) => {
    const pct = clamp(max > 0 ? (item.value / max) * 100 : 0, 0, remaining);
    remaining -= pct;
    return pct;
  });

  const bar = (
    <div className="progress-stacked ui-meter-group__bar">
      {items.map((item, i) => (
        <div
          key={`${item.label}-${i}`}
          className="progress ui-meter-group__segment"
          role="meter"
          aria-label={item.label}
          aria-valuenow={item.value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuetext={format(item.value, item)}
          style={{ '--ui-meter-size': `${segments[i]}%`, '--ui-meter-color': `var(--ui-color-chart-${item.color})` } as CSSProperties}
        >
          <div className="progress-bar ui-meter-group__fill" />
        </div>
      ))}
    </div>
  );

  const legend = (
    <ul className="ui-meter-group__legend list-unstyled">
      {items.map((item, i) => (
        <li key={`${item.label}-${i}`} className="ui-meter-group__legend-item">
          {item.icon ? <Icon name={item.icon} className="ui-meter-group__icon" style={{ color: `var(--ui-color-chart-${item.color})` }} /> : <span className="ui-meter-group__marker" style={{ '--ui-meter-color': `var(--ui-color-chart-${item.color})` } as CSSProperties} aria-hidden="true" />}
          <span className="ui-meter-group__label">{item.label}</span>
          <span className="ui-meter-group__value">{format(item.value, item)}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={ref} className={cx('ui-meter-group', `ui-meter-group--${orientation}`, className)} {...rest}>
      {labelPosition === 'start' && legend}
      {bar}
      {labelPosition === 'end' && legend}
    </div>
  );
}
