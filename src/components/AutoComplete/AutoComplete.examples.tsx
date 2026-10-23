import { useState } from 'react';
import { Field } from '../Field/Field';
import { AutoComplete } from './AutoComplete';

const countries = ['Australia', 'Austria', 'Belgium', 'Brazil', 'Canada', 'Denmark', 'Finland', 'France', 'Germany', 'Netherlands', 'Norway', 'Pakistan', 'Sweden', 'Switzerland'];

/** Fake server: resolves after 300 ms unless aborted. */
function searchCountries(query: string, signal: AbortSignal): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(countries.filter((c) => c.toLowerCase().includes(query.toLowerCase()))), 300);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

function Async() {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<string | null>(null);
  return (
    <Field label="Country" help={`Value: ${value ?? 'none'}`}>
      <AutoComplete
        suggestions={items}
        loading={loading}
        value={value}
        onChange={setValue}
        forceSelection
        dropdown
        onSearch={async (q, signal) => {
          setLoading(true);
          try {
            setItems(await searchCountries(q, signal));
          } finally {
            if (!signal.aborted) setLoading(false);
          }
        }}
      />
    </Field>
  );
}

function Multiple() {
  const [items, setItems] = useState<string[]>([]);
  const [value, setValue] = useState<string[]>(['Sweden']);
  return (
    <Field label="Countries">
      <AutoComplete multiple suggestions={items} value={value} onChange={setValue} delay={0} onSearch={(q) => setItems(countries.filter((c) => c.toLowerCase().startsWith(q.toLowerCase())))} />
    </Field>
  );
}

export const examples = [
  {
    title: 'Async with abort, forceSelection and dropdown',
    description: 'Each keystroke aborts the previous request via the AbortSignal.',
    code: `<AutoComplete suggestions={items} loading={loading} value={value} onChange={setValue} forceSelection dropdown\n  onSearch={async (q, signal) => setItems(await api.search(q, { signal }))} />`,
    render: () => (
      <div style={{ maxWidth: 360 }}>
        <Async />
      </div>
    ),
  },
  {
    title: 'Multiple (chips)',
    code: `<AutoComplete multiple suggestions={items} value={value} onChange={setValue} onSearch={search} />`,
    render: () => (
      <div style={{ maxWidth: 360 }}>
        <Multiple />
      </div>
    ),
  },
];
