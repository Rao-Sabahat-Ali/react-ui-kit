import { SplitButton } from './SplitButton';

export const examples = [
  {
    title: 'Save with alternatives',
    description: 'Two tab stops: the main action and the menu toggle (named "More actions").',
    code: `<SplitButton label="Save" onClick={save} items={[{ label: 'Save as draft' }, { label: 'Save and close' }]} />`,
    render: () => (
      <div className="d-flex gap-2">
        <SplitButton label="Save" icon="check" items={[{ label: 'Save as draft' }, { label: 'Save and close' }]} />
        <SplitButton label="Export" variant="secondary" appearance="outline" items={[{ label: 'CSV' }, { label: 'PDF' }]} />
        <SplitButton label="Publishing" loading items={[{ label: 'Schedule' }]} />
      </div>
    ),
  },
];
