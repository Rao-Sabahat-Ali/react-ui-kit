import { Field } from '../Field/Field';
import { InputOtp } from './InputOtp';

export const examples = [
  {
    title: 'Verification code',
    description: 'Typing advances, Backspace goes back, pasting distributes the code.',
    code: `<Field label="Verification code">\n  <InputOtp length={6} onComplete={(code) => verify(code)} />\n</Field>`,
    render: () => (
      <Field label="Verification code" help="Enter the 6-digit code we sent you">
        <InputOtp length={6} />
      </Field>
    ),
  },
  {
    title: 'Masked PIN',
    code: `<Field label="PIN"><InputOtp length={4} mask /></Field>`,
    render: () => (
      <Field label="PIN">
        <InputOtp length={4} mask />
      </Field>
    ),
  },
];
