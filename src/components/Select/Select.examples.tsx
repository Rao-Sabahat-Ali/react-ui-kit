import { useState } from 'react';
import { Field } from '../Field/Field';
import { Select } from './Select';

const countries = [
  { label: 'Europe', options: [{ label: 'Germany', value: 'de' }, { label: 'Sweden', value: 'se' }, { label: 'Netherlands', value: 'nl' }] },
  { label: 'Asia', options: [{ label: 'Japan', value: 'jp' }, { label: 'Pakistan', value: 'pk' }, { label: 'Singapore', value: 'sg' }] },
];

function Controlled() {
  const [country, setCountry] = useState<string | null>('se');
  return (
    <Field label="Country" help={`Selected: ${country ?? 'none'}`}>
      <Select options={countries} value={country} onChange={setCountry} filter clearable />
    </Field>
  );
}

export const examples = [
  {
    title: 'Custom with filter, groups and clear',
    code: `const [country, setCountry] = useState<string | null>('se');\n<Field label="Country">\n  <Select options={countries} value={country} onChange={setCountry} filter clearable />\n</Field>`,
    render: () => (
      <div style={{ maxWidth: 360 }}>
        <Controlled />
      </div>
    ),
  },
  {
    title: 'Native (mobile / POS)',
    code: `<Field label="Size"><Select native options={[{ label: 'Small', value: 's' }, { label: 'Medium', value: 'm' }, { label: 'Large', value: 'l' }]} /></Field>`,
    render: () => (
      <div style={{ maxWidth: 360 }}>
        <Field label="Size">
          <Select native options={[{ label: 'Small', value: 's' }, { label: 'Medium', value: 'm' }, { label: 'Large', value: 'l' }]} />
        </Field>
      </div>
    ),
  },
];
