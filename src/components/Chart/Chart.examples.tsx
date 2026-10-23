import { Chart, type ChartData } from './Chart';

const monthly: ChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    { name: 'Revenue', values: [12, 19, 14, 22, 28, 31] },
    { name: 'Costs', values: [8, 11, 9, null, 15, 17] },
  ],
};
const share: ChartData = { labels: ['Direct', 'Search', 'Social', 'Email'], series: [{ name: 'Visits', values: [42, 31, 17, 10] }] };
const money = (n: number) => `$${n}k`;

export const examples = [
  {
    title: 'Line with table alternative',
    description: 'Tab into the chart, then use arrow keys to move between points. Null values create gaps.',
    code: `<Chart type="line" data={monthly} title="Revenue vs costs" summary="Revenue grows faster than costs" formatValue={(n) => \`$\${n}k\`} showTable />`,
    render: () => <Chart type="line" data={monthly} title="Revenue vs costs" summary="Revenue grows faster than costs" formatValue={money} showTable />,
  },
  {
    title: 'Area',
    code: `<Chart type="area" data={monthly} title="Area" legend="top" />`,
    render: () => <Chart type="area" data={monthly} title="Area" legend="top" />,
  },
  {
    title: 'Bars: grouped, stacked, horizontal',
    code: `<Chart type="bar" data={monthly} title="Grouped" />\n<Chart type="bar" stacked data={monthly} title="Stacked" patterns />\n<Chart type="bar" horizontal data={monthly} title="Horizontal" />`,
    render: () => (
      <div className="d-grid gap-4">
        <Chart type="bar" data={monthly} title="Grouped" />
        <Chart type="bar" stacked data={monthly} title="Stacked" patterns />
        <Chart type="bar" horizontal data={monthly} title="Horizontal" />
      </div>
    ),
  },
  {
    title: 'Pie and doughnut',
    code: `<Chart type="pie" data={share} title="Traffic sources" />\n<Chart type="doughnut" data={share} title="Traffic (doughnut)" />`,
    render: () => (
      <div className="row g-4">
        <div className="col-md-6">
          <Chart type="pie" data={share} title="Traffic sources" height={240} />
        </div>
        <div className="col-md-6">
          <Chart type="doughnut" data={share} title="Traffic (doughnut)" height={240} />
        </div>
      </div>
    ),
  },
  {
    title: 'Sparkline',
    code: `<Chart type="sparkline" data={{ labels, series: [revenue] }} title="Revenue trend" hideTitle />`,
    render: () => (
      <div style={{ maxWidth: 200 }}>
        <Chart type="sparkline" data={{ labels: monthly.labels, series: [monthly.series[0]!] }} title="Revenue trend" hideTitle />
      </div>
    ),
  },
];
