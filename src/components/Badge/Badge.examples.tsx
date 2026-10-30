import { Button } from '../Button/Button';
import { Badge } from './Badge';
import { INTENTS } from '../../types';

export const examples = [
  {
    title: 'Solid and subtle',
    code: `<Badge value={4} />\n<Badge value="Beta" variant="info" appearance="subtle" />\n<Badge value={120} variant="danger" />`,
    render: () => (
      <div className="d-flex flex-wrap gap-2">
        {INTENTS.map((v) => <Badge key={v} value={v} variant={v} />)}
        {INTENTS.map((v) => <Badge key={`${v}-s`} value={v} variant={v} appearance="subtle" />)}
        <Badge value={120} variant="danger" />
      </div>
    ),
  },
  {
    title: 'Dot and compact counts',
    code: `<Badge dot label="Online" variant="success" />\n<Badge value={7} variant="secondary" />`,
    render: () => (
      <div className="d-flex align-items-center gap-3">
        <Badge dot label="Online" variant="success" />
        <Badge value={7} variant="secondary" />
        <Badge value={99} variant="danger" />
      </div>
    ),
  },
  {
    title: 'Overlay',
    code: `<Badge value={3} label="3 unread messages" variant="danger" overlay={{ children: <Button icon="user" aria-label="Inbox" appearance="text" variant="secondary" /> }} />`,
    render: () => (
      <div className="d-flex gap-4 p-2">
        <Badge value={3} label="3 unread messages" variant="danger" overlay={{ children: <Button icon="user" aria-label="Inbox" appearance="text" variant="secondary" /> }} />
        <Badge dot label="Online" variant="success" overlay={{ children: <Button icon="settings" aria-label="Settings" appearance="text" variant="secondary" /> }} />
      </div>
    ),
  },
];
