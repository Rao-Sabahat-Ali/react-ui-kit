import { InputText } from '../InputText/InputText';
import { InputTextarea } from '../InputTextarea/InputTextarea';
import { Select } from '../Select/Select';
import { IftaLabel } from './IftaLabel';

const countries = [{ label: 'Sweden', value: 'se' }, { label: 'Norway', value: 'no' }, { label: 'Finland', value: 'fi' }];

export const examples = [
  {
    title: 'Label inside the border',
    description: 'The label stays at the top of the field, inside its border, whether or not it has a value.',
    code: `<IftaLabel label="Email" help="We never share it" required>\n  <InputText type="email" />\n</IftaLabel>\n<IftaLabel label="Country"><Select options={countries} /></IftaLabel>\n<IftaLabel label="Message" error="Message is required"><InputTextarea /></IftaLabel>`,
    render: () => (
      <div style={{ maxWidth: 420 }}>
        <IftaLabel label="Email" help="We never share it" required>
          <InputText type="email" defaultValue="anna@example.se" />
        </IftaLabel>
        <IftaLabel label="Country">
          <Select options={countries} defaultValue="se" />
        </IftaLabel>
        <IftaLabel label="Region">
          <Select native options={countries} />
        </IftaLabel>
        <IftaLabel label="Message" error="Message is required">
          <InputTextarea rows={3} />
        </IftaLabel>
        <IftaLabel label="Customer ID">
          <InputText disabled defaultValue="C-10443" />
        </IftaLabel>
      </div>
    ),
  },
];
