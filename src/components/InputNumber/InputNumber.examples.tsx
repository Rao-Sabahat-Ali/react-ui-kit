import { Field } from '../Field/Field';
import { InputNumber } from './InputNumber';

export const examples = [
  {
    title: 'Quantity with stepper buttons',
    code: `<Field label="Quantity"><InputNumber showButtons buttonLayout="horizontal" min={1} max={99} defaultValue={1} /></Field>`,
    render: () => (
      <div style={{ maxWidth: 260 }}>
        <Field label="Quantity">
          <InputNumber showButtons buttonLayout="horizontal" min={1} max={99} defaultValue={1} />
        </Field>
      </div>
    ),
  },
  {
    title: 'Currency and percent',
    code: `<InputNumber mode="currency" currency="USD" defaultValue={1234.5} />\n<InputNumber mode="percent" step={0.01} min={0} max={1} defaultValue={0.25} />`,
    render: () => (
      <div style={{ maxWidth: 260 }}>
        <Field label="Price"><InputNumber mode="currency" currency="USD" defaultValue={1234.5} showButtons /></Field>
        <Field label="Discount"><InputNumber mode="percent" step={0.01} min={0} max={1} defaultValue={0.25} /></Field>
      </div>
    ),
  },
];
