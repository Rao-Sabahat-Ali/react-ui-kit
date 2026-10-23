import { useState } from 'react';
import { PickList, type PickListChange } from './PickList';

interface Permission {
  id: number;
  name: string;
}

const all: Permission[] = ['Read', 'Write', 'Delete', 'Invite', 'Billing', 'Export'].map((name, i) => ({ id: i + 1, name }));

function Demo({ filter, showReorder }: { filter?: boolean; showReorder?: boolean }) {
  const [state, setState] = useState<PickListChange<Permission>>({ source: all.slice(2), target: all.slice(0, 2) });
  return <PickList source={state.source} target={state.target} onChange={setState} sourceHeader="Available" targetHeader="Granted" itemTemplate={(p) => p.name} filter={filter} showReorder={showReorder} listHeight="12rem" />;
}

export const examples = [
  {
    title: 'Transfer items',
    description: 'Use the buttons, double-click, or press Enter on an item.',
    code: `<PickList source={source} target={target} onChange={({ source, target }) => …} sourceHeader="Available" targetHeader="Granted" />`,
    render: () => <Demo />,
  },
  { title: 'Filter and reorder', code: `<PickList … filter showReorder />`, render: () => <Demo filter showReorder /> },
];
