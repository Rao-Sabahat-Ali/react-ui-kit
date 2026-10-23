import { Button } from '../Button/Button';
import { Panel } from './Panel';

export const examples = [
  {
    title: 'Collapsible panel with actions',
    description: 'Header is a real heading; the toggle exposes `aria-expanded` and `aria-controls`.',
    code: `<Panel header="Revenue" toggleable footer="Updated 2 min ago" icons={<Button size="sm">Refresh</Button>}>\n  Chart goes here\n</Panel>`,
    render: () => (
      <Panel header="Revenue" toggleable footer="Updated 2 min ago" icons={<Button size="sm" appearance="outline">Refresh</Button>}>
        Chart goes here
      </Panel>
    ),
  },
];
