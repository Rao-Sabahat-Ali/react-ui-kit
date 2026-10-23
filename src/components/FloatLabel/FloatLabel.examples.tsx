import { InputText } from '../InputText/InputText';
import { InputTextarea } from '../InputTextarea/InputTextarea';
import { FloatLabel } from './FloatLabel';

export const examples = [
  {
    title: 'Login form',
    code: `<FloatLabel label="Email"><InputText type="email" /></FloatLabel>\n<FloatLabel label="Message" error="Required"><InputTextarea /></FloatLabel>`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <FloatLabel label="Email" help="We never share it">
          <InputText type="email" />
        </FloatLabel>
        <FloatLabel label="Message" error="Message is required">
          <InputTextarea />
        </FloatLabel>
      </div>
    ),
  },
];
