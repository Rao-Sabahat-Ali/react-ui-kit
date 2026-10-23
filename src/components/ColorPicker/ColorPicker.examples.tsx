import { useState } from 'react';
import { Field } from '../Field/Field';
import { ColorPicker } from './ColorPicker';

const swatches = [
  { value: '#0d6efd', name: 'Blue' },
  { value: '#198754', name: 'Green' },
  { value: '#dc3545', name: 'Red' },
  { value: '#ffc107', name: 'Amber' },
  { value: '#6f42c1', name: 'Purple' },
  { value: '#212529', name: 'Ink' },
];

function Popup() {
  const [color, setColor] = useState('#0d6efd');
  return (
    <Field label="Brand colour" help={`Value: ${color}`}>
      <ColorPicker value={color} onChange={setColor} swatches={swatches} />
    </Field>
  );
}

function Inline() {
  const [color, setColor] = useState('rgba(220, 53, 69, 0.8)');
  return (
    <Field label="Overlay" help={`Value: ${color}`}>
      <ColorPicker inline alpha format="rgb" value={color} onChange={setColor} />
    </Field>
  );
}

export const examples = [
  {
    title: 'Popup with swatches',
    code: `<Field label="Brand colour"><ColorPicker value={color} onChange={setColor} swatches={swatches} /></Field>`,
    render: () => <Popup />,
  },
  {
    title: 'Inline, alpha, rgb output',
    code: `<ColorPicker inline alpha format="rgb" value={color} onChange={setColor} />`,
    render: () => <Inline />,
  },
  {
    title: 'Native',
    code: `<Field label="Accent"><ColorPicker native defaultValue="#6f42c1" /></Field>`,
    render: () => (
      <Field label="Accent">
        <ColorPicker native defaultValue="#6f42c1" />
      </Field>
    ),
  },
];
