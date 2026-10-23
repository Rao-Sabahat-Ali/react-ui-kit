import { Button } from '../Button/Button';
import { Tooltip } from './Tooltip';

export const examples = [
  {
    title: 'Hover and focus',
    description: 'Shows after 300 ms on hover and immediately on keyboard focus. Escape hides it.',
    code: `<Tooltip content="Saves a draft copy">\n  <Button variant="secondary">Save draft</Button>\n</Tooltip>`,
    render: () => (
      <div className="d-flex gap-2">
        <Tooltip content="Saves a draft copy">
          <Button variant="secondary">Save draft</Button>
        </Tooltip>
        <Tooltip content="Opens below" placement="bottom">
          <Button variant="secondary" appearance="outline">Bottom</Button>
        </Tooltip>
      </div>
    ),
  },
  {
    title: 'Icon-only button (asLabel)',
    description: 'The tooltip text becomes the button name; the tooltip itself is hidden from assistive tech.',
    code: `<Tooltip content="Settings" asLabel>\n  <Button icon="settings" aria-label="Settings" appearance="text" />\n</Tooltip>`,
    render: () => (
      <Tooltip content="Settings" asLabel>
        <Button icon="settings" aria-label="Settings" appearance="text" />
      </Tooltip>
    ),
  },
];
