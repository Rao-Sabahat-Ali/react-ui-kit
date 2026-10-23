import { useState } from 'react';
import { Button } from '../Button/Button';
import { Drawer } from './Drawer';

function Demo({ position }: { position: 'start' | 'end' | 'bottom' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button appearance="outline" onClick={() => setOpen(true)}>Open {position}</Button>
      <Drawer open={open} onClose={() => setOpen(false)} position={position} title="Word details" footer={<Button onClick={() => setOpen(false)}>Done</Button>}>
        <p>Drawers slide in from an edge: detail panels, filters, mobile navigation.</p>
      </Drawer>
    </>
  );
}

export const examples = [
  {
    title: 'Positions',
    code: `<Drawer open={open} onClose={() => setOpen(false)} position="end" title="Word details" footer={<Button>Done</Button>}>…</Drawer>`,
    render: () => (
      <div className="d-flex gap-2">
        <Demo position="start" />
        <Demo position="end" />
        <Demo position="bottom" />
      </div>
    ),
  },
];
