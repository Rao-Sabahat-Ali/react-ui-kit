import { useState } from 'react';
import { Button } from '../Button/Button';
import { BlockUI } from './BlockUI';

function Demo() {
  const [blocked, setBlocked] = useState(false);
  return (
    <div className="d-flex flex-column gap-3">
      <Button onClick={() => { setBlocked(true); setTimeout(() => setBlocked(false), 2000); }}>Block for 2 s</Button>
      <BlockUI blocked={blocked}>
        <div className="border rounded p-4 d-flex flex-column gap-2">
          <strong>Payment</strong>
          <Button>Charge card</Button>
        </div>
      </BlockUI>
    </div>
  );
}

export const examples = [
  {
    title: 'Block a region',
    description: 'Content becomes `inert` and `aria-busy`; the overlay message is announced; focus returns afterwards.',
    code: `<BlockUI blocked={processing}>…</BlockUI>`,
    render: () => <Demo />,
  },
];
