import { Field } from '../Field/Field';
import { Password } from './Password';

export const examples = [
  {
    title: 'Sign in',
    code: `<Field label="Password"><Password /></Field>`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <Field label="Password"><Password /></Field>
      </div>
    ),
  },
  {
    title: 'New password with strength and requirements',
    code: `<Field label="New password">\n  <Password feedback requirements={[\n    { label: 'At least 8 characters', test: (v) => v.length >= 8 },\n    { label: 'Contains a number', test: (v) => /\\d/.test(v) },\n  ]} />\n</Field>`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <Field label="New password">
          <Password
            feedback
            requirements={[
              { label: 'At least 8 characters', test: (v) => v.length >= 8 },
              { label: 'Contains a number', test: (v) => /\d/.test(v) },
            ]}
          />
        </Field>
      </div>
    ),
  },
];
