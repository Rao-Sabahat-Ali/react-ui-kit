import { Skeleton } from './Skeleton';

export const examples = [
  {
    title: 'Card placeholder',
    code: `<Skeleton shape="circle" width={48} />\n<Skeleton lines={3} />\n<Skeleton shape="rect" height={120} />`,
    render: () => (
      <div className="d-flex gap-3" style={{ maxWidth: 420 }}>
        <Skeleton shape="circle" width={48} />
        <div className="flex-grow-1 d-flex flex-column gap-3">
          <Skeleton lines={3} />
          <Skeleton shape="rect" height={120} />
        </div>
      </div>
    ),
  },
];
