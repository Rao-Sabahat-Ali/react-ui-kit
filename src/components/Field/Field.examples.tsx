import { InputText } from '../InputText/InputText';
import { Field } from './Field';

export const examples = [
  {
    title: 'Label, help, error, required',
    code: `<Field label="Email" help="We never share it." required>\n  <InputText type="email" />\n</Field>\n<Field label="Username" error="Username is taken. Try another.">\n  <InputText defaultValue="admin" />\n</Field>`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <Field label="Email" help="We never share it." required>
          <InputText type="email" />
        </Field>
        <Field label="Username" error="Username is taken. Try another.">
          <InputText defaultValue="admin" />
        </Field>
        <Field label="Company" optionalText="(optional)">
          <InputText />
        </Field>
      </div>
    ),
  },
];
