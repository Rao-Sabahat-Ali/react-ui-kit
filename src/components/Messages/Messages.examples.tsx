import { useRef } from 'react';
import { Button } from '../Button/Button';
import { Messages, type MessagesHandle } from './Messages';

function Demo() {
  const ref = useRef<MessagesHandle>(null);
  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex gap-2">
        <Button size="sm" onClick={() => ref.current?.show({ severity: 'success', children: 'Saved.', life: 3000 })}>Success (3 s)</Button>
        <Button size="sm" appearance="outline" onClick={() => ref.current?.show({ severity: 'danger', children: 'Could not save.' })}>Error</Button>
        <Button size="sm" appearance="outline" onClick={() => ref.current?.clear()}>Clear</Button>
      </div>
      <Messages ref={ref} />
    </div>
  );
}

export const examples = [
  {
    title: 'Imperative messages',
    description: 'Wrapper is a polite live region; danger items are assertive.',
    code: `const ref = useRef<MessagesHandle>(null);\nref.current?.show({ severity: 'success', children: 'Saved.', life: 3000 });\n<Messages ref={ref} />`,
    render: () => <Demo />,
  },
];
