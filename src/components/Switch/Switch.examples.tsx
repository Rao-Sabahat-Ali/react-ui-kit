import { Switch } from './Switch';

export const examples = [
  {
    title: 'Settings',
    description: 'Takes effect immediately — use Checkbox inside forms that need Submit.',
    code: `<Switch label="Show translations" />\n<Switch label="Sound effects" defaultChecked />\n<Switch label="Large" size="lg" />\n<Switch label="Label first" labelPosition="start" />`,
    render: () => (
      <div className="d-flex flex-column gap-2">
        <Switch label="Show translations" />
        <Switch label="Sound effects" defaultChecked />
        <Switch label="Large" size="lg" />
        <Switch label="Label first" labelPosition="start" />
        <Switch label="Disabled" disabled />
      </div>
    ),
  },
];
