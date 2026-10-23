import { useState } from 'react';
import { Knob } from './Knob';

function Volume() {
  const [volume, setVolume] = useState(40);
  return <Knob aria-label="Volume" value={volume} onChange={setVolume} valueTemplate="{v}%" />;
}

export const examples = [
  {
    title: 'Volume knob',
    description: 'Drag around the dial or use arrows, PageUp/PageDown, Home and End.',
    code: `const [volume, setVolume] = useState(40);\n<Knob aria-label="Volume" value={volume} onChange={setVolume} valueTemplate="{v}%" />`,
    render: () => <Volume />,
  },
  {
    title: 'Read-only gauge',
    code: `<Knob aria-label="CPU load" readOnly value={72} variant="warning" size={120} valueTemplate={(v) => v + '%'} />`,
    render: () => <Knob aria-label="CPU load" readOnly value={72} variant="warning" size={120} valueTemplate={(v) => `${v}%`} />,
  },
];
