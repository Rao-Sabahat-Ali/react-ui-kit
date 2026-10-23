import { NumberFormat } from './NumberFormat';

export const examples = [
  {
    title: 'Currency, percent, compact',
    description: 'Uses `Intl.NumberFormat` with the LocaleProvider locale.',
    code: `<NumberFormat value={1234.5} format="currency" currency="EUR" />\n<NumberFormat value={0.256} format="percent" maximumFractionDigits={1} />\n<NumberFormat value={1_234_567} notation="compact" title />\n<NumberFormat value={-42} signDisplay="exceptZero" colorize tabular />`,
    render: () => (
      <div className="d-flex flex-wrap gap-4">
        <NumberFormat value={1234.5} format="currency" currency="EUR" />
        <NumberFormat value={0.256} format="percent" maximumFractionDigits={1} />
        <NumberFormat value={1_234_567} notation="compact" title />
        <NumberFormat value={-42} colorize tabular />
        <NumberFormat value={42} colorize tabular />
        <NumberFormat value={1024} format="unit" unit="kilobyte" />
        <NumberFormat value={null} />
      </div>
    ),
  },
];
