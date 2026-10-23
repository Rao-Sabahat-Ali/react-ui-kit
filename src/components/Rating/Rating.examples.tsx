import { Field } from '../Field/Field';
import { Rating } from './Rating';

export const examples = [
  {
    title: 'Interactive rating',
    description: 'Arrow keys change the value; click the current star (or press Delete) to clear.',
    code: `<Field label="Your rating"><Rating defaultValue={3} /></Field>`,
    render: () => (
      <Field label="Your rating">
        <Rating defaultValue={3} />
      </Field>
    ),
  },
  {
    title: 'Read-only with half stars',
    code: `<Rating readOnly value={4.5} />\n<Rating readOnly value={2.25} size="sm" />`,
    render: () => (
      <div className="d-flex flex-column gap-2">
        <Rating readOnly value={4.5} />
        <Rating readOnly value={2.25} size="sm" />
      </div>
    ),
  },
];
