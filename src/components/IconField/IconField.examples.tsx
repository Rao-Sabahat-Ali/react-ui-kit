import { Field } from '../Field/Field';
import { InputText } from '../InputText/InputText';
import { IconField } from './IconField';

export const examples = [
  {
    title: 'Search box and clickable icon',
    description: 'The start icon is decorative; the end icon is a labelled button.',
    code: `<IconField icon="search"><InputText aria-label="Search" placeholder="Search…" /></IconField>\n<IconField icon="eye" iconPosition="end" iconLabel="Reveal" onIconClick={() => {}}>\n  <InputText aria-label="Token" />\n</IconField>`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <Field label="Search" labelHidden>
          <IconField icon="search">
            <InputText placeholder="Search…" />
          </IconField>
        </Field>
        <Field label="Token">
          <IconField icon="copy" iconPosition="end" iconLabel="Copy token" onIconClick={() => undefined}>
            <InputText defaultValue="tok_demo" readOnly />
          </IconField>
        </Field>
      </div>
    ),
  },
];
