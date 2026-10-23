import { Field } from '../Field/Field';
import { InputMask } from './InputMask';

export const examples = [
  {
    title: 'Phone and postal code',
    code: `<InputMask mask="(999) 999-9999" placeholder="(555) 123-4567" />\n<InputMask mask="999 99" slotChar="_" unmask />`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <Field label="Phone"><InputMask mask="(999) 999-9999" placeholder="(555) 123-4567" /></Field>
        <Field label="Postal code" help="Emits the digits only"><InputMask mask="999 99" unmask /></Field>
      </div>
    ),
  },
  {
    title: 'Serial number with optional part',
    code: `<InputMask mask="aa-999?-99" onComplete={(v) => console.log(v)} />`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <Field label="Serial"><InputMask mask="aa-999?-99" /></Field>
      </div>
    ),
  },
];
