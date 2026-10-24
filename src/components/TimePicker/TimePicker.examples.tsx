import { useState } from 'react';
import { Field } from '../Field/Field';
import { TimePicker } from './TimePicker';

function Controlled() {
  const [time, setTime] = useState<string | null>('09:30');
  return (
    <div className="d-grid gap-2">
      <Field label="Opens at" help="Arrow keys, Page keys, or type digits.">
        <TimePicker value={time} onChange={setTime} />
      </Field>
      <p className="mb-0 small text-body-secondary">Value: {time ?? 'empty'}</p>
    </div>
  );
}

export const examples = [
  {
    title: 'Controlled with Field',
    description: 'The value is always a 24-hour `HH:mm` string; the display follows the locale.',
    code: `<Field label="Opens at"><TimePicker value={time} onChange={setTime} /></Field>`,
    render: () => <Controlled />,
  },
  {
    title: '12-hour, step and range',
    description: 'Minutes move in steps of 15 and the value stays between 08:00 and 18:00.',
    code: `<TimePicker defaultValue="13:15" hourFormat="12" step={15} min="08:00" max="18:00" aria-label="Pickup time" />`,
    render: () => <TimePicker defaultValue="13:15" hourFormat="12" step={15} min="08:00" max="18:00" aria-label="Pickup time" />,
  },
  {
    title: 'Seconds, sizes and states',
    code: `<TimePicker showSeconds hourFormat="24" defaultValue="14:05:30" />\n<TimePicker size="sm" />\n<TimePicker invalid />\n<TimePicker disabled defaultValue="10:00" />`,
    render: () => (
      <div className="d-flex flex-wrap gap-3 align-items-center">
        <TimePicker showSeconds hourFormat="24" defaultValue="14:05:30" aria-label="With seconds" />
        <TimePicker size="sm" hourFormat="24" aria-label="Small, empty" />
        <TimePicker size="lg" hourFormat="24" defaultValue="07:45" aria-label="Large" />
        <TimePicker invalid hourFormat="24" defaultValue="25:00" aria-label="Invalid" />
        <TimePicker disabled hourFormat="24" defaultValue="10:00" aria-label="Disabled" />
      </div>
    ),
  },
];
