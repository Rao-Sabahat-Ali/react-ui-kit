import { Button } from './Button';
import { INTENTS } from '../../types';

export const examples = [
  {
    title: 'Variants',
    description: 'One primary button per region. Danger only for destructive actions.',
    code: INTENTS.map((v) => `<Button variant="${v}">${v}</Button>`).join('\n'),
    render: () => (
      <div className="d-flex flex-wrap gap-2">
        {INTENTS.map((v) => (
          <Button key={v} variant={v}>
            {v[0]!.toUpperCase() + v.slice(1)}
          </Button>
        ))}
      </div>
    ),
  },
  {
    title: 'Appearances',
    code: `<Button appearance="outline">Outline</Button>\n<Button appearance="text">Text</Button>\n<Button variant="link">Link</Button>`,
    render: () => (
      <div className="d-flex flex-wrap gap-2">
        <Button appearance="outline">Outline</Button>
        <Button appearance="outline" variant="danger">Outline danger</Button>
        <Button appearance="text">Text</Button>
        <Button appearance="text" variant="secondary">Text secondary</Button>
        <Button variant="link">Link</Button>
      </div>
    ),
  },
  {
    title: 'Sizes, icons, states',
    code: `<Button size="sm" icon="plus">Add</Button>\n<Button icon="download" iconPosition="end">Export</Button>\n<Button size="lg" rounded>Play now</Button>\n<Button icon="settings" aria-label="Settings" appearance="text" />\n<Button loading loadingText="Saving…">Save</Button>\n<Button disabled>Disabled</Button>\n<Button badge={3} variant="secondary">Inbox</Button>`,
    render: () => (
      <div className="d-flex flex-wrap align-items-center gap-2">
        <Button size="sm" icon="plus">Add</Button>
        <Button icon="download" iconPosition="end">Export</Button>
        <Button size="lg" rounded>Play now</Button>
        <Button icon="settings" aria-label="Settings" appearance="text" />
        <Button loading loadingText="Saving…">Save</Button>
        <Button disabled>Disabled</Button>
        <Button badge={3} variant="secondary">Inbox</Button>
      </div>
    ),
  },
];
