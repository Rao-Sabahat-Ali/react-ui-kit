import { Button } from '../Button/Button';
import { Message } from './Message';

export const examples = [
  {
    title: 'Severities',
    code: `<Message severity="info" title="Heads up">New version available.</Message>\n<Message severity="success">Profile saved.</Message>\n<Message severity="warning" dismissible>Your trial ends in 3 days.</Message>\n<Message severity="danger" title="Couldn't save" live="assertive" actions={<Button size="sm" variant="danger">Retry</Button>}>Check the highlighted fields.</Message>`,
    render: () => (
      <div style={{ maxWidth: 560 }}>
        <Message severity="info" title="Heads up">New version available.</Message>
        <Message severity="success">Profile saved.</Message>
        <Message severity="warning" dismissible>Your trial ends in 3 days.</Message>
        <Message severity="danger" title="Couldn't save" actions={<Button size="sm" variant="danger">Retry</Button>}>
          Check the highlighted fields.
        </Message>
        <Message severity="secondary" inline>Inline note next to a field.</Message>
      </div>
    ),
  },
];
