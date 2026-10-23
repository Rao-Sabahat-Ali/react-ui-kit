import { useState } from 'react';
import { addDays, startOfDay } from '../../utils/date';
import { Field } from '../Field/Field';
import { DatePicker, type DateRange } from './DatePicker';

const today = startOfDay(new Date());
const rangePresets = [
  { label: 'Last 7 days', value: (): DateRange => [addDays(today, -6), today] },
  { label: 'Last 30 days', value: (): DateRange => [addDays(today, -29), today] },
  { label: 'Next 14 days', value: (): DateRange => [today, addDays(today, 13)] },
];

function Single() {
  const [due, setDue] = useState<Date | null>(null);
  return (
    <Field label="Due date" help={due ? `ISO: ${due.toISOString()}` : 'Type a date or use the calendar'}>
      <DatePicker value={due} onChange={setDue} minDate={today} showButtonBar />
    </Field>
  );
}

function Range() {
  const [range, setRange] = useState<DateRange | null>(null);
  return (
    <Field label="Reporting period">
      <DatePicker selectionMode="range" value={range} onChange={setRange} presets={rangePresets} numberOfMonths={2} />
    </Field>
  );
}

export const examples = [
  {
    title: 'Single date with min date and button bar',
    code: `<Field label="Due date"><DatePicker value={due} onChange={setDue} minDate={new Date()} showButtonBar /></Field>`,
    render: () => (
      <div style={{ maxWidth: 320 }}>
        <Single />
      </div>
    ),
  },
  {
    title: 'Range with presets, two months',
    code: `<DatePicker selectionMode="range" value={range} onChange={setRange} presets={rangePresets} numberOfMonths={2} />`,
    render: () => (
      <div style={{ maxWidth: 320 }}>
        <Range />
      </div>
    ),
  },
  {
    title: 'Inline with time (no weekends)',
    code: `<DatePicker inline showTime aria-label="Appointment" disabledDates={(d) => d.getDay() === 0 || d.getDay() === 6} />`,
    render: () => <DatePicker inline showTime aria-label="Appointment" disabledDates={(d) => d.getDay() === 0 || d.getDay() === 6} />,
  },
  {
    title: 'Month and year granularity',
    code: `<DatePicker view="month" aria-label="Billing month" />\n<DatePicker view="year" aria-label="Fiscal year" />`,
    render: () => (
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Field label="Billing month">
          <DatePicker view="month" />
        </Field>
        <Field label="Fiscal year">
          <DatePicker view="year" />
        </Field>
      </div>
    ),
  },
];
