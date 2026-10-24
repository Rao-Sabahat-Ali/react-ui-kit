import { useState } from 'react';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import { ProgressCircle } from './ProgressCircle';

function Demo() {
  const [v, setV] = useState(40);
  return (
    <div className="d-flex flex-wrap align-items-center gap-4">
      <ProgressCircle label="Storage used" value={v} showValue size="lg" />
      <ProgressCircle label="Daily goal" value={v} size="md" showValue variant="success" />
      <ProgressCircle label="Quota" value={v} size="sm" variant="warning" />
      <ProgressCircle label="Import" value={100} size="md">
        <Icon name="check" size="lg" />
      </ProgressCircle>
      <ProgressCircle label="Loading" size="md" />
      <Button size="sm" appearance="outline" variant="secondary" onClick={() => setV((x) => (x >= 100 ? 0 : x + 20))}>
        Advance
      </Button>
    </div>
  );
}

export const examples = [
  {
    title: 'Sizes, intents, centre content, indeterminate',
    description: 'Read-only. The transition and the spinning arc are off under reduced motion; use Knob for input.',
    code: `<ProgressCircle label="Storage used" value={72} showValue size="lg" />\n<ProgressCircle label="Import" value={100}><Icon name="check" size="lg" /></ProgressCircle>\n<ProgressCircle label="Loading" />`,
    render: () => <Demo />,
  },
];
