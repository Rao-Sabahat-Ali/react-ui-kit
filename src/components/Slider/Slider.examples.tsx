import { useState } from 'react';
import { Field } from '../Field/Field';
import { Slider, type SliderValue } from './Slider';

function PriceRange() {
  const [value, setValue] = useState<SliderValue>([20, 80]);
  return (
    <Field label="Price range">
      <Slider range min={0} max={200} step={5} value={value} onChange={setValue} thumbLabels={['Minimum price', 'Maximum price']} valueText={(v) => `$${v}`} showValue />
    </Field>
  );
}

export const examples = [
  {
    title: 'Single value with marks',
    code: `<Field label="Volume"><Slider defaultValue={40} marks={[{ value: 0, label: '0' }, { value: 50, label: '50' }, { value: 100, label: '100' }]} showValue="tooltip" /></Field>`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <Field label="Volume">
          <Slider defaultValue={40} marks={[{ value: 0, label: '0' }, { value: 50, label: '50' }, { value: 100, label: '100' }]} showValue="tooltip" />
        </Field>
      </div>
    ),
  },
  {
    title: 'Range',
    code: `<Slider range value={value} onChange={setValue} thumbLabels={['Minimum price', 'Maximum price']} valueText={(v) => '$' + v} showValue />`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <PriceRange />
      </div>
    ),
  },
  {
    title: 'Vertical',
    code: `<Slider orientation="vertical" defaultValue={60} aria-label="Level" />`,
    render: () => <Slider orientation="vertical" defaultValue={60} aria-label="Level" />,
  },
];
