import { ProgressBar } from './ProgressBar';

export const examples = [
  {
    title: 'Determinate, sizes, indeterminate',
    code: `<ProgressBar label="Daily goal" value={35} max={50} />\n<ProgressBar label="Upload" value={70} size="lg" showValue variant="success" />\n<ProgressBar label="Loading" size="sm" />`,
    render: () => (
      <div className="d-flex flex-column gap-3" style={{ maxWidth: 420 }}>
        <ProgressBar label="Daily goal" value={35} max={50} />
        <ProgressBar label="Upload" value={70} size="lg" showValue variant="success" />
        <ProgressBar label="Loading" size="sm" />
      </div>
    ),
  },
];
