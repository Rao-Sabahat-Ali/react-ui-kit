import { StatCard } from './StatCard';

export const examples = [
  {
    title: 'KPI tiles',
    code: `<StatCard label="Day streak" value={12} icon="star" />\n<StatCard label="Words learned" value={1834} delta={0.08} deltaLabel="vs last week" sparkline={[3, 5, 4, 8, 9, 7, 12]} />\n<StatCard label="Mistakes" value={14} delta={0.2} invertDelta />\n<StatCard label="Revenue" value={48210} format={{ style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }} loading />`,
    render: () => (
      <div className="row g-3">
        <div className="col-sm-6 col-lg-3"><StatCard label="Day streak" value={12} icon="star" /></div>
        <div className="col-sm-6 col-lg-3"><StatCard label="Words learned" value={1834} delta={0.08} deltaLabel="vs last week" sparkline={[3, 5, 4, 8, 9, 7, 12]} /></div>
        <div className="col-sm-6 col-lg-3"><StatCard label="Mistakes" value={14} delta={0.2} invertDelta /></div>
        <div className="col-sm-6 col-lg-3"><StatCard label="Revenue" value={48210} format={{ style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }} loading /></div>
      </div>
    ),
  },
];
