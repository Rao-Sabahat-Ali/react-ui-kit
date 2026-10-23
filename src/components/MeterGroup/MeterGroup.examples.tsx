import { MeterGroup } from './MeterGroup';

const storage = [
  { label: 'Apps', value: 16 },
  { label: 'Photos', value: 38 },
  { label: 'Documents', value: 12 },
  { label: 'System', value: 20, icon: 'settings' },
];

export const examples = [
  {
    title: 'Storage usage',
    description: 'Each segment is `role="meter"`; the legend repeats the values as text.',
    code: `<MeterGroup value={[{ label: 'Apps', value: 16 }, …]} formatValue={(v) => \`\${v} GB\`} max={100} />`,
    render: () => (
      <div className="d-flex flex-column gap-4">
        <MeterGroup value={storage} formatValue={(v) => `${v} GB`} />
        <MeterGroup value={storage} orientation="vertical" labelPosition="end" formatValue={(v) => `${v} GB`} />
      </div>
    ),
  },
];
