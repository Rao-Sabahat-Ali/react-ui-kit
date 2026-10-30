import { useState } from 'react';
import { Button } from '../Button/Button';
import { QuantityTick } from './QuantityTick';

function Demo() {
  const [count, setCount] = useState(8);
  return (
    <div className="d-flex align-items-center gap-4">
      <span className="ui-qty ui-qty--display">
        <QuantityTick value={count} />
        <span className="ui-qty__mark" aria-hidden="true">
          ×
        </span>
      </span>
      <Button variant="secondary" appearance="outline" onClick={() => setCount((n) => n + 7)}>
        Add 7
      </Button>
      <Button variant="secondary" appearance="outline" onClick={() => setCount((n) => Math.max(0, n - 3))}>
        Remove 3
      </Button>
    </div>
  );
}

export const examples = [
  {
    title: 'Rolling quantity mark',
    code: `<span className="ui-qty">\n  <QuantityTick value={count} />\n  <span className="ui-qty__mark" aria-hidden="true">×</span>\n</span>`,
    render: () => <Demo />,
  },
];
