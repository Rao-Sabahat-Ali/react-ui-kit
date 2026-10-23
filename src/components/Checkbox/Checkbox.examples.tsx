import { Checkbox, CheckboxGroup } from './Checkbox';

export const examples = [
  {
    title: 'Single and states',
    code: `<Checkbox label="Remember me" defaultChecked />\n<Checkbox label="Select all" indeterminate />\n<Checkbox label="Disabled" disabled />\n<Checkbox label="Accept terms" invalid />`,
    render: () => (
      <>
        <Checkbox label="Remember me" defaultChecked />
        <Checkbox label="Select all" indeterminate />
        <Checkbox label="Disabled" disabled />
        <Checkbox label="Accept terms" invalid />
      </>
    ),
  },
  {
    title: 'Group',
    code: `<CheckboxGroup legend="Notify me by" options={[{ label: 'Email', value: 'email' }, { label: 'SMS', value: 'sms' }, { label: 'Push', value: 'push' }]} defaultValue={['email']} inline />`,
    render: () => (
      <CheckboxGroup
        legend="Notify me by"
        options={[{ label: 'Email', value: 'email' }, { label: 'SMS', value: 'sms' }, { label: 'Push', value: 'push' }]}
        defaultValue={['email']}
        inline
      />
    ),
  },
];
