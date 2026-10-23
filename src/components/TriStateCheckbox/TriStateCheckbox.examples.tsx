import { useState } from 'react';
import { TriStateCheckbox, type TriState } from './TriStateCheckbox';

function Demo() {
  const [value, setValue] = useState<TriState>(null);
  return (
    <>
      <TriStateCheckbox label="Active customers" value={value} onChange={setValue} labels={{ null: 'Any', true: 'Only active', false: 'Only inactive' }} />
      <p className="text-body-secondary small mb-0">Filter: {value === null ? 'any' : value ? 'yes' : 'no'}</p>
    </>
  );
}

export const examples = [
  {
    title: 'Filter: any / yes / no',
    code: `const [value, setValue] = useState<boolean | null>(null);\n<TriStateCheckbox label="Active customers" value={value} onChange={setValue} labels={{ null: 'Any', true: 'Only active', false: 'Only inactive' }} />`,
    render: () => <Demo />,
  },
];
