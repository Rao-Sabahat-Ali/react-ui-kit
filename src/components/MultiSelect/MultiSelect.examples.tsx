import { useState } from 'react';
import { Field } from '../Field/Field';
import { MultiSelect } from './MultiSelect';

const langs = [
  { label: 'Compiled', options: [{ label: 'Go', value: 'go' }, { label: 'Rust', value: 'rs' }, { label: 'Zig', value: 'zig' }] },
  { label: 'Scripting', options: [{ label: 'Python', value: 'py' }, { label: 'TypeScript', value: 'ts' }, { label: 'Ruby', value: 'rb', disabled: true }] },
];

function Comma() {
  const [value, setValue] = useState<string[]>(['ts']);
  return (
    <Field label="Languages" help={`Value: [${value.join(', ')}]`}>
      <MultiSelect options={langs} value={value} onChange={setValue} filter />
    </Field>
  );
}

function Chips() {
  const [value, setValue] = useState<string[]>(['go', 'py']);
  return (
    <Field label="Top three" help="At most three">
      <MultiSelect options={langs} value={value} onChange={setValue} display="chips" selectionLimit={3} />
    </Field>
  );
}

export const examples = [
  {
    title: 'Comma display with filter and select all',
    code: `<Field label="Languages"><MultiSelect options={langs} value={value} onChange={setValue} filter /></Field>`,
    render: () => (
      <div style={{ maxWidth: 360 }}>
        <Comma />
      </div>
    ),
  },
  {
    title: 'Chips with selection limit',
    code: `<MultiSelect options={langs} value={value} onChange={setValue} display="chips" selectionLimit={3} />`,
    render: () => (
      <div style={{ maxWidth: 360 }}>
        <Chips />
      </div>
    ),
  },
];
