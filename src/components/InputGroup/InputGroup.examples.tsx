import { Button } from '../Button/Button';
import { Field } from '../Field/Field';
import { InputText } from '../InputText/InputText';
import { InputGroup } from './InputGroup';

export const examples = [
  {
    title: 'Addons around an amount',
    description: 'Addons marked `describe` are read as part of the control description.',
    code: `<InputGroup>\n  <InputGroup.Addon describe>$</InputGroup.Addon>\n  <InputText aria-label="Amount" />\n  <InputGroup.Addon>.00</InputGroup.Addon>\n</InputGroup>`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <InputGroup>
          <InputGroup.Addon describe>USD $</InputGroup.Addon>
          <InputText aria-label="Amount" inputMode="numeric" />
          <InputGroup.Addon>.00</InputGroup.Addon>
        </InputGroup>
      </div>
    ),
  },
  {
    title: 'Search with button',
    code: `<Field label="Search" labelHidden>\n  <InputGroup>\n    <InputText placeholder="Search…" />\n    <Button>Go</Button>\n  </InputGroup>\n</Field>`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <Field label="Search" labelHidden>
          <InputGroup size="lg">
            <InputText placeholder="Search…" />
            <Button>Go</Button>
          </InputGroup>
        </Field>
      </div>
    ),
  },
];
