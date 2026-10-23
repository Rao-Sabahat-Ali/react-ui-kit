import { useState } from 'react';
import { Field } from '../Field/Field';
import { Mention } from './Mention';

const people = ['ada', 'alan', 'barbara', 'grace', 'linus', 'margaret'];
const topics = ['design-system', 'docs', 'react', 'release'];

function Demo() {
  const [text, setText] = useState('');
  const [items, setItems] = useState<string[]>([]);
  return (
    <Field label="Comment" help="Type @ to mention someone or # for a topic.">
      <Mention
        value={text}
        onChange={setText}
        triggers={['@', '#']}
        suggestions={items}
        onSearch={(trigger, query) => setItems((trigger === '@' ? people : topics).filter((x) => x.startsWith(query.toLowerCase())))}
        rows={4}
      />
    </Field>
  );
}

export const examples = [
  {
    title: 'People and topics',
    code: `<Mention value={text} onChange={setText} triggers={['@', '#']} suggestions={items}\n  onSearch={(trigger, query) => setItems(lookup(trigger, query))} />`,
    render: () => (
      <div style={{ maxWidth: 480 }}>
        <Demo />
      </div>
    ),
  },
];
