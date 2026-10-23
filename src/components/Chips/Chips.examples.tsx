import { useState } from 'react';
import { Field } from '../Field/Field';
import { Chips } from './Chips';

function Tags() {
  const [tags, setTags] = useState<string[]>(['react', 'bootstrap']);
  return (
    <Field label="Tags" help="Enter or comma adds a tag; paste a comma-separated list.">
      <Chips value={tags} onChange={setTags} placeholder="Add tag" />
    </Field>
  );
}

export const examples = [
  {
    title: 'Tags',
    code: `const [tags, setTags] = useState(['react', 'bootstrap']);\n<Field label="Tags"><Chips value={tags} onChange={setTags} /></Field>`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <Tags />
      </div>
    ),
  },
  {
    title: 'Emails with validation and max',
    code: `<Chips validate={(v) => /^[^@\\s]+@[^@\\s]+$/.test(v) || 'Enter a valid email'} max={3} separators={['Enter', ',', ' ']} />`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <Field label="Invite (max 3)">
          <Chips validate={(v) => /^[^@\s]+@[^@\s]+$/.test(v) || 'Enter a valid email'} max={3} separators={['Enter', ',', ' ']} />
        </Field>
      </div>
    ),
  },
];
