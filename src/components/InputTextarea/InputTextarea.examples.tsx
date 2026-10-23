import { Field } from '../Field/Field';
import { InputTextarea } from './InputTextarea';

export const examples = [
  {
    title: 'Auto-resize with counter',
    description: 'Grows up to five rows, then scrolls. The counter is announced at 90% and at the limit.',
    code: `<Field label="Bio" help="Tell us about yourself">\n  <InputTextarea autoResize maxRows={5} maxLength={200} showCount />\n</Field>`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <Field label="Bio" help="Tell us about yourself">
          <InputTextarea autoResize maxRows={5} maxLength={200} showCount />
        </Field>
      </div>
    ),
  },
  {
    title: 'Invalid',
    code: `<Field label="Notes" error="Notes are required"><InputTextarea rows={4} /></Field>`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <Field label="Notes" error="Notes are required"><InputTextarea rows={4} /></Field>
      </div>
    ),
  },
];
