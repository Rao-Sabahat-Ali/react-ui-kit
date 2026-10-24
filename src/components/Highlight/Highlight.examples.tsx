import { useState } from 'react';
import { InputText } from '../InputText/InputText';
import { Highlight } from './Highlight';

const ENTRIES = [
  { word: 'café', gloss: 'a small restaurant serving coffee and light meals' },
  { word: 'cafeteria', gloss: 'a self-service restaurant' },
  { word: 'decaf', gloss: 'coffee with most of the caffeine removed' },
  { word: 'crème brûlée', gloss: 'a custard topped with hard caramel' },
];

function Demo() {
  const [q, setQ] = useState('cafe');
  const query = q.split(/\s+/).filter(Boolean);
  const shown = ENTRIES.filter((e) => query.length === 0 || query.some((t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(`${e.word} ${e.gloss}`.normalize('NFD').replace(/\p{M}/gu, ''))));
  return (
    <div style={{ maxWidth: 420 }}>
      <label className="form-label" htmlFor="highlight-q">
        Search
      </label>
      <InputText id="highlight-q" value={q} onChange={(v) => setQ(v)} />
      <ul className="list-unstyled mt-3 mb-0">
        {shown.map((e) => (
          <li key={e.word} className="mb-2">
            <strong>
              <Highlight query={query}>{e.word}</Highlight>
            </strong>
            <div className="text-body-secondary">
              <Highlight query={query}>{e.gloss}</Highlight>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const examples = [
  {
    title: 'Search results',
    description: 'Case- and diacritic-insensitive by default ("cafe" marks "café"). Text is rendered as text, never as HTML.',
    code: `<Highlight query={['cafe', 'coffee']}>{entry.gloss}</Highlight>\n<Highlight query="cat" wholeWord caseSensitive>{text}</Highlight>`,
    render: () => <Demo />,
  },
  {
    title: 'Whole word and case-sensitive',
    code: `<Highlight query="cat" wholeWord caseSensitive>Cat cat concatenate</Highlight>`,
    render: () => (
      <Highlight query="cat" wholeWord caseSensitive>
        Cat cat concatenate
      </Highlight>
    ),
  },
];
