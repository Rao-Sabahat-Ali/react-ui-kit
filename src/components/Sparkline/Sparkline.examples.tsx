import { Sparkline } from './Sparkline';

const data = [12, 18, 14, 22, 19, 27, 24, 31, 28, 36];

export const examples = [
  {
    title: 'Line, area and bars',
    description: 'No axes, 100% wide. Give it a label when it is the only trend information; otherwise it is decorative.',
    code: `<Sparkline values={data} label="Signups, last 10 days" />\n<Sparkline values={data} type="area" color={4} />\n<Sparkline values={data} type="bar" color={2} />`,
    render: () => (
      <div className="d-flex flex-column gap-3" style={{ maxWidth: 320 }}>
        <Sparkline values={data} label="Signups, last 10 days" />
        <Sparkline values={data} type="area" color={4} />
        <Sparkline values={data} type="bar" color={2} height={40} />
      </div>
    ),
  },
  {
    title: 'Min and max markers, gaps and negatives',
    code: `<Sparkline values={[3, 8, null, 5, 12, 2]} showMinMax label="Latency" />\n<Sparkline type="bar" values={[4, -3, 6, -2, 5]} />`,
    render: () => (
      <div className="d-flex flex-column gap-3" style={{ maxWidth: 320 }}>
        <Sparkline values={[3, 8, null, 5, 12, 2]} showMinMax label="Latency" height={40} />
        <Sparkline type="bar" values={[4, -3, 6, -2, 5]} color={5} height={40} />
      </div>
    ),
  },
];
