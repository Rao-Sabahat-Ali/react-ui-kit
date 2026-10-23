import { Field } from '../Field/Field';
import { InputText } from '../InputText/InputText';

export const examples = [
  {
    title: 'Presets on InputText',
    description: 'Typing and pasting are limited to the allowed characters.',
    code: `<InputText keyFilter="pint" />\n<InputText keyFilter="alphanum" />\n<InputText keyFilter={/[A-Z]/} />`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <Field label="Quantity (digits only)"><InputText keyFilter="pint" inputMode="numeric" /></Field>
        <Field label="Username (letters, digits, _)"><InputText keyFilter="alphanum" /></Field>
        <Field label="Code (uppercase A-Z)"><InputText keyFilter={/[A-Z]/} /></Field>
      </div>
    ),
  },
  {
    title: 'useKeyFilter hook on a native input',
    code: `const { props } = useKeyFilter('hex');\n<input className="form-control" {...props} />`,
    render: function HookExample() {
      return <HexInput />;
    },
  },
];

import { useKeyFilter } from './useKeyFilter';

function HexInput() {
  const { props } = useKeyFilter('hex');
  return (
    <div style={{ maxWidth: 420 }}>
      <label className="form-label" htmlFor="kf-hex">Hex colour</label>
      <input id="kf-hex" className="form-control" {...props} />
    </div>
  );
}
