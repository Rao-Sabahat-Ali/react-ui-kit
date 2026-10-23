import { useState } from 'react';
import { Field } from '../Field/Field';
import { CascadeSelect, type CascadeOption } from './CascadeSelect';

const places: CascadeOption<string>[] = [
  {
    label: 'Sweden',
    children: [
      { label: 'Stockholm County', children: [{ label: 'Stockholm', value: 'sto' }, { label: 'Solna', value: 'sol' }] },
      { label: 'Skåne', children: [{ label: 'Malmö', value: 'mmx' }, { label: 'Lund', value: 'lnd' }] },
    ],
  },
  { label: 'Pakistan', children: [{ label: 'Punjab', children: [{ label: 'Lahore', value: 'lhe' }, { label: 'Multan', value: 'mux' }] }, { label: 'Sindh', children: [{ label: 'Karachi', value: 'khi' }] }] },
];

function Demo() {
  const [city, setCity] = useState<string | null>(null);
  return (
    <Field label="City" help={`Value: ${city ?? 'none'}`}>
      <CascadeSelect options={places} value={city} onChange={setCity} placeholder="Country → region → city" />
    </Field>
  );
}

export const examples = [
  {
    title: 'Country → region → city',
    description: 'ArrowRight/Enter opens a level, ArrowLeft goes back, Enter on a city selects.',
    code: `<Field label="City"><CascadeSelect options={places} value={city} onChange={setCity} /></Field>`,
    render: () => (
      <div style={{ maxWidth: 320 }}>
        <Demo />
      </div>
    ),
  },
];
