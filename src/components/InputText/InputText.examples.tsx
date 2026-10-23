import { Field } from '../Field/Field';
import { Icon } from '../Icon/Icon';
import { InputText } from './InputText';

export const examples = [
  {
    title: 'Basic and sizes',
    code: `<Field label="Small"><InputText size="sm" /></Field>\n<Field label="Default"><InputText placeholder="Jane Doe" /></Field>\n<Field label="Large"><InputText size="lg" /></Field>`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <Field label="Small"><InputText size="sm" /></Field>
        <Field label="Default"><InputText placeholder="Jane Doe" /></Field>
        <Field label="Large"><InputText size="lg" /></Field>
      </div>
    ),
  },
  {
    title: 'Adornments and clear',
    code: `<Field label="Search" labelHidden>\n  <InputText type="search" prefix={<Icon name="search" />} clearable placeholder="Search…" />\n</Field>\n<Field label="Website"><InputText type="url" prefix="https://" /></Field>`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <Field label="Search" labelHidden>
          <InputText type="search" prefix={<Icon name="search" />} clearable placeholder="Search…" defaultValue="invoices" />
        </Field>
        <Field label="Website"><InputText type="url" prefix="https://" /></Field>
        <Field label="Disabled"><InputText disabled defaultValue="Read only value" /></Field>
      </div>
    ),
  },
];
