import { Icon } from '../Icon/Icon';
import { Timeline, type TimelineAlign } from './Timeline';

interface OrderEvent {
  status: string;
  date: string;
  detail: string;
}

const events: OrderEvent[] = [
  { status: 'Ordered', date: '2026-10-01T09:00:00Z', detail: 'Order placed' },
  { status: 'Processing', date: '2026-10-02T09:00:00Z', detail: 'Preparing items' },
  { status: 'Shipped', date: '2026-10-03T09:00:00Z', detail: 'On its way' },
  { status: 'Delivered', date: '2026-10-05T09:00:00Z', detail: 'Left at the door' },
];

const content = (e: OrderEvent) => (
  <>
    <strong>{e.status}</strong>
    <div className="small text-body-secondary">{e.detail}</div>
  </>
);

const demo = (align: TimelineAlign, layout: 'vertical' | 'horizontal' = 'vertical') => (
  <Timeline value={events} align={align} layout={layout} content={content} date={(e) => e.date} opposite={(e) => new Date(e.date).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' })} />
);

export const examples = [
  {
    title: 'Alignments',
    code: `<Timeline value={events} align="alternate" content={(e) => <strong>{e.status}</strong>} date={(e) => e.date} opposite={(e) => formatDate(e.date)} />`,
    render: () => (
      <div className="d-grid gap-4">
        {demo('left')}
        {demo('alternate')}
      </div>
    ),
  },
  {
    title: 'Horizontal',
    code: `<Timeline layout="horizontal" align="top" value={events} content={…} />`,
    render: () => demo('top', 'horizontal'),
  },
  {
    title: 'Numbered markers',
    code: `<Timeline numbered value={events} content={(e) => <strong>{e.status}</strong>} />`,
    render: () => <Timeline numbered value={events} content={(e) => <strong>{e.status}</strong>} opposite={(e) => e.detail} />,
  },
  {
    title: 'Custom marker',
    code: `<Timeline value={events} marker={() => <Icon name="check" />} content={…} />`,
    render: () => <Timeline value={events} content={(e) => e.status} marker={() => <Icon name="check" className="text-success-emphasis" />} />,
  },
];
