import { useState } from 'react';
import { Field } from '../Field/Field';
import { ListBox } from './ListBox';

const cities = [
  { label: 'Nordics', options: [{ label: 'Copenhagen', value: 'cph' }, { label: 'Oslo', value: 'osl' }, { label: 'Stockholm', value: 'sto' }] },
  { label: 'Benelux', options: [{ label: 'Amsterdam', value: 'ams' }, { label: 'Brussels', value: 'bru' }, { label: 'Luxembourg', value: 'lux', disabled: true }] },
];

const many = Array.from({ length: 5000 }, (_, i) => ({ label: `Row ${i + 1}`, value: i + 1 }));

function Single() {
  const [city, setCity] = useState<string | null>('sto');
  return (
    <Field label="City" help={`Selected: ${city ?? 'none'}`}>
      <ListBox options={cities} value={city} onChange={setCity} filter />
    </Field>
  );
}

function Multiple() {
  const [value, setValue] = useState<string[]>(['ams']);
  return (
    <Field label="Cities" help={`Selected: ${value.join(', ') || 'none'}`}>
      <ListBox multiple options={cities} value={value} onChange={setValue} />
    </Field>
  );
}

export const examples = [
  {
    title: 'Single with filter and groups',
    code: `const [city, setCity] = useState<string | null>('sto');\n<Field label="City"><ListBox options={cities} value={city} onChange={setCity} filter /></Field>`,
    render: () => (
      <div style={{ maxWidth: 320 }}>
        <Single />
      </div>
    ),
  },
  {
    title: 'Multiple',
    description: 'Space toggles, Shift+Arrow extends, Ctrl/Cmd+A selects all.',
    code: `<ListBox multiple options={cities} value={value} onChange={setValue} />`,
    render: () => (
      <div style={{ maxWidth: 320 }}>
        <Multiple />
      </div>
    ),
  },
  {
    title: 'Virtual (5000 rows)',
    code: `<ListBox aria-label="Rows" options={many} virtual={{ itemHeight: 40 }} listHeight="16rem" />`,
    render: () => (
      <div style={{ maxWidth: 320 }}>
        <ListBox aria-label="Rows" options={many} virtual={{ itemHeight: 40 }} listHeight="16rem" />
      </div>
    ),
  },
];
